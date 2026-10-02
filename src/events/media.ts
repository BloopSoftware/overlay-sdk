export interface MediaShareStateFrame {
  type: 'mediashare';
  op: 'state';
  at: string;
  paused: boolean;
  holder: string | null;
  ack: string | null;
  current: { request_id: string; video_id: string; title: string; requester: string; duration_s: number } | null;
}

export type MediaSharePlayerReport =
  /** `unanswered`: this boot has reported for a while and never seen the server's answer; the server answers it again and ends nothing. */
  | { op: 'ready'; sourceId: string; boot: string; unanswered?: true }
  | { op: 'started' | 'ended'; sourceId: string; requestId: string }
  | { op: 'failed'; sourceId: string; requestId: string; code: number };

/** The wire frame (checked in src/widgets/validate.ts). */
export interface ClipPlayFrame {
  type: 'clip';
  op: 'play';
  /** This play's own id, so a page never plays one delivery twice. */
  id: string;
  slug: string;
  title: string;
  broadcaster_name: string;
  duration_ms: number;
  /** The clip's own file (#1239): only ever a URL `isClipMediaUrl` accepts. */
  media_url?: string;
}


export type ClipFrame = ClipPlayFrame | { type: 'clip'; op: 'sample' };
export type MediaShareFrame = MediaShareStateFrame | { type: 'mediashare'; op: 'sample' };
