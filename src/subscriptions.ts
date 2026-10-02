import type { EventFamily } from './events/index.js';


export type RecordKind = 'widget' | 'giveaway' | 'nowplaying' | 'alert_design' | 'theme';

export type BoardKey = 'loyalty' | `contrib:${'cheers' | 'gifts' | 'total'}:${'stream' | 'alltime'}` | `var:${string}`;


export interface RecordRequest {
  kind: RecordKind;
  id: string;
}


export interface Subscriptions {
  events: readonly EventFamily[];
  variables?: readonly string[];
  messages?: readonly string[];
  boards?: readonly BoardKey[];
  records?: readonly RecordRequest[];
}


export interface AcceptedSubscriptions {
  events: string[];
  variables: string[];
  messages: string[];
  boards: string[];
  records: RecordRequest[];
}


export interface RejectedSubscription {
  kind: 'event' | 'variable' | 'message' | 'board' | 'record';
  name: string;
  reason: 'unknown' | 'not_granted';
}