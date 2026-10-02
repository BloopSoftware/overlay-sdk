/** The message as the layer draws it: a chat message frame without the parts that only a chat box uses. */
export interface ChatHighlightMessage {
  id: string;
  userId: string;
  login: string;
  name: string;
  colour?: string;
  badges?: ChatBadgeRef[];
  fragments: ChatFragment[];
  flags?: ChatFlags;
}

/** The wire frame. `message: null` takes whatever is up down. */
export interface ChatHighlightFrame {
  type: 'chathighlight';
  at: string;
  message: ChatHighlightMessage | null;
  until: string | null;
}

/* ------------------------------------------------------------------ *
 * Frames
 * ------------------------------------------------------------------ */

/**
 * One piece of a message. `text` carries what the viewer typed (the renderer
 * writes it with `textContent`); `emote` carries an id the renderer turns into
 * a URL with `emoteImageUrl` and nothing else.
 */
export type ChatFragment =
  | { type: 'text'; text: string }
  | { type: 'mention'; text: string; userId?: string }
  | { type: 'cheer'; text: string; bits: number }
  | {
      type: 'emote';
      provider: EmoteProviderId;
      id: string;
      /** The code as typed, used as the image's alt text and as the fallback when the id is refused. */
      name: string;
      /** 7TV overlays: draws on top of the fragment before it instead of beside it. */
      zeroWidth?: true;
      animated?: true;
    };

/** A badge, already resolved to the Helix image id the CDN template needs. */
export interface ChatBadgeRef {
  /** `subscriber`, `moderator`, … — the renderer's CSS hook and the alt text. */
  set: string;
  id: string;
  /** The Helix badge-set image id. Absent when the set could not be resolved; the badge is then not drawn. */
  img?: string;
}

/**
 * Facts about a message the widget cannot work out for itself. `command` and
 * `link` are deliberately NOT here — the widget derives those from the
 * fragments it already has (see the spec's "What is hidden, and where").
 */
export interface ChatFlags {
  /** First message this viewer has ever sent in the channel (`user_intro`). */
  first?: true;
  sub?: true;
  mod?: true;
  vip?: true;
  /** Channel-points highlighted, or a power-up. */
  highlight?: true;
  /** A `/me` message. */
  action?: true;
  /** A known bot account, or this channel's own bot. */
  bot?: true;
  /** Arrived through shared chat from another channel; see `source`. */
  shared?: true;
}

export interface ChatMessageFrame {
  type: 'chat';
  op: 'message';
  /** Twitch's `message_id`; what `delete` refers to. */
  id: string;
  /** Server clock, ms epoch. The widget uses it for lifetimes, never the browser's own. */
  ts: number;
  userId: string;
  login: string;
  /** Display name; falls back to the login when Twitch sends none. */
  name: string;
  /**
   * Set on the scrollback a socket is handed when it connects (never on a
   * live message): a chat box draws it, an Emote Wall skips it so a reload
   * never replays old emotes (src/chat/connections.ts, bloopbot #642).
   */
  catchUp?: true;
  /** `#RRGGBB` as Twitch sent it. Absent when the viewer never picked one. */
  colour?: string;
  badges?: ChatBadgeRef[];
  fragments: ChatFragment[];
  flags?: ChatFlags;
  /** Shared chat: the channel the message was actually typed in. */
  source?: { id: string; name: string };
  /** A reply: the parent message's id and the name being replied to. */
  reply?: { id: string; name: string };
  bits?: number;
}

/**
 * The chat family. `delete`, `purge` and `clear` are moderation and take
 * effect at once; they are never rate-limited, coalesced or dropped.
 * `highlight`, `decorate` and `hide` are what a flow drives (docs/chat-widget.md,
 * `chat.highlight` / `chat.decorate` / `chat.hide`): the first two are screen
 * state and the third is a removal, so it rides the moderation path with the
 * rest.
 *
 * Every frame carries `op` and nothing else distinguishes them.
 */
export type ChatFrame =
  | ChatMessageFrame
  | { type: 'chat'; op: 'delete'; id: string }
  | { type: 'chat'; op: 'purge'; userId: string }
  | { type: 'chat'; op: 'clear' }
  /**
   * Pin (`on: true`) or unpin one message on the screen (`chat.highlight`).
   * `on` is required rather than defaulted: the frame is what a log and a
   * third-party widget read, and "which direction" is not something to guess.
   */
  | { type: 'chat'; op: 'highlight'; id: string; on: boolean }
  /**
   * A short text badge beside one message (`chat.decorate`). `label` is drawn
   * with `textContent` and is never markup, never a URL. `first` asks the widget
   * to draw it only when the message is the viewer's first in the channel, which
   * is the fact `flags.first` already carries on the message frame.
   */
  | { type: 'chat'; op: 'decorate'; id: string; label: string; first?: true }
  /**
   * A flow's own moderation (`chat.hide`): the message leaves the screen and
   * never comes back — it is also removed from the catch-up history and blocked
   * while it is still in flight, the way a delete is.
   */
  | { type: 'chat'; op: 'hide'; id: string };

export type EmoteProviderId = 'twitch' | 'bttv' | 'ffz' | '7tv';

export interface RainEmote { provider: EmoteProviderId; id: string; animated?: boolean }
export interface EmoteRainFrame { type: 'emotewall'; op: 'rain'; at: string; count: number; emotes: RainEmote[]; layer?: string }
