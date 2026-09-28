import { helloFrame, readEventFrame, readRecord, recordKey } from './protocol.js';
import { OverlayRuntime } from './runtime.js';
import type { OverlayFrame, OverlayReader, OverlayRecord, RecordKind, Subscriptions } from './types.js';

export interface OverlaySimulation extends OverlayReader {
  emit(frame: OverlayFrame): void;
  setVariables(values: Record<string, unknown>): void;
  setRecord(record: OverlayRecord): void;
}

class LocalSimulation extends OverlayRuntime implements OverlaySimulation {
  private running = false;

  constructor(private readonly subscriptions: Subscriptions) {
    super();
    helloFrame(subscriptions);
  }

  async start(): Promise<void> {
    this.running = true;
    this.setState({ status: 'ready', revision: 0 });
  }

  stop(): void {
    this.running = false;
    this.setState({ status: 'stopped' });
  }

  emit(frame: OverlayFrame): void {
    if (!this.running) throw new Error('Start the overlay simulation before emitting events');
    const valid = readEventFrame(frame);
    if (!valid) throw new TypeError('Invalid overlay frame');
    const family = valid.type === 'stage'
      ? valid.kind === 'media' ? 'stage.media' : valid.kind === 'minigame' ? 'stage.minigame' : 'stage.alert'
      : valid.type;
    if (family !== 'vars' && !new Set<string>(this.subscriptions.events).has(family)) {
      throw new Error(`Event ${family} was not subscribed`);
    }
    this.acceptEvent(valid);
  }

  setVariables(values: Record<string, unknown>): void {
    const granted = Object.fromEntries(Object.entries(values).filter(([key]) => this.subscriptions.variables?.includes(key)));
    this.emit({ type: 'vars', values: granted });
  }

  async getRecord(kind: RecordKind, id: string): Promise<OverlayRecord | null> {
    if (!this.subscriptions.records?.some((record) => record.kind === kind && record.id === id)) {
      throw new Error('Record was not subscribed');
    }
    return this.state.records[recordKey(kind, id)] ?? null;
  }

  setRecord(value: OverlayRecord): void {
    if (!this.running) throw new Error('Start the overlay simulation before setting records');
    const record = readRecord(value);
    if (!record) throw new TypeError('Invalid overlay record');
    if (!this.subscriptions.records?.some((request) => request.kind === record.kind && request.id === record.id)) {
      throw new Error('Record was not subscribed');
    }
    this.applyRecord(record);
  }
}

/** Explicit, local-only test source. It never opens a network connection. */
export function createSimulation(subscriptions: Subscriptions): OverlaySimulation {
  return new LocalSimulation(subscriptions);
}
