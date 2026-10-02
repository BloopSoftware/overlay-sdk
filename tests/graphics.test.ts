import { describe, expect, it, vi } from 'vitest';
import { createGraphicsRuntime, GRAPHICS_API_VERSION } from '../src/index.js';

const options = () => ({ events: ['raid'], variables: ['score'], settings: { accent: '#fff' }, assets: { portrait: 'blob:portrait' } });
const timeline = () => ({ pause: vi.fn(), seek: vi.fn(), kill: vi.fn() });

describe('graphics SDK v1 clock and lifetime', () => {
  it('delivers only declared data and protects configuration snapshots', () => {
    const config = options();
    const runtime = createGraphicsRuntime(config);
    const raid = vi.fn(); const values = vi.fn();
    runtime.context.onEvent('raid', raid); runtime.context.onVariables(values);
    expect(runtime.context.version).toBe(GRAPHICS_API_VERSION);
    config.settings.accent = '#000'; config.variables.push('secret');
    runtime.deliver({ type: 'follow', name: 'Ignored' });
    runtime.deliver({ type: 'raid', name: 'Ada' });
    runtime.deliver({ type: 'vars', values: { score: 0, secret: 'private', bad: NaN } });
    expect(raid).toHaveBeenCalledExactlyOnceWith({ type: 'raid', name: 'Ada' });
    expect(values).toHaveBeenLastCalledWith({ score: 0 });
    expect(runtime.context.settings.accent).toBe('#fff');
    expect(Object.isFrozen(runtime.context.settings)).toBe(true);
    expect(Object.isFrozen(runtime.context.getVariables())).toBe(true);
    expect(() => runtime.context.onEvent('chat', () => {})).toThrow('not declared');
  });
  it('gives each subscriber a detached event', () => {
    const runtime = createGraphicsRuntime(options());
    runtime.context.onEvent('raid', (event) => { event.name = 'Changed'; });
    const second = vi.fn(); runtime.context.onEvent('raid', second);
    const frame = { type: 'raid', name: 'Original' }; runtime.deliver(frame);
    expect(frame.name).toBe('Original');
    expect(second).toHaveBeenCalledWith({ type: 'raid', name: 'Original' });
  });
  it('advances paused timelines relative to the event that created them', () => {
    const one = timeline(); const two = timeline();
    const factory = vi.fn().mockReturnValueOnce(one).mockReturnValueOnce(two);
    const runtime = createGraphicsRuntime({ ...options(), timeline: factory });
    expect(runtime.context.timeline()).toBe(one);
    runtime.advance(1000);
    runtime.context.onEvent('raid', () => runtime.context.timeline());
    runtime.deliver({ type: 'raid' }); runtime.advance(1500);
    expect(one.pause).toHaveBeenCalledOnce();
    expect(one.seek).toHaveBeenLastCalledWith(1.5, false);
    expect(two.seek).toHaveBeenLastCalledWith(.5, false);
    expect(runtime.context.timeMs).toBe(1500);
    expect(() => runtime.advance(1000)).toThrow('monotonically');
    expect(() => runtime.advance(NaN)).toThrow('monotonically');
  });
  it('runs scheduled work at its due time across large seeks and cancels jobs', () => {
    const animation = timeline(); const runtime = createGraphicsRuntime({ ...options(), timeline: () => animation });
    const cancelled = vi.fn(); runtime.context.schedule(20, cancelled)();
    const seen: number[] = [];
    runtime.context.schedule(100, () => { seen.push(runtime.context.timeMs); runtime.context.timeline(); runtime.context.schedule(50, () => seen.push(runtime.context.timeMs)); });
    runtime.advance(1000);
    expect(seen).toEqual([100, 150]); expect(cancelled).not.toHaveBeenCalled();
    expect(animation.seek).toHaveBeenLastCalledWith(.9, false);
    expect(() => runtime.context.schedule(-1, () => {})).toThrow('Delay');
    expect(() => runtime.context.schedule(Infinity, () => {})).toThrow('Delay');
  });
  it('isolates errors and bounds recursively scheduled work', () => {
    const diagnose = vi.fn(); const runtime = createGraphicsRuntime({ ...options(), onDiagnostic: diagnose });
    runtime.context.onEvent('raid', () => { throw new Error('secret'); });
    const next = vi.fn(); runtime.context.onEvent('raid', next); runtime.deliver({ type: 'raid' });
    expect(next).toHaveBeenCalledOnce(); expect(diagnose).toHaveBeenCalledWith('Graphic callback failed');
    const loop = () => { runtime.context.schedule(0, loop); }; runtime.context.schedule(0, loop);
    runtime.advance(1); expect(diagnose).toHaveBeenCalledWith('Too many scheduled callbacks in one clock advance');
  });
  it('owns resize, ticks, subscriptions and exactly-once teardown', () => {
    const animation = timeline(); const runtime = createGraphicsRuntime({ ...options(), timeline: () => animation });
    const resize = vi.fn(); const tick = vi.fn(); const dispose = vi.fn(); const job = vi.fn(); const event = vi.fn();
    runtime.context.onResize(resize); const unTick = runtime.context.onTick(tick); runtime.context.onDispose(dispose);
    const unEvent = runtime.context.onEvent('raid', event); runtime.context.schedule(2000, job); runtime.context.timeline();
    runtime.resize(800, 240); runtime.resize(-1, NaN); runtime.advance(1000);
    expect(runtime.context.size).toEqual({ width: 800, height: 240 }); expect(resize).toHaveBeenCalledTimes(2);
    expect(tick).toHaveBeenLastCalledWith({ timeMs: 1000, deltaMs: 1000 });
    unTick(); unEvent(); runtime.advance(1100); runtime.deliver({ type: 'raid' });
    expect(tick).toHaveBeenCalledTimes(2); expect(event).not.toHaveBeenCalled();
    runtime.destroy(); runtime.destroy(); runtime.advance(3000); runtime.resize(900, 400); runtime.deliver({ type: 'raid' });
    expect(dispose).toHaveBeenCalledOnce(); expect(animation.kill).toHaveBeenCalledOnce(); expect(job).not.toHaveBeenCalled();
    expect(() => runtime.context.onTick(tick)).toThrow('disposed');
    expect(() => runtime.context.timeline()).toThrow('disposed');
    expect(() => runtime.context.schedule(0, job)).toThrow('disposed');
  });
  it('reports a missing library and ignores malformed variables', () => {
    const runtime = createGraphicsRuntime(options());
    expect(() => runtime.context.timeline()).toThrow('Enable the GSAP');
    for (const values of [null, [], { score: Infinity }, { score: {} }]) runtime.deliver({ type: 'vars', values });
    expect(runtime.context.getVariables()).toEqual({});
  });
  it('gives late canvas listeners the chosen time and releases completed timelines', () => {
    const animation = { ...timeline(), totalDuration: () => 1 };
    const runtime = createGraphicsRuntime({ ...options(), timeline: () => animation });
    runtime.context.timeline();
    runtime.advance(1500);
    const tick = vi.fn();
    runtime.context.onTick(tick);
    expect(tick).toHaveBeenCalledExactlyOnceWith({ timeMs: 1500, deltaMs: 0 });
    expect(animation.kill).toHaveBeenCalledOnce();
    runtime.advance(2000); runtime.destroy();
    expect(animation.kill).toHaveBeenCalledOnce();
  });
});
