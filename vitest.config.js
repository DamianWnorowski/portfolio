import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Environment
        environment: 'jsdom',

        // Global setup
        globals: true,

        // Include patterns
        include: [
            'tests/**/*.test.js',
            'tests/**/*.spec.js'
        ],

        // Exclude patterns
        exclude: [
            'node_modules',
            'dist',
            '.git',
            'tests/e2e/**/*.spec.js'  // E2E tests use Playwright, not Vitest
        ],

        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'tests/',
                '**/*.config.js',
                '**/api/**'
            ],
            include: [
                'src/**/*.js'
            ],
            thresholds: {
                global: {
                    branches: 70,
                    functions: 70,
                    lines: 70,
                    statements: 70
                }
            }
        },

        // Reporters
        reporters: ['default'],

        // Timeout
        testTimeout: 10000,

        // Setup files
        setupFiles: ['./tests/setup.js'],

        // Mock reset - disabled to allow setup mocks to persist
        mockReset: false,
        restoreMocks: false,
        clearMocks: true,

        // Watch exclude
        watchExclude: [
            'node_modules',
            'dist'
        ],

        // Pool config for better isolation
        pool: 'forks',

        // Disable concurrent test execution within files to prevent state leakage
        fileParallelism: false,

        // Sequence
        sequence: {
            shuffle: false,
            concurrent: false
        }
    }
});
