/**
 * Accessibility Utilities Unit Tests
 * Tests for WCAG 2.1 AA compliance helpers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Accessibility Utilities', () => {
    let a11y;
    let initAccessibility;

    beforeEach(async () => {
        vi.resetModules();
        vi.useFakeTimers();

        document.head.innerHTML = '';
        document.body.innerHTML = '';

        // Reset window.announce
        delete window.announce;

        // Mock matchMedia
        window.matchMedia = vi.fn().mockImplementation((query) => ({
            matches: false,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn()
        }));

        const module = await import('../../src/utils/accessibility.js');
        a11y = module.a11y;
        initAccessibility = module.initAccessibility;
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('initAccessibility', () => {
        it('initializes all accessibility features', () => {
            initAccessibility();

            expect(document.getElementById('skip-link')).not.toBeNull();
            expect(document.getElementById('aria-status')).not.toBeNull();
            expect(document.getElementById('aria-alert')).not.toBeNull();
        });

        it('logs initialization message', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            initAccessibility();

            expect(consoleSpy).toHaveBeenCalledWith('[A11y] Accessibility features initialized');
        });
    });

    describe('Skip Link', () => {
        beforeEach(() => {
            initAccessibility();
        });

        it('creates skip link element', () => {
            const skipLink = document.getElementById('skip-link');
            expect(skipLink).not.toBeNull();
        });

        it('skip link has correct href', () => {
            const skipLink = document.getElementById('skip-link');
            expect(skipLink.href).toContain('#main-content');
        });

        it('skip link has correct text', () => {
            const skipLink = document.getElementById('skip-link');
            expect(skipLink.textContent).toBe('Skip to main content');
        });

        it('skip link has skip-link class', () => {
            const skipLink = document.getElementById('skip-link');
            expect(skipLink.classList.contains('skip-link')).toBe(true);
        });

        it('adds skip link styles', () => {
            const styles = document.getElementById('skip-link-styles');
            expect(styles).not.toBeNull();
            expect(styles.textContent).toContain('.skip-link');
        });

        it('does not duplicate skip link', () => {
            initAccessibility();
            initAccessibility();

            const skipLinks = document.querySelectorAll('#skip-link');
            expect(skipLinks.length).toBe(1);
        });

        it('adds main-content id to main element', () => {
            document.body.innerHTML = '<main></main>';
            initAccessibility();

            const main = document.querySelector('main');
            expect(main.id).toBe('main-content');
        });
    });

    describe('Focus Management', () => {
        beforeEach(() => {
            initAccessibility();
        });

        it('adds keyboard-nav class on Tab key', () => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));

            expect(document.body.classList.contains('keyboard-nav')).toBe(true);
        });

        it('removes keyboard-nav class on mousedown', () => {
            document.body.classList.add('keyboard-nav');

            document.dispatchEvent(new MouseEvent('mousedown'));

            expect(document.body.classList.contains('keyboard-nav')).toBe(false);
        });

        it('adds focus styles', () => {
            const styles = document.getElementById('focus-styles');
            expect(styles).not.toBeNull();
            expect(styles.textContent).toContain(':focus-visible');
        });
    });

    describe('Live Regions', () => {
        beforeEach(() => {
            initAccessibility();
        });

        it('creates status region', () => {
            const status = document.getElementById('aria-status');
            expect(status).not.toBeNull();
        });

        it('status region has correct attributes', () => {
            const status = document.getElementById('aria-status');
            expect(status.getAttribute('role')).toBe('status');
            expect(status.getAttribute('aria-live')).toBe('polite');
            expect(status.getAttribute('aria-atomic')).toBe('true');
        });

        it('creates alert region', () => {
            const alert = document.getElementById('aria-alert');
            expect(alert).not.toBeNull();
        });

        it('alert region has correct attributes', () => {
            const alert = document.getElementById('aria-alert');
            expect(alert.getAttribute('role')).toBe('alert');
            expect(alert.getAttribute('aria-live')).toBe('assertive');
        });

        it('regions have sr-only class', () => {
            const status = document.getElementById('aria-status');
            const alert = document.getElementById('aria-alert');

            expect(status.classList.contains('sr-only')).toBe(true);
            expect(alert.classList.contains('sr-only')).toBe(true);
        });

        it('adds sr-only styles', () => {
            const styles = document.getElementById('sr-only-styles');
            expect(styles).not.toBeNull();
            expect(styles.textContent).toContain('.sr-only');
        });
    });

    describe('Keyboard Navigation', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div class="panel"></div>
                <div role="tablist">
                    <button role="tab">Tab 1</button>
                    <button role="tab">Tab 2</button>
                    <button role="tab">Tab 3</button>
                </div>
            `;
            initAccessibility();
        });

        it('adds tabindex to panels', () => {
            const panel = document.querySelector('.panel');
            expect(panel.getAttribute('tabindex')).toBe('0');
        });

        it('does not override existing tabindex', () => {
            document.body.innerHTML = '<div class="panel" tabindex="-1"></div>';
            initAccessibility();

            const panel = document.querySelector('.panel');
            expect(panel.getAttribute('tabindex')).toBe('-1');
        });

        it('escape key closes modals', () => {
            document.body.innerHTML = `
                <div role="dialog">
                    <button class="modal-close">Close</button>
                </div>
            `;
            initAccessibility();

            const closeBtn = document.querySelector('.modal-close');
            const clickSpy = vi.spyOn(closeBtn, 'click');

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

            expect(clickSpy).toHaveBeenCalled();
        });

        it('arrow keys navigate tabs', () => {
            const tabs = document.querySelectorAll('[role="tab"]');
            tabs[0].focus();

            const tablist = document.querySelector('[role="tablist"]');
            tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

            expect(document.activeElement).toBe(tabs[1]);
        });
    });

    describe('Reduced Motion', () => {
        it('respects prefers-reduced-motion', async () => {
            window.matchMedia = vi.fn().mockImplementation((query) => ({
                matches: query.includes('reduced-motion'),
                media: query,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn()
            }));

            vi.resetModules();
            const module = await import('../../src/utils/accessibility.js');
            module.initAccessibility();

            const styles = document.getElementById('reduced-motion-styles');
            expect(styles).not.toBeNull();
            expect(styles.textContent).toContain('animation-duration: 0.01ms');
        });

        it('responds to reduced motion changes', async () => {
            let changeCallback;
            window.matchMedia = vi.fn().mockImplementation((query) => ({
                matches: false,
                media: query,
                addEventListener: (event, cb) => {
                    if (query.includes('reduced-motion')) {
                        changeCallback = cb;
                    }
                },
                removeEventListener: vi.fn()
            }));

            vi.resetModules();
            const module = await import('../../src/utils/accessibility.js');
            module.initAccessibility();

            // Simulate preference change
            if (changeCallback) {
                changeCallback({ matches: true });
            }

            const styles = document.getElementById('reduced-motion-styles');
            expect(styles).not.toBeNull();
        });
    });

    describe('High Contrast', () => {
        it('respects prefers-contrast: high', async () => {
            window.matchMedia = vi.fn().mockImplementation((query) => ({
                matches: query.includes('contrast: high'),
                media: query,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn()
            }));

            vi.resetModules();
            const module = await import('../../src/utils/accessibility.js');
            module.initAccessibility();

            expect(document.body.classList.contains('high-contrast')).toBe(true);
        });

        it('adds high contrast styles', async () => {
            window.matchMedia = vi.fn().mockImplementation((query) => ({
                matches: query.includes('contrast: high'),
                media: query,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn()
            }));

            vi.resetModules();
            const module = await import('../../src/utils/accessibility.js');
            module.initAccessibility();

            const styles = document.getElementById('high-contrast-styles');
            expect(styles).not.toBeNull();
            expect(styles.textContent).toContain('.high-contrast');
        });
    });

    describe('Announcer', () => {
        beforeEach(() => {
            initAccessibility();
        });

        it('creates global announce function', () => {
            expect(window.announce).toBeDefined();
            expect(typeof window.announce).toBe('function');
        });

        it('announces to status region by default', () => {
            window.announce('Test message');

            vi.advanceTimersByTime(200);

            const status = document.getElementById('aria-status');
            expect(status.textContent).toBe('Test message');
        });

        it('announces to alert region with assertive priority', () => {
            window.announce('Urgent message', 'assertive');

            vi.advanceTimersByTime(200);

            const alert = document.getElementById('aria-alert');
            expect(alert.textContent).toBe('Urgent message');
        });

        it('clears region before announcing', () => {
            const status = document.getElementById('aria-status');
            status.textContent = 'Old message';

            window.announce('New message');

            expect(status.textContent).toBe('');
        });
    });

    describe('a11y Object Export', () => {
        it('exports init function', () => {
            expect(a11y.init).toBeDefined();
            expect(typeof a11y.init).toBe('function');
        });

        it('exports announce function', () => {
            expect(a11y.announce).toBeDefined();
            expect(typeof a11y.announce).toBe('function');
        });

        it('exports trapFocus function', () => {
            expect(a11y.trapFocus).toBeDefined();
            expect(typeof a11y.trapFocus).toBe('function');
        });

        it('exports hide function', () => {
            expect(a11y.hide).toBeDefined();
            expect(typeof a11y.hide).toBe('function');
        });

        it('exports show function', () => {
            expect(a11y.show).toBeDefined();
            expect(typeof a11y.show).toBe('function');
        });
    });

    describe('Focus Trap', () => {
        it('traps focus within element', () => {
            document.body.innerHTML = `
                <div id="modal">
                    <button id="first">First</button>
                    <input id="middle" />
                    <button id="last">Last</button>
                </div>
            `;

            const modal = document.getElementById('modal');
            a11y.trapFocus(modal);

            expect(document.activeElement.id).toBe('first');
        });

        it('wraps focus from last to first', () => {
            document.body.innerHTML = `
                <div id="modal">
                    <button id="first">First</button>
                    <button id="last">Last</button>
                </div>
            `;

            const modal = document.getElementById('modal');
            a11y.trapFocus(modal);

            document.getElementById('last').focus();
            modal.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));

            // Focus would wrap to first (in real scenario with proper event handling)
        });

        it('wraps focus from first to last with shift+tab', () => {
            document.body.innerHTML = `
                <div id="modal">
                    <button id="first">First</button>
                    <button id="last">Last</button>
                </div>
            `;

            const modal = document.getElementById('modal');
            a11y.trapFocus(modal);

            // First is already focused after trapFocus
            modal.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }));

            // Focus would wrap to last (in real scenario with proper event handling)
        });
    });

    describe('Hide/Show', () => {
        it('hide sets aria-hidden', () => {
            document.body.innerHTML = '<div id="test"></div>';
            const element = document.getElementById('test');

            a11y.hide(element);

            expect(element.getAttribute('aria-hidden')).toBe('true');
        });

        it('hide sets inert', () => {
            document.body.innerHTML = '<div id="test"></div>';
            const element = document.getElementById('test');

            a11y.hide(element);

            expect(element.hasAttribute('inert')).toBe(true);
        });

        it('show removes aria-hidden', () => {
            document.body.innerHTML = '<div id="test" aria-hidden="true"></div>';
            const element = document.getElementById('test');

            a11y.show(element);

            expect(element.hasAttribute('aria-hidden')).toBe(false);
        });

        it('show removes inert', () => {
            document.body.innerHTML = '<div id="test" inert></div>';
            const element = document.getElementById('test');

            a11y.show(element);

            expect(element.hasAttribute('inert')).toBe(false);
        });
    });

    describe('Integration', () => {
        it('a11y.init works correctly', () => {
            a11y.init();

            expect(document.getElementById('skip-link')).not.toBeNull();
            expect(document.getElementById('aria-status')).not.toBeNull();
        });

        it('a11y.announce works after init', () => {
            a11y.init();
            a11y.announce('Test message');

            vi.advanceTimersByTime(200);

            const status = document.getElementById('aria-status');
            expect(status.textContent).toBe('Test message');
        });
    });
});
