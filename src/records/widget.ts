// Generated from published server record DTOs by scripts/overlay-record-types.mjs.
import type { StageDesign } from './design.js';

export interface StoredWidget {
    id: string;
    channelId: string;
    key: string;
    /**
     * A DERIVED label: the first layer's type, or `label` for an empty surface
     * (`deriveRowKind`). Not authoritative — every reader that needs to know what
     * a widget draws asks the LAYERS — but kept because it already exists, is
     * `NOT NULL`, and several wire shapes would rather not change at once.
     */
    kind: WidgetKind;
    name: string;
    /**
     * Always a version-5 surface: a row holding v4, v3, v2 or v1 is migrated on read,
     * so every consumer (the panel, the editor, `/w/<key>`'s `doc.json`, the Stage
     * resolver) sees one shape. The row itself is not rewritten — see
     * `rowToStoredWidget` and the surface-without-a-type spec §4.3.
     */
    doc: WidgetDoc;
    rev: number;
    createdAt: string;
    updatedAt: string;
    /**
     * How many retired Alert box layers the read dropped from the stored row
     * (#233, `migrateDocReport`). The row itself still holds them until the next
     * save, which is why the editor can show its one-time notice until then.
     * Absent when nothing was dropped.
     */
    retiredLayers?: number;
    /** When OBS first opened this overlay (phase 5 setup checklist); null until then. Absent on a hand-built value. */
    obsSeenAt?: string | null;
}

export type WidgetKind = (readonly [
    "label",
    "goalbar",
    "eventstack",
    "stage",
    "chat",
    "nowplaying",
    "giveaway",
    "media",
    "poll",
    "countdown",
    "image",
    "shape",
    "leaderboard",
    "slideshow",
    "credits",
    "emotewall",
    "chathighlight",
    "boss",
    "wheel",
    "jar",
    "ticker",
    "queue",
    "minigames",
    "clock",
    "socials",
    "eventlist",
    "clip",
    "mediashare",
    "graphics"
])[number];

/**
 * Any document version. The store serves v6; a v5, v4, v3, v2 or v1 row is
 * migrated on read (see `migrateDoc`).
 */
export type WidgetDoc<S = unknown> = WidgetDocV1<S> | WidgetDocV2<S> | WidgetDocV3<S> | WidgetDocV4<S> | WidgetDocV5<S> | WidgetDocV6<S>;

/**
 * Version 1: one frame and one settings block at the document level. Rows in
 * the `widgets` table still hold this shape until their next save, and it
 * stays fully valid input — see the migration in `migrateDoc`.
 */
export interface WidgetDocV1<S = unknown> {
    version: 1;
    kind: WidgetKind;
    frame: WidgetFrame;
    theme: WidgetTheme;
    settings: S;
    customCss?: string;
}

export interface WidgetFrame {
    anchor: (readonly [
        "top-left",
        "top",
        "top-right",
        "left",
        "center",
        "right",
        "bottom-left",
        "bottom",
        "bottom-right"
    ])[number];
    x: number;
    y: number;
    width: number;
    scale: number;
    /**
     * Optional fixed box height (editor tools phase, #613). Absent means
     * content-sized, exactly as every frame behaved before this field existed —
     * every older document stays valid input and unchanged in meaning. When
     * present the layer is a fixed `width`×`height` box; how content fills it
     * (clipped or fitted) is each kind's own rendering rule (phase 4, #614).
     */
    height?: number;
    /**
     * Optional rotation in degrees, -180..180, around the frame's own centre
     * (its `width`×`height` box, or `width`×the content's painted height when
     * `height` is absent). Absent means no rotation, exactly as every frame
     * behaved before this field existed.
     */
    rotation?: number;
    /**
     * Optional: where the content sits inside a `height` box taller than it
     * (#1326). Absent means top, exactly as every frame behaved before this
     * field existed, and a stored frame never holds `'top'`. Without a
     * `height` it is kept but does nothing; the kinds in
     * `VALIGN_IGNORED_KINDS` ignore it.
     */
    valign?: FrameValign;
}

export type FrameValign = (readonly [
    "top",
    "middle",
    "bottom"
])[number];

export interface WidgetTheme {
    font: (readonly [
        "system",
        "rounded",
        "serif",
        "mono",
        "display",
        "inter",
        "bloop"
    ])[number];
    text: string;
    accent: string;
    panel: string;
    panelOpacity: number;
    radius: number;
    shadow: boolean;
    /** Optional additions keep existing saved widgets visually unchanged. */
    design?: (readonly [
        "classic",
        "studio",
        "capsule",
        "scoreboard",
        "minimal"
    ])[number];
    /** Bubble line geometry. Absent keeps the original full-width lines. */
    chatBubbleWidth?: (readonly [
        "full",
        "content"
    ])[number];
    paddingX?: number;
    paddingY?: number;
    borderWidth?: number;
    borderColor?: string;
    fontWeight?: number;
    lineHeight?: number;
    letterSpacing?: number;
    /**
     * An optional web font drawn over the top of `font`, which stays REQUIRED
     * as the fallback stack: a widget whose family does not exist, or whose OBS
     * machine cannot reach Google, still renders its text. Absent on every
     * document stored before web fonts existed, and the document `version`
     * stays 1 because the key is purely additive.
     *
     * `webFont.weight` only picks which cut of the family is DOWNLOADED. The
     * weight actually painted is `theme.fontWeight` when the streamer has set
     * one, so the styling controls stay in charge of the look; see
     * ui/widget-runtime/theme.ts.
     */
    webFont?: WebFont;
    /**
     * Backgrounds (#630; src/hosted/doc/background.ts): each layer's panel,
     * chat lines and event-list rows, and alert cards. Absent draws what the
     * theme always drew (the panel colour at its opacity). In a theme record a
     * panel background is never a video; a layer's own override may be.
     */
    panelBackground?: Background;
    itemBackground?: Background;
    alertBackground?: Background;
    /**
     * Border images (#1041; src/hosted/doc/border-image.ts): a 9-slice frame on
     * each layer's panel, on chat lines and event-list rows, and on alert cards.
     * Absent draws the plain border exactly as before.
     */
    panelBorderImage?: BorderImage;
    itemBorderImage?: BorderImage;
    alertBorderImage?: BorderImage;
    /**
     * Per-part styles (#629; `./parts.ts`): `{ <kind>: { <part>: PartStyle } }`,
     * each part one of the kind's stable `.w-*` classes. Absent draws every part
     * exactly as the kind's own stylesheet does.
     */
    parts?: ThemeParts;
    /**
     * Motion (#612; `src/hosted/motion.ts`): how chat lines, event-list rows and
     * media come and go, and the layer's idle motion. Absent (or any absent
     * field) animates exactly as before motion existed. A layer's override
     * merges into it field by field, like `parts`.
     */
    motion?: ThemeMotion;
}

export interface WebFont {
    provider: (readonly [
        "google"
    ])[number];
    family: string;
    weight: (readonly [
        100,
        200,
        300,
        400,
        500,
        600,
        700,
        800,
        900
    ])[number];
}

/**
 * One background. Which keys may appear depends on `type`:
 *
 * - `none` — nothing is drawn, not even the theme's: how a layer switches a
 *   theme's background off for itself.
 * - `color` — `color`.
 * - `gradient` — `gradient` (the shared `Gradient`, src/hosted/doc/gradient.ts).
 * - `image` — `asset` (a media-library image), `fit`, `position`.
 * - `video` — `asset` (a media-library WebM), `fit` (not `tile`), `position`.
 *
 * Every type but `none` also takes `opacity` (0-1, absent is 1) and `blur`
 * (0-40 px, absent is 0).
 */
export interface Background {
    type: BackgroundType;
    color?: string;
    gradient?: Gradient;
    asset?: string;
    fit?: BackgroundFit;
    position?: BackgroundPosition;
    opacity?: number;
    blur?: number;
}

export type BackgroundType = (readonly [
    "none",
    "color",
    "gradient",
    "image",
    "video"
])[number];

export interface Gradient {
    kind: GradientKind;
    /** Linear only; absent is 180 (top to bottom), CSS's own default. */
    angle?: number;
    /** 2-4 stops, in order along the gradient. */
    stops: GradientStop[];
}

export type GradientKind = (readonly [
    "linear",
    "radial"
])[number];

export interface GradientStop {
    /** `#rgb`, `#rrggbb`, `#rrggbbaa`, or a theme colour where the caller allows one (src/hosted/theme-colors.ts). */
    color: string;
    /** Position along the gradient, 0-100 (%). */
    at: number;
    /** 0-1, multiplied into the colour's own alpha. Absent is 1. */
    opacity?: number;
}

export type BackgroundFit = (readonly [
    "cover",
    "contain",
    "stretch",
    "tile"
])[number];

export type BackgroundPosition = (readonly [
    "center",
    "top",
    "bottom",
    "left",
    "right",
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right"
])[number];

/**
 * One border image. `none` carries only `type`. `image` names a media-library
 * image in `asset` (required), and optionally:
 *
 * - `slice`: the top, right, bottom and left cuts, whole px of the source
 *   image, each 0-4096. Absent is 33% on every side.
 * - `width`: the drawn border thickness, 0-64 px. Absent is 16. When set, it
 *   replaces the box's plain `borderWidth`; `borderColor` still shows if the
 *   image fails to load.
 * - `outset`: how far the frame sits outside the box, 0-64 px. Absent is 0.
 * - `repeat`: how the edges fill their length. Absent is `stretch`.
 * - `fillCenter`: draw the image's middle over the box too. Absent is false.
 */
export interface BorderImage {
    type: BorderImageType;
    asset?: string;
    slice?: [
        number,
        number,
        number,
        number
    ];
    width?: number;
    outset?: number;
    repeat?: BorderImageRepeat;
    fillCenter?: boolean;
}

export type BorderImageType = (readonly [
    "none",
    "image"
])[number];

export type BorderImageRepeat = (readonly [
    "stretch",
    "repeat",
    "round",
    "space"
])[number];

/** `{ <kind>: { <part id>: PartStyle } }`. */
export type ThemeParts = Record<string, Record<string, PartStyle>>;

export interface PartStyle {
    /** One of the theme's system stacks; the fallback under `webFont`. */
    font?: (readonly [
        "system",
        "rounded",
        "serif",
        "mono",
        "display",
        "inter",
        "bloop"
    ])[number];
    webFont?: WebFont;
    size?: number;
    weight?: (readonly [
        100,
        200,
        300,
        400,
        500,
        600,
        700,
        800,
        900
    ])[number];
    color?: string;
    /** Gradient-filled text. Not with `fill`/`fillGradient`: both paint the background. */
    gradient?: Gradient;
    transform?: PartTransform;
    letterSpacing?: number;
    lineHeight?: number;
    paddingX?: number;
    paddingY?: number;
    marginX?: number;
    marginY?: number;
    /** The part's own box: a colour, or a gradient. */
    fill?: string;
    fillGradient?: Gradient;
    borderWidth?: number;
    borderColor?: string;
    /** A 9-slice image frame on the part's own box (#1041, `./border-image.ts`). Only a part whose `box` is true. */
    borderImage?: BorderImage;
    radius?: number;
    shadow?: TextShadow;
    outline?: TextOutline;
    glow?: TextGlow;
    highlight?: boolean;
    /**
     * A per-letter effect (#612) on this text part: each letter of its text is
     * animated on its own, looping while it is shown (`typewriter` types it in
     * once). Only a part that draws text may carry it; the `hl` part's is the
     * one the editor offers first, so the highlighted values move.
     */
    letters?: LetterEffect;
}

export type PartTransform = (readonly [
    "none",
    "uppercase",
    "lowercase",
    "capitalize"
])[number];

export interface TextShadow {
    x: number;
    y: number;
    blur: number;
    color: string;
}

export interface TextOutline {
    width: number;
    color: string;
}

export interface TextGlow {
    blur: number;
    color: string;
    /** 1-4 whole layers of the same glow. */
    strength: number;
}

export type LetterEffect = (readonly [
    "wave",
    "wiggle",
    "bounce",
    "pulse",
    "tada",
    "rubber-band",
    "jelly",
    "typewriter"
])[number];

/** The theme's motion (`WidgetTheme.motion`); a layer may override any field of it. */
export interface ThemeMotion {
    /** Chat lines arriving and leaving. */
    lineIn?: Motion;
    lineOut?: Motion;
    /** Event-list rows arriving and leaving. */
    rowIn?: Motion;
    rowOut?: Motion;
    /** A Play media file arriving and leaving. */
    mediaIn?: Motion;
    mediaOut?: Motion;
    idle?: IdleEffect;
    idleSpeed?: IdleSpeed;
}

/** One entrance or exit. */
export interface Motion extends MotionOptions {
    effect: MotionEffect;
}

/** Everything about one animation but its effect. Each field is optional: absent is the default. */
export interface MotionOptions {
    direction?: MotionDirection;
    durationMs?: number;
    easing?: MotionEasing;
}

export type MotionDirection = (readonly [
    "up",
    "down",
    "left",
    "right"
])[number];

export type MotionEasing = (readonly [
    "smooth",
    "snappy",
    "bouncy",
    "linear"
])[number];

export type MotionEffect = (readonly [
    "fade",
    "slide",
    "zoom",
    "bounce",
    "flip",
    "rotate",
    "roll",
    "light-speed",
    "back",
    "blur",
    "drop",
    "pop",
    "wipe",
    "none"
])[number];

export type IdleEffect = (readonly [
    "none",
    "float",
    "pulse",
    "shimmer",
    "breathe-glow"
])[number];

export type IdleSpeed = (readonly [
    "slow",
    "medium",
    "fast"
])[number];

/**
 * Version 2: an ordered `layers` array. Array order is z-order (first =
 * bottom). `theme`/`customCss` stay document-level; `settings` is present only
 * for the kinds that have document-level settings (today: `stage`).
 */
export interface WidgetDocV2<S = unknown> {
    version: 2;
    kind: WidgetKind;
    theme: WidgetTheme;
    /** Document-level settings shared by every layer. Only `stage` has one. */
    settings?: StageQueueSettings;
    customCss?: string;
    layers: WidgetLayer<S>[];
}

/**
 * `StageSettings`' queue half, named rather than restated: the v2 document
 * carries `gapMs`/`maxQueue` at the document level and one `StageDesign` per
 * layer. `StageSettings` itself is untouched — the service, the flow nodes and
 * the Stage tests keep using it.
 */
export type StageQueueSettings = Pick<StageSettings, 'gapMs' | 'maxQueue'>;

export interface StageSettings {
    designs: StageDesign[];
    gapMs: number;
    maxQueue: number;
}

/**
 * One placed piece of a widget surface. `settings` is the existing per-kind
 * block, verbatim: `LabelSettings`, `StageDesign`, `ChatSettings`, …
 * (`docs/superpowers/specs/2026-09-21-widget-surface-builder-design.md` §2).
 */
export interface WidgetLayer<S = unknown> {
    /** UUID v4; unique within the document; stable once saved. */
    id: string;
    /**
     * The editor's label. For a stage layer this IS the design name and obeys
     * `STAGE_DESIGN_NAME_PATTERN`; every other kind only has the name-length cap.
     */
    name: string;
    /** Placement on the 1920×1080 canvas, validated by `validateFrame`. */
    frame: WidgetFrame;
    /** Absent means false. A hidden layer is never drawn; a hidden stage design is also not playable. */
    hidden?: boolean;
    settings: S;
}

/**
 * Version 3: an ordered `layers` array whose layers may be of any kind.
 *
 * The document's own `kind` is not a constraint on the layers — a mixed surface
 * holds whatever the streamer placed. It is (a) the default kind a new layer
 * gets, (b) the kind the document-level `settings` belong to, and (c) the kind
 * at least one layer must declare. That last rule is what keeps the row's
 * reported kind (the panel label, `doc.json`'s kind, the CSP widening, the
 * socket preset) truthful, and it is the price of the one-stage-per-channel
 * former database guard: in v3, a `stage` layer required a `stage` document
 * because migration 047 indexed the row's kind. Migration 048 removed that index.
 */
export interface WidgetDocV3<S = unknown> {
    version: 3;
    /** The default layer kind and the key to the document-level `settings`. */
    kind: WidgetKind;
    /** Document-level settings. Today only `stage` has one, and only a stage document may. */
    settings?: StageQueueSettings;
    theme: WidgetTheme;
    customCss?: string;
    /** Array order is z-order (first = bottom). */
    layers: WidgetLayerV3<S>[];
}

/**
 * Version 3: a layer is a widget in its own right. It carries its own `kind`,
 * its own `settings` validated by that kind's validator, and — optionally — its
 * own `design` theme that overrides the document's.
 *
 * A superset of the v2 layer (everything here is also true of one), which is
 * what lets v2 input stay valid and lets the v2->v3 migration be a pure
 * relabelling: nothing but `kind` (and an optional `theme`) is added.
 */
export interface WidgetLayerV3<S = unknown> {
    /** UUID v4; unique within the document; stable once saved. */
    id: string;
    /**
     * The layer's own kind. REQUIRED — an absent kind is not "the document's",
     * it is invalid. The editor always writes it and the migration always adds
     * it; accepting a missing one would let two readers disagree about what the
     * layer is.
     */
    kind: WidgetKind;
    /** Editor label. For a `stage` layer this IS the design name. */
    name: string;
    frame: WidgetFrame;
    hidden?: boolean;
    /** A channel variable can hide this layer without hiding its surface. */
    visibility?: LayerVisibility;
    /**
     * Absent means false. A locked layer still draws, but the editor tools
     * (#613) refuse to drag, resize, rotate or delete it until it is unlocked —
     * the runtime does not read this at all, it is an editor-only guard.
     */
    locked?: boolean;
    /**
     * An opaque id shared by every layer of a one-level group (#613): never a
     * group of groups, so this never points at another layer's `groupId`, only
     * groups member layers together for "move/hide/lock as a unit". Absent
     * means "not in a group".
     */
    groupId?: string;
    /**
     * The layer's own design, or absent for "use the document's" (spec §8).
     * When present it is a complete `WidgetTheme` whose `design` names the preset
     * it was composed from.
     */
    theme?: WidgetTheme;
    settings: S;
}

export interface LayerVisibility {
    variable: string;
    operator: VisibilityOperator;
    value?: VisibilityValue;
    /** Played when the layer appears after its first snapshot or a later change. */
    animateIn?: Motion;
    /** Played before removing a layer hidden by a live value. */
    animateOut?: Motion;
}

export type VisibilityOperator = (readonly [
    "is_set",
    "is_not_set",
    "equals",
    "not_equals"
])[number];

export type VisibilityValue = string | number | boolean;

/**
 * Version 4: **the surface has no type of its own.** A widget is a surface, and
 * the types belong to the layers a streamer places on it, so the document's one
 * remaining identity key — its `kind` — is gone
 * (`docs/superpowers/specs/2026-09-21-surface-without-widget-type-design.md` §3
 * as amended by the C ruling; see `docs/hosted-widgets.md` for the streamer's
 * account).
 *
 * Everything else is v3's, unchanged and deliberately so: `WidgetLayerV3` is
 * reused rather than copied, because a v4 layer IS a v3 layer — one design per
 * `stage` layer, with its own `frame`, `hidden` and `theme`. Document-level
 * `settings` also stays, as the home for **surface-scoped** settings: the bag
 * used to need a type to belong to, and today it holds one thing, the Stage
 * queue pair, which is about the surface's own on-screen queue rather than
 * about the type of any layer on it. Without a type to check it against, it is
 * simply optional on every surface.
 */
export interface WidgetDocV4<S = unknown> {
    version: 4;
    theme: WidgetTheme;
    customCss?: string;
    /** Surface-scoped settings. Today only the Stage queue pair. */
    settings?: StageQueueSettings;
    /**
     * 0..`STAGE_LIMITS.designsMax`, array order is z-order (first = bottom).
     * ZERO is legal: that is the empty surface a streamer has when they create a
     * widget and have not placed anything yet.
     */
    layers: WidgetLayerV3<S>[];
}

/**
 * Version 5: alert designs and the queue pair live in the channel's alert
 * design record, not in any document
 * (`docs/superpowers/specs/2026-09-22-alerts-unification-design.md` §3).
 *
 * The layer shape is v3's. What changed is what two kinds' settings mean:
 *
 * - a `stage` layer's settings are `AlertLayerSettings` — `{design}` — and its
 *   `name` is a free editor label like every other kind's;
 * - a `media` layer (`MediaLayerSettings`) is where Play media draws.
 *
 * There is no document-level `settings`: the queue pair was the only thing it
 * ever held, and it belongs to the channel's one queue, not to a surface.
 */
export interface WidgetDocV5<S = unknown> {
    version: 5;
    theme: WidgetTheme;
    customCss?: string;
    /** 0..`STAGE_LIMITS.designsMax`, array order is z-order (first = bottom). */
    layers: WidgetLayerV3<S>[];
    /** Saved settings for one-level layer groups. Older groupId-only documents omit this. */
    groups?: LayerGroup[];
    /** The surface's full-canvas backdrop (#630); absent draws nothing behind the layers. */
    background?: Background;
    /** A scene screen's role (#648, src/hosted/doc/scene.ts); absent on every other surface. */
    scene?: SceneRole;
}

export interface LayerGroup {
    id: string;
    name: string;
    visibility?: LayerVisibility;
}

export type SceneRole = (readonly [
    {
        readonly id: "starting";
        readonly label: "Starting soon";
        readonly obsScene: "Starting Soon";
    },
    {
        readonly id: "brb";
        readonly label: "Be right back";
        readonly obsScene: "Be Right Back";
    },
    {
        readonly id: "ending";
        readonly label: "Stream ending";
        readonly obsScene: "Stream Ending";
    },
    {
        readonly id: "chatting";
        readonly label: "Just chatting";
        readonly obsScene: "Just Chatting";
    }
])[number]['id'];

/**
 * Version 6: the look lives in the channel's THEME records
 * (src/hosted/doc/theme-record.ts; spec 2026-09-24-widgets-theme-parity-design.md
 * "Phase 1 plan"), not in the document.
 *
 * - `theme` is the surface's Theme setting: `'active'` (follow whichever theme
 *   is Active) or a pinned theme's id.
 * - each layer's `theme` is a sparse per-field override (`WidgetLayerV6`).
 * - `customCss` is the surface's own, drawn after its theme's.
 *
 * Everything else is v5's. The runtime never sees this shape: the server
 * resolves it into v5 first (`renderDoc`).
 */
export interface WidgetDocV6<S = unknown> {
    version: 6;
    theme: string;
    customCss?: string;
    /** 0..`STAGE_LIMITS.designsMax`, array order is z-order (first = bottom). */
    layers: WidgetLayerV6<S>[];
    groups?: LayerGroup[];
    /**
     * The surface's own full-canvas backdrop (#630): this surface's, not its
     * theme's, so a scene screen's picture never lands on a gameplay overlay
     * that shares the theme.
     */
    background?: Background;
    /**
     * A scene screen's role (#648): which of the channel's Starting soon, Be
     * right back, Stream ending and Just chatting screens this surface is.
     * Server-owned: set at creation, carried forward on every other write.
     */
    scene?: SceneRole;
}

/**
 * A v6 layer: v3's shape, except that `theme` is a SPARSE override — only the
 * fields this layer changed, drawn on top of the surface's theme
 * (`applyThemeOverride`). Absent, or `{}`, follows the theme completely.
 */
export interface WidgetLayerV6<S = unknown> extends Omit<WidgetLayerV3<S>, 'theme'> {
    theme?: ThemeOverride;
}

/**
 * A layer's own look in a v6 document: SPARSE, one entry per field the
 * streamer changed on that layer, drawn on top of the surface's theme
 * (`applyThemeOverride`). An absent field follows the theme, so editing the
 * theme restyles every layer that did not override that field — the whole
 * point of a theme (spec 2026-09-24-widgets-theme-parity-design.md, "Phase 1
 * plan": "Overrides: sparse, per field, on layers").
 *
 * Replaces v3-v5's whole-theme `layer.theme ?? doc.theme`.
 */
export type ThemeOverride = Partial<WidgetTheme>;
