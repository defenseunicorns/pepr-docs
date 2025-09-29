import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.?(m)js'],
    environment: 'node',
    reporters: ['verbose'],
    pool: 'threads',
    globalSetup: [],
    setupFiles: []
  }
});
