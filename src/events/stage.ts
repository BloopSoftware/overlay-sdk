import type { MinigameGame, MinigamePlay } from './minigames.js';
export type StageAlertFields = Partial<Record<'name' | 'amount' | 'months' | 'tier' | 'message' | 'viewers', string | number>>;
export type StageMediaKind = 'image' | 'video' | 'audio';
export interface StageItemBase { id: string; queuedAt: number; durationMs: number; source?: string }
export type StageItem = StageItemBase & (
  | { kind: 'alert'; design: string; fields: StageAlertFields; avatar?: string }
  | { kind: 'media'; media: { url: string; kind: StageMediaKind }; volume: number }
  | { kind: 'minigame'; game: MinigameGame; play: MinigamePlay }
);
export interface StageStopFrame { type: 'stage'; op: 'stop'; id: string }
export type StagePlayFrame = { type: 'stage'; op: 'play'; remainingMs: number } & StageItem;
export type StageFrame = StagePlayFrame | StageStopFrame;
export type StageAlertFrame = Extract<StagePlayFrame, {kind: 'alert'}> | StageStopFrame;
export type StageMediaFrame = Extract<StagePlayFrame, {kind: 'media'}> | StageStopFrame;
export type StageMinigameFrame = Extract<StagePlayFrame, {kind: 'minigame'}> | StageStopFrame;
