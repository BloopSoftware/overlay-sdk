/** Names of live frames available to normal Bloopbot widgets. */
export const EVENT_FAMILIES = [
  'adbreak', 'charity', 'chat', 'chathighlight', 'cheer', 'clip', 'contributions',
  'countdown', 'credits', 'custom', 'emotewall', 'eventlist', 'follow', 'gift', 'giveaway',
  'goal', 'hypetrain', 'jar', 'leaderboard', 'minigames', 'poll', 'prediction',
  'queue', 'raid', 'resub', 'slideshow', 'stage.alert', 'stage.media',
  'stage.minigame', 'sub', 'tickerline', 'wheel',
] as const;

export type EventFamily = (typeof EVENT_FAMILIES)[number];
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

export interface OverlayFrame {
  type: string;
  [field: string]: unknown;
}

export interface OverlayRecord {
  kind: RecordKind;
  id: string;
  revision: number;
  data: unknown;
}

export type ConnectionStatus = 'idle' | 'connecting' | 'ready' | 'stale' | 'expired' | 'stopped';

export interface OverlayState {
  status: ConnectionStatus;
  revision: number | null;
  variables: Readonly<Record<string, unknown>>;
  records: Readonly<Record<string, OverlayRecord>>;
  lastEventAt: number | null;
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
  onEvent(family: EventFamily, handler: (frame: OverlayFrame) => void): Unsubscribe;
  onState(handler: (state: OverlayState) => void): Unsubscribe;
  onDiagnostic(handler: (diagnostic: Diagnostic) => void): Unsubscribe;
  getRecord(kind: RecordKind, id: string): Promise<OverlayRecord | null>;
}
