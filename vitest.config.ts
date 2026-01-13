import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      exclude: ['src/index.ts', 'src/**/*.d.ts', 'dist/**', 'test/**'],
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
    },
    environment: 'node',
    globals: true,
  },
});
