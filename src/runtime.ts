import { eventFamily, readRecord, recordKey } from './protocol.js';
import type {
  Diagnostic, EventFamily, EventFrame, OverlayFrame, OverlayReader, OverlayRecord, OverlayState, OverlayValue,
  RecordKind, Unsubscribe,
} from './types.js';

function immutable<T>(value: T): T {
  const snapshot = structuredClone(value);
  const seen = new WeakSet<object>();
  function freeze(item: unknown): void {
    if (!item || typeof item !== 'object' || seen.has(item)) return;
    seen.add(item);
    for (const child of Object.values(item)) freeze(child);
    Object.freeze(item);
  }
  freeze(snapshot);
  return snapshot;
}

/** Shared state and handler rules for live sockets and explicit simulation. */
export abstract class OverlayRuntime implements OverlayReader {
  private current: OverlayState = immutable({ status: 'idle', revision: null, variables: {}, records: {}, lastEventAt: null });
  private readonly events = new Map<string, Set<(frame: OverlayFrame) => void>>();
  private readonly stateHandlers = new Set<(state: OverlayState) => void>();
  private readonly diagnosticHandlers = new Set<(diagnostic: Diagnostic) => void>();

  get state(): OverlayState { return this.current; }
  abstract start(): Promise<void>;
  abstract stop(): void;
  abstract getRecord(kind: RecordKind, id: string): Promise<OverlayRecord | null>;

  onEvent<F extends EventFamily>(family: F, handler: (frame: EventFrame<F>) => void): Unsubscribe {
    const handlers = this.events.get(family) ?? new Set<(frame: OverlayFrame) => void>();
    // acceptEvent dispatches only after eventFamily has selected this family.
    const deliver = (frame: OverlayFrame) => handler(frame as EventFrame<F>);
    handlers.add(deliver);
    this.events.set(family, handlers);
    return () => { handlers.delete(deliver); if (handlers.size === 0) this.events.delete(family); };
  }

  onState(handler: (state: OverlayState) => void): Unsubscribe {
    this.stateHandlers.add(handler);
    return () => { this.stateHandlers.delete(handler); };
  }

  onDiagnostic(handler: (diagnostic: Diagnostic) => void): Unsubscribe {
    this.diagnosticHandlers.add(handler);
    return () => { this.diagnosticHandlers.delete(handler); };
  }

  protected acceptEvent(frame: OverlayFrame): void {
    if (frame.type === 'sdk.record') {
      const record = readRecord(frame);
      if (!record) {
        this.emitDiagnostic({ code: 'invalid_frame', message: 'Ignored malformed record update' });
        return;
      }
      this.applyRecord(record);
      return;
    }
    if (frame.type === 'vars' && typeof frame.values === 'object' && frame.values !== null && !Array.isArray(frame.values)) {
      const values = Object.fromEntries(Object.entries(frame.values).filter((entry): entry is [string, OverlayValue] =>
        entry[1] === null || typeof entry[1] === 'string' || typeof entry[1] === 'boolean' || typeof entry[1] === 'number' && Number.isFinite(entry[1])));
      this.setState({ variables: { ...this.current.variables, ...values } });
    }
    this.setState({ lastEventAt: Date.now() });
    for (const handler of this.events.get(eventFamily(frame)) ?? []) {
      try { handler(structuredClone(frame)); }
      catch { this.emitDiagnostic({ code: 'handler_error', message: 'Overlay event handler failed' }); }
    }
  }

  protected applyRecord(record: OverlayRecord): void {
    const key = recordKey(record.kind, record.id);
    if ((this.current.records[key]?.revision ?? -1) >= record.revision) return;
    this.setState({ records: { ...this.current.records, [key]: record } });
  }

  protected removeRecord(kind: RecordKind, id: string): void {
    const key = recordKey(kind, id);
    if (!(key in this.current.records)) return;
    const records = { ...this.current.records };
    delete records[key];
    this.setState({ records });
  }

  protected setState(update: Partial<OverlayState>): void {
    this.current = Object.freeze({ ...this.current, ...immutable(update) });
    for (const handler of this.stateHandlers) {
      try { handler(this.current); }
      catch { this.emitDiagnostic({ code: 'handler_error', message: 'Overlay state handler failed' }); }
    }
  }

  protected emitDiagnostic(diagnostic: Diagnostic): void {
    for (const handler of this.diagnosticHandlers) {
      try { handler(diagnostic); } catch { /* Diagnostics cannot recurse. */ }
    }
  }
}
