/** A wire timestamp: ISO text or epoch milliseconds. */
export type EventTime = string | number;
export interface PollChoice { id: string; title?: string; votes?: number }
export type PollFrame = { type: 'poll'; id?: string; ends?: EventTime; status?: 'completed' | 'terminated' | 'archived' } & (
  | { event: 'begin'; title: string; choices: PollChoice[] }
  | { event: 'progress' | 'end'; title?: string; choices?: PollChoice[] }
);
export interface PredictionOutcome {
  id: string; title?: string; color?: 'blue' | 'pink'; users?: number; channel_points?: number;
  top_predictors?: Array<{ user_name?: string; channel_points_used?: number; channel_points_won?: number | null }>;
}
export type PredictionFrame = { type: 'prediction'; id?: string; locks_at?: EventTime } & (
  | { event: 'begin'; title: string; outcomes: PredictionOutcome[] }
  | { event: 'progress' | 'lock'; title?: string; outcomes?: PredictionOutcome[] }
  | { event: 'end'; status: 'resolved'; winning_outcome_id: string; title?: string; outcomes?: PredictionOutcome[] }
  | { event: 'end'; status: 'canceled'; title?: string; outcomes?: PredictionOutcome[] }
);
export type GoalType = 'follow' | 'subscription' | 'subscription_count' | 'new_subscription' | 'new_subscription_count' | 'new_bit' | 'new_cheerer';
export type GoalFrame = { type: 'goal'; goal_type: GoalType; current_amount: number; id?: string; description?: string; is_achieved?: boolean } & (
  | { event: 'begin'; target_amount: number }
  | { event: 'progress' | 'end'; target_amount?: number }
);
export interface HypeTrainFrame {
  type: 'hypetrain'; event: 'begin' | 'progress' | 'levelup' | 'end'; level: number;
  progress?: number; goal?: number; total?: number; amount?: number; expires?: EventTime;
  name?: string; kind?: string; kicker?: string; sub?: string;
}
export type AdBreakFrame = { type: 'adbreak'; started_at?: EventTime; is_automatic?: boolean } & (
  | { event: 'begin'; duration_seconds: number }
  | { event: 'upcoming'; next_ad_at: EventTime; duration_seconds?: number }
  | { event: 'snooze' | 'end'; duration_seconds?: number; next_ad_at?: EventTime }
);
export type Money = number | { value: number; decimal_places: number; currency: string };
export type CharityFrame = { type: 'charity'; charity_logo?: string } & (
  | { event: 'begin'; charity_name: string; current_amount: Money; target_amount: Money }
  | { event: 'progress' | 'end'; charity_name?: string; current_amount?: Money; target_amount?: Money }
  | { event: 'donate'; user_name: string; amount: Money }
);
