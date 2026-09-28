import { readRecord, recordKey } from './protocol.js';
import type {
  Diagnostic, EventFamily, OverlayFrame, OverlayReader, OverlayRecord, OverlayState,
  RecordKind, Unsubscribe,
} from './types.js';

function familyOf(frame: OverlayFrame): string {
  if (frame.type !== 'stage') return frame.type;
  if (frame.kind === 'media') return 'stage.media';
  if (frame.kind === 'minigame') return 'stage.minigame';
  return 'stage.alert';
}

/** Shared state and handler rules for live sockets and explicit simulation. */
export abstract class OverlayRuntime implements OverlayReader {
  private current: OverlayState = { status: 'idle', revision: null, variables: {}, records: {}, lastEventAt: null };
  private readonly events = new Map<string, Set<(frame: OverlayFrame) => void>>();
  private readonly stateHandlers = new Set<(state: OverlayState) => void>();
  private readonly diagnosticHandlers = new Set<(diagnostic: Diagnostic) => void>();

  get state(): OverlayState { return this.current; }
  abstract start(): Promise<void>;
  abstract stop(): void;
  abstract getRecord(kind: RecordKind, id: string): Promise<OverlayRecord | null>;

  onEvent(family: EventFamily, handler: (frame: OverlayFrame) => void): Unsubscribe {
    const handlers = this.events.get(family) ?? new Set<(frame: OverlayFrame) => void>();
    handlers.add(handler);
    this.events.set(family, handlers);
    return () => { handlers.delete(handler); if (handlers.size === 0) this.events.delete(family); };
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
      this.setState({ variables: { ...this.current.variables, ...frame.values } });
    }
    this.setState({ lastEventAt: Date.now() });
    for (const handler of this.events.get(familyOf(frame)) ?? []) {
      try { handler(frame); }
      catch { this.emitDiagnostic({ code: 'handler_error', message: 'Overlay event handler failed' }); }
    }
  }

  protected applyRecord(record: OverlayRecord): void {
    const key = recordKey(record.kind, record.id);
    if ((this.current.records[key]?.revision ?? -1) >= record.revision) return;
    this.setState({ records: { ...this.current.records, [key]: record } });
  }

  protected setState(update: Partial<OverlayState>): void {
    this.current = { ...this.current, ...update };
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
