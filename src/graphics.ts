import type { EventFamily, EventFrame, OverlayFrame, Unsubscribe } from './types.js';

export const GRAPHICS_API_VERSION = '1.0' as const;
export type GraphicValue = string | number | boolean | null;
export interface GraphicTick { readonly timeMs: number; readonly deltaMs: number }
export interface GraphicSize { readonly width: number; readonly height: number }
/** A paused animation supplied by the host's pinned animation library. */
export interface GraphicTimeline { pause(): unknown; seek(seconds: number, suppressEvents?: boolean): unknown; kill(): unknown; totalDuration?(): number }
export interface GraphicsContext<T extends GraphicTimeline = GraphicTimeline> {
  readonly version: typeof GRAPHICS_API_VERSION;
  readonly settings: Readonly<Record<string, GraphicValue>>;
  readonly assets: Readonly<Record<string, string>>;
  readonly timeMs: number;
  readonly size: GraphicSize;
  /** Current declared variable values, with absent values omitted. */
  getVariables(): Readonly<Record<string, GraphicValue>>;
  /** Subscribe to a declared family; the callback receives its raw typed payload. */
  onEvent<F extends EventFamily>(type: F, handler: (frame: EventFrame<F>) => void): Unsubscribe;
  onEvent(type: string, handler: (frame: OverlayFrame) => void): Unsubscribe;
  /** Receive the current values immediately, then each variables update. */
  onVariables(handler: (values: Readonly<Record<string, GraphicValue>>) => void): Unsubscribe;
  /** Receive an initial tick and every advance of the shared preview clock. */
  onTick(handler: (tick: GraphicTick) => void): Unsubscribe;
  /** Receive the initial size, then container resize notifications. */
  onResize(handler: (size: GraphicSize) => void): Unsubscribe;
  /** Release renderers, listeners and other resources before a reset or close. */
  onDispose(handler: () => void): Unsubscribe;
  /** Register a paused timeline against the same clock as events and ticks. */
  timeline(): T;
  /** Run once at this clock's current time + delay; cancelled on disposal. */
  schedule(delayMs: number, handler: () => void): Unsubscribe;
}

export interface GraphicsRuntimeOptions<T extends GraphicTimeline> {
  events: readonly string[];
  variables: readonly string[];
  settings: Readonly<Record<string, GraphicValue>>;
  assets: Readonly<Record<string, string>>;
  timeline?: () => T;
  onDiagnostic?: (message: string) => void;
}

/**
 * A graphic's complete lifetime. The host owns replay: recreate this runtime
 * and deliver the ordered history when seeking backwards. Time is milliseconds,
 * monotonically increasing within one lifetime, with no wall-clock timers here.
 */
export function createGraphicsRuntime<T extends GraphicTimeline = GraphicTimeline>(options: GraphicsRuntimeOptions<T>) {
  const timelineFactory = options.timeline;
  const onDiagnostic = options.onDiagnostic;
  const permittedEvents = new Set(options.events);
  const permittedVariables = new Set(options.variables);
  const events = new Map<string, Set<(frame: OverlayFrame) => void>>();
  const variableHandlers = new Set<(values: Readonly<Record<string, GraphicValue>>) => void>();
  const ticks = new Set<(tick: GraphicTick) => void>();
  const resizes = new Set<(size: GraphicSize) => void>();
  const disposers = new Set<() => void>();
  const scheduled = new Map<() => void, number>();
  const timelines = new Map<T, number>();
  let variables: Readonly<Record<string, GraphicValue>> = Object.freeze({});
  let size: GraphicSize = Object.freeze({ width: 0, height: 0 });
  let timeMs = 0;
  let disposed = false;

  function invoke(callback: () => void): void {
    try { callback(); } catch { try { onDiagnostic?.('Graphic callback failed'); } catch { /* Reporting cannot break disposal or replay. */ } }
  }
  function subscribe<H>(handlers: Set<H>, handler: H): Unsubscribe {
    if (disposed) throw new Error('Graphic has been disposed');
    handlers.add(handler);
    return () => { handlers.delete(handler); };
  }
  const context: GraphicsContext<T> = Object.freeze({
    version: GRAPHICS_API_VERSION,
    settings: Object.freeze({ ...options.settings }),
    assets: Object.freeze({ ...options.assets }),
    get timeMs() { return timeMs; },
    get size() { return size; },
    getVariables: () => variables,
    onEvent(type: string, handler: (frame: OverlayFrame) => void) {
      if (!permittedEvents.has(type)) throw new Error(`Event ${type} is not declared by this graphic`);
      const handlers = events.get(type) ?? new Set<(frame: OverlayFrame) => void>();
      events.set(type, handlers);
      return subscribe(handlers, handler);
    },
    onVariables: (handler: (values: Readonly<Record<string, GraphicValue>>) => void) => {
      const unsubscribe = subscribe(variableHandlers, handler);
      invoke(() => handler(variables));
      return unsubscribe;
    },
    onTick: (handler: (tick: GraphicTick) => void) => {
      const unsubscribe = subscribe(ticks, handler);
      invoke(() => handler(Object.freeze({ timeMs, deltaMs: 0 })));
      return unsubscribe;
    },
    onResize: (handler: (next: GraphicSize) => void) => {
      const unsubscribe = subscribe(resizes, handler);
      invoke(() => handler(size));
      return unsubscribe;
    },
    onDispose: (handler: () => void) => subscribe(disposers, handler),
    timeline() {
      if (disposed) throw new Error('Graphic has been disposed');
      if (!timelineFactory) throw new Error('Enable the GSAP library to use timelines');
      const timeline = timelineFactory();
      timeline.pause();
      timelines.set(timeline, timeMs);
      return timeline;
    },
    schedule(delayMs: number, handler: () => void) {
      if (disposed) throw new Error('Graphic has been disposed');
      if (!Number.isFinite(delayMs) || delayMs < 0 || delayMs > 3_600_000) throw new Error('Delay must be between 0 and 3600000 milliseconds');
      // A distinct callback means scheduling the same handler twice is two jobs.
      const callback = () => handler();
      scheduled.set(callback, timeMs + delayMs);
      return () => { scheduled.delete(callback); };
    },
  });
  return {
    context,
    deliver(frame: OverlayFrame): void {
      if (disposed) return;
      if (frame.type === 'vars') {
        const raw = frame.values;
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
        const next = { ...variables };
        for (const [key, value] of Object.entries(raw)) {
          if (permittedVariables.has(key) && (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value)))) next[key] = value;
        }
        variables = Object.freeze(next);
        for (const handler of [...variableHandlers]) invoke(() => handler(variables));
        return;
      }
      if (!permittedEvents.has(frame.type)) return;
      // Each subscriber gets a detached frame, so one callback cannot change another's event.
      for (const handler of [...(events.get(frame.type) ?? [])]) invoke(() => handler(structuredClone(frame)));
    },
    advance(nextMs: number): void {
      if (disposed) return;
      if (!Number.isFinite(nextMs) || nextMs < timeMs) throw new Error('Graphic clock must advance monotonically');
      const previousMs = timeMs;
      // Jobs run at their due time even when a seek crosses several jobs. A job
      // may schedule another; cap a self-scheduling zero-delay loop per advance.
      let jobs = 0;
      while (!disposed) {
        const next = [...scheduled].sort((a, b) => a[1] - b[1])[0];
        if (!next || next[1] > nextMs) break;
        if (++jobs > 1000) { scheduled.clear(); invoke(() => onDiagnostic?.('Too many scheduled callbacks in one clock advance')); break; }
        const [callback, due] = next;
        timeMs = due;
        for (const [timeline, start] of timelines) invoke(() => { timeline.seek((timeMs - start) / 1000, false); });
        scheduled.delete(callback);
        invoke(callback);
      }
      timeMs = nextMs;
      for (const [timeline, start] of timelines) invoke(() => { timeline.seek((timeMs - start) / 1000, false); });
      for (const [timeline, start] of timelines) invoke(() => {
        const duration = timeline.totalDuration?.();
        if (duration !== undefined && duration > 0 && (timeMs - start) / 1000 >= duration) { timeline.kill(); timelines.delete(timeline); }
      });
      const deltaMs = timeMs - previousMs;
      const tick = Object.freeze({ timeMs, deltaMs });
      for (const handler of [...ticks]) invoke(() => handler(tick));
    },
    resize(width: number, height: number): void {
      if (disposed || !Number.isFinite(width) || !Number.isFinite(height) || width < 0 || height < 0) return;
      size = Object.freeze({ width, height });
      for (const handler of [...resizes]) invoke(() => handler(size));
    },
    destroy(): void {
      if (disposed) return;
      disposed = true;
      for (const handler of [...disposers]) invoke(handler);
      for (const timeline of timelines.keys()) invoke(() => { timeline.kill(); });
      events.clear(); variableHandlers.clear(); ticks.clear(); resizes.clear(); disposers.clear(); scheduled.clear(); timelines.clear();
    },
  };
}
