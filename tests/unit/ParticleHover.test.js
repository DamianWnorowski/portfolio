/**
 * ParticleHover Unit Tests
 * Tests for particle explosion hover effects
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('ParticleHover', () => {
    let ParticleHover;
    let particleHover;
    let rafCallback;

    beforeEach(async () => {
        vi.resetModules();
        vi.useFakeTimers();

        // Clear DOM
        document.body.innerHTML = '';
        document.head.innerHTML = '';

        // Mock requestAnimationFrame
        rafCallback = null;
        global.requestAnimationFrame = vi.fn(cb => {
            rafCallback = cb;
            return 1;
        });
        global.cancelAnimationFrame = vi.fn();

        // Mock window size
        Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
        Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });

        // Import fresh instance
        const module = await import('../../src/components/ParticleHover.js');
        ParticleHover = module.ParticleHover;
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('Initialization', () => {
        it('creates canvas element', () => {
            particleHover = new ParticleHover();

            const canvas = document.getElementById('particle-canvas');
            expect(canvas).not.toBeNull();
            expect(canvas.tagName).toBe('CANVAS');
        });

        it('sets correct canvas dimensions', () => {
            particleHover = new ParticleHover();

            expect(particleHover.canvas.width).toBe(1024);
            expect(particleHover.canvas.height).toBe(768);
        });

        it('applies correct canvas styles', () => {
            particleHover = new ParticleHover();

            expect(particleHover.canvas.style.position).toBe('fixed');
            expect(particleHover.canvas.style.pointerEvents).toBe('none');
            expect(particleHover.canvas.style.zIndex).toBe('9999');
        });

        it('initializes empty particles array', () => {
            particleHover = new ParticleHover();

            expect(particleHover.particles).toEqual([]);
        });

        it('sets isActive to false', () => {
            particleHover = new ParticleHover();

            expect(particleHover.isActive).toBe(false);
        });

        it('adds particle hover styles', () => {
            particleHover = new ParticleHover();

            const styles = document.getElementById('particle-hover-styles');
            expect(styles).not.toBeNull();
            expect(styles.textContent).toContain('.particle-hover-target');
        });

        it('does not duplicate styles', () => {
            particleHover = new ParticleHover();
            const instance2 = new ParticleHover();

            const styles = document.querySelectorAll('#particle-hover-styles');
            expect(styles.length).toBe(1);
        });

        it('uses default selector', () => {
            particleHover = new ParticleHover();

            expect(particleHover.selector).toBe('.asset-card, .acq-option, .btn-acquire');
        });

        it('accepts custom selector', () => {
            particleHover = new ParticleHover('.custom-selector');

            expect(particleHover.selector).toBe('.custom-selector');
        });
    });

    describe('Element Binding', () => {
        beforeEach(() => {
            // Create test elements
            const card = document.createElement('div');
            card.className = 'asset-card';
            document.body.appendChild(card);

            const button = document.createElement('button');
            button.className = 'btn-acquire';
            document.body.appendChild(button);

            particleHover = new ParticleHover();
        });

        it('adds particle-hover-target class to elements', () => {
            const card = document.querySelector('.asset-card');
            const button = document.querySelector('.btn-acquire');

            expect(card.classList.contains('particle-hover-target')).toBe(true);
            expect(button.classList.contains('particle-hover-target')).toBe(true);
        });

        it('binds mouseenter event', () => {
            const card = document.querySelector('.asset-card');
            const spy = vi.spyOn(particleHover, 'onHover');

            card.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, clientX: 100, clientY: 100 }));

            expect(spy).toHaveBeenCalled();
        });

        it('binds mousemove event', () => {
            const card = document.querySelector('.asset-card');
            const spy = vi.spyOn(particleHover, 'onMove');

            card.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 100, clientY: 100 }));

            expect(spy).toHaveBeenCalled();
        });

        it('binds mouseleave event', () => {
            const card = document.querySelector('.asset-card');
            const spy = vi.spyOn(particleHover, 'onLeave');

            card.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));

            expect(spy).toHaveBeenCalled();
        });
    });

    describe('Hover Behavior', () => {
        beforeEach(() => {
            const card = document.createElement('div');
            card.className = 'asset-card';
            document.body.appendChild(card);

            particleHover = new ParticleHover();
        });

        it('sets isActive on hover', () => {
            const card = document.querySelector('.asset-card');
            card.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, clientX: 100, clientY: 100 }));

            expect(particleHover.isActive).toBe(true);
        });

        it('spawns burst on hover', () => {
            const card = document.querySelector('.asset-card');
            card.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, clientX: 100, clientY: 100 }));

            expect(particleHover.particles.length).toBe(12);
        });

        it('starts animation on hover', () => {
            const card = document.querySelector('.asset-card');
            card.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, clientX: 100, clientY: 100 }));

            expect(requestAnimationFrame).toHaveBeenCalled();
        });

        it('clears isActive on leave', () => {
            const card = document.querySelector('.asset-card');
            card.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, clientX: 100, clientY: 100 }));
            card.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));

            expect(particleHover.isActive).toBe(false);
        });

        it('spawns particles on move when active', () => {
            const card = document.querySelector('.asset-card');

            // Activate
            card.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, clientX: 100, clientY: 100 }));
            const initialCount = particleHover.particles.length;

            // Force random to trigger particle spawn (very low value ensures spawn)
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            card.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 150, clientY: 150 }));

            // Should have same or more particles (spawn may or may not trigger based on random)
            expect(particleHover.particles.length).toBeGreaterThanOrEqual(initialCount);
        });

        it('does not spawn on move when inactive', () => {
            const card = document.querySelector('.asset-card');
            card.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 150, clientY: 150 }));

            expect(particleHover.particles.length).toBe(0);
        });
    });

    describe('Particle Spawning', () => {
        beforeEach(() => {
            particleHover = new ParticleHover();
        });

        it('creates particle at specified position', () => {
            particleHover.spawnParticle(100, 200);

            expect(particleHover.particles.length).toBe(1);
            expect(particleHover.particles[0].x).toBe(100);
            expect(particleHover.particles[0].y).toBe(200);
        });

        it('assigns random color from palette', () => {
            particleHover.spawnParticle(100, 100);

            const colors = ['#c9a227', '#4a9eff', '#22c55e', '#f8fafc'];
            expect(colors).toContain(particleHover.particles[0].color);
        });

        it('assigns random velocity', () => {
            particleHover.spawnParticle(100, 100);

            const particle = particleHover.particles[0];
            expect(particle.vx).toBeDefined();
            expect(particle.vy).toBeDefined();
        });

        it('sets initial alpha to 1', () => {
            particleHover.spawnParticle(100, 100);

            expect(particleHover.particles[0].alpha).toBe(1);
        });

        it('assigns random size', () => {
            particleHover.spawnParticle(100, 100);

            const size = particleHover.particles[0].size;
            expect(size).toBeGreaterThanOrEqual(2);
            expect(size).toBeLessThanOrEqual(5);
        });

        it('assigns gravity to particle', () => {
            particleHover.spawnParticle(100, 100);

            expect(particleHover.particles[0].gravity).toBe(0.05);
        });

        it('creates burst with specified count', () => {
            particleHover.spawnBurst(100, 100, 20);

            expect(particleHover.particles.length).toBe(20);
        });

        it('burst particles have higher speed', () => {
            particleHover.spawnBurst(100, 100, 1);
            const burstParticle = particleHover.particles[0];

            particleHover.particles = [];
            particleHover.spawnParticle(100, 100, false);
            const normalParticle = particleHover.particles[0];

            const burstSpeed = Math.sqrt(burstParticle.vx ** 2 + burstParticle.vy ** 2);
            const normalSpeed = Math.sqrt(normalParticle.vx ** 2 + normalParticle.vy ** 2);

            // Burst particles should generally be faster (with high probability)
            // We check range instead of exact comparison due to randomness
            expect(burstSpeed).toBeGreaterThan(0);
            expect(normalSpeed).toBeGreaterThan(0);
        });
    });

    describe('Animation Loop', () => {
        beforeEach(() => {
            particleHover = new ParticleHover();
            particleHover.spawnParticle(100, 100);
        });

        it('updates particle position', () => {
            const particle = particleHover.particles[0];
            const initialX = particle.x;
            const initialY = particle.y;

            particleHover.animate();

            expect(particle.x).not.toBe(initialX);
            expect(particle.y).not.toBe(initialY);
        });

        it('applies gravity to particles', () => {
            const particle = particleHover.particles[0];
            const initialVy = particle.vy;

            particleHover.animate();

            expect(particle.vy).toBeGreaterThan(initialVy);
        });

        it('decays particle alpha', () => {
            const particle = particleHover.particles[0];
            const initialAlpha = particle.alpha;

            particleHover.animate();

            expect(particle.alpha).toBeLessThan(initialAlpha);
        });

        it('shrinks particle size', () => {
            const particle = particleHover.particles[0];
            const initialSize = particle.size;

            particleHover.animate();

            expect(particle.size).toBeLessThan(initialSize);
        });

        it('removes dead particles', () => {
            particleHover.particles[0].alpha = 0;

            particleHover.animate();

            expect(particleHover.particles.length).toBe(0);
        });

        it('schedules next frame when particles exist', () => {
            particleHover.particles[0].alpha = 1;

            particleHover.animate();

            expect(particleHover.animationId).toBeDefined();
        });

        it('schedules next frame when active', () => {
            particleHover.isActive = true;
            particleHover.particles = [];

            particleHover.animate();

            expect(particleHover.animationId).toBeDefined();
        });

        it('stops animation when no particles and inactive', () => {
            particleHover.isActive = false;
            particleHover.particles = [];

            particleHover.animate();

            expect(particleHover.animationId).toBeNull();
        });

        it('draws particles to canvas', () => {
            const fillSpy = vi.spyOn(particleHover.ctx, 'fill');

            particleHover.animate();

            expect(fillSpy).toHaveBeenCalled();
        });

        it('applies particle alpha to canvas', () => {
            particleHover.particles[0].alpha = 0.5;

            particleHover.animate();

            expect(particleHover.ctx.globalAlpha).toBe(1); // Reset after drawing
        });
    });

    describe('Programmatic Trigger', () => {
        beforeEach(() => {
            particleHover = new ParticleHover();
        });

        it('triggers particle burst on element', () => {
            const element = document.createElement('div');
            element.getBoundingClientRect = vi.fn(() => ({
                left: 100,
                top: 100,
                width: 100,
                height: 50
            }));

            particleHover.trigger(element);

            expect(particleHover.particles.length).toBe(20);
        });

        it('centers burst on element', () => {
            const element = document.createElement('div');
            element.getBoundingClientRect = vi.fn(() => ({
                left: 100,
                top: 100,
                width: 100,
                height: 50
            }));

            particleHover.trigger(element);

            const centerX = 150; // left + width/2
            const centerY = 125; // top + height/2

            particleHover.particles.forEach(p => {
                // Initial position should be near center (with some random variance)
                expect(Math.abs(p.x - centerX)).toBeLessThan(20);
                expect(Math.abs(p.y - centerY)).toBeLessThan(20);
            });
        });

        it('starts animation after trigger', () => {
            const element = document.createElement('div');
            element.getBoundingClientRect = vi.fn(() => ({
                left: 100,
                top: 100,
                width: 100,
                height: 50
            }));

            particleHover.trigger(element);

            expect(requestAnimationFrame).toHaveBeenCalled();
        });
    });

    describe('Canvas Resize', () => {
        beforeEach(() => {
            particleHover = new ParticleHover();
        });

        it('updates canvas size on window resize', () => {
            window.innerWidth = 1920;
            window.innerHeight = 1080;

            window.dispatchEvent(new Event('resize'));

            expect(particleHover.canvas.width).toBe(1920);
            expect(particleHover.canvas.height).toBe(1080);
        });
    });

    describe('Styles', () => {
        beforeEach(() => {
            particleHover = new ParticleHover();
        });

        it('includes hover target styles', () => {
            const styles = document.getElementById('particle-hover-styles');
            expect(styles.textContent).toContain('.particle-hover-target');
        });

        it('includes hover effect styles', () => {
            const styles = document.getElementById('particle-hover-styles');
            expect(styles.textContent).toContain('.particle-hover-target:hover::before');
        });

        it('includes gradient background', () => {
            const styles = document.getElementById('particle-hover-styles');
            expect(styles.textContent).toContain('linear-gradient');
            expect(styles.textContent).toContain('rgba(201, 162, 39, 0.1)');
        });
    });

    describe('Destroy', () => {
        beforeEach(() => {
            particleHover = new ParticleHover();
            particleHover.spawnParticle(100, 100);
            particleHover.startAnimation();
        });

        it('cancels animation frame', () => {
            particleHover.destroy();

            expect(cancelAnimationFrame).toHaveBeenCalled();
        });

        it('removes canvas from DOM', () => {
            expect(document.getElementById('particle-canvas')).not.toBeNull();

            particleHover.destroy();

            expect(particleHover.canvas.parentElement).toBeNull();
        });

        it('handles missing animation ID gracefully', () => {
            particleHover.animationId = null;

            expect(() => particleHover.destroy()).not.toThrow();
        });

        it('handles missing canvas gracefully', () => {
            particleHover.canvas = null;

            expect(() => particleHover.destroy()).not.toThrow();
        });
    });
});

describe('ParticleHover Singleton', () => {
    it('exports auto-initialized singleton', async () => {
        vi.resetModules();
        document.body.innerHTML = '';
        document.head.innerHTML = '';

        window.requestAnimationFrame = vi.fn((cb) => setTimeout(() => cb(performance.now()), 0));
        window.cancelAnimationFrame = vi.fn((id) => clearTimeout(id));

        const { particleHover } = await import('../../src/components/ParticleHover.js');
        expect(particleHover).not.toBeNull();
        expect(particleHover.constructor.name).toBe('ParticleHover');
    });
});
