/**
 * KAIZEN Elite Portfolio - Playwright Visual Regression Configuration
 * Comprehensive viewport matrix for real browser testing
 */

import { defineConfig, devices } from '@playwright/test';

/**
 * Viewport Matrix - Tests across all major breakpoints
 * Matches CSS breakpoints: 1400px, 1200px, 768px
 */
const VIEWPORT_MATRIX = [
    // Ultra-wide 4K
    { name: 'ultrawide-4k', viewport: { width: 3840, height: 2160 } },
    // Standard 1080p Desktop
    { name: 'desktop-1080p', viewport: { width: 1920, height: 1080 } },
    // Large Desktop (above 1400px breakpoint)
    { name: 'desktop-large', viewport: { width: 1600, height: 900 } },
    // Medium Desktop (1200-1400px breakpoint)
    { name: 'desktop-medium', viewport: { width: 1280, height: 800 } },
    // Small Desktop / Large Tablet (768-1200px breakpoint)
    { name: 'tablet-landscape', viewport: { width: 1024, height: 768 } },
    // Tablet Portrait
    { name: 'tablet-portrait', viewport: { width: 768, height: 1024 } },
    // Large Phone
    { name: 'phone-large', viewport: { width: 428, height: 926 } },
    // Standard Phone
    { name: 'phone-standard', viewport: { width: 390, height: 844 } },
    // Small Phone
    { name: 'phone-small', viewport: { width: 320, height: 568 } },
];

export default defineConfig({
    testDir: './tests/e2e',

    /* Run tests in files in parallel */
    fullyParallel: true,

    /* Fail the build on CI if you accidentally left test.only in the source code */
    forbidOnly: !!process.env.CI,

    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,

    /* Opt out of parallel tests on CI */
    workers: process.env.CI ? 1 : undefined,

    /* Reporter to use */
    reporter: [
        ['html', { outputFolder: 'playwright-report' }],
        ['json', { outputFile: 'test-results/results.json' }],
        ['list']
    ],

    /* Shared settings for all the projects below */
    use: {
        /* Base URL for all tests */
        baseURL: 'http://localhost:5173',

        /* Collect trace when retrying the failed test */
        trace: 'on-first-retry',

        /* Screenshot on failure */
        screenshot: 'only-on-failure',

        /* Video on failure */
        video: 'retain-on-failure',
    },

    /* Configure projects for major browsers and viewports */
    projects: [
        // Chromium across all viewports
        ...VIEWPORT_MATRIX.map(v => ({
            name: `chromium-${v.name}`,
            use: {
                ...devices['Desktop Chrome'],
                viewport: v.viewport,
            },
        })),

        // Firefox key viewports
        {
            name: 'firefox-desktop',
            use: { ...devices['Desktop Firefox'] },
        },
        {
            name: 'firefox-mobile',
            use: { ...devices['Desktop Firefox'], viewport: { width: 390, height: 844 } },
        },

        // WebKit key viewports
        {
            name: 'webkit-desktop',
            use: { ...devices['Desktop Safari'] },
        },
        {
            name: 'webkit-mobile',
            use: { ...devices['iPhone 13'] },
        },

        // Mobile devices
        {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] },
        },
        {
            name: 'Mobile Safari',
            use: { ...devices['iPhone 13'] },
        },
    ],

    /* Local dev server before starting tests */
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },

    /* Visual comparison options */
    expect: {
        toHaveScreenshot: {
            maxDiffPixels: 100,
            maxDiffPixelRatio: 0.01,
            threshold: 0.2,
            animations: 'disabled',
        },
    },

    /* Output folder for test artifacts */
    outputDir: 'test-results/',

    /* Snapshot path template */
    snapshotPathTemplate: '{testDir}/__snapshots__/{testFilePath}/{arg}{-projectName}{ext}',
});

export { VIEWPORT_MATRIX };
