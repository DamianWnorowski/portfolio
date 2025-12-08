/**
 * VisitorCounter Unit Tests
 * Tests for visitor count display widget
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock DataService
vi.mock('../../src/services/DataService.js', () => ({
    dataService: {
        fetchStats: vi.fn().mockResolvedValue({})
    }
}));

describe('VisitorCounter', () => {
    let VisitorCounter;
    let originalFetch;

    let activeInstances = [];

    beforeEach(async () => {
        vi.resetModules();
        vi.useFakeTimers();

        // Store original
        originalFetch = global.fetch;

        // Mock fetch
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ total: 1500, isNewVisitor: false })
        });

        // Mock requestAnimationFrame
        global.requestAnimationFrame = vi.fn((cb) => {
            setTimeout(cb, 16);
            return 1;
        });

        document.body.innerHTML = '';
        document.head.innerHTML = '';
        activeInstances = [];

        const module = await import('../../src/components/VisitorCounter.js');
        VisitorCounter = module.VisitorCounter;
    });

    afterEach(async () => {
        // Clean up instances and flush async operations
        for (const instance of activeInstances) {
            if (instance && instance.destroy) {
                try { instance.destroy(); } catch (e) { /* ignore */ }
            }
        }
        activeInstances = [];
        await vi.runAllTimersAsync();
        vi.useRealTimers();
        vi.restoreAllMocks();
        global.fetch = originalFetch;
    });

    describe('Initialization', () => {
        it('creates container if not found', async () => {
            document.body.innerHTML = `<div class="grid-container"></div>`;

            new VisitorCounter('visitor-counter');
            await vi.advanceTimersByTimeAsync(100);

            const container = document.getElementById('visitor-counter');
            expect(container).not.toBeNull();
        });

        it('uses existing container if found', async () => {
            document.body.innerHTML = `<div id="visitor-counter"></div>`;

            const instance = new VisitorCounter('visitor-counter');
            await vi.advanceTimersByTimeAsync(100);

            expect(instance.container).toBe(document.getElementById('visitor-counter'));
        });

        it('starts with count of 0', () => {
            document.body.innerHTML = `<div id="visitor-counter"></div>`;

            const instance = new VisitorCounter('visitor-counter');

            expect(instance.currentCount).toBe(0);
        });

        it('starts with target count of 0', () => {
            document.body.innerHTML = `<div id="visitor-counter"></div>`;

            const instance = new VisitorCounter('visitor-counter');

            expect(instance.targetCount).toBe(0);
        });

        it('fetches count on init', async () => {
            document.body.innerHTML = `<div id="visitor-counter"></div>`;

            new VisitorCounter('visitor-counter');
            await vi.advanceTimersByTimeAsync(100);

            expect(fetch).toHaveBeenCalledWith('/api/visitors');
        });
    });

    describe('Rendering', () => {
        let instance;

        beforeEach(async () => {
            document.body.innerHTML = `<div id="visitor-counter"></div>`;
            instance = new VisitorCounter('visitor-counter');
            await vi.advanceTimersByTimeAsync(100);
        });

        it('renders visitor inner container', () => {
            const inner = instance.container.querySelector('.visitor-inner');
            expect(inner).not.toBeNull();
        });

        it('renders visitor icon', () => {
            const icon = instance.container.querySelector('.visitor-icon');
            expect(icon).not.toBeNull();
            expect(icon.querySelector('svg')).not.toBeNull();
        });

        it('renders visitor count element', () => {
            const count = instance.container.querySelector('#visitor-count');
            expect(count).not.toBeNull();
        });

        it('renders visitor label', () => {
            const label = instance.container.querySelector('.visitor-label');
            expect(label).not.toBeNull();
            expect(label.textContent).toBe('visitors');
        });

        it('renders live indicator', () => {
            const live = instance.container.querySelector('.visitor-live');
            expect(live).not.toBeNull();
        });

        it('renders live dot', () => {
            const dot = instance.container.querySelector('.live-dot');
            expect(dot).not.toBeNull();
        });

        it('renders live text', () => {
            const text = instance.container.querySelector('.live-text');
            expect(text).not.toBeNull();
            expect(text.textContent).toBe('LIVE');
        });

        it('renders count element with numeric value after fetch', () => {
            const count = instance.container.querySelector('#visitor-count');
            // After 100ms, the count should be fetched and displayed
            expect(count.textContent).toMatch(/\d+/);
        });
    });

    describe('Styles', () => {
        it('adds styles to document', async () => {
            document.body.innerHTML = `<div id="visitor-counter"></div>`;
            new VisitorCounter('visitor-counter');
            await vi.advanceTimersByTimeAsync(100);

            const styles = document.getElementById('visitor-counter-styles');
            expect(styles).not.toBeNull();
        });

        it('does not duplicate styles', async () => {
            document.body.innerHTML = `<div id="visitor-counter"></div><div id="visitor-counter-2"></div>`;
            new VisitorCounter('visitor-counter');
            await vi.advanceTimersByTimeAsync(100);

            new VisitorCounter('visitor-counter-2');
            await vi.advanceTimersByTimeAsync(100);

            const styles = document.querySelectorAll('#visitor-counter-styles');
            expect(styles.length).toBe(1);
        });

        it('includes widget positioning styles', async () => {
            document.body.innerHTML = `<div id="visitor-counter"></div>`;
            new VisitorCounter('visitor-counter');
            await vi.advanceTimersByTimeAsync(100);

            const styles = document.getElementById('visitor-counter-styles');
            expect(styles.textContent).toContain('.visitor-widget');
            expect(styles.textContent).toContain('position: fixed');
        });

        it('includes live pulse animation', async () => {
            document.body.innerHTML = `<div id="visitor-counter"></div>`;
            new VisitorCounter('visitor-counter');
            await vi.advanceTimersByTimeAsync(100);

            const styles = document.getElementById('visitor-counter-styles');
            expect(styles.textContent).toContain('@keyframes live-pulse');
        });

        it('includes mobile responsive styles', async () => {
            document.body.innerHTML = `<div id="visitor-counter"></div>`;
            new VisitorCounter('visitor-counter');
            await vi.advanceTimersByTimeAsync(100);

            const styles = document.getElementById('visitor-counter-styles');
            expect(styles.textContent).toContain('@media (max-width: 768px)');
        });
    });

    describe('fetchCount', () => {
        it('sets target count from API response', async () => {
            document.body.innerHTML = `<div id="visitor-counter"></div>`;
            const instance = new VisitorCounter('visitor-counter');
            await vi.advanceTimersByTimeAsync(100);

            expect(instance.targetCount).toBe(1500);
        });

        it('uses fallback count on error', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            document.body.innerHTML = `<div id="visitor-counter"></div>`;
            const instance = new VisitorCounter('visitor-counter');
            await vi.advanceTimersByTimeAsync(100);

            expect(instance.targetCount).toBeGreaterThanOrEqual(1247);
        });

        it('shows welcome for new visitors', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ total: 1500, isNewVisitor: true })
            });

            document.body.innerHTML = `<div id="visitor-counter"></div>`;
            new VisitorCounter('visitor-counter');
            await vi.advanceTimersByTimeAsync(100);

            const welcome = document.querySelector('.visitor-welcome');
            expect(welcome).not.toBeNull();
        });

        it('does not show welcome for returning visitors', async () => {
            document.body.innerHTML = `<div id="visitor-counter"></div>`;
            new VisitorCounter('visitor-counter');
            await vi.advanceTimersByTimeAsync(100);

            const welcome = document.querySelector('.visitor-welcome');
            expect(welcome).toBeNull();
        });
    });

    describe('animateCount', () => {
        it('animates count from 0 to target', async () => {
            document.body.innerHTML = `<div id="visitor-counter"></div>`;
            const instance = new VisitorCounter('visitor-counter');
            await vi.advanceTimersByTimeAsync(100);

            // Wait for animation to complete (2000ms duration)
            await vi.advanceTimersByTimeAsync(2100);

            expect(instance.currentCount).toBe(instance.targetCount);
        });

        it('updates display during animation', async () => {
            document.body.innerHTML = `<div id="visitor-counter"></div>`;
            const instance = new VisitorCounter('visitor-counter');
            await vi.advanceTimersByTimeAsync(100);

            // Part way through animation
            await vi.advanceTimersByTimeAsync(1000);

            const countEl = instance.container.querySelector('#visitor-count');
            expect(countEl.textContent).not.toBe('---');
            expect(countEl.textContent).not.toBe('0');
        });
    });

    describe('formatNumber', () => {
        let instance;

        beforeEach(async () => {
            document.body.innerHTML = `<div id="visitor-counter"></div>`;
            instance = new VisitorCounter('visitor-counter');
            await vi.advanceTimersByTimeAsync(100);
        });

        it('formats millions with M suffix', () => {
            expect(instance.formatNumber(1500000)).toBe('1.5M');
        });

        it('formats thousands with K suffix', () => {
            expect(instance.formatNumber(1500)).toBe('1.5K');
        });

        it('formats numbers under 1000 with locale string', () => {
            const result = instance.formatNumber(999);
            expect(result).toBe('999');
        });

        it('handles edge case at 1000', () => {
            expect(instance.formatNumber(1000)).toBe('1.0K');
        });

        it('handles edge case at 1000000', () => {
            expect(instance.formatNumber(1000000)).toBe('1.0M');
        });
    });

    describe('showWelcome', () => {
        let instance;

        beforeEach(async () => {
            document.body.innerHTML = `<div id="visitor-counter"></div>`;
            instance = new VisitorCounter('visitor-counter');
            instance.targetCount = 1500;
            await vi.advanceTimersByTimeAsync(100);
        });

        it('creates welcome toast', () => {
            instance.showWelcome();

            const welcome = document.querySelector('.visitor-welcome');
            expect(welcome).not.toBeNull();
        });

        it('displays visitor number', () => {
            instance.showWelcome();

            const welcome = document.querySelector('.visitor-welcome');
            expect(welcome.textContent).toContain('#1500');
        });

        it('displays wave emoji', () => {
            instance.showWelcome();

            const icon = document.querySelector('.welcome-icon');
            expect(icon.textContent).toBe('👋');
        });

        it('adds welcome styles', () => {
            instance.showWelcome();

            const styles = document.getElementById('welcome-styles');
            expect(styles).not.toBeNull();
        });

        it('auto-removes after 5 seconds', () => {
            instance.showWelcome();

            vi.advanceTimersByTime(5500); // 5000 + 500 animation

            const welcome = document.querySelector('.visitor-welcome');
            expect(welcome).toBeNull();
        });

        it('positions toast above widget', () => {
            instance.showWelcome();

            const welcome = document.querySelector('.visitor-welcome');
            expect(welcome.style.cssText).toContain('bottom: 80px');
        });
    });

    describe('Container Creation', () => {
        it('appends to grid-container', () => {
            document.body.innerHTML = `<div class="grid-container"></div>`;

            new VisitorCounter('visitor-counter');

            const container = document.getElementById('visitor-counter');
            expect(container.parentElement.className).toBe('grid-container');
        });

        it('has correct class name', () => {
            document.body.innerHTML = `<div class="grid-container"></div>`;

            new VisitorCounter('visitor-counter');

            const container = document.getElementById('visitor-counter');
            expect(container.classList.contains('visitor-widget')).toBe(true);
        });
    });

    describe('destroy()', () => {
        it('removes container from DOM', async () => {
            document.body.innerHTML = `<div id="visitor-counter"></div>`;
            const instance = new VisitorCounter('visitor-counter');
            await vi.advanceTimersByTimeAsync(100);

            instance.destroy();

            expect(document.getElementById('visitor-counter')).toBeNull();
        });

        it('handles null container gracefully', async () => {
            document.body.innerHTML = `<div id="visitor-counter"></div>`;
            const instance = new VisitorCounter('visitor-counter');
            await vi.advanceTimersByTimeAsync(3000); // Wait for all async ops to complete
            instance.container = null;

            expect(() => instance.destroy()).not.toThrow();
        });
    });
});
