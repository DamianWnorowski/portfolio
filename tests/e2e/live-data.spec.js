import { test, expect } from '@playwright/test';

const previewBase = process.env.PLAYWRIGHT_BASE_URL;

test.describe('Live data (Preview/Prod only)', () => {
    test.beforeEach(async () => {
        test.skip(!previewBase, 'Requires PLAYWRIGHT_BASE_URL (Vercel Preview/Prod).');
    });

    test('APIs respond and UI leaves CONNECTING state', async ({ page }) => {
        await page.goto('/');

        // GitHub projects API should always respond (even if empty/fallback)
        const projectsRes = await page.request.get('/api/github/projects');
        expect(projectsRes.ok()).toBeTruthy();
        const projectsJson = await projectsRes.json();
        expect(Array.isArray(projectsJson.projects)).toBeTruthy();

        // Metrics API should always respond (db or fallback)
        const metricsRes = await page.request.get('/api/metrics');
        expect(metricsRes.ok()).toBeTruthy();
        const metricsJson = await metricsRes.json();
        expect(metricsJson.metrics).toBeTruthy();
        expect(typeof metricsJson.metrics.cpu).toBe('number');
        expect(typeof metricsJson.metrics.memory).toBe('number');

        const status = page.locator('#github-projects-status');
        await expect(status).toBeVisible();

        // Give the widget time to fetch/stream and move off CONNECTING.
        await expect
            .poll(async () => (await status.textContent())?.trim() || '')
            .not.toBe('CONNECTING');
    });

    test('metrics SSE emits at least one event', async ({ page }) => {
        await page.goto('/');

        const got = await page.evaluate(() => new Promise((resolve) => {
            const es = new EventSource('/api/metrics/stream');
            const timeout = setTimeout(() => {
                es.close();
                resolve(false);
            }, 8000);

            es.onmessage = (ev) => {
                try {
                    const data = JSON.parse(ev.data);
                    if (data && data.metrics) {
                        clearTimeout(timeout);
                        es.close();
                        resolve(true);
                    }
                } catch {
                    // ignore parse errors
                }
            };

            es.onerror = () => {
                clearTimeout(timeout);
                es.close();
                resolve(false);
            };
        }));

        expect(got).toBeTruthy();
    });
});

