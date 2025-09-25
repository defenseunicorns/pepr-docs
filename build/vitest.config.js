import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Match both unit tests and integration tests
    include: ['**/?(*.)@(unit.test|test).?(m)js'],
    // Enable ES modules and modern features
    environment: 'node',
    // Better error reporting
    reporters: ['verbose'],
    // Run tests in parallel for better performance, but limit for integration tests
    pool: 'threads',
    // Longer timeout for integration tests
    testTimeout: 60000,
    // Setup files if needed
    globalSetup: [],
    setupFiles: []
  }
});
