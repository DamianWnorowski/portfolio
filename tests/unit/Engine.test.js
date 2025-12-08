/**
 * Engine Unit Tests
 * Tests for core WebGL rendering engine
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock THREE.js
vi.mock('three', () => ({
    Clock: vi.fn().mockImplementation(() => ({
        getDelta: vi.fn().mockReturnValue(0.016),
        getElapsedTime: vi.fn().mockReturnValue(1.0)
    }))
}));

describe('Engine', () => {
    let Engine;
    let getEngine;
    let engine;

    beforeEach(async () => {
        vi.resetModules();

        // Mock window
        global.innerWidth = 1920;
        global.innerHeight = 1080;

        // Mock requestAnimationFrame
        global.requestAnimationFrame = vi.fn((cb) => {
            return setTimeout(() => cb(performance.now()), 16);
        });
        global.cancelAnimationFrame = vi.fn((id) => clearTimeout(id));

        // Reset singleton
        const module = await import('../../src/core/Engine.js');
        Engine = module.Engine;
        getEngine = module.getEngine;

        engine = new Engine();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    describe('Initialization', () => {
        it('creates a Clock instance', () => {
            expect(engine.clock).toBeDefined();
        });

        it('initializes mouse position at center', () => {
            expect(engine.mouse).toEqual({ x: 0, y: 0 });
        });

        it('stores window dimensions', () => {
            expect(engine.width).toBe(1920);
            expect(engine.height).toBe(1080);
        });

        it('creates empty components map', () => {
            expect(engine.components).toBeInstanceOf(Map);
            expect(engine.components.size).toBe(0);
        });

        it('starts not running', () => {
            expect(engine.isRunning).toBe(false);
        });
    });

    describe('Component Registration', () => {
        it('registers component with name', () => {
            const mockComponent = { update: vi.fn() };
            engine.register('test', mockComponent);

            expect(engine.components.has('test')).toBe(true);
        });

        it('returns component on get', () => {
            const mockComponent = { update: vi.fn() };
            engine.register('test', mockComponent);

            expect(engine.get('test')).toBe(mockComponent);
        });

        it('returns undefined for unregistered component', () => {
            expect(engine.get('nonexistent')).toBeUndefined();
        });

        it('unregisters component', () => {
            const mockComponent = { update: vi.fn(), dispose: vi.fn() };
            engine.register('test', mockComponent);

            engine.unregister('test');

            expect(engine.components.has('test')).toBe(false);
        });

        it('calls dispose on unregister if available', () => {
            const mockComponent = { update: vi.fn(), dispose: vi.fn() };
            engine.register('test', mockComponent);

            engine.unregister('test');

            expect(mockComponent.dispose).toHaveBeenCalled();
        });

        it('handles unregister without dispose method', () => {
            const mockComponent = { update: vi.fn() };
            engine.register('test', mockComponent);

            expect(() => engine.unregister('test')).not.toThrow();
        });
    });

    describe('Animation Loop', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('starts animation loop', () => {
            engine.start();

            expect(engine.isRunning).toBe(true);
            expect(requestAnimationFrame).toHaveBeenCalled();
        });

        it('does not start if already running', () => {
            engine.start();
            const callCount = requestAnimationFrame.mock.calls.length;

            engine.start();

            expect(requestAnimationFrame.mock.calls.length).toBe(callCount);
        });

        it('stops animation loop', () => {
            engine.start();
            engine.stop();

            expect(engine.isRunning).toBe(false);
        });

        it('updates all components on tick', () => {
            const comp1 = { update: vi.fn() };
            const comp2 = { update: vi.fn() };

            engine.register('comp1', comp1);
            engine.register('comp2', comp2);
            engine.start();

            vi.advanceTimersByTime(16);

            expect(comp1.update).toHaveBeenCalled();
            expect(comp2.update).toHaveBeenCalled();
        });

        it('passes delta time to component update', () => {
            const mockComponent = { update: vi.fn() };
            engine.register('test', mockComponent);
            engine.start();

            vi.advanceTimersByTime(16);

            expect(mockComponent.update).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number)
            );
        });

        it('skips components without update method', () => {
            const noUpdate = { render: vi.fn() };
            engine.register('noUpdate', noUpdate);

            expect(() => {
                engine.start();
                vi.advanceTimersByTime(16);
            }).not.toThrow();
        });
    });

    describe('Mouse Tracking', () => {
        it('normalizes mouse position on move', () => {
            const event = new MouseEvent('mousemove', {
                clientX: 960,
                clientY: 540
            });

            window.dispatchEvent(event);

            // Center of screen should be ~0, 0
            expect(engine.mouse.x).toBeCloseTo(0, 1);
            expect(engine.mouse.y).toBeCloseTo(0, 1);
        });

        it('calculates left edge as -1', () => {
            const event = new MouseEvent('mousemove', {
                clientX: 0,
                clientY: 540
            });

            window.dispatchEvent(event);

            expect(engine.mouse.x).toBeCloseTo(-1, 1);
        });

        it('calculates right edge as 1', () => {
            const event = new MouseEvent('mousemove', {
                clientX: 1920,
                clientY: 540
            });

            window.dispatchEvent(event);

            expect(engine.mouse.x).toBeCloseTo(1, 1);
        });

        it('inverts Y axis (top is 1, bottom is -1)', () => {
            const topEvent = new MouseEvent('mousemove', {
                clientX: 960,
                clientY: 0
            });
            window.dispatchEvent(topEvent);
            expect(engine.mouse.y).toBeCloseTo(1, 1);

            const bottomEvent = new MouseEvent('mousemove', {
                clientX: 960,
                clientY: 1080
            });
            window.dispatchEvent(bottomEvent);
            expect(engine.mouse.y).toBeCloseTo(-1, 1);
        });
    });

    describe('Resize Handling', () => {
        it('updates dimensions on resize', () => {
            global.innerWidth = 1280;
            global.innerHeight = 720;

            window.dispatchEvent(new Event('resize'));

            expect(engine.width).toBe(1280);
            expect(engine.height).toBe(720);
        });

        it('calls onResize on components', () => {
            const mockComponent = {
                update: vi.fn(),
                onResize: vi.fn()
            };
            engine.register('test', mockComponent);

            global.innerWidth = 1280;
            global.innerHeight = 720;
            window.dispatchEvent(new Event('resize'));

            expect(mockComponent.onResize).toHaveBeenCalledWith(1280, 720);
        });

        it('handles components without onResize', () => {
            const noResize = { update: vi.fn() };
            engine.register('noResize', noResize);

            expect(() => {
                window.dispatchEvent(new Event('resize'));
            }).not.toThrow();
        });
    });

    describe('Singleton Pattern', () => {
        it('getEngine returns same instance', async () => {
            const engine1 = getEngine();
            const engine2 = getEngine();

            expect(engine1).toBe(engine2);
        });
    });

    describe('Cleanup', () => {
        it('disposes all components on destroy', () => {
            const comp1 = { update: vi.fn(), dispose: vi.fn() };
            const comp2 = { update: vi.fn(), dispose: vi.fn() };

            engine.register('comp1', comp1);
            engine.register('comp2', comp2);

            engine.destroy();

            expect(comp1.dispose).toHaveBeenCalled();
            expect(comp2.dispose).toHaveBeenCalled();
        });

        it('clears components map on destroy', () => {
            engine.register('test', { update: vi.fn() });

            engine.destroy();

            expect(engine.components.size).toBe(0);
        });

        it('stops animation loop on destroy', () => {
            engine.start();
            engine.destroy();

            expect(engine.isRunning).toBe(false);
        });
    });
});
