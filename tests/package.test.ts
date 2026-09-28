import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const packageRoot = resolve(import.meta.dirname, '..');

describe('release artifacts', () => {
  it('builds a usable browser global and an ESM entry from one package', async () => {
    execFileSync(process.execPath, [resolve(packageRoot, 'scripts/build.mjs')], { cwd: packageRoot });
    const code = readFileSync(resolve(packageRoot, 'dist/browser.global.js'), 'utf8');
    const context: Record<string, unknown> = {};
    runInNewContext(code, context);
    const global = context.BloopbotOverlay as { createOverlay?: unknown; createSimulation?: unknown; EVENT_FAMILIES?: string[] };
    expect(typeof global.createOverlay).toBe('function');
    expect(typeof global.createSimulation).toBe('function');
    expect(global.EVENT_FAMILIES).toContain('follow');
    const esm = await import(pathToFileURL(resolve(packageRoot, 'dist/index.js')).href);
    expect(esm.EVENT_FAMILIES).toEqual(global.EVENT_FAMILIES);
  });
});
