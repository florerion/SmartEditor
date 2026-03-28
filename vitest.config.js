import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup/vitest.setup.js'],
    include: ['tests/**/*.test.js'],
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.js'],
      exclude: [
        'src/index.js',
        'src/adapters/**',
        'vendor/**',
        'demo/**',
      ],
      thresholds: {
        lines: 45,
        functions: 42,
        branches: 29,
        statements: 42,
      },
    },
  },
});
