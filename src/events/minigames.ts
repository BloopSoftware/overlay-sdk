export interface MinigamePlayerView {
  login: string;
  name: string;
  avatar?: string;
}

/** A play on the wire. Game-specific fields are present for their game only. */
export interface MinigamePlayView {
  id: string;
  game: 'slots' | 'roulette' | 'duel' | 'heist' | 'bet';
  player: MinigamePlayerView;
  wager: number;
  payout: number;
  won: boolean;
  reels?: string[];
  outcome?: string;
  multiplier?: number;
  bet?: string;
  pocket?: number;
  colour?: string;
  opponent?: MinigamePlayerView;
  /** duel: the winner's login; bet: the winning option. */
  winner?: string;
  /** heist (#816): up to 12 of the crew, the whole crew's size and its chance. */
  crew?: MinigamePlayerView[];
  crewCount?: number;
  chance?: number;
  /** bet (#816): the two options, the points and bets on each, and whether it was refunded. */
  options?: string[];
  pools?: number[];
  counts?: number[];
  refunded?: boolean;
}

export interface MinigameRoundView {
  id: string;
  game: string;
  state: string;
  owner: MinigamePlayerView;
  opponent?: MinigamePlayerView;
  wager: number;
  expiresAt: string;
  /** heist and bet (#816): entries and every stake together. */
  count?: number;
  pool?: number;
  /** heist: up to 12 of the crew. */
  crew?: MinigamePlayerView[];
  /** bet: the two options, and the points and bets on each. */
  options?: string[];
  pools?: number[];
  counts?: number[];
}

/** The wire frames (mirrored by hand in src/widgets/validate.ts). */
export interface MinigamesPlayFrame {
  type: 'minigames';
  event: 'play';
  at: string;
  play_id: string;
  started_at: string;
  duration_ms: number;
  play: MinigamePlayView;
}

export interface MinigamesRoundsFrame {
  type: 'minigames';
  event: 'rounds';
  at: string;
  rounds: MinigameRoundView[];
}

/**
 * Play a game sound (#912): a media-library sound for every Minigames layer
 * to play now. It is published straight to the hub and never reduced, so it
 * is in no snapshot and a source that connects later never plays it.
 */
export interface MinigamesSoundFrame {
  type: 'minigames';
  event: 'sound';
  at: string;
  sound_id: string;
  url: string;
  /** 0..1, before each layer's Game volume. */
  volume: number;
}

export interface MinigamePlayer {
  login: string;
  name: string;
  /** A Twitch profile picture on static-cdn.jtvnw.net, or absent (the card draws initials). */
  avatar?: string;
}

interface PlayBase {
  /** The play's id: the stage item's id in a Takeover, a fresh id in a Corner. */
  id: string;
  /** Who played (the duel's challenger). */
  player: MinigamePlayer;
  wager: number;
  /** What the play paid out: `floor(wager × multiplier)`; the duel's pot to the winner. */
  payout: number;
  won: boolean;
}

export interface SlotsPlay extends PlayBase {
  game: 'slots';
  reels: [string, string, string];
  outcome: string;
  multiplier: number;
}

export interface RoulettePlay extends PlayBase {
  game: 'roulette';
  bet: string;
  pocket: number;
  colour: 'red' | 'black' | 'green';
  multiplier: number;
}

export interface DuelPlay extends PlayBase {
  game: 'duel';
  opponent: MinigamePlayer;
  /** The winner's login: `player.login` or `opponent.login`. */
  winner: string;
}

/**
 * A heist (#816): one roll for the whole crew. `player` started it, `wager`
 * is every stake together, `payout` the loot paid out, `won` that the crew
 * got away.
 */
export interface HeistPlay extends PlayBase {
  game: 'heist';
  /** Up to `crewShown` of the crew, in the order they joined. */
  crew: MinigamePlayer[];
  /** The whole crew's size. */
  crewCount: number;
  /** The chance they had, in percent. */
  chance: number;
}

/**
 * A settled bet (#816). `player` opened it, `wager` is the pool, `payout`
 * what was paid out (the pool, whether to the winners or back on a refund),
 * `won` that it paid winners rather than refunding everyone.
 */
export interface BetPlay extends PlayBase {
  game: 'bet';
  /** The two options, as the mod typed them. */
  options: [string, string];
  /** Points on each option, in `options` order. */
  pools: [number, number];
  /** Bets on each option. */
  counts: [number, number];
  /** The option the mod named. */
  winner: string;
  refunded: boolean;
}

export type MinigamePlay = SlotsPlay | RoulettePlay | DuelPlay | HeistPlay | BetPlay;

export type MinigameGame = 'slots' | 'roulette' | 'duel' | 'heist' | 'bet';
