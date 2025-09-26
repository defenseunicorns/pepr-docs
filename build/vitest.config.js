import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.?(m)js'],
    environment: 'node',
    reporters: ['verbose'],
    pool: 'threads',
    testTimeout: 60000,
    globalSetup: [],
    setupFiles: []
  }
});
