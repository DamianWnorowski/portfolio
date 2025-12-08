/**
 * Engine Unit Tests
 * Tests for core WebGL rendering engine
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Engine', () => {
    let Engine;
    let getEngine;
    let engine;
    let rafCallbacks = [];
    let mockClock;
    let mockVector2;

    beforeEach(async () => {
        vi.resetModules();
        vi.useFakeTimers();
        rafCallbacks = [];

        // Create mock instances
        mockClock = {
            getDelta: vi.fn().mockReturnValue(0.016),
            getElapsedTime: vi.fn().mockReturnValue(1.0)
        };

        mockVector2 = (x = 0, y = 0) => ({
            x,
            y,
            set: vi.fn(function(newX, newY) { this.x = newX; this.y = newY; return this; })
        });

        // Mock THREE.js
        vi.doMock('three', () => ({
            Clock: vi.fn().mockImplementation(() => mockClock),
            Vector2: vi.fn().mockImplementation(mockVector2)
        }));

        // Mock window dimensions
        global.innerWidth = 1920;
        global.innerHeight = 1080;

        // Mock requestAnimationFrame to capture callbacks without auto-executing
        global.requestAnimationFrame = vi.fn((cb) => {
            const id = rafCallbacks.length;
            rafCallbacks.push(cb);
            return id;
        });
        global.cancelAnimationFrame = vi.fn((id) => {
            rafCallbacks[id] = null;
        });

        // Import module fresh for each test
        const module = await import('../../src/core/Engine.js');
        Engine = module.Engine;
        getEngine = module.getEngine;
    });

    afterEach(() => {
        // Stop any running engines
        if (engine) {
            engine.isRunning = false;
        }
        rafCallbacks = [];
        vi.clearAllTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
        vi.doUnmock('three');
    });

    describe('Initialization', () => {
        beforeEach(() => {
            engine = new Engine();
        });

        it('creates a Clock instance', () => {
            expect(engine.clock).toBeDefined();
        });

        it('initializes mouse position at (0.5, 0.5)', () => {
            // Engine initializes mouse at center (0.5, 0.5) in normalized coordinates
            expect(engine.mouse.x).toBe(0.5);
            expect(engine.mouse.y).toBe(0.5);
        });

        it('initializes mouse influence at 0', () => {
            expect(engine.mouseInfluence).toBe(0);
        });

        it('creates empty components map', () => {
            expect(engine.components).toBeInstanceOf(Map);
            expect(engine.components.size).toBe(0);
        });

        it('starts running automatically', () => {
            // Engine auto-starts on construction
            expect(engine.isRunning).toBe(true);
        });

        it('registers mousemove listener', () => {
            const addEventSpy = vi.spyOn(window, 'addEventListener');
            new Engine();
            expect(addEventSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
        });

        it('registers resize listener', () => {
            const addEventSpy = vi.spyOn(window, 'addEventListener');
            new Engine();
            expect(addEventSpy).toHaveBeenCalledWith('resize', expect.any(Function));
        });

        it('requests animation frame on init', () => {
            expect(requestAnimationFrame).toHaveBeenCalled();
        });
    });

    describe('Component Registration', () => {
        beforeEach(() => {
            engine = new Engine();
        });

        it('registers component with name', () => {
            const mockComponent = { update: vi.fn() };
            engine.registerComponent('test', mockComponent);

            expect(engine.components.has('test')).toBe(true);
        });

        it('returns component on getComponent', () => {
            const mockComponent = { update: vi.fn() };
            engine.registerComponent('test', mockComponent);

            expect(engine.getComponent('test')).toBe(mockComponent);
        });

        it('returns undefined for unregistered component', () => {
            expect(engine.getComponent('nonexistent')).toBeUndefined();
        });

        it('allows multiple components to be registered', () => {
            engine.registerComponent('comp1', { update: vi.fn() });
            engine.registerComponent('comp2', { update: vi.fn() });

            expect(engine.components.size).toBe(2);
        });

        it('overwrites component with same name', () => {
            const comp1 = { update: vi.fn(), id: 1 };
            const comp2 = { update: vi.fn(), id: 2 };

            engine.registerComponent('test', comp1);
            engine.registerComponent('test', comp2);

            expect(engine.getComponent('test').id).toBe(2);
        });
    });

    describe('Animation Loop', () => {
        beforeEach(() => {
            engine = new Engine();
        });

        it('calls requestAnimationFrame in animate', () => {
            // Clear initial call from constructor
            const initialCalls = requestAnimationFrame.mock.calls.length;

            // Execute the first RAF callback to trigger another frame
            if (rafCallbacks[0]) {
                rafCallbacks[0]();
            }

            expect(requestAnimationFrame.mock.calls.length).toBeGreaterThan(initialCalls);
        });

        it('stops animation when isRunning is false', () => {
            engine.isRunning = false;

            // Clear previous calls
            requestAnimationFrame.mockClear();

            // Try to animate - should exit early
            engine.animate();

            expect(requestAnimationFrame).not.toHaveBeenCalled();
        });

        it('updates all components with update method', () => {
            const comp1 = { update: vi.fn() };
            const comp2 = { update: vi.fn() };

            engine.registerComponent('comp1', comp1);
            engine.registerComponent('comp2', comp2);

            // Execute animation frame callback
            if (rafCallbacks.length > 0 && rafCallbacks[0]) {
                rafCallbacks[0]();
            }

            expect(comp1.update).toHaveBeenCalled();
            expect(comp2.update).toHaveBeenCalled();
        });

        it('passes elapsed, delta, mouse, and mouseInfluence to update', () => {
            const mockComponent = { update: vi.fn() };
            engine.registerComponent('test', mockComponent);

            // Execute animation frame
            if (rafCallbacks.length > 0 && rafCallbacks[0]) {
                rafCallbacks[0]();
            }

            expect(mockComponent.update).toHaveBeenCalledWith(
                expect.any(Number),   // elapsed
                expect.any(Number),   // delta
                engine.mouse,         // mouse position
                expect.any(Number)    // mouseInfluence
            );
        });

        it('skips components without update method', () => {
            const noUpdate = { render: vi.fn() };
            engine.registerComponent('noUpdate', noUpdate);

            expect(() => {
                if (rafCallbacks.length > 0 && rafCallbacks[0]) {
                    rafCallbacks[0]();
                }
            }).not.toThrow();
        });

        it('decays mouse influence each frame', () => {
            engine.mouseInfluence = 1.0;

            // Execute animation frame
            if (rafCallbacks.length > 0 && rafCallbacks[0]) {
                rafCallbacks[0]();
            }

            expect(engine.mouseInfluence).toBeLessThan(1.0);
        });
    });

    describe('Mouse Tracking', () => {
        beforeEach(() => {
            engine = new Engine();
        });

        it('normalizes mouse X position (0 to 1)', () => {
            const event = new MouseEvent('mousemove', {
                clientX: 960,  // Center of 1920
                clientY: 540
            });

            engine.onMouseMove(event);

            expect(engine.mouse.x).toBeCloseTo(0.5, 2);
        });

        it('calculates left edge as 0', () => {
            const event = new MouseEvent('mousemove', {
                clientX: 0,
                clientY: 540
            });

            engine.onMouseMove(event);

            expect(engine.mouse.x).toBeCloseTo(0, 2);
        });

        it('calculates right edge as 1', () => {
            const event = new MouseEvent('mousemove', {
                clientX: 1920,
                clientY: 540
            });

            engine.onMouseMove(event);

            expect(engine.mouse.x).toBeCloseTo(1, 2);
        });

        it('inverts Y axis (top is 1, bottom is 0)', () => {
            // Top of screen
            const topEvent = new MouseEvent('mousemove', {
                clientX: 960,
                clientY: 0
            });
            engine.onMouseMove(topEvent);
            expect(engine.mouse.y).toBeCloseTo(1, 2);

            // Bottom of screen
            const bottomEvent = new MouseEvent('mousemove', {
                clientX: 960,
                clientY: 1080
            });
            engine.onMouseMove(bottomEvent);
            expect(engine.mouse.y).toBeCloseTo(0, 2);
        });

        it('increases mouse influence on move', () => {
            const initialInfluence = engine.mouseInfluence;

            const event = new MouseEvent('mousemove', {
                clientX: 500,
                clientY: 500
            });

            engine.onMouseMove(event);

            expect(engine.mouseInfluence).toBeGreaterThan(initialInfluence);
        });

        it('caps mouse influence at 1.0', () => {
            // Move mouse multiple times
            for (let i = 0; i < 20; i++) {
                engine.onMouseMove(new MouseEvent('mousemove', {
                    clientX: i * 100,
                    clientY: i * 50
                }));
            }

            expect(engine.mouseInfluence).toBeLessThanOrEqual(1.0);
        });
    });

    describe('Resize Handling', () => {
        beforeEach(() => {
            engine = new Engine();
        });

        it('calls onResize on components with onResize method', () => {
            const mockComponent = {
                update: vi.fn(),
                onResize: vi.fn()
            };
            engine.registerComponent('test', mockComponent);

            engine.onResize();

            expect(mockComponent.onResize).toHaveBeenCalled();
        });

        it('handles components without onResize method', () => {
            const noResize = { update: vi.fn() };
            engine.registerComponent('noResize', noResize);

            expect(() => engine.onResize()).not.toThrow();
        });

        it('calls onResize on all components', () => {
            const comp1 = { update: vi.fn(), onResize: vi.fn() };
            const comp2 = { update: vi.fn(), onResize: vi.fn() };

            engine.registerComponent('comp1', comp1);
            engine.registerComponent('comp2', comp2);

            engine.onResize();

            expect(comp1.onResize).toHaveBeenCalled();
            expect(comp2.onResize).toHaveBeenCalled();
        });
    });

    describe('Singleton Pattern', () => {
        it('getEngine returns an Engine instance', () => {
            const instance = getEngine();
            expect(instance).toBeInstanceOf(Engine);
        });

        it('getEngine returns same instance on subsequent calls', async () => {
            // Need to test singleton within same module context
            const instance1 = getEngine();
            const instance2 = getEngine();

            expect(instance1).toBe(instance2);
        });
    });

    describe('Cleanup', () => {
        beforeEach(() => {
            engine = new Engine();
        });

        it('sets isRunning to false on destroy', () => {
            engine.destroy();

            expect(engine.isRunning).toBe(false);
        });

        it('calls destroy on components with destroy method', () => {
            const comp1 = { update: vi.fn(), destroy: vi.fn() };
            const comp2 = { update: vi.fn(), destroy: vi.fn() };

            engine.registerComponent('comp1', comp1);
            engine.registerComponent('comp2', comp2);

            engine.destroy();

            expect(comp1.destroy).toHaveBeenCalled();
            expect(comp2.destroy).toHaveBeenCalled();
        });

        it('clears components map on destroy', () => {
            engine.registerComponent('test', { update: vi.fn() });

            engine.destroy();

            expect(engine.components.size).toBe(0);
        });

        it('handles components without destroy method', () => {
            const noDestroy = { update: vi.fn() };
            engine.registerComponent('noDestroy', noDestroy);

            expect(() => engine.destroy()).not.toThrow();
        });
    });
});
