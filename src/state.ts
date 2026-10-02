import type { RecordDataMap } from './records/index.js';
import type { EventFamily, EventFrame } from './events/index.js';
import type { RecordKind, RejectedSubscription } from './subscriptions.js';


export type OverlayValue = string | number | boolean | null;


export interface OverlayRecord<K extends RecordKind = RecordKind> {
  readonly kind: K;
  readonly id: string;
  readonly revision: number;
  readonly data: RecordKind extends K ? unknown : RecordDataMap[K];
}


export type ConnectionStatus = 'idle' | 'connecting' | 'ready' | 'stale' | 'expired' | 'stopped';


export interface OverlayState {
  readonly status: ConnectionStatus;
  readonly revision: number | null;
  readonly variables: Readonly<Record<string, OverlayValue>>;
  readonly records: Readonly<Record<string, OverlayRecord>>;
  readonly lastEventAt: number | null;
}


export interface Diagnostic {
  code: 'subscription_rejected' | 'invalid_frame' | 'connection_closed' | 'connection_error' | 'handler_error' | 'unsupported_server' | 'access_expired' | 'record_unavailable';
  message: string;
  subscription?: RejectedSubscription;
}


export type Unsubscribe = () => void;


export interface OverlayReader {
  readonly state: OverlayState;
  start(): Promise<void>;
  stop(): void;
  onEvent<F extends EventFamily>(family: F, handler: (frame: EventFrame<F>) => void): Unsubscribe;
  onState(handler: (state: OverlayState) => void): Unsubscribe;
  onDiagnostic(handler: (diagnostic: Diagnostic) => void): Unsubscribe;
  getRecord<K extends RecordKind>(kind: K, id: string): Promise<OverlayRecord<K> | null>;
}