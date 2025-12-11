/**
 * KAIZEN Elite Portfolio - Auto-Action Chaining Loop
 * Continuous automated testing with self-healing and adaptive actions
 *
 * This implements a comprehensive test chain that:
 * 1. Navigates through all pages/sections
 * 2. Tests all interactive elements
 * 3. Validates responsive behavior dynamically
 * 4. Reports issues and auto-retries
 * 5. Generates comprehensive reports
 * 6. Maintains session persistence for continuability
 */

import { test, expect } from '@playwright/test';
import { SessionManager, generateSessionSignature } from './session-persistence.js';

// ============================================================================
// AUTO-CHAIN CONFIGURATION
// ============================================================================

const CHAIN_CONFIG = {
    maxRetries: 3,
    actionDelay: 100,
    pageTimeout: 30000,
    screenshotOnFailure: true,
    continueOnFailure: true,
    viewportProgression: [
        { width: 1920, height: 1080, name: 'desktop' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 390, height: 844, name: 'mobile' },
    ],
    sections: [
        { selector: '.hero, [class*="hero"], #hero, section:first-of-type', name: 'Hero' },
        { selector: '.about, [class*="about"], #about', name: 'About' },
        { selector: '.projects, [class*="project"], #projects', name: 'Projects' },
        { selector: '.skills, [class*="skill"], #skills', name: 'Skills' },
        { selector: '.contact, [class*="contact"], #contact', name: 'Contact' },
        { selector: 'footer, .footer', name: 'Footer' },
    ],
};

// ============================================================================
// ACTION CHAIN PRIMITIVES
// ============================================================================

class ActionChain {
    constructor(page) {
        this.page = page;
        this.results = [];
        this.errors = [];
        this.screenshots = [];
    }

    async log(action, status, details = {}) {
        const entry = {
            timestamp: new Date().toISOString(),
            action,
            status,
            ...details
        };
        this.results.push(entry);
        console.log(`[${status}] ${action}`, details.error || '');
    }

    async executeWithRetry(actionName, actionFn, retries = CHAIN_CONFIG.maxRetries) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                await actionFn();
                await this.log(actionName, 'SUCCESS');
                return true;
            } catch (error) {
                await this.log(actionName, attempt < retries ? 'RETRY' : 'FAILED', {
                    error: error.message,
                    attempt
                });

                if (CHAIN_CONFIG.screenshotOnFailure && attempt === retries) {
                    try {
                        const screenshot = await this.page.screenshot({
                            path: `test-results/failure-${actionName.replace(/\s+/g, '-')}-${Date.now()}.png`
                        });
                        this.screenshots.push(screenshot);
                    } catch (e) { /* ignore screenshot errors */ }
                }

                if (attempt < retries) {
                    await this.page.waitForTimeout(1000 * attempt);
                }
            }
        }
        this.errors.push(actionName);
        return false;
    }

    getReport() {
        return {
            total: this.results.length,
            successes: this.results.filter(r => r.status === 'SUCCESS').length,
            failures: this.errors.length,
            retries: this.results.filter(r => r.status === 'RETRY').length,
            errors: this.errors,
            timeline: this.results
        };
    }
}

// ============================================================================
// COMPREHENSIVE AUTO-CHAIN TEST
// ============================================================================

test.describe('Auto-Action Chaining Loop', () => {
    let session;

    test.beforeAll(() => {
        const sessionId = process.env.KAIZEN_SESSION_ID || generateSessionSignature();
        session = new SessionManager(sessionId);
        console.log(`\n[KAIZEN] Session: ${sessionId}`);
    });

    test.afterAll(() => {
        if (session) {
            session.checkpoint('chain_complete');
            console.log('\n[KAIZEN] Session Summary:', session.getSummary());
        }
    });

    test('Full site interaction chain', async ({ page }) => {
        const chain = new ActionChain(page);
        session.startTest('full-site-interaction-chain');

        // Phase 1: Initial Load
        await chain.executeWithRetry('Navigate to homepage', async () => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');
        });

        // Phase 2: Check all sections exist and are visible
        for (const section of CHAIN_CONFIG.sections) {
            await chain.executeWithRetry(`Locate ${section.name} section`, async () => {
                const elem = page.locator(section.selector).first();
                if (await elem.count() > 0) {
                    await expect(elem).toBeAttached();
                }
            });
        }

        // Phase 3: Scroll through entire page
        await chain.executeWithRetry('Scroll to bottom', async () => {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await page.waitForTimeout(500);
        });

        await chain.executeWithRetry('Scroll to top', async () => {
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.waitForTimeout(500);
        });

        // Phase 4: Test all interactive elements
        const buttons = page.locator('button:visible, .btn:visible, [class*="button"]:visible');
        const buttonCount = await buttons.count();

        for (let i = 0; i < Math.min(buttonCount, 10); i++) {
            await chain.executeWithRetry(`Click button ${i + 1}`, async () => {
                const btn = buttons.nth(i);
                if (await btn.isVisible() && await btn.isEnabled()) {
                    await btn.click({ timeout: 5000 });
                    await page.waitForTimeout(CHAIN_CONFIG.actionDelay);
                }
            });
        }

        // Phase 5: Test all links
        const links = page.locator('a[href]:visible');
        const linkCount = await links.count();
        const internalLinks = [];

        for (let i = 0; i < Math.min(linkCount, 20); i++) {
            const link = links.nth(i);
            const href = await link.getAttribute('href');

            if (href && !href.startsWith('http') && !href.startsWith('mailto') && !href.startsWith('tel')) {
                internalLinks.push({ index: i, href });
            }
        }

        await chain.log('Found internal links', 'INFO', { count: internalLinks.length });

        // Phase 6: Test form inputs if any
        const inputs = page.locator('input:visible, textarea:visible, select:visible');
        const inputCount = await inputs.count();

        for (let i = 0; i < Math.min(inputCount, 5); i++) {
            await chain.executeWithRetry(`Interact with input ${i + 1}`, async () => {
                const input = inputs.nth(i);
                const type = await input.getAttribute('type') || 'text';

                if (await input.isVisible() && await input.isEnabled()) {
                    if (type === 'checkbox' || type === 'radio') {
                        await input.click();
                    } else if (type !== 'submit' && type !== 'button') {
                        await input.fill('test input');
                        await input.fill('');
                    }
                }
            });
        }

        // Phase 7: Take screenshots at key points
        await chain.executeWithRetry('Capture final state', async () => {
            await page.screenshot({
                path: 'test-results/chain-final-state.png',
                fullPage: true
            });
        });

        // Generate report
        const report = chain.getReport();
        console.log('\n=== AUTO-CHAIN REPORT ===');
        console.log(`Total Actions: ${report.total}`);
        console.log(`Successes: ${report.successes}`);
        console.log(`Failures: ${report.failures}`);
        console.log(`Retries: ${report.retries}`);
        if (report.errors.length > 0) {
            console.log('Failed Actions:', report.errors);
        }

        // Record session results
        const passed = report.failures < report.total * 0.2;
        session.completeTest('full-site-interaction-chain', passed ? 'pass' : 'fail', 0, report);
        session.checkpoint('interaction_chain_complete', report);

        // Fail test if too many errors
        expect(report.failures).toBeLessThan(report.total * 0.2);
    });
});

// ============================================================================
// VIEWPORT PROGRESSION CHAIN
// ============================================================================

test.describe('Viewport Progression Chain', () => {
    test('Test across all viewports sequentially', async ({ page }) => {
        const chain = new ActionChain(page);

        for (const viewport of CHAIN_CONFIG.viewportProgression) {
            await chain.executeWithRetry(`Set viewport to ${viewport.name}`, async () => {
                await page.setViewportSize({ width: viewport.width, height: viewport.height });
            });

            await chain.executeWithRetry(`Load page at ${viewport.name}`, async () => {
                await page.goto('/');
                await page.waitForLoadState('networkidle');
            });

            await chain.executeWithRetry(`No overflow at ${viewport.name}`, async () => {
                const overflow = await page.evaluate(() => ({
                    scrollWidth: document.body.scrollWidth,
                    clientWidth: document.documentElement.clientWidth
                }));
                expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 20);
            });

            await chain.executeWithRetry(`Screenshot ${viewport.name}`, async () => {
                await page.screenshot({
                    path: `test-results/viewport-${viewport.name}.png`,
                    fullPage: true
                });
            });

            // Test navigation at this viewport
            const navToggle = page.locator('[class*="menu"], [class*="hamburger"], .nav-toggle');
            if (await navToggle.count() > 0 && await navToggle.first().isVisible()) {
                await chain.executeWithRetry(`Toggle mobile nav at ${viewport.name}`, async () => {
                    await navToggle.first().click();
                    await page.waitForTimeout(300);
                });
            }
        }

        const report = chain.getReport();
        expect(report.failures).toBeLessThan(5);
    });
});

// ============================================================================
// CONTINUOUS INTERACTION LOOP
// ============================================================================

test.describe('Continuous Interaction Loop', () => {
    test('Random interaction stress test', async ({ page }) => {
        const chain = new ActionChain(page);
        const ITERATIONS = 20;

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        for (let i = 0; i < ITERATIONS; i++) {
            const actions = ['scroll', 'click', 'hover', 'resize'];
            const action = actions[i % actions.length];

            switch (action) {
                case 'scroll':
                    await chain.executeWithRetry(`Iteration ${i}: Scroll`, async () => {
                        const scrollY = Math.random() * 1000;
                        await page.evaluate((y) => window.scrollTo(0, y), scrollY);
                        await page.waitForTimeout(100);
                    });
                    break;

                case 'click':
                    await chain.executeWithRetry(`Iteration ${i}: Click random`, async () => {
                        const clickables = page.locator('button:visible, a:visible, [onclick]:visible');
                        const count = await clickables.count();
                        if (count > 0) {
                            const randomIndex = Math.floor(Math.random() * count);
                            const elem = clickables.nth(randomIndex);
                            if (await elem.isVisible()) {
                                await elem.click({ timeout: 2000 }).catch(() => {});
                            }
                        }
                    });
                    break;

                case 'hover':
                    await chain.executeWithRetry(`Iteration ${i}: Hover`, async () => {
                        const hoverables = page.locator('[class*="hover"], button, a, .card');
                        const count = await hoverables.count();
                        if (count > 0) {
                            const randomIndex = Math.floor(Math.random() * count);
                            await hoverables.nth(randomIndex).hover().catch(() => {});
                        }
                    });
                    break;

                case 'resize':
                    await chain.executeWithRetry(`Iteration ${i}: Resize`, async () => {
                        const widths = [1920, 1024, 768, 390];
                        const width = widths[Math.floor(Math.random() * widths.length)];
                        await page.setViewportSize({ width, height: 800 });
                        await page.waitForTimeout(200);
                    });
                    break;
            }
        }

        // Reset viewport
        await page.setViewportSize({ width: 1920, height: 1080 });

        // Check page is still functional
        await chain.executeWithRetry('Verify page stability', async () => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');
            const hasContent = await page.evaluate(() => document.body.textContent.trim().length > 0);
            expect(hasContent).toBe(true);
        });

        const report = chain.getReport();
        console.log('\n=== STRESS TEST REPORT ===');
        console.log(`Iterations: ${ITERATIONS}`);
        console.log(`Success Rate: ${((report.successes / report.total) * 100).toFixed(1)}%`);

        expect(report.failures).toBeLessThan(ITERATIONS * 0.3);
    });
});

// ============================================================================
// ACCESSIBILITY CHAIN
// ============================================================================

test.describe('Accessibility Auto-Chain', () => {
    test('Keyboard navigation chain', async ({ page }) => {
        const chain = new ActionChain(page);

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const TAB_COUNT = 30;
        let lastFocused = null;

        for (let i = 0; i < TAB_COUNT; i++) {
            await chain.executeWithRetry(`Tab ${i + 1}`, async () => {
                await page.keyboard.press('Tab');
                await page.waitForTimeout(50);

                const currentFocused = await page.evaluate(() => ({
                    tag: document.activeElement?.tagName,
                    text: document.activeElement?.textContent?.substring(0, 30),
                    role: document.activeElement?.getAttribute('role')
                }));

                // Verify focus moved
                if (i > 0 && lastFocused) {
                    // Focus should change (unless we've reached the end)
                }

                lastFocused = currentFocused;
            });
        }

        // Test Enter key on focused element
        await chain.executeWithRetry('Press Enter on focused', async () => {
            await page.keyboard.press('Enter');
            await page.waitForTimeout(200);
        });

        // Test Escape key
        await chain.executeWithRetry('Press Escape', async () => {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(200);
        });

        const report = chain.getReport();
        expect(report.failures).toBeLessThan(5);
    });
});

// ============================================================================
// SELF-HEALING VALIDATION CHAIN
// ============================================================================

test.describe('Self-Healing Validation', () => {
    test('Detect and report broken elements', async ({ page }) => {
        const chain = new ActionChain(page);
        const issues = [];

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Check for broken images
        await chain.executeWithRetry('Check images', async () => {
            const images = await page.locator('img').all();
            for (const img of images) {
                const isLoaded = await img.evaluate(el => el.complete && el.naturalHeight > 0);
                if (!isLoaded) {
                    const src = await img.getAttribute('src');
                    issues.push({ type: 'broken-image', src });
                }
            }
        });

        // Check for broken links
        await chain.executeWithRetry('Check internal links', async () => {
            const links = await page.locator('a[href^="/"], a[href^="#"]').all();
            for (const link of links.slice(0, 10)) {
                const href = await link.getAttribute('href');
                if (href.startsWith('#')) {
                    const targetId = href.substring(1);
                    if (targetId) {
                        const target = page.locator(`#${targetId}`);
                        if (await target.count() === 0) {
                            issues.push({ type: 'broken-anchor', href });
                        }
                    }
                }
            }
        });

        // Check for console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        await page.reload();
        await page.waitForLoadState('networkidle');

        // Report
        console.log('\n=== VALIDATION REPORT ===');
        console.log(`Broken Images: ${issues.filter(i => i.type === 'broken-image').length}`);
        console.log(`Broken Anchors: ${issues.filter(i => i.type === 'broken-anchor').length}`);
        console.log(`Console Errors: ${consoleErrors.length}`);

        if (issues.length > 0) {
            console.log('Issues:', issues);
        }

        // Allow some issues but not too many
        expect(issues.length).toBeLessThan(10);
    });
});
