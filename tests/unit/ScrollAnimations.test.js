/**
 * ScrollAnimations Unit Tests
 * Tests for scroll-triggered animations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('ScrollAnimations', () => {
    let ScrollAnimations;
    let scrollAnimations;
    let observerCallback;
    let mockObserverInstance;

    beforeEach(async () => {
        // Reset mocks
        vi.clearAllMocks();
        observerCallback = null;

        mockObserverInstance = {
            observe: vi.fn(),
            disconnect: vi.fn(),
            unobserve: vi.fn()
        };

        // Create a proper constructor mock
        global.IntersectionObserver = class MockIntersectionObserver {
            constructor(callback, options) {
                observerCallback = callback;
                this.observe = mockObserverInstance.observe;
                this.disconnect = mockObserverInstance.disconnect;
                this.unobserve = mockObserverInstance.unobserve;
                IntersectionObserver.mock.calls.push([callback, options]);
            }
            static mock = { calls: [] };
        };

        // Clear DOM
        document.body.innerHTML = '';
        document.head.innerHTML = '';

        vi.resetModules();

        // Import fresh instance
        const module = await import('../../src/utils/scrollAnimations.js');
        ScrollAnimations = module.ScrollAnimations;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Initialization', () => {
        it('creates IntersectionObserver', () => {
            scrollAnimations = new ScrollAnimations();

            expect(IntersectionObserver.mock.calls.length).toBeGreaterThan(0);
        });

        it('uses default threshold', () => {
            scrollAnimations = new ScrollAnimations();

            const lastCall = IntersectionObserver.mock.calls[IntersectionObserver.mock.calls.length - 1];
            expect(lastCall[1].threshold).toBe(0.1);
        });

        it('uses default rootMargin', () => {
            scrollAnimations = new ScrollAnimations();

            const lastCall = IntersectionObserver.mock.calls[IntersectionObserver.mock.calls.length - 1];
            expect(lastCall[1].rootMargin).toBe('0px 0px -50px 0px');
        });

        it('accepts custom threshold', () => {
            scrollAnimations = new ScrollAnimations({ threshold: 0.5 });

            const lastCall = IntersectionObserver.mock.calls[IntersectionObserver.mock.calls.length - 1];
            expect(lastCall[1].threshold).toBe(0.5);
        });

        it('accepts custom rootMargin', () => {
            scrollAnimations = new ScrollAnimations({ rootMargin: '100px' });

            const lastCall = IntersectionObserver.mock.calls[IntersectionObserver.mock.calls.length - 1];
            expect(lastCall[1].rootMargin).toBe('100px');
        });

        it('accepts custom animation class', () => {
            scrollAnimations = new ScrollAnimations({ animationClass: 'custom-animate' });

            expect(scrollAnimations.options.animationClass).toBe('custom-animate');
        });

        it('adds scroll animation styles', () => {
            scrollAnimations = new ScrollAnimations();

            const styles = document.getElementById('scroll-animation-styles');
            expect(styles).not.toBeNull();
        });

        it('does not duplicate styles', () => {
            scrollAnimations = new ScrollAnimations();
            const instance2 = new ScrollAnimations();

            const styles = document.querySelectorAll('#scroll-animation-styles');
            expect(styles.length).toBe(1);
        });
    });

    describe('Element Observation', () => {
        beforeEach(() => {
            // Create test elements
            const el1 = document.createElement('div');
            el1.setAttribute('data-animate', 'fade-up');
            document.body.appendChild(el1);

            const el2 = document.createElement('div');
            el2.setAttribute('data-animate', 'fade-down');
            document.body.appendChild(el2);

            scrollAnimations = new ScrollAnimations();
        });

        it('observes elements with data-animate attribute', () => {
            expect(mockObserverInstance.observe).toHaveBeenCalledTimes(2);
        });

        it('observes each element individually', () => {
            const elements = document.querySelectorAll('[data-animate]');
            elements.forEach(el => {
                expect(mockObserverInstance.observe).toHaveBeenCalledWith(el);
            });
        });
    });

    describe('Auto-marking Elements', () => {
        it('auto-marks asset cards', () => {
            const card = document.createElement('div');
            card.className = 'asset-card';
            document.body.appendChild(card);

            scrollAnimations = new ScrollAnimations();

            expect(card.getAttribute('data-animate')).toBe('fade-up');
            expect(mockObserverInstance.observe).toHaveBeenCalledWith(card);
        });

        it('adds staggered delays to asset cards', () => {
            for (let i = 0; i < 3; i++) {
                const card = document.createElement('div');
                card.className = 'asset-card';
                document.body.appendChild(card);
            }

            scrollAnimations = new ScrollAnimations();

            const cards = document.querySelectorAll('.asset-card');
            expect(cards[0].getAttribute('data-animate-delay')).toBe('1');
            expect(cards[1].getAttribute('data-animate-delay')).toBe('2');
            expect(cards[2].getAttribute('data-animate-delay')).toBe('3');
        });

        it('limits delay to maximum of 6', () => {
            for (let i = 0; i < 10; i++) {
                const card = document.createElement('div');
                card.className = 'asset-card';
                document.body.appendChild(card);
            }

            scrollAnimations = new ScrollAnimations();

            const cards = document.querySelectorAll('.asset-card');
            const delay = parseInt(cards[9].getAttribute('data-animate-delay'));
            expect(delay).toBeLessThanOrEqual(6);
        });

        it('auto-marks skill items with fade-left', () => {
            const skill = document.createElement('div');
            skill.className = 'skill-item';
            document.body.appendChild(skill);

            scrollAnimations = new ScrollAnimations();

            expect(skill.getAttribute('data-animate')).toBe('fade-left');
        });

        it('auto-marks stat cards with scale', () => {
            const stat = document.createElement('div');
            stat.className = 'stat-card';
            document.body.appendChild(stat);

            scrollAnimations = new ScrollAnimations();

            expect(stat.getAttribute('data-animate')).toBe('scale');
        });

        it('auto-marks panels with fade-up', () => {
            const panel = document.createElement('div');
            panel.className = 'panel';
            document.body.appendChild(panel);

            scrollAnimations = new ScrollAnimations();

            expect(panel.getAttribute('data-animate')).toBe('fade-up');
        });

        it('does not override existing data-animate', () => {
            const card = document.createElement('div');
            card.className = 'asset-card';
            card.setAttribute('data-animate', 'custom');
            document.body.appendChild(card);

            scrollAnimations = new ScrollAnimations();

            expect(card.getAttribute('data-animate')).toBe('custom');
        });
    });

    describe('Intersection Handling', () => {
        beforeEach(() => {
            const el = document.createElement('div');
            el.setAttribute('data-animate', 'fade-up');
            document.body.appendChild(el);

            scrollAnimations = new ScrollAnimations();
        });

        it('adds animation class when intersecting', () => {
            const element = document.querySelector('[data-animate]');
            const entries = [{
                target: element,
                isIntersecting: true
            }];

            observerCallback(entries);

            expect(element.classList.contains('animate-in')).toBe(true);
        });

        it('does not add class when not intersecting', () => {
            const element = document.querySelector('[data-animate]');
            const entries = [{
                target: element,
                isIntersecting: false
            }];

            observerCallback(entries);

            expect(element.classList.contains('animate-in')).toBe(false);
        });

        it('uses custom animation class', () => {
            scrollAnimations = new ScrollAnimations({ animationClass: 'custom-in' });
            const element = document.querySelector('[data-animate]');

            const entries = [{
                target: element,
                isIntersecting: true
            }];

            observerCallback(entries);

            expect(element.classList.contains('custom-in')).toBe(true);
        });

        it('handles multiple entries', () => {
            const el2 = document.createElement('div');
            el2.setAttribute('data-animate', 'fade-down');
            document.body.appendChild(el2);

            const elements = document.querySelectorAll('[data-animate]');
            const entries = [
                { target: elements[0], isIntersecting: true },
                { target: elements[1], isIntersecting: true }
            ];

            observerCallback(entries);

            expect(elements[0].classList.contains('animate-in')).toBe(true);
            expect(elements[1].classList.contains('animate-in')).toBe(true);
        });
    });

    describe('Manual Animation', () => {
        beforeEach(() => {
            scrollAnimations = new ScrollAnimations();
        });

        it('manually triggers animation on element', () => {
            const element = document.createElement('div');
            element.setAttribute('data-animate', 'fade-up');
            document.body.appendChild(element);

            scrollAnimations.animate(element);

            expect(element.classList.contains('animate-in')).toBe(true);
        });

        it('resets element to pre-animation state', () => {
            const element = document.createElement('div');
            element.setAttribute('data-animate', 'fade-up');
            element.classList.add('animate-in');
            document.body.appendChild(element);

            scrollAnimations.reset(element);

            expect(element.classList.contains('animate-in')).toBe(false);
        });
    });

    describe('Animation Styles', () => {
        beforeEach(() => {
            scrollAnimations = new ScrollAnimations();
        });

        it('includes base animation styles', () => {
            const styles = document.getElementById('scroll-animation-styles');
            expect(styles.textContent).toContain('[data-animate]');
            expect(styles.textContent).toContain('opacity: 0');
        });

        it('includes fade-up variant', () => {
            const styles = document.getElementById('scroll-animation-styles');
            expect(styles.textContent).toContain('[data-animate="fade-up"]');
            expect(styles.textContent).toContain('translateY(30px)');
        });

        it('includes fade-down variant', () => {
            const styles = document.getElementById('scroll-animation-styles');
            expect(styles.textContent).toContain('[data-animate="fade-down"]');
            expect(styles.textContent).toContain('translateY(-30px)');
        });

        it('includes fade-left variant', () => {
            const styles = document.getElementById('scroll-animation-styles');
            expect(styles.textContent).toContain('[data-animate="fade-left"]');
            expect(styles.textContent).toContain('translateX(30px)');
        });

        it('includes fade-right variant', () => {
            const styles = document.getElementById('scroll-animation-styles');
            expect(styles.textContent).toContain('[data-animate="fade-right"]');
            expect(styles.textContent).toContain('translateX(-30px)');
        });

        it('includes scale variant', () => {
            const styles = document.getElementById('scroll-animation-styles');
            expect(styles.textContent).toContain('[data-animate="scale"]');
            expect(styles.textContent).toContain('scale(0.9)');
        });

        it('includes glitch effect', () => {
            const styles = document.getElementById('scroll-animation-styles');
            expect(styles.textContent).toContain('[data-animate="glitch"]');
            expect(styles.textContent).toContain('@keyframes glitch-in');
        });

        it('includes typewriter effect', () => {
            const styles = document.getElementById('scroll-animation-styles');
            expect(styles.textContent).toContain('[data-animate="typewriter"]');
        });

        it('includes staggered delay styles', () => {
            const styles = document.getElementById('scroll-animation-styles');
            expect(styles.textContent).toContain('[data-animate-delay="1"]');
            expect(styles.textContent).toContain('[data-animate-delay="2"]');
            expect(styles.textContent).toContain('transition-delay: 0.1s');
        });

        it('includes animated-in state styles', () => {
            const styles = document.getElementById('scroll-animation-styles');
            expect(styles.textContent).toContain('.animate-in');
            expect(styles.textContent).toContain('opacity: 1');
        });
    });

    describe('Destroy', () => {
        beforeEach(() => {
            scrollAnimations = new ScrollAnimations();
        });

        it('disconnects observer', () => {
            scrollAnimations.destroy();

            expect(mockObserverInstance.disconnect).toHaveBeenCalled();
        });

        it('handles missing observer gracefully', () => {
            scrollAnimations.observer = null;

            expect(() => scrollAnimations.destroy()).not.toThrow();
        });
    });
});

describe('ScrollAnimations Singleton', () => {
    it('exports auto-initialized singleton', async () => {
        vi.resetModules();
        document.body.innerHTML = '';
        document.head.innerHTML = '';

        // Use class-based mock for constructor
        global.IntersectionObserver = class MockIntersectionObserver {
            constructor(callback, options) {
                this.observe = vi.fn();
                this.disconnect = vi.fn();
                this.unobserve = vi.fn();
            }
        };

        const { scrollAnimations } = await import('../../src/utils/scrollAnimations.js');
        expect(scrollAnimations).not.toBeNull();
        expect(scrollAnimations.constructor.name).toBe('ScrollAnimations');
    });
});
