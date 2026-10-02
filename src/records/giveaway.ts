// Generated from published server record DTOs by scripts/overlay-record-types.mjs.


export interface GiveawayRecord {
    id: string;
    channelId: string;
    state: GiveawayState;
    kind: GiveawayKind;
    title: string;
    slug: string;
    description: string;
    /** Cover art for the prize: a `widget_assets` id, or null. Migration 051. */
    prizeAssetId: string | null;
    winnerCount: number;
    entryChannels: EntryChannel[];
    keyword: string;
    ticketCost: number;
    maxTickets: number;
    firstTicketFree: boolean;
    subLuck: number;
    vipLuck: number;
    regularLuck: number;
    eligibility: EligibilityRules;
    claim: ClaimRules;
    /** Donation intake settings; `null` on a `draw`. */
    pool: PoolSettings | null;
    opensAt: string | null;
    closesAt: string | null;
    openedAt: string | null;
    closedAt: string | null;
    completedAt: string | null;
    cancelledAt: string | null;
    archivedAt: string | null;
    entryCount: number;
    totalTickets: number;
    totalPointsSpent: number;
    createdAt: string;
    updatedAt: string;
}

export type GiveawayState = 'draft' | 'open' | 'closed' | 'drawing' | 'completed' | 'cancelled' | 'archived';

/** `draw` is the original entries-and-a-drawing giveaway; `pool` is a mod-awarded prize pool (spec §1). Fixed at creation. */
export type GiveawayKind = 'draw' | 'pool';

export type EntryChannel = 'chat' | 'web';

export interface EligibilityRules {
    follow: boolean;
    minFollowDays: number;
    roles: GiveawayRole[] | null;
    minWatchMinutes: number;
}

export type GiveawayRole = 'sub' | 'vip' | 'regular';

export interface ClaimRules {
    confirm: {
        mode: ConfirmMode;
        word: string;
        timeoutSec: number;
    };
    /** Starts when a slot becomes `confirmed`; only used with `delivery: 'page'` (V5). */
    claimBy: {
        withinSec: number;
    } | null;
    autoReroll: boolean;
    /** Absent on a record stored before SP3 — read as `chat` (`rowToRecord`). */
    delivery: ClaimDelivery;
}

/**
 * `page` (SP3 V4) confirms by claiming on the claim page, in one step; it is
 * only valid with `delivery: 'page'`, and its window may run to 7 days.
 */
export type ConfirmMode = 'chat' | 'none' | 'page';

/**
 * How a winner gets their prize (SP3 V3): `chat` is SP1's behaviour —
 * confirming IS claiming, nothing leaves the vault — and `page` means a
 * confirmed winner still has to claim on `/c/<login>/claim`, which is what
 * hands them a vault prize.
 */
export type ClaimDelivery = 'chat' | 'page';

/** `giveaways.pool` (migration 093): donation intake for a pool, `null` on a draw. */
export interface PoolSettings {
    donations: {
        accept: boolean;
        mode: 'approve' | 'instant';
    };
}
