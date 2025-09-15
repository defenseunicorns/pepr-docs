import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Match the same pattern as Jest was using
    include: ['**/?(*.)test.?(m)js'],
    // Enable ES modules and modern features
    environment: 'node',
    // Better error reporting
    reporters: ['verbose'],
    // Run tests in parallel for better performance
    pool: 'threads'
  }
});