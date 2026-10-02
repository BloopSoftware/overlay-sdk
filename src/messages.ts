/** Wire envelopes, separate from the SDK's local state and event payloads. */
import type { EventServerFrame } from './events/index.js';
import type { AcceptedSubscriptions, OverlayRecord, OverlayValue, RejectedSubscription, RecordRequest } from './types.js';

/** Client → server. An unknown record kind is well-shaped but rejected by authorization. */
export interface HelloFrame<R extends {kind: string; id: string} = RecordRequest> {
  hello: 'overlay-sdk'; version: 2;
  subscribe: Omit<AcceptedSubscriptions, 'records'> & { records: R[] };
}
/** Server → client before snapshot replay. */
export interface SubscribedFrame { type: 'sdk.subscribed'; version: 2; revision: number; accepted: AcceptedSubscriptions; rejected: RejectedSubscription[] }
/** Server → client after snapshot replay. */
export interface ReadyFrame { type: 'sdk.ready'; version: 2; revision: number }
export interface VariablesFrame { type: 'vars'; values: Record<string, OverlayValue> }
export type RecordFrame = { [K in RecordRequest['kind']]: { type: 'sdk.record' } & OverlayRecord<K> }[RecordRequest['kind']];
/** Hosted surface document changed; re-fetch doc.json. */
export interface ConfigFrame { type: 'config'; rev: number }
export type ServerFrame = EventServerFrame | SubscribedFrame | ReadyFrame | VariablesFrame | RecordFrame | ConfigFrame;
/** Named SDK overlays are read-only: the hello is their only accepted outbound message. */
export type SdkClientFrame = HelloFrame;
/** Legacy widget-token clients; not accepted on named SDK overlay connections. */
export interface WidgetHelloFrame { hello: string; version: number; pages?: string[]; vars?: string[]; stage?: boolean; designs?: string[]; media?: boolean }
/** These reports require a hosted-widget connection with the corresponding layer. */
export type HostedReportFrame =
  | { type: 'credits'; op: 'finished'; roll_id: string; layer?: string }
  | { type: 'minigames'; op: 'finished'; play_id: string }
  | { type: 'mediashare'; op: 'ready'; source_id: string; boot: string; unanswered?: true }
  | { type: 'mediashare'; op: 'started' | 'ended'; source_id: string; request_id: string }
  | { type: 'mediashare'; op: 'failed'; source_id: string; request_id: string; code: number };
export type ClientFrame = SdkClientFrame | WidgetHelloFrame | HostedReportFrame;
export type RecordResponse = OverlayRecord | { error: 'not_found' | 'record_unavailable' };
