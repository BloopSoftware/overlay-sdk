/** Raw alert fields from the channel widget stream. */
export interface AlertFields {
  name: string;
  message?: string;
  kicker?: string;
  tail?: string;
  tier?: '1000' | '2000' | '3000' | 'Prime' | 'prime' | 1 | 2 | 3;
  months?: number;
  amount?: number;
  viewers?: number;
  color?: 'red' | 'mint' | 'butter' | 'lilac';
}
export type FollowFrame = AlertFields & { type: 'follow' };
export type SubFrame = AlertFields & { type: 'sub' };
export type ResubFrame = AlertFields & { type: 'resub' };
export type GiftFrame = AlertFields & { type: 'gift' };
export type CheerFrame = AlertFields & { type: 'cheer' };
export type RaidFrame = AlertFields & { type: 'raid' };
