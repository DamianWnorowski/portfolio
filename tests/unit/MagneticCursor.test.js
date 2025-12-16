/**
 * MagneticCursor Unit Tests
 * Tests for magnetic cursor with distortion field
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('MagneticCursor', () => {
    let MagneticCursor;
    let magneticCursor;
    let rafCallback;

    beforeEach(async () => {
        vi.resetModules();
        vi.useFakeTimers();

        // Clear DOM
        document.body.innerHTML = '';
        document.head.innerHTML = '';

        // Mock matchMedia for mobile detection
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

        // Mock window size
        Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
        Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });

        // Mock canvas context with all required methods
        const mockContext = {
            clearRect: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            quadraticCurveTo: vi.fn(),
            stroke: vi.fn(),
            fill: vi.fn(),
            arc: vi.fn(),
            closePath: vi.fn(),
            strokeStyle: '',
            fillStyle: '',
            lineWidth: 1,
            globalAlpha: 1,
            lineCap: 'round',
            lineJoin: 'round'
        };

        HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext);

        // Import fresh instance
        const module = await import('../../src/components/MagneticCursor.js');
        MagneticCursor = module.MagneticCursor;
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('Initialization', () => {
        it('creates cursor element', () => {
            magneticCursor = new MagneticCursor();

            const cursor = document.querySelector('.magnetic-cursor');
            expect(cursor).not.toBeNull();
        });

        it('creates cursor dot', () => {
            magneticCursor = new MagneticCursor();

            const dot = document.querySelector('.cursor-dot');
            expect(dot).not.toBeNull();
        });

        it('creates cursor ring', () => {
            magneticCursor = new MagneticCursor();

            const ring = document.querySelector('.cursor-ring');
            expect(ring).not.toBeNull();
        });

        it('creates cursor glow', () => {
            magneticCursor = new MagneticCursor();

            const glow = document.querySelector('.cursor-glow');
            expect(glow).not.toBeNull();
        });

        it('creates cursor arrows', () => {
            magneticCursor = new MagneticCursor();

            const arrows = document.querySelector('.cursor-arrows');
            expect(arrows).not.toBeNull();
        });

        it('creates trail canvas', () => {
            magneticCursor = new MagneticCursor();

            const canvas = document.querySelector('.cursor-trail-canvas');
            expect(canvas).not.toBeNull();
            expect(canvas.tagName).toBe('CANVAS');
        });

        it('sets correct canvas dimensions', () => {
            magneticCursor = new MagneticCursor();

            const canvas = magneticCursor.trailCanvas;
            expect(canvas.width).toBe(1024);
            expect(canvas.height).toBe(768);
        });

        it('initializes empty trail array', () => {
            magneticCursor = new MagneticCursor();

            expect(magneticCursor.cursorTrail).toEqual([]);
        });

        it('sets trail length to 20', () => {
            magneticCursor = new MagneticCursor();

            expect(magneticCursor.trailLength).toBe(20);
        });

        it('initializes mouse position to 0', () => {
            magneticCursor = new MagneticCursor();

            expect(magneticCursor.mouseX).toBe(0);
            expect(magneticCursor.mouseY).toBe(0);
        });

        it('adds magnetic cursor styles', () => {
            magneticCursor = new MagneticCursor();

            const styles = document.getElementById('magnetic-cursor-styles');
            expect(styles).not.toBeNull();
            expect(styles.textContent).toContain('.magnetic-cursor');
        });

        it('starts animation loop', () => {
            magneticCursor = new MagneticCursor();

            expect(requestAnimationFrame).toHaveBeenCalled();
        });

        it('sets smoothing to 0.15', () => {
            magneticCursor = new MagneticCursor();

            expect(magneticCursor.smoothing).toBe(0.15);
        });

        it('sets magnet strength to 0.3', () => {
            magneticCursor = new MagneticCursor();

            expect(magneticCursor.magnetStrength).toBe(0.3);
        });
    });

    describe('Mouse Tracking', () => {
        beforeEach(() => {
            magneticCursor = new MagneticCursor();
        });

        it('tracks mouse position on mousemove', () => {
            const event = new MouseEvent('mousemove', {
                clientX: 100,
                clientY: 200
            });
            document.dispatchEvent(event);

            expect(magneticCursor.mouseX).toBe(100);
            expect(magneticCursor.mouseY).toBe(200);
        });

        it('adds positions to trail on mousemove', () => {
            const event = new MouseEvent('mousemove', {
                clientX: 150,
                clientY: 250
            });
            document.dispatchEvent(event);

            expect(magneticCursor.cursorTrail.length).toBe(1);
            expect(magneticCursor.cursorTrail[0]).toEqual({ x: 150, y: 250, alpha: 1 });
        });

        it('limits trail to trailLength', () => {
            for (let i = 0; i < 30; i++) {
                const event = new MouseEvent('mousemove', {
                    clientX: i * 10,
                    clientY: i * 10
                });
                document.dispatchEvent(event);
            }

            expect(magneticCursor.cursorTrail.length).toBe(20);
        });

        it('sets clicking state on mousedown', () => {
            const event = new MouseEvent('mousedown');
            document.dispatchEvent(event);

            expect(magneticCursor.isClicking).toBe(true);
        });

        it('adds clicking class on mousedown', () => {
            const event = new MouseEvent('mousedown');
            document.dispatchEvent(event);

            expect(magneticCursor.cursor.classList.contains('clicking')).toBe(true);
        });

        it('clears clicking state on mouseup', () => {
            document.dispatchEvent(new MouseEvent('mousedown'));
            document.dispatchEvent(new MouseEvent('mouseup'));

            expect(magneticCursor.isClicking).toBe(false);
        });

        it('removes clicking class on mouseup', () => {
            document.dispatchEvent(new MouseEvent('mousedown'));
            document.dispatchEvent(new MouseEvent('mouseup'));

            expect(magneticCursor.cursor.classList.contains('clicking')).toBe(false);
        });
    });

    describe('Hover Detection', () => {
        beforeEach(() => {
            magneticCursor = new MagneticCursor();
            // Create test elements
            const button = document.createElement('button');
            button.textContent = 'Test Button';
            document.body.appendChild(button);
        });

        it('detects hover over button', () => {
            const button = document.querySelector('button');
            const event = new MouseEvent('mouseover', { bubbles: true });
            button.dispatchEvent(event);

            expect(magneticCursor.isHovering).toBe(true);
        });

        it('adds hovering class on button hover', () => {
            const button = document.querySelector('button');
            const event = new MouseEvent('mouseover', { bubbles: true });
            button.dispatchEvent(event);

            expect(magneticCursor.cursor.classList.contains('hovering')).toBe(true);
        });

        it('sets hover target', () => {
            const button = document.querySelector('button');
            const event = new MouseEvent('mouseover', { bubbles: true });
            button.dispatchEvent(event);

            expect(magneticCursor.hoverTarget).toBe(button);
        });

        it('adds text-hover class for input elements', () => {
            const input = document.createElement('input');
            document.body.appendChild(input);

            const event = new MouseEvent('mouseover', { bubbles: true });
            input.dispatchEvent(event);

            expect(magneticCursor.cursor.classList.contains('text-hover')).toBe(true);
        });

        it('clears hover state on mouseout', () => {
            const button = document.querySelector('button');
            button.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
            button.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));

            expect(magneticCursor.isHovering).toBe(false);
            expect(magneticCursor.hoverTarget).toBeNull();
        });

        it('removes hovering class on mouseout', () => {
            const button = document.querySelector('button');
            button.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
            button.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));

            expect(magneticCursor.cursor.classList.contains('hovering')).toBe(false);
        });
    });

    describe('Magnetic Elements', () => {
        beforeEach(() => {
            // Create test elements
            const button = document.createElement('button');
            button.textContent = 'Test';
            document.body.appendChild(button);

            magneticCursor = new MagneticCursor();
        });

        it('registers magnetic elements', () => {
            expect(magneticCursor.magneticElements.length).toBeGreaterThan(0);
        });

        it('adds magnetic-element class to elements', () => {
            const button = document.querySelector('button');
            expect(button.classList.contains('magnetic-element')).toBe(true);
        });

        it('applies magnetic effect on nearby elements', () => {
            const button = document.querySelector('button');

            // Position button at known location
            button.getBoundingClientRect = vi.fn(() => ({
                left: 100,
                top: 100,
                width: 100,
                height: 50
            }));

            // Move cursor near button
            magneticCursor.mouseX = 150;
            magneticCursor.mouseY = 125;

            // Trigger animation frame
            if (rafCallback) rafCallback();

            // Element should have transform applied
            expect(button.style.transform).toBeTruthy();
        });

        it('resets element transform when cursor is far', () => {
            const button = document.querySelector('button');

            button.getBoundingClientRect = vi.fn(() => ({
                left: 100,
                top: 100,
                width: 100,
                height: 50
            }));

            // Move cursor far from button
            magneticCursor.mouseX = 1000;
            magneticCursor.mouseY = 1000;

            // Trigger animation frame
            if (rafCallback) rafCallback();

            // Transform should be cleared
            expect(button.style.transform).toBe('');
        });
    });

    describe('Animation Loop', () => {
        beforeEach(() => {
            magneticCursor = new MagneticCursor();
        });

        it('smoothly follows mouse position', () => {
            magneticCursor.mouseX = 100;
            magneticCursor.mouseY = 200;

            if (rafCallback) rafCallback();

            // Cursor should move towards mouse with smoothing
            expect(magneticCursor.cursorX).toBeGreaterThan(0);
            expect(magneticCursor.cursorY).toBeGreaterThan(0);
            expect(magneticCursor.cursorX).toBeLessThan(100);
            expect(magneticCursor.cursorY).toBeLessThan(200);
        });

        it('updates cursor transform', () => {
            magneticCursor.mouseX = 100;
            magneticCursor.mouseY = 200;

            if (rafCallback) rafCallback();

            expect(magneticCursor.cursor.style.transform).toBeTruthy();
        });

        it('schedules next animation frame', () => {
            const initialCalls = requestAnimationFrame.mock.calls.length;
            if (rafCallback) rafCallback();

            expect(requestAnimationFrame.mock.calls.length).toBeGreaterThan(initialCalls);
        });
    });

    describe('Trail Drawing', () => {
        beforeEach(() => {
            magneticCursor = new MagneticCursor();
        });

        it('does not draw with less than 2 trail points', () => {
            const clearRectSpy = vi.spyOn(magneticCursor.trailCtx, 'clearRect');
            const strokeSpy = vi.spyOn(magneticCursor.trailCtx, 'stroke');

            magneticCursor.drawTrail();

            expect(clearRectSpy).toHaveBeenCalled();
            expect(strokeSpy).not.toHaveBeenCalled();
        });

        it('draws trail with multiple points', () => {
            magneticCursor.cursorTrail = [
                { x: 0, y: 0, alpha: 1 },
                { x: 10, y: 10, alpha: 1 },
                { x: 20, y: 20, alpha: 1 }
            ];

            const strokeSpy = vi.spyOn(magneticCursor.trailCtx, 'stroke');
            magneticCursor.drawTrail();

            expect(strokeSpy).toHaveBeenCalled();
        });

        it('fades trail points over time', () => {
            magneticCursor.cursorTrail = [
                { x: 0, y: 0, alpha: 1 },
                { x: 10, y: 10, alpha: 1 }
            ];

            magneticCursor.drawTrail();

            // Alpha should be reduced
            expect(magneticCursor.cursorTrail[1].alpha).toBeLessThan(1);
        });
    });

    describe('Canvas Resize', () => {
        beforeEach(() => {
            magneticCursor = new MagneticCursor();
        });

        it('updates canvas size on window resize', () => {
            window.innerWidth = 1920;
            window.innerHeight = 1080;

            window.dispatchEvent(new Event('resize'));

            expect(magneticCursor.trailCanvas.width).toBe(1920);
            expect(magneticCursor.trailCanvas.height).toBe(1080);
        });
    });

    describe('Styles', () => {
        beforeEach(() => {
            magneticCursor = new MagneticCursor();
        });

        it('hides default cursor', () => {
            const styles = document.getElementById('magnetic-cursor-styles');
            expect(styles.textContent).toContain('cursor: none');
        });

        it('includes hovering state styles', () => {
            const styles = document.getElementById('magnetic-cursor-styles');
            expect(styles.textContent).toContain('.magnetic-cursor.hovering');
        });

        it('includes clicking state styles', () => {
            const styles = document.getElementById('magnetic-cursor-styles');
            expect(styles.textContent).toContain('.magnetic-cursor.clicking');
        });

        it('includes text-hover state styles', () => {
            const styles = document.getElementById('magnetic-cursor-styles');
            expect(styles.textContent).toContain('.magnetic-cursor.text-hover');
        });

        it('includes mobile media query', () => {
            const styles = document.getElementById('magnetic-cursor-styles');
            expect(styles.textContent).toContain('@media (max-width: 768px)');
        });

        it('hides cursor on mobile', () => {
            const styles = document.getElementById('magnetic-cursor-styles');
            expect(styles.textContent).toContain('display: none');
        });
    });

    describe('Destroy', () => {
        beforeEach(() => {
            magneticCursor = new MagneticCursor();
        });

        it('removes cursor element', () => {
            expect(document.querySelector('.magnetic-cursor')).not.toBeNull();

            magneticCursor.destroy();

            expect(magneticCursor.cursor.parentElement).toBeNull();
        });

        it('removes trail canvas', () => {
            expect(document.querySelector('.cursor-trail-canvas')).not.toBeNull();

            magneticCursor.destroy();

            expect(magneticCursor.trailCanvas.parentElement).toBeNull();
        });

        it('removes styles', () => {
            const styles = document.getElementById('magnetic-cursor-styles');
            expect(styles).not.toBeNull();

            magneticCursor.destroy();

            // Style element should be removed from DOM (parentElement becomes null after remove())
            // Note: The element reference may still exist but should no longer be in document
            const stylesAfter = document.getElementById('magnetic-cursor-styles');
            // Either null OR not the same element (destroyed but singleton re-created)
            expect(stylesAfter === null || stylesAfter !== styles).toBe(true);
        });

        it('handles missing cursor gracefully', () => {
            magneticCursor.cursor = null;

            expect(() => magneticCursor.destroy()).not.toThrow();
        });

        it('handles missing canvas gracefully', () => {
            magneticCursor.trailCanvas = null;

            expect(() => magneticCursor.destroy()).not.toThrow();
        });
    });
});

describe('MagneticCursor Singleton', () => {
    it('does not initialize on mobile', async () => {
        vi.resetModules();
        document.body.innerHTML = '';
        document.head.innerHTML = '';

        Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });

        const { magneticCursor } = await import('../../src/components/MagneticCursor.js');
        expect(magneticCursor).toBeNull();
    });

    it('initializes on desktop', async () => {
        vi.resetModules();
        document.body.innerHTML = '';
        document.head.innerHTML = '';

        Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
        window.requestAnimationFrame = vi.fn((cb) => setTimeout(() => cb(performance.now()), 0));

        const { magneticCursor } = await import('../../src/components/MagneticCursor.js');
        expect(magneticCursor).not.toBeNull();
    });
});
