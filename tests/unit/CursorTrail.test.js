/**
 * CursorTrail Unit Tests
 * Tests for cursor particle trail effect
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('CursorTrail', () => {
    let CursorTrail;
    let cursorTrail;
    let rafCallback;

    beforeEach(async () => {
        vi.resetModules();
        vi.useFakeTimers();

        // Clear DOM
        document.body.innerHTML = '';
        document.head.innerHTML = '';

        // Mock matchMedia
        window.matchMedia = vi.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn()
        }));

        // Mock requestAnimationFrame
        rafCallback = null;
        global.requestAnimationFrame = vi.fn(cb => {
            rafCallback = cb;
            return 1;
        });
        global.cancelAnimationFrame = vi.fn();

        // Import fresh instance
        const module = await import('../../src/components/CursorTrail.js');
        CursorTrail = module.CursorTrail;
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('Initialization', () => {
        it('creates container element', () => {
            cursorTrail = new CursorTrail();

            const container = document.getElementById('cursor-trail');
            expect(container).not.toBeNull();
        });

        it('applies correct container styles', () => {
            cursorTrail = new CursorTrail();

            const container = document.getElementById('cursor-trail');
            expect(container.style.position).toBe('fixed');
            expect(container.style.pointerEvents).toBe('none');
            expect(container.style.zIndex).toBe('9997');
        });

        it('adds trail styles to document', () => {
            cursorTrail = new CursorTrail();

            const styles = document.getElementById('cursor-trail-styles');
            expect(styles).not.toBeNull();
            expect(styles.textContent).toContain('.trail-particle');
        });

        it('creates glow element', () => {
            cursorTrail = new CursorTrail();

            const glow = document.querySelector('.trail-glow');
            expect(glow).not.toBeNull();
        });

        it('starts enabled by default', () => {
            cursorTrail = new CursorTrail();

            expect(cursorTrail.enabled).toBe(true);
        });

        it('starts animation loop', () => {
            cursorTrail = new CursorTrail();

            expect(requestAnimationFrame).toHaveBeenCalled();
        });

        it('initializes with empty particles array', () => {
            cursorTrail = new CursorTrail();

            expect(cursorTrail.particles).toEqual([]);
        });

        it('sets maxParticles to 20', () => {
            cursorTrail = new CursorTrail();

            expect(cursorTrail.maxParticles).toBe(20);
        });
    });

    describe('Reduced Motion', () => {
        it('disables on prefers-reduced-motion', async () => {
            window.matchMedia = vi.fn().mockImplementation(query => ({
                matches: query === '(prefers-reduced-motion: reduce)',
                media: query,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn()
            }));

            vi.resetModules();
            const module = await import('../../src/components/CursorTrail.js');
            const instance = new module.CursorTrail();

            expect(instance.enabled).toBe(false);
        });

        it('does not create container when disabled', async () => {
            window.matchMedia = vi.fn().mockImplementation(query => ({
                matches: query === '(prefers-reduced-motion: reduce)',
                media: query,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn()
            }));

            vi.resetModules();
            const module = await import('../../src/components/CursorTrail.js');
            new module.CursorTrail();

            const container = document.getElementById('cursor-trail');
            expect(container).toBeNull();
        });

        it('includes reduced motion media query in styles', () => {
            cursorTrail = new CursorTrail();

            const styles = document.getElementById('cursor-trail-styles');
            expect(styles.textContent).toContain('prefers-reduced-motion');
        });
    });

    describe('Mouse Tracking', () => {
        beforeEach(() => {
            cursorTrail = new CursorTrail();
        });

        it('tracks mouse position', () => {
            const event = new MouseEvent('mousemove', {
                clientX: 100,
                clientY: 200
            });
            document.dispatchEvent(event);

            expect(cursorTrail.mouseX).toBe(100);
            expect(cursorTrail.mouseY).toBe(200);
        });

        it('creates particle on mouse move', () => {
            const event = new MouseEvent('mousemove', {
                clientX: 150,
                clientY: 250
            });
            document.dispatchEvent(event);

            expect(cursorTrail.particles.length).toBe(1);
        });

        it('updates glow position on mouse move', () => {
            const event = new MouseEvent('mousemove', {
                clientX: 300,
                clientY: 400
            });
            document.dispatchEvent(event);

            // Trigger animation frame
            if (rafCallback) rafCallback();

            expect(cursorTrail.glow.style.left).toBe('300px');
            expect(cursorTrail.glow.style.top).toBe('400px');
        });
    });

    describe('Particle Creation', () => {
        beforeEach(() => {
            cursorTrail = new CursorTrail();
        });

        it('creates particle element', () => {
            cursorTrail.mouseX = 100;
            cursorTrail.mouseY = 100;
            cursorTrail.createParticle();

            const particles = cursorTrail.container.querySelectorAll('.trail-particle');
            expect(particles.length).toBe(1);
        });

        it('positions particle at mouse location', () => {
            cursorTrail.mouseX = 150;
            cursorTrail.mouseY = 200;
            cursorTrail.createParticle();

            const particle = cursorTrail.particles[0];
            expect(particle.x).toBe(150);
            expect(particle.y).toBe(200);
        });

        it('assigns gold or blue class', () => {
            cursorTrail.mouseX = 100;
            cursorTrail.mouseY = 100;

            // Create multiple particles to test both colors
            for (let i = 0; i < 10; i++) {
                cursorTrail.createParticle();
            }

            const gold = cursorTrail.container.querySelectorAll('.trail-particle.gold');
            const blue = cursorTrail.container.querySelectorAll('.trail-particle.blue');

            expect(gold.length + blue.length).toBe(10);
        });

        it('sets random size between 4-12px', () => {
            cursorTrail.mouseX = 100;
            cursorTrail.mouseY = 100;
            cursorTrail.createParticle();

            const particle = cursorTrail.particles[0];
            expect(particle.size).toBeGreaterThanOrEqual(4);
            expect(particle.size).toBeLessThanOrEqual(12);
        });

        it('assigns random velocity', () => {
            cursorTrail.mouseX = 100;
            cursorTrail.mouseY = 100;
            cursorTrail.createParticle();

            const particle = cursorTrail.particles[0];
            expect(particle.vx).toBeDefined();
            expect(particle.vy).toBeDefined();
        });

        it('sets initial life to 1', () => {
            cursorTrail.mouseX = 100;
            cursorTrail.mouseY = 100;
            cursorTrail.createParticle();

            const particle = cursorTrail.particles[0];
            expect(particle.life).toBe(1);
        });

        it('respects maxParticles limit', () => {
            cursorTrail.mouseX = 100;
            cursorTrail.mouseY = 100;

            for (let i = 0; i < 30; i++) {
                cursorTrail.createParticle();
            }

            expect(cursorTrail.particles.length).toBeLessThanOrEqual(20);
        });

        it('does not create particles when disabled', () => {
            cursorTrail.enabled = false;
            cursorTrail.mouseX = 100;
            cursorTrail.mouseY = 100;
            cursorTrail.createParticle();

            expect(cursorTrail.particles.length).toBe(0);
        });
    });

    describe('Animation Loop', () => {
        beforeEach(() => {
            cursorTrail = new CursorTrail();
            cursorTrail.mouseX = 100;
            cursorTrail.mouseY = 100;
            cursorTrail.createParticle();
        });

        it('updates particle position', () => {
            const particle = cursorTrail.particles[0];
            const initialX = particle.x;
            const initialY = particle.y;

            // Run animation frame
            if (rafCallback) rafCallback();

            expect(particle.x).not.toBe(initialX);
            expect(particle.y).not.toBe(initialY);
        });

        it('applies gravity to particles', () => {
            const particle = cursorTrail.particles[0];
            const initialVy = particle.vy;

            if (rafCallback) rafCallback();

            expect(particle.vy).toBeGreaterThan(initialVy);
        });

        it('decays particle life', () => {
            const particle = cursorTrail.particles[0];
            const initialLife = particle.life;

            if (rafCallback) rafCallback();

            expect(particle.life).toBeLessThan(initialLife);
        });

        it('updates particle opacity', () => {
            if (rafCallback) rafCallback();

            const particle = cursorTrail.particles[0];
            expect(particle.element.style.opacity).toBeDefined();
        });

        it('removes dead particles', () => {
            const particle = cursorTrail.particles[0];
            particle.life = 0.01;
            particle.decay = 0.02;

            if (rafCallback) rafCallback();

            expect(cursorTrail.particles.length).toBe(0);
        });

        it('removes particle element from DOM when dead', () => {
            const particle = cursorTrail.particles[0];
            particle.life = 0.01;
            particle.decay = 0.02;

            if (rafCallback) rafCallback();

            const particles = cursorTrail.container.querySelectorAll('.trail-particle');
            expect(particles.length).toBe(0);
        });

        it('schedules next frame', () => {
            if (rafCallback) rafCallback();

            expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
        });
    });

    describe('Toggle', () => {
        beforeEach(() => {
            cursorTrail = new CursorTrail();
        });

        it('toggles enabled state', () => {
            expect(cursorTrail.enabled).toBe(true);

            const result = cursorTrail.toggle();

            expect(result).toBe(false);
            expect(cursorTrail.enabled).toBe(false);
        });

        it('hides container when disabled', () => {
            cursorTrail.toggle();

            expect(cursorTrail.container.style.display).toBe('none');
        });

        it('shows container when enabled', () => {
            cursorTrail.toggle(); // off
            cursorTrail.toggle(); // on

            expect(cursorTrail.container.style.display).toBe('block');
        });

        it('hides glow when disabled', () => {
            cursorTrail.toggle();

            expect(cursorTrail.glow.style.display).toBe('none');
        });

        it('shows glow when enabled', () => {
            cursorTrail.toggle();
            cursorTrail.toggle();

            expect(cursorTrail.glow.style.display).toBe('block');
        });

        it('returns new state', () => {
            expect(cursorTrail.toggle()).toBe(false);
            expect(cursorTrail.toggle()).toBe(true);
        });
    });

    describe('Destroy', () => {
        beforeEach(() => {
            cursorTrail = new CursorTrail();
        });

        it('cancels animation frame', () => {
            cursorTrail.destroy();

            expect(cancelAnimationFrame).toHaveBeenCalled();
        });

        it('removes container from DOM', () => {
            cursorTrail.destroy();

            const container = document.getElementById('cursor-trail');
            expect(container).toBeNull();
        });

        it('removes glow from DOM', () => {
            cursorTrail.destroy();

            const glow = document.querySelector('.trail-glow');
            expect(glow).toBeNull();
        });

        it('clears particles array', () => {
            cursorTrail.mouseX = 100;
            cursorTrail.mouseY = 100;
            cursorTrail.createParticle();

            cursorTrail.destroy();

            expect(cursorTrail.particles).toEqual([]);
        });

        it('handles missing container gracefully', () => {
            cursorTrail.container = null;

            expect(() => cursorTrail.destroy()).not.toThrow();
        });

        it('handles missing glow gracefully', () => {
            cursorTrail.glow = null;

            expect(() => cursorTrail.destroy()).not.toThrow();
        });
    });

    describe('Styles', () => {
        beforeEach(() => {
            cursorTrail = new CursorTrail();
        });

        it('does not duplicate styles', () => {
            cursorTrail.addStyles();
            cursorTrail.addStyles();

            const styles = document.querySelectorAll('#cursor-trail-styles');
            expect(styles.length).toBe(1);
        });

        it('includes gold particle gradient', () => {
            const styles = document.getElementById('cursor-trail-styles');
            expect(styles.textContent).toContain('.trail-particle.gold');
            expect(styles.textContent).toContain('201, 162, 39');
        });

        it('includes blue particle gradient', () => {
            const styles = document.getElementById('cursor-trail-styles');
            expect(styles.textContent).toContain('.trail-particle.blue');
            expect(styles.textContent).toContain('74, 158, 255');
        });

        it('includes glow styles', () => {
            const styles = document.getElementById('cursor-trail-styles');
            expect(styles.textContent).toContain('.trail-glow');
        });

        it('sets mix-blend-mode to screen', () => {
            const styles = document.getElementById('cursor-trail-styles');
            expect(styles.textContent).toContain('mix-blend-mode: screen');
        });
    });
});

describe('CursorTrail Singleton', () => {
    it('exports auto-initialized singleton', async () => {
        vi.resetModules();
        document.body.innerHTML = '';
        document.head.innerHTML = '';

        window.matchMedia = vi.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn()
        }));

        const { cursorTrail } = await import('../../src/components/CursorTrail.js');
        expect(cursorTrail).toBeDefined();
        expect(cursorTrail.constructor.name).toBe('CursorTrail');
    });
});
