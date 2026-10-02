import { describe, expect, it, vi } from 'vitest';
import { createSimulation } from '../src/index.js';

describe('explicit overlay simulation', () => {
  it('uses the same event and state interface without a network connection', async () => {
    const simulation = createSimulation({ events: ['follow', 'stage.media'], variables: ['score'] });
    const follow = vi.fn();
    const media = vi.fn();
    const unsubscribe = simulation.onEvent('follow', follow);
    simulation.onEvent('stage.media', media);
    await simulation.start();
    simulation.emit({ type: 'follow', name: 'Ada' });
    simulation.emit({ type: 'stage', kind: 'media', op: 'play' });
    simulation.setVariables({ score: 5, secret: 9 });
    expect(follow).toHaveBeenCalledTimes(1);
    expect(media).toHaveBeenCalledTimes(1);
    expect(simulation.state.variables).toEqual({ score: 5 });
    expect(simulation.state.status).toBe('ready');
    unsubscribe();
    simulation.emit({ type: 'follow', name: 'Grace' });
    expect(follow).toHaveBeenCalledTimes(1);
    simulation.stop();
    expect(() => simulation.emit({ type: 'follow' })).toThrow('Start');
  });

  it('validates subscriptions and refuses unrequested events', async () => {
    expect(() => createSimulation({ events: [], variables: ['bad name'] })).toThrow(TypeError);
    const simulation = createSimulation({ events: ['follow'] });
    await simulation.start();
    expect(() => simulation.emit({ type: 'raid' })).toThrow('not subscribed');
    expect(() => simulation.emit({ type: '' })).toThrow(TypeError);
    simulation.stop();
  });

  it('filters raw variable frames and snapshots the subscription configuration', async () => {
    const requested = { events: ['follow' as const], variables: ['score'] };
    const simulation = createSimulation(requested);
    requested.variables.push('secret');
    await simulation.start();
    simulation.emit({ type: 'vars', values: { score: 0, secret: 'private' } });
    expect(simulation.state.variables).toEqual({ score: 0 });
    simulation.stop();
    expect(simulation.state.variables).toEqual({});
  });

  it('simulates granted records with monotonic revisions', async () => {
    const simulation = createSimulation({ events: [], records: [{ kind: 'widget', id: 'one' }] });
    await simulation.start();
    expect(await simulation.getRecord('widget', 'one')).toBeNull();
    simulation.setRecord({ kind: 'widget', id: 'one', revision: 2, data: { title: 'New' } });
    simulation.setRecord({ kind: 'widget', id: 'one', revision: 1, data: { title: 'Old' } });
    expect((await simulation.getRecord('widget', 'one'))?.data).toEqual({ title: 'New' });
    await expect(simulation.getRecord('widget', 'other')).rejects.toThrow('not subscribed');
    simulation.stop();
  });

  it('routes alert and minigame stage frames and isolates state handlers', async () => {
    const simulation = createSimulation({ events: ['stage.alert', 'stage.minigame'] });
    const alert = vi.fn();
    const minigame = vi.fn();
    simulation.onState(() => { throw new Error('page rendering failed'); });
    simulation.onEvent('stage.alert', alert);
    simulation.onEvent('stage.minigame', minigame);
    await simulation.start();
    simulation.emit({ type: 'stage', kind: 'alert', op: 'play' });
    simulation.emit({ type: 'stage', kind: 'minigame', op: 'play' });
    expect(alert).toHaveBeenCalledTimes(1);
    expect(minigame).toHaveBeenCalledTimes(1);
    simulation.stop();
  });
});
