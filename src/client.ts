import { helloFrame, isRecordKind, readEventFrame, readReadyFrame, readRecord, readSubscribedFrame, recordKey } from './protocol.js';
import { OverlayRuntime } from './runtime.js';
import type { OverlayFrame, OverlayReader, OverlayRecord, RecordKind, RecordRequest, Subscriptions } from './types.js';

export interface OverlayOptions {
  /** The OBS Browser Source URL normally supplies `?ws=`. Override for local development. */
  url?: string;
  /** Defaults to 5 seconds. */
  handshakeTimeoutMs?: number;
  /** Defaults to true. */
  reconnect?: boolean;
  /** How often granted records are refreshed; defaults to 30 seconds. */
  recordRefreshMs?: number;
}

function socketUrl(override?: string): string {
  const candidate = override ?? (typeof location === 'undefined' ? null : new URL(location.href).searchParams.get('ws'));
  if (!candidate) throw new TypeError('Missing overlay WebSocket URL');
  let parsed: URL;
  try { parsed = new URL(candidate); } catch { throw new TypeError('Invalid overlay WebSocket URL'); }
  if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') throw new TypeError('Overlay URL must use ws or wss');
  return parsed.href;
}

class LiveOverlay extends OverlayRuntime {
  private socket: WebSocket | null = null;
  private active = false;
  private attempt = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private handshakeTimer: ReturnType<typeof setTimeout> | null = null;
  private recordTimer: ReturnType<typeof setInterval> | null = null;
  private pending: { resolve: () => void; reject: (error: Error) => void } | null = null;
  private pendingStart: Promise<void> | null = null;
  private grantedRecords: RecordRequest[] = [];

  constructor(private readonly subscriptions: Subscriptions, private readonly options: OverlayOptions) {
    super();
    // Validate synchronously so the author sees a configuration error before
    // opening a socket. Grants are still decided only by the server.
    helloFrame(subscriptions);
    if (options.handshakeTimeoutMs !== undefined &&
      (!Number.isSafeInteger(options.handshakeTimeoutMs) || options.handshakeTimeoutMs < 1 || options.handshakeTimeoutMs > 60_000)) {
      throw new TypeError('Handshake timeout must be 1–60000 ms');
    }
    if (options.recordRefreshMs !== undefined &&
      (!Number.isSafeInteger(options.recordRefreshMs) || options.recordRefreshMs < 1000 || options.recordRefreshMs > 3_600_000)) {
      throw new TypeError('Record refresh interval must be 1000–3600000 ms');
    }
  }

  start(): Promise<void> {
    if (this.state.status === 'ready') return Promise.resolve();
    if (this.pendingStart) return this.pendingStart;
    let url: string;
    try { url = socketUrl(this.options.url); }
    catch (error) { return Promise.reject(error); }
    if (typeof WebSocket === 'undefined') return Promise.reject(new Error('WebSocket is unavailable'));
    this.active = true;
    this.pendingStart = new Promise<void>((resolve, reject) => {
      this.pending = { resolve, reject };
      this.open(url);
    }).finally(() => { this.pendingStart = null; });
    return this.pendingStart;
  }

  stop(): void {
    this.active = false;
    this.clearTimers();
    try { this.socket?.close(1000, 'Overlay stopped'); }
    catch { /* A connecting socket may reject close; the callback is detached below. */ }
    this.socket = null;
    this.pending?.reject(new Error('Overlay stopped'));
    this.pending = null;
    this.grantedRecords = [];
    this.setState({ status: 'stopped' });
  }

  async getRecord(kind: RecordKind, id: string): Promise<OverlayRecord | null> {
    return this.readRecord(kind, id, () => true);
  }

  private async readRecord(kind: RecordKind, id: string, isCurrent: () => boolean): Promise<OverlayRecord | null> {
    if (!isRecordKind(kind) || !/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(id)) {
      throw new TypeError('Invalid overlay record');
    }
    if (!this.subscriptions.records?.some((record) => record.kind === kind && record.id === id)) {
      throw new Error('Record was not subscribed');
    }
    if (typeof fetch === 'undefined') throw new Error('Fetch is unavailable');
    const socket = new URL(socketUrl(this.options.url));
    const token = socket.pathname.split('/').at(-1);
    if (!token) throw new Error('Overlay credential is missing');
    const endpoint = new URL(`/overlay-sdk/v2/records/${encodeURIComponent(token)}/${kind}/${encodeURIComponent(id)}`, socket);
    endpoint.protocol = socket.protocol === 'wss:' ? 'https:' : 'http:';
    const response = await fetch(endpoint, { cache: 'no-store', credentials: 'omit' });
    if (!isCurrent() || response.status === 404) return null;
    if (!response.ok) throw new Error('Overlay record unavailable');
    const record = readRecord(await response.json());
    if (!record || record.kind !== kind || record.id !== id) throw new Error('Invalid overlay record response');
    this.applyRecord(record);
    return this.state.records[recordKey(kind, id)] ?? record;
  }

  private open(url: string): void {
    if (!this.active) return;
    this.setState({ status: this.attempt === 0 ? 'connecting' : 'stale' });
    let socket: WebSocket;
    try { socket = new WebSocket(url); }
    catch (error) {
      this.fail(error instanceof Error ? error : new Error('Could not open overlay socket'));
      return;
    }
    this.socket = socket;
    const replay: OverlayFrame[] = [];
    let acknowledged = false;
    let ready = false;
    let subscribedRevision: number | null = null;
    const timeoutMs = this.options.handshakeTimeoutMs ?? 5000;
    this.handshakeTimer = setTimeout(() => {
      if (ready || this.socket !== socket) return;
      this.emitDiagnostic({ code: 'unsupported_server', message: 'The overlay server did not finish SDK V2 setup' });
      socket.close(1002, 'SDK V2 required');
    }, timeoutMs);

    socket.onopen = () => {
      try { socket.send(JSON.stringify(helloFrame(this.subscriptions))); }
      catch (error) { this.fail(error instanceof Error ? error : new Error('Could not send overlay hello')); }
    };
    socket.onmessage = (message) => {
      if (this.socket !== socket) return;
      let raw: unknown;
      try { raw = JSON.parse(String(message.data)); }
      catch { this.emitDiagnostic({ code: 'invalid_frame', message: 'Ignored malformed overlay frame' }); return; }
      if (!acknowledged) {
        const subscribed = readSubscribedFrame(raw);
        if (subscribed) {
          acknowledged = true;
          subscribedRevision = subscribed.revision;
          this.grantedRecords = subscribed.accepted.records;
          this.setState({ revision: subscribed.revision });
          for (const rejection of subscribed.rejected) {
            this.emitDiagnostic({ code: 'subscription_rejected', message: `${rejection.kind} ${rejection.name}: ${rejection.reason}`, subscription: rejection });
          }
          for (const frame of replay) this.acceptEvent(frame);
          return;
        }
        const frame = readEventFrame(raw);
        if (frame && frame.type !== 'sdk.subscribed' && replay.length < 256) replay.push(frame);
        else this.emitDiagnostic({ code: 'invalid_frame', message: 'Ignored frame before SDK V2 acknowledgement' });
        return;
      }
      const done = readReadyFrame(raw);
      if (done) {
        if (done.revision !== subscribedRevision) {
          this.emitDiagnostic({ code: 'invalid_frame', message: 'Ignored mismatched SDK ready frame' });
          return;
        }
        if (!ready) {
          ready = true;
          this.clearHandshakeTimer();
          this.attempt = 0;
          this.setState({ status: 'ready' });
          this.pending?.resolve();
          this.pending = null;
          this.startRecordRefresh(socket);
        }
        return;
      }
      if (typeof raw === 'object' && raw !== null && 'type' in raw &&
        (raw.type === 'sdk.ready' || raw.type === 'sdk.subscribed')) {
        this.emitDiagnostic({ code: 'invalid_frame', message: 'Ignored invalid SDK control frame' });
        return;
      }
      const frame = readEventFrame(raw);
      if (frame) this.acceptEvent(frame);
      else this.emitDiagnostic({ code: 'invalid_frame', message: 'Ignored malformed overlay frame' });
    };
    socket.onerror = () => this.emitDiagnostic({ code: 'connection_error', message: 'Overlay connection error' });
    socket.onclose = (event) => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.clearHandshakeTimer();
      this.clearRecordTimer();
      if (!this.active) return;
      this.setState(event.code === 1008
        ? { status: 'expired', variables: {}, records: {} }
        : { status: 'stale' });
      this.emitDiagnostic({ code: 'connection_closed', message: `Overlay connection closed (${event.code})` });
      if (event.code === 1008) this.emitDiagnostic({ code: 'access_expired', message: 'Overlay access expired or was revoked' });
      if (!ready) {
        this.pending?.reject(new Error('Overlay SDK V2 handshake failed'));
        this.pending = null;
      }
      if (event.code === 1008 || this.options.reconnect === false) { this.active = false; return; }
      const delay = Math.min(30_000, 500 * 2 ** Math.min(this.attempt++, 6));
      this.retryTimer = setTimeout(() => this.open(url), delay);
    };
  }

  private fail(error: Error): void {
    this.pending?.reject(error);
    this.pending = null;
    this.stop();
  }

  private clearHandshakeTimer(): void {
    if (this.handshakeTimer) clearTimeout(this.handshakeTimer);
    this.handshakeTimer = null;
  }

  private clearTimers(): void {
    this.clearHandshakeTimer();
    this.clearRecordTimer();
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  private startRecordRefresh(socket: WebSocket): void {
    this.clearRecordTimer();
    if (this.grantedRecords.length === 0) return;
    let refreshing = false;
    const refresh = () => {
      if (refreshing || this.socket !== socket || this.state.status !== 'ready') return;
      refreshing = true;
      void Promise.all(this.grantedRecords.map(async (record) => {
        try {
          const found = await this.readRecord(record.kind, record.id, () => this.socket === socket);
          if (!found && this.socket === socket) this.removeRecord(record.kind, record.id);
        } catch {
          if (this.socket === socket) this.emitDiagnostic({
            code: 'record_unavailable', message: `Could not refresh ${record.kind} ${record.id}`,
          });
        }
      })).finally(() => { refreshing = false; });
    };
    refresh();
    this.recordTimer = setInterval(refresh, this.options.recordRefreshMs ?? 30_000);
  }

  private clearRecordTimer(): void {
    if (this.recordTimer) clearInterval(this.recordTimer);
    this.recordTimer = null;
  }
}

/** Create a connection. Register handlers, then call start(). */
export function createOverlay(subscriptions: Subscriptions, options: OverlayOptions = {}): OverlayReader {
  return new LiveOverlay(subscriptions, options);
}
