// portflio/tests/e2e/navigation.spec.js
import { test, expect } from '@playwright/test';

async function intersectsViewport(locator) {
    return locator.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight;
        const vw = window.innerWidth || document.documentElement.clientWidth;
        return rect.bottom > 0 && rect.right > 0 && rect.top < vh && rect.left < vw;
    });
}

test.describe('Navigation', () => {
    // Ensure nav is visible regardless of the project/device matrix.
    test.use({ viewport: { width: 1280, height: 800 } });

    test('loads the SPA shell', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/KAIZEN/i);
        await expect(page.locator('header.top-bar')).toBeVisible();
        await expect(page.locator('#app')).toBeVisible();
        await expect(page.locator('h1')).toHaveText(/Damian Wnorowski/i);
    });

    test('top nav updates hash and active state', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('.nav-links')).toBeVisible();

        const cases = [
            { text: 'OVERVIEW', hash: '#sidebar', target: '#sidebar' },
            { text: 'ASSETS', hash: '#assets-panel', target: '#assets-panel' },
            { text: 'METRICS', hash: '#viewport', target: '#viewport' },
            { text: 'TERMINAL', hash: '#terminal-panel', target: '#terminal-panel' },
        ];

        for (const c of cases) {
            const link = page.locator('.nav-link', { hasText: c.text });
            await expect(link).toBeVisible();
            await link.click();

            await expect(page).toHaveURL(new RegExp(`${c.hash}$`));
            await expect(link).toHaveClass(/active/);

            const target = page.locator(c.target);
            await expect.poll(() => intersectsViewport(target)).toBe(true);
        }
    });
});

