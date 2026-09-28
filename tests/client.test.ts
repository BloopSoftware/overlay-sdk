import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocket, WebSocketServer } from 'ws';
import { createOverlay, EVENT_FAMILIES } from '../src/index.js';

const subscriptions = {
  events: ['follow', 'stage.media', 'leaderboard'] as const,
  variables: ['score'],
  messages: [],
  boards: ['loyalty'] as const,
  records: [],
};

describe('published overlay client', () => {
  let server: WebSocketServer;
  let url: string;

  beforeEach(async () => {
    vi.stubGlobal('WebSocket', WebSocket);
    server = new WebSocketServer({ port: 0 });
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (typeof address === 'string' || !address) throw new Error('Missing test server address');
    url = `ws://127.0.0.1:${address.port}/overlay/test-token`;
  });

  afterEach(async () => {
    for (const client of server.clients) client.terminate();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    vi.unstubAllGlobals();
  });

  it('has the complete typed family list', () => {
    expect(EVENT_FAMILIES).toContain('follow');
    expect(EVENT_FAMILIES).toContain('stage.media');
    expect(EVENT_FAMILIES).toContain('leaderboard');
  });

  it('sends a V2 hello, applies state, and isolates a failing handler', async () => {
    const received: unknown[] = [];
    server.on('connection', (socket) => {
      socket.once('message', (data) => {
        received.push(JSON.parse(String(data)));
        socket.send(JSON.stringify({
          type: 'sdk.subscribed', version: 2, revision: 4,
          accepted: { events: ['follow', 'stage.media'], variables: ['score'], messages: [], boards: [], records: [] },
          rejected: [{ kind: 'board', name: 'loyalty', reason: 'not_granted' }],
        }));
        socket.send(JSON.stringify({ type: 'vars', values: { score: 5 } }));
        socket.send(JSON.stringify({ type: 'follow', name: 'Ada' }));
        socket.send(JSON.stringify({ type: 'stage', kind: 'media', op: 'play' }));
      });
    });
    const overlay = createOverlay(subscriptions, { url });
    const frames: string[] = [];
    const diagnostics: string[] = [];
    overlay.onDiagnostic((value) => diagnostics.push(value.code));
    overlay.onEvent('follow', () => { throw new Error('private handler error'); });
    overlay.onEvent('follow', (frame) => frames.push(String(frame.name)));
    overlay.onEvent('stage.media', () => frames.push('media'));
    await overlay.start();
    await vi.waitFor(() => expect(frames).toEqual(['Ada', 'media']));
    expect(received).toEqual([{
      hello: 'overlay-sdk', version: 2,
      subscribe: { events: ['follow', 'stage.media', 'leaderboard'], variables: ['score'], messages: [], boards: ['loyalty'], records: [] },
    }]);
    expect(overlay.state.status).toBe('ready');
    expect(overlay.state.revision).toBe(4);
    expect(overlay.state.variables).toEqual({ score: 5 });
    expect(diagnostics).toEqual(['subscription_rejected', 'handler_error']);
    overlay.stop();
    expect(overlay.state.status).toBe('stopped');
  });

  it('buffers a replay frame until the subscription acknowledgement', async () => {
    server.on('connection', (socket) => {
      socket.once('message', () => {
        socket.send(JSON.stringify({ type: 'follow', name: 'Early' }));
        socket.send(JSON.stringify({
          type: 'sdk.subscribed', version: 2, revision: 1,
          accepted: { events: ['follow'], variables: [], messages: [], boards: [], records: [] }, rejected: [],
        }));
      });
    });
    const overlay = createOverlay(subscriptions, { url });
    const states: string[] = [];
    overlay.onState((state) => states.push(state.status));
    overlay.onEvent('follow', () => expect(overlay.state.status).toBe('ready'));
    await overlay.start();
    await vi.waitFor(() => expect(overlay.state.lastEventAt).not.toBeNull());
    expect(states).toContain('ready');
    overlay.stop();
  });

  it('uses the OBS ws query parameter and allows an explicit local override', async () => {
    vi.stubGlobal('location', { href: `https://example.test/overlay.html?ws=${encodeURIComponent(url)}` });
    server.on('connection', (socket) => socket.once('message', () => socket.send(JSON.stringify({
      type: 'sdk.subscribed', version: 2, revision: 1,
      accepted: { events: [], variables: [], messages: [], boards: [], records: [] }, rejected: [],
    }))));
    const fromQuery = createOverlay(subscriptions);
    await fromQuery.start();
    fromQuery.stop();
    const fromOverride = createOverlay(subscriptions, { url });
    await fromOverride.start();
    fromOverride.stop();
  });

  it('rejects malformed subscriptions and an unsupported server', async () => {
    expect(() => createOverlay({ events: [] }, { url: 'https://example.test' })).not.toThrow();
    expect(() => createOverlay({ events: [], variables: ['bad name'] })).toThrow(TypeError);
    server.on('connection', (socket) => socket.once('message', () => socket.send(JSON.stringify({ hello: 'legacy' }))));
    const overlay = createOverlay(subscriptions, { url, handshakeTimeoutMs: 30, reconnect: false });
    const diagnostics: string[] = [];
    overlay.onDiagnostic((item) => diagnostics.push(item.code));
    await expect(overlay.start()).rejects.toThrow('handshake failed');
    expect(diagnostics).toContain('unsupported_server');
    overlay.stop();
  });

  it('rejects a missing or unsafe URL before opening a socket', async () => {
    vi.stubGlobal('location', { href: 'https://example.test/overlay.html' });
    await expect(createOverlay(subscriptions).start()).rejects.toThrow('Missing overlay WebSocket URL');
    await expect(createOverlay(subscriptions, { url: 'https://example.test/token' }).start()).rejects.toThrow('ws or wss');
    expect(() => createOverlay(subscriptions, { handshakeTimeoutMs: 0 })).toThrow(TypeError);
    vi.stubGlobal('WebSocket', undefined);
    await expect(createOverlay(subscriptions, { url }).start()).rejects.toThrow('unavailable');
  });

  it('marks revoked access expired without reconnecting', async () => {
    let connections = 0;
    server.on('connection', (socket) => {
      connections += 1;
      socket.once('message', () => {
        socket.send(JSON.stringify({
          type: 'sdk.subscribed', version: 2, revision: 1,
          accepted: { events: [], variables: [], messages: [], boards: [], records: [] }, rejected: [],
        }));
        setTimeout(() => socket.close(1008, 'Access changed'), 10);
      });
    });
    const overlay = createOverlay(subscriptions, { url });
    const diagnostics: string[] = [];
    overlay.onDiagnostic((item) => diagnostics.push(item.code));
    await overlay.start();
    await vi.waitFor(() => expect(overlay.state.status).toBe('expired'));
    await new Promise((resolve) => setTimeout(resolve, 550));
    expect(connections).toBe(1);
    expect(diagnostics).toContain('access_expired');
    overlay.stop();
  });

  it('rejects a pending start when stopped and ignores malformed frames', async () => {
    server.on('connection', (socket) => socket.once('message', () => {
      socket.send('not json');
      socket.send(JSON.stringify({ type: 'sdk.subscribed', version: 1 }));
    }));
    const overlay = createOverlay(subscriptions, { url });
    const diagnostics: string[] = [];
    overlay.onDiagnostic(() => { throw new Error('diagnostic display failed'); });
    overlay.onDiagnostic((item) => diagnostics.push(item.code));
    const starting = overlay.start();
    await vi.waitFor(() => expect(diagnostics).toContain('invalid_frame'));
    overlay.stop();
    await expect(starting).rejects.toThrow('stopped');
    expect(overlay.state.status).toBe('stopped');
  });

  it('marks state stale and reconnects after an ordinary close', async () => {
    let connections = 0;
    server.on('connection', (socket) => {
      connections += 1;
      socket.once('message', () => {
        socket.send(JSON.stringify({
          type: 'sdk.subscribed', version: 2, revision: connections,
          accepted: { events: [], variables: [], messages: [], boards: [], records: [] }, rejected: [],
        }));
        if (connections === 1) setTimeout(() => socket.close(1012, 'Restart'), 10);
      });
    });
    const overlay = createOverlay(subscriptions, { url });
    const states: string[] = [];
    overlay.onState((state) => states.push(state.status));
    await overlay.start();
    await vi.waitFor(() => expect(connections).toBe(2), { timeout: 1500 });
    await vi.waitFor(() => expect(overlay.state.revision).toBe(2));
    expect(states).toContain('stale');
    overlay.stop();
  });

  it('reads only requested records and keeps the newest live revision', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      kind: 'widget', id: 'one', revision: 2, data: { title: 'Initial' },
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', mockFetch);
    server.on('connection', (socket) => socket.once('message', () => {
      socket.send(JSON.stringify({
        type: 'sdk.subscribed', version: 2, revision: 1,
        accepted: { events: [], variables: [], messages: [], boards: [], records: [{ kind: 'widget', id: 'one' }] }, rejected: [],
      }));
      socket.send(JSON.stringify({ type: 'sdk.record', kind: 'widget', id: 'one', revision: 3, data: { title: 'Live' } }));
    }));
    const overlay = createOverlay({ events: [], records: [{ kind: 'widget', id: 'one' }] }, { url });
    await overlay.start();
    await vi.waitFor(() => expect(overlay.state.records['widget:one']?.revision).toBe(3));
    expect(await overlay.getRecord('widget', 'one')).toEqual({
      kind: 'widget', id: 'one', revision: 3, data: { title: 'Live' },
    });
    expect(String(mockFetch.mock.calls[0][0])).toContain('/overlay-sdk/v2/records/test-token/widget/one');
    await expect(overlay.getRecord('widget', 'two')).rejects.toThrow('not subscribed');
    overlay.stop();
  });

  it('handles missing, denied, and malformed record responses without exposing the credential', async () => {
    const overlay = createOverlay({ events: [], records: [{ kind: 'theme', id: 'one' }] }, { url });
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }));
    expect(await overlay.getRecord('theme', 'one')).toBeNull();
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 403 }));
    await expect(overlay.getRecord('theme', 'one')).rejects.toThrow('Overlay record unavailable');
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ kind: 'theme', id: 'other', revision: 1, data: {} }), { status: 200 }));
    await expect(overlay.getRecord('theme', 'one')).rejects.toThrow('Invalid overlay record response');
    await expect(overlay.getRecord('theme', '../invalid')).rejects.toThrow(TypeError);
    vi.stubGlobal('fetch', undefined);
    await expect(overlay.getRecord('theme', 'one')).rejects.toThrow('Fetch is unavailable');
  });
});
