// Generated from published server record DTOs by scripts/overlay-record-types.mjs.
import type { MotionOptions, Motion, MotionEffect } from './widget.js';

/** One named look an alert can be played with. Lives in the channel's alert design record. */
export interface StageDesign {
    /** Slug, 1–32 of a-z 0-9 - _, unique within the document. */
    name: string;
    title: string;
    subtitle: string;
    showMessage: boolean;
    image?: string;
    sound?: string;
    video?: string;
    volume: number;
    durationMs: number;
    animateIn: AlertAnimation;
    animateOut: AlertAnimation;
    /**
     * Where the card's picture comes from (#246): the library `image`, the
     * Twitch profile picture of whoever the alert is about, or nothing. Absent
     * reads as `library` when `image` is set and `none` otherwise
     * (`designImageSource`), so designs saved before it are unchanged. A
     * `video` still replaces the picture, whatever this says.
     */
    imageSource?: StageImageSource;
    /** How an avatar is cut. Absent: `circle`. */
    avatarShape?: StageAvatarShape;
    /** A media-library image drawn when there is no avatar to show (anonymous, unknown, too slow). */
    avatarFallback?: string;
    /** On a gifted sub, whose picture: the gifter's or the recipient's. Absent: `gifter`. */
    avatarGift?: StageAvatarGift;
    /** Picture and words arrangement; absent keeps the original beside layout. */
    layout?: StageAlertLayout;
    /** Picture width in CSS pixels. Absent keeps the original 128 px. */
    imageSizePx?: number;
    /** Offsets from the ordinary beside positions, used by the manual layout. */
    imageOffsetX?: number;
    imageOffsetY?: number;
    textOffsetX?: number;
    textOffsetY?: number;
    /**
     * The Free layout (#1135): the card's own size, and where each piece
     * sits inside it, in whole CSS px from the card's inner (padding-box)
     * top-left. Required when `layout` is `free`; kept, and ignored, with any
     * other layout, so flipping layouts to compare never loses an arrangement.
     */
    card?: StageAlertCard;
    pieces?: StageAlertPieces;
    /**
     * Motion (#612; src/hosted/motion.ts). `animateIn`/`animateOut` name the
     * effect; these carry its direction, duration (100–3000 ms, default 400)
     * and easing. `animateText` animates the words on their own, `textDelayMs`
     * after the card has come in. Every one is optional: a design saved before
     * motion existed draws exactly as it did. In + out + text delay never
     * exceed `durationMs`, the alert's whole time on screen.
     */
    animateInOptions?: MotionOptions;
    animateOutOptions?: MotionOptions;
    animateText?: Motion;
    textDelayMs?: number;
}

export type AlertAnimation = MotionEffect;

export type StageImageSource = (readonly [
    "library",
    "avatar",
    "none"
])[number];

export type StageAvatarShape = (readonly [
    "circle",
    "rounded"
])[number];

export type StageAvatarGift = (readonly [
    "gifter",
    "recipient"
])[number];

export type StageAlertLayout = (readonly [
    "beside",
    "above",
    "over",
    "manual",
    "free"
])[number];

export interface StageAlertCard {
    width: number;
    height: number;
}

export interface StageAlertPieces {
    image?: StageImagePieceBox;
    title?: StagePieceBox;
    subtitle?: StagePieceBox;
    message?: StagePieceBox;
}

export interface StageImagePieceBox extends StagePieceBox {
    height: number;
}

/** A text piece's box: its height is whatever its words need. */
export interface StagePieceBox {
    x: number;
    y: number;
    width: number;
}
