import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/browser.ts', 'src/index.ts', 'src/types.ts'],
      reporter: ['text', 'json', 'html'],
      thresholds: { statements: 90, branches: 85, functions: 90, lines: 90 },
    },
  },
});
