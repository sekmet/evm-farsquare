import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      '~backend': path.resolve(__dirname, '../backend'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup/happy-dom.ts'],
    css: true,
    // Enhanced test configuration for better coverage and reliability
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
        'coverage/',
        '**/*.test.*',
        '**/*.spec.*',
        'vite-env.d.ts',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    // Test timeout and retry configuration
    testTimeout: 10000,
    retry: 2,
    // Parallel test execution for better performance
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
    // Reporter configuration for better test output
    reporters: process.env.CI ? ['verbose', 'github-actions'] : ['verbose'],
    // Environment variables for testing
    env: {
      VITE_API_BASE_URL: 'http://localhost:3000',
      VITE_DEMO_MODE: 'true',
    },
  },
});
