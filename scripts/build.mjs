import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
await mkdir(resolve(root, 'dist'), { recursive: true });
execFileSync(process.platform === 'win32' ? 'tsc.cmd' : 'tsc', ['-p', 'tsconfig.json'], { cwd: root, stdio: 'inherit' });
await build({
  entryPoints: [resolve(root, 'src/browser.ts')],
  outfile: resolve(root, 'dist/browser.global.js'),
  bundle: true,
  format: 'iife',
  globalName: 'BloopbotOverlay',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  sourcemap: true,
});
