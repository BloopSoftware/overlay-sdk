/** The wire frame (mirrored by hand in src/widgets/validate.ts). */
export interface GiveawayFrame {
  type: 'giveaway';
  event: 'panel' | 'clear';
  giveaway_id: string;
  at: string;
  /** panel only: */
  state?: 'open' | 'closed' | 'drawing';
  /** `draw` for every giveaway that predates prize pools (#843). */
  kind?: 'draw' | 'pool';
  title?: string;
  keyword?: string;
  entries?: number;
  winner_count?: number;
  opened_at?: string | null;
  closes_at?: string | null;
  /** A pool's remaining stock (#843); absent for a `draw`. */
  prizes_left?: number;
  winners?: Array<{ slot: number; login: string; display_name: string; state: string; drawn_at: string; confirm_deadline: string | null; prize?: string }>;
  reveal?: {
    started_at: string;
    slots: number[];
    /** #640: each slot's wheel, for a panel whose draw style is Wheel. */
    wheels?: Array<{ slot: number; entries: number; segments: Array<{ label: string; weight: number }>; target: number; offset: number }>;
  } | null;
  recent?: Array<{ login: string; display_name: string; at: string }>;
}

export interface WheelSegmentView {
  label: string;
  color: string;
  weight: number;
}

/** The wire frame (mirrored by hand in src/widgets/validate.ts). */
export interface WheelSpinFrame {
  type: 'wheel';
  event: 'spin';
  at: string;
  wheel_id: string;
  spin_id: string;
  name: string;
  segments: WheelSegmentView[];
  target: number;
  offset: number;
  turns: number;
  /** The rotation the spin starts from (degrees). */
  from: number;
  started_at: string;
  duration_ms: number;
  lands_at: string;
}

/** The wire frame (checked by hand in src/widgets/validate.ts). */
export interface CreditsRollFrame {
  type: 'credits';
  op: 'roll';
  roll_id: string;
  /** Only the End credits layer with this name (any case); '' is every one. */
  layer: string;
  at: string;
}

/** One row as the frame carries it: only what a row draws, never a viewer id or login. */
export interface EventListEntry {
  /** The row's id, so a renderer can tell a new row from one it shows. */
  id: string;
  kind: 'follow' | 'sub' | 'gift' | 'cheer' | 'raid' | 'redemption';
  /** Display name; "Anonymous" for an anonymous gift. */
  name: string;
  /** Bits, gift count, raid viewers; 1 otherwise. */
  amount: number;
  /** '' | '1000' | '2000' | '3000' | 'Prime' as Twitch sends it. */
  tier: string;
  /** Resub cumulative months; 0 otherwise. */
  months: number;
  /** Redemption title; '' otherwise. */
  reward: string;
  /** ISO occurred_at. */
  at: string;
}

export interface JarEmote {
  provider: EmoteProviderId;
  id: string;
  animated: boolean;
}

export interface JarItem {
  id: string;
  /** `avatar` and `emote` are only ever flow drops (#742). */
  kind: 'cheer' | 'sub' | 'gift' | 'avatar' | 'emote';
  user: string;
  amount: number;
  at: string;
  /** Channel's starter subscriber badge from Helix; omitted when unavailable. */
  badgeId?: string;
  /** An `avatar` item's Twitch CDN picture. */
  image?: string;
  /** An `emote` item's emote, drawn from the id-checked templates. */
  emote?: JarEmote;
}

export interface LeaderboardRow {
  rank: number;
  name: string;
  login: string;
  /** Resolved server-side (`ProfileLookup`); null when there is none, or the source has no avatar to offer. */
  avatarUrl: string | null;
  value: number;
}

export interface QueueViewerView {
  position: number;
  user: string;
  note: string;
}

/** The wire frame (mirrored by hand in src/widgets/validate.ts). */
export interface QueueFrame {
  type: 'queue';
  event: 'sync';
  at: string;
  open: boolean;
  length: number;
  viewers: QueueViewerView[];
}

import type { EmoteProviderId } from './chat.js';

export interface ContributionEntry { user: string; login: string; amount: number }
export interface RecentSupport extends ContributionEntry { kind: 'cheer' | 'sub' | 'gift'; at: string }
export interface ContributionsFrame {
  type: 'contributions'; event: 'follow' | 'sub' | 'gift' | 'cheer' | 'raid' | 'redemption' | 'reset' | 'sync';
  stream_started_at: string | null; version: number;
  follows: ContributionEntry[]; subs: ContributionEntry[]; gifts: ContributionEntry[]; cheers: ContributionEntry[];
  raids: ContributionEntry[]; redemptions: ContributionEntry[]; recent?: RecentSupport[];
  top_cheerer: ContributionEntry | null; top_gifter: ContributionEntry | null; demo?: boolean;
}
export interface EventListFrame { type: 'eventlist'; version: number; events: EventListEntry[]; demo?: boolean }
export interface JarFrame { type: 'jar'; stream_started_at: string | null; cleared_at: string | null; version: number; items: JarItem[]; demo?: boolean }
export interface LeaderboardFrame { type: 'leaderboard'; board: string; entries: LeaderboardRow[]; version: number; demo?: boolean }
export type WheelFrame = WheelSpinFrame | { type: 'wheel'; event: 'changed'; wheel_id: string; at: string };
