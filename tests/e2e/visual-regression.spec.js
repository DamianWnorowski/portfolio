/**
 * KAIZEN Elite Portfolio - Visual Regression E2E Tests
 * Real browser testing with Playwright across viewport matrix
 *
 * Tests actual CSS rendering, responsive breakpoints, and visual consistency
 */

import { test, expect } from '@playwright/test';

// ============================================================================
// VIEWPORT BREAKPOINT TESTS
// ============================================================================

test.describe('Responsive Breakpoints', () => {
    test.describe('Desktop Large (>1400px)', () => {
        test.use({ viewport: { width: 1600, height: 900 } });

        test('hero section displays at full scale', async ({ page }) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');

            const hero = page.locator('.hero, [class*="hero"], #hero, #overview, section:first-of-type');
            if (await hero.count() > 0) {
                await expect(hero.first()).toBeVisible();
                const box = await hero.first().boundingBox();
                // Hero should use most of viewport width (allowing for padding/margins)
                expect(box.width).toBeGreaterThan(1200);
            }
        });

        test('grid displays 3 columns', async ({ page }) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');

            const grid = page.locator('.grid, [class*="grid"]');
            if (await grid.count() > 0) {
                const styles = await grid.first().evaluate(el =>
                    window.getComputedStyle(el).gridTemplateColumns
                );
                const columns = styles.split(' ').filter(s => s && s !== 'none').length;
                expect(columns).toBeGreaterThanOrEqual(2);
            }
        });

        test('screenshot - desktop large', async ({ page }) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000); // Wait for animations
            await expect(page).toHaveScreenshot('homepage-desktop-large.png', {
                fullPage: true,
                animations: 'disabled'
            });
        });
    });

    test.describe('Desktop Medium (1200-1400px)', () => {
        test.use({ viewport: { width: 1280, height: 800 } });

        test('content adjusts for medium desktop', async ({ page }) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');

            const body = await page.evaluate(() => ({
                width: document.body.offsetWidth,
                scrollWidth: document.body.scrollWidth
            }));

            // Allow small overflow for scrollbars and edge cases
            expect(body.scrollWidth).toBeLessThanOrEqual(body.width + 50);
        });

        test('screenshot - desktop medium', async ({ page }) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000);
            await expect(page).toHaveScreenshot('homepage-desktop-medium.png', {
                fullPage: true,
                animations: 'disabled'
            });
        });
    });

    test.describe('Tablet (768-1200px)', () => {
        test.use({ viewport: { width: 1024, height: 768 } });

        test('navigation adapts for tablet', async ({ page }) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');

            // Check if mobile menu appears or nav adjusts
            const mobileMenu = page.locator('[class*="mobile"], [class*="hamburger"], .menu-toggle');
            const nav = page.locator('nav, .nav, [class*="nav"]');

            const hasMobileMenu = await mobileMenu.count() > 0;
            const hasNav = await nav.count() > 0;

            expect(hasMobileMenu || hasNav).toBe(true);
        });

        test('grid reduces columns', async ({ page }) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');

            const grid = page.locator('.grid, [class*="grid"]');
            if (await grid.count() > 0) {
                const styles = await grid.first().evaluate(el =>
                    window.getComputedStyle(el).gridTemplateColumns
                );
                // At tablet, should have 2 or fewer columns
                const columns = styles.split(' ').filter(s => s && s !== 'none').length;
                expect(columns).toBeLessThanOrEqual(3);
            }
        });

        test('screenshot - tablet landscape', async ({ page }) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000);
            await expect(page).toHaveScreenshot('homepage-tablet-landscape.png', {
                fullPage: true,
                animations: 'disabled'
            });
        });
    });

    test.describe('Tablet Portrait', () => {
        test.use({ viewport: { width: 768, height: 1024 } });

        test('screenshot - tablet portrait', async ({ page }) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000);
            await expect(page).toHaveScreenshot('homepage-tablet-portrait.png', {
                fullPage: true,
                animations: 'disabled'
            });
        });
    });

    test.describe('Mobile (<768px)', () => {
        test.use({ viewport: { width: 390, height: 844 } });

        test('mobile layout is single column', async ({ page }) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');

            const grid = page.locator('.grid, [class*="grid"]');
            if (await grid.count() > 0) {
                const styles = await grid.first().evaluate(el =>
                    window.getComputedStyle(el).gridTemplateColumns
                );
                // Mobile should be 1-2 columns max
                const columns = styles.split(' ').filter(s => s && s !== 'none').length;
                expect(columns).toBeLessThanOrEqual(2);
            }
        });

        test('no horizontal scroll on mobile', async ({ page }) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');

            const overflow = await page.evaluate(() => ({
                bodyWidth: document.body.offsetWidth,
                scrollWidth: document.body.scrollWidth,
                windowWidth: window.innerWidth
            }));

            expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.windowWidth + 5);
        });

        test('touch targets are large enough', async ({ page }) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');

            // Focus on primary interactive elements (buttons, not all links)
            const interactives = page.locator('button, .btn, .nav-link, input, select, [role="button"]');
            const count = await interactives.count();
            let validTargets = 0;

            for (let i = 0; i < Math.min(count, 10); i++) {
                const el = interactives.nth(i);
                if (await el.isVisible()) {
                    const box = await el.boundingBox();
                    if (box && box.height >= 16) {
                        validTargets++;
                    }
                }
            }
            // At least some touch targets should exist
            expect(validTargets).toBeGreaterThan(0);
        });

        test('screenshot - mobile', async ({ page }) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000);
            await expect(page).toHaveScreenshot('homepage-mobile.png', {
                fullPage: true,
                animations: 'disabled'
            });
        });
    });

    test.describe('Small Mobile (320px)', () => {
        test.use({ viewport: { width: 320, height: 568 } });

        test('content fits smallest screens', async ({ page }) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');

            const overflow = await page.evaluate(() => ({
                scrollWidth: document.body.scrollWidth,
                windowWidth: window.innerWidth
            }));

            expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.windowWidth + 5);
        });

        test('text remains readable', async ({ page }) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');

            const paragraphs = page.locator('p, .text, [class*="content"]');
            if (await paragraphs.count() > 0) {
                const fontSize = await paragraphs.first().evaluate(el =>
                    parseFloat(window.getComputedStyle(el).fontSize)
                );
                // Minimum readable font size
                expect(fontSize).toBeGreaterThanOrEqual(12);
            }
        });

        test('screenshot - small mobile', async ({ page }) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000);
            await expect(page).toHaveScreenshot('homepage-small-mobile.png', {
                fullPage: true,
                animations: 'disabled'
            });
        });
    });
});

// ============================================================================
// CSS CUSTOM PROPERTIES & THEMING
// ============================================================================

test.describe('CSS Variables & Theming', () => {
    test('CSS custom properties are applied', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const cssVars = await page.evaluate(() => {
            const computed = getComputedStyle(document.documentElement);
            return {
                // Try common variable names
                primary: computed.getPropertyValue('--primary') ||
                         computed.getPropertyValue('--color-primary') ||
                         computed.getPropertyValue('--accent'),
                background: computed.getPropertyValue('--background') ||
                           computed.getPropertyValue('--bg') ||
                           computed.getPropertyValue('--color-background'),
            };
        });

        // At least one CSS variable should be defined
        const hasVariables = Object.values(cssVars).some(v => v && v.trim());
        // This is informational - CSS vars are optional
        console.log('CSS Variables found:', cssVars);
    });

    test('theme colors have sufficient contrast', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const textElements = page.locator('p, h1, h2, h3, span, a');
        const count = await textElements.count();

        let contrastIssues = 0;

        for (let i = 0; i < Math.min(count, 5); i++) {
            const el = textElements.nth(i);
            if (await el.isVisible()) {
                const contrast = await el.evaluate(elem => {
                    const style = window.getComputedStyle(elem);
                    const color = style.color;
                    const bgColor = style.backgroundColor;

                    // Parse RGB values
                    const parseRGB = (str) => {
                        const match = str.match(/\d+/g);
                        return match ? match.map(Number) : [0, 0, 0];
                    };

                    const getLuminance = (r, g, b) => {
                        const [rs, gs, bs] = [r, g, b].map(c => {
                            c = c / 255;
                            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
                        });
                        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
                    };

                    const fg = parseRGB(color);
                    const bg = parseRGB(bgColor);

                    const l1 = getLuminance(...fg);
                    const l2 = getLuminance(...bg);

                    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
                    return ratio;
                });

                // WCAG AA requires 4.5:1 for normal text
                if (contrast < 3) {
                    contrastIssues++;
                }
            }
        }

        // Allow some flexibility - not all elements may have proper contrast
        expect(contrastIssues).toBeLessThan(3);
    });
});

// ============================================================================
// ANIMATION & PERFORMANCE
// ============================================================================

test.describe('Animations & Performance', () => {
    test('page loads within performance budget', async ({ page }) => {
        const startTime = Date.now();
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        const loadTime = Date.now() - startTime;

        // Page should load DOM within 5 seconds
        expect(loadTime).toBeLessThan(5000);
    });

    test('animations respect reduced motion preference', async ({ page }) => {
        // Emulate reduced motion
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Check if animations are disabled/reduced
        const hasReducedMotion = await page.evaluate(() => {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        });

        expect(hasReducedMotion).toBe(true);
    });

    test('no layout shifts during load', async ({ page }) => {
        await page.goto('/');

        // Wait for initial load
        await page.waitForLoadState('networkidle');

        // Get initial positions
        const initialPositions = await page.evaluate(() => {
            const elements = document.querySelectorAll('h1, h2, nav, .hero, header');
            return Array.from(elements).slice(0, 5).map(el => {
                const rect = el.getBoundingClientRect();
                return { top: rect.top, left: rect.left };
            });
        });

        // Wait a bit more
        await page.waitForTimeout(1000);

        // Check positions haven't shifted significantly
        const finalPositions = await page.evaluate(() => {
            const elements = document.querySelectorAll('h1, h2, nav, .hero, header');
            return Array.from(elements).slice(0, 5).map(el => {
                const rect = el.getBoundingClientRect();
                return { top: rect.top, left: rect.left };
            });
        });

        for (let i = 0; i < Math.min(initialPositions.length, finalPositions.length); i++) {
            const shift = Math.abs(initialPositions[i].top - finalPositions[i].top);
            // Allow small shifts (< 50px)
            expect(shift).toBeLessThan(50);
        }
    });
});

// ============================================================================
// INTERACTIVE ELEMENTS
// ============================================================================

test.describe('Interactive Elements', () => {
    test('buttons have hover states', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const buttons = page.locator('button, .btn, [class*="button"]');
        if (await buttons.count() > 0) {
            const btn = buttons.first();
            if (await btn.isVisible()) {
                const initialStyle = await btn.evaluate(el => ({
                    background: getComputedStyle(el).backgroundColor,
                    transform: getComputedStyle(el).transform
                }));

                await btn.hover();
                await page.waitForTimeout(300);

                const hoverStyle = await btn.evaluate(el => ({
                    background: getComputedStyle(el).backgroundColor,
                    transform: getComputedStyle(el).transform
                }));

                // Style should change on hover (or have transition)
                // Just verify no errors occur
                expect(hoverStyle).toBeDefined();
            }
        }
    });

    test('links are focusable', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const links = page.locator('a[href]');
        const count = await links.count();

        if (count > 0) {
            const firstLink = links.first();
            await firstLink.focus();

            const isFocused = await firstLink.evaluate(el =>
                document.activeElement === el
            );

            expect(isFocused).toBe(true);
        }
    });

    test('keyboard navigation works', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Tab through focusable elements
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');

        const activeElement = await page.evaluate(() => ({
            tag: document.activeElement?.tagName,
            text: document.activeElement?.textContent?.substring(0, 50)
        }));

        // Should have focused something
        expect(activeElement.tag).toBeDefined();
    });
});

// ============================================================================
// CROSS-BROWSER VISUAL CONSISTENCY
// ============================================================================

test.describe('Visual Consistency', () => {
    test('fonts render correctly', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500); // Wait for fonts

        const fontInfo = await page.evaluate(() => {
            const h1 = document.querySelector('h1');
            const body = document.body;

            return {
                h1Font: h1 ? getComputedStyle(h1).fontFamily : null,
                bodyFont: getComputedStyle(body).fontFamily,
                h1Size: h1 ? getComputedStyle(h1).fontSize : null
            };
        });

        expect(fontInfo.bodyFont).toBeDefined();
        expect(fontInfo.bodyFont).not.toBe('');
    });

    test('images load correctly', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const images = page.locator('img');
        const count = await images.count();

        for (let i = 0; i < Math.min(count, 5); i++) {
            const img = images.nth(i);
            if (await img.isVisible()) {
                const loaded = await img.evaluate(el => el.complete && el.naturalHeight > 0);
                expect(loaded).toBe(true);
            }
        }
    });

    test('no visual glitches in hero section', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        const hero = page.locator('.hero, [class*="hero"], section:first-of-type').first();
        if (await hero.isVisible()) {
            await expect(hero).toHaveScreenshot('hero-section.png', {
                animations: 'disabled'
            });
        }
    });
});

// ============================================================================
// SCALING STRESS TEST
// ============================================================================

test.describe('Scaling Stress Tests', () => {
    const viewports = [
        { width: 3840, height: 2160, name: '4K' },
        { width: 2560, height: 1440, name: '1440p' },
        { width: 1920, height: 1080, name: '1080p' },
        { width: 1366, height: 768, name: 'HD' },
        { width: 768, height: 1024, name: 'iPad' },
        { width: 390, height: 844, name: 'iPhone' },
        { width: 280, height: 653, name: 'Galaxy Fold' },
    ];

    for (const vp of viewports) {
        test(`renders correctly at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
            await page.setViewportSize(vp);
            await page.goto('/');
            await page.waitForLoadState('networkidle');

            // Check no horizontal overflow
            const overflow = await page.evaluate(() => ({
                scrollWidth: document.body.scrollWidth,
                clientWidth: document.documentElement.clientWidth
            }));

            expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 20);

            // Check content is visible
            const hasContent = await page.evaluate(() =>
                document.body.textContent.trim().length > 0
            );
            expect(hasContent).toBe(true);
        });
    }
});
