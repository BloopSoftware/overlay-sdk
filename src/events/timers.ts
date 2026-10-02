export interface TickerLine {
  id: string;
  text: string;
  layer: string;
  once: boolean;
  /** ISO time the line leaves. */
  until: string;
}

/** The wire frame: every moved layer's anchor, in full, each time. Mirrored by hand in src/widgets/validate.ts. */
export interface SlideshowFrame {
  type: 'slideshow';
  at: string;
  layers: Record<string, SlideshowAnchor>;
}

/**
 * The Slideshow's shared clock arithmetic (bloopbot #745), imported by both
 * the server (src/widgets/slideshow-control.ts, which moves a slideshow when a
 * flow says Next, Previous or Show picture N) and the OBS renderer
 * (ui/widget-runtime/render/slideshow.ts, which draws it). No imports and no
 * runtime dependencies: the renderer bundles this into the OBS page.
 *
 * Untouched, a slideshow's rotation is anchored at the Unix epoch: cycle
 * `k = floor(now / interval)` is the same number on every page at the same
 * moment, and the picture is a pure function of `k` (see the renderer).
 *
 * A flow moves it by storing an ANCHOR for the layer, never a picture: "from
 * `at`, the rotation is at cycle `cycle`", and the renderer counts on from
 * there, `cycle + floor((now - at) / interval)`. So:
 *
 *  - Next / Previous are the cycle one past or one before the cycle showing
 *    at that moment — computed on the server from the interval alone, so the
 *    server never needs to know which files resolve or how shuffle orders them;
 *  - Show picture N anchors on a list ENTRY instead (`entry`, 0-based, and
 *    `entryAt`): the renderer finds the cycle that shows that entry — it is
 *    the one that knows the resolvable pictures and the shuffle order — and a
 *    later Next or Previous counts from it (`cycle` becomes an offset);
 *  - either way `at` is the moment of the move, so the per-picture timer
 *    restarts from the picture it put up.
 *
 * Every page applies the same anchor with the same arithmetic, so two OBS
 * sources — and a source opened later, which is handed the stored anchors on
 * connect — show the same picture at the same moment, as they already did.
 */

/** Where one slideshow layer's rotation stands after a flow moved it. Times are epoch ms. */
export interface SlideshowAnchor {
  /** Epoch-anchored: the rotation's cycle at `at`. Entry-anchored: cycles on from the one showing `entry`. */
  cycle: number;
  /** When the move happened: the timer counts from here. */
  at: number;
  /** Show picture N: the list entry (0-based) that went up at `entryAt`. */
  entry?: number;
  entryAt?: number;
}

/** One countdown on the wire (mirrored by hand in src/widgets/validate.ts and ui/widget-runtime/render/countdown.ts). */
export interface CountdownFrameTimer {
  name: string;
  status: 'running' | 'paused' | 'ended';
  direction: 'down' | 'up';
  ends_at: string | null;
  remaining_ms: number | null;
  started_at: string | null;
  elapsed_ms: number | null;
}

/** The wire frame: every countdown of the channel, in full, each time. */
export interface CountdownFrame {
  type: 'countdown';
  at: string;
  timers: CountdownFrameTimer[];
}


export interface TickerLineFrame { type: 'tickerline'; at: string; lines: TickerLine[] }
