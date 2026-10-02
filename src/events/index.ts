import type { AdBreakFrame, CharityFrame, GoalFrame, HypeTrainFrame, PollFrame, PredictionFrame } from './polls.js';
import type { FollowFrame, SubFrame, ResubFrame, GiftFrame, CheerFrame, RaidFrame } from './alerts.js';
import type { ChatFrame, ChatHighlightFrame, EmoteRainFrame } from './chat.js';
import type { ContributionsFrame, CreditsRollFrame, EventListFrame, GiveawayFrame, JarFrame, LeaderboardFrame, QueueFrame, WheelFrame } from './activity.js';
import type { ClipFrame, MediaShareFrame } from './media.js';
import type { MinigamesPlayFrame, MinigamesRoundsFrame, MinigamesSoundFrame } from './minigames.js';
import type { StageAlertFrame, StageMediaFrame, StageMinigameFrame } from './stage.js';
import type { CountdownFrame, SlideshowFrame, TickerLineFrame } from './timers.js';

/** Names of live frames available to normal Bloopbot widgets. */
export const EVENT_FAMILIES = [
  'adbreak', 'charity', 'chat', 'chathighlight', 'cheer', 'clip', 'contributions',
  'countdown', 'credits', 'custom', 'emotewall', 'eventlist', 'follow', 'gift', 'giveaway',
  'goal', 'hypetrain', 'jar', 'leaderboard', 'mediashare', 'minigames', 'poll', 'prediction',
  'queue', 'raid', 'resub', 'slideshow', 'stage.alert', 'stage.media',
  'stage.minigame', 'sub', 'tickerline', 'wheel',
] as const;
export type EventFamily = (typeof EVENT_FAMILIES)[number];
/** An unknown/additive raw frame. Named event callbacks use EventFrame instead. */
export interface OverlayFrame { type: string; [field: string]: unknown }
/** A flow author's custom message supplies its own JSON fields. */
export interface CustomFrame { type: 'custom'; name: string; data: Record<string, unknown> }
export interface EventFrameMap {
  adbreak: AdBreakFrame; charity: CharityFrame; chat: ChatFrame; chathighlight: ChatHighlightFrame;
  cheer: CheerFrame; clip: ClipFrame; contributions: ContributionsFrame; countdown: CountdownFrame;
  credits: CreditsRollFrame; custom: CustomFrame; emotewall: EmoteRainFrame; eventlist: EventListFrame;
  follow: FollowFrame; gift: GiftFrame; giveaway: GiveawayFrame; goal: GoalFrame; hypetrain: HypeTrainFrame;
  jar: JarFrame; leaderboard: LeaderboardFrame; mediashare: MediaShareFrame;
  minigames: MinigamesPlayFrame | MinigamesRoundsFrame | MinigamesSoundFrame;
  poll: PollFrame; prediction: PredictionFrame; queue: QueueFrame; raid: RaidFrame; resub: ResubFrame;
  slideshow: SlideshowFrame; 'stage.alert': StageAlertFrame; 'stage.media': StageMediaFrame;
  'stage.minigame': StageMinigameFrame; sub: SubFrame; tickerline: TickerLineFrame; wheel: WheelFrame;
}
/** Known fields are typed; future additive fields remain unknown until narrowed. */
export type EventFrame<F extends EventFamily = EventFamily> = EventFrameMap[F] & OverlayFrame;
export type EventServerFrame = EventFrame<EventFamily>;
export type * from './alerts.js';
export type * from './chat.js';
export type * from './polls.js';
export type * from './activity.js';
export type * from './media.js';
export type * from './timers.js';
export type * from './stage.js';
export type * from './minigames.js';
