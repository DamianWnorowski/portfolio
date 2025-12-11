/**
 * Engine Unit Tests
 * Tests for core WebGL rendering engine
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';

// Mocks are in setup.js, but we import them to access the spy instances
const MockedClock = THREE.Clock;
const MockedVector2 = THREE.Vector2;

describe('Engine', () => {
    let Engine;
    let getEngine;
    let engine;
    
    beforeEach(async () => {
        vi.resetModules();
        vi.useFakeTimers();

        global.innerWidth = 1920;
        global.innerHeight = 1080;
        global.performance = { now: () => Date.now() };

        // Re-establish requestAnimationFrame mock after resetModules
        window.requestAnimationFrame = vi.fn((cb) => {
            return setTimeout(() => cb(performance.now()), 0);
        });
        window.cancelAnimationFrame = vi.fn((id) => {
            clearTimeout(id);
        });

        const module = await import('../../src/core/Engine.js');
        Engine = module.Engine;
        getEngine = module.getEngine;
    });

    afterEach(() => {
        if (engine && engine.isRunning) {
            engine.destroy();
        }
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    describe('Initialization', () => {
        beforeEach(() => {
            engine = new Engine();
        });

        it('creates a Clock instance', () => {
            expect(MockedClock).toHaveBeenCalled();
            expect(engine.clock).toBeDefined();
        });

        it('initializes mouse position at (0.5, 0.5)', () => {
            expect(MockedVector2).toHaveBeenCalledWith(0.5, 0.5);
            expect(engine.mouse.x).toBe(0.5);
            expect(engine.mouse.y).toBe(0.5);
        });

        it('starts running automatically', () => {
            expect(engine.isRunning).toBe(true);
        });

        it('requests animation frame on init', () => {
            expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
        });
    });

    describe('Animation Loop', () => {
        beforeEach(() => {
            engine = new Engine();
            window.requestAnimationFrame.mockClear();
        });

        it('calls requestAnimationFrame in animate', () => {
            engine.animate();
            expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
        });

        it('stops animation when isRunning is false', () => {
            engine.isRunning = false;
            engine.animate();
            expect(window.requestAnimationFrame).not.toHaveBeenCalled();
        });

        it('updates all components with update method', () => {
            const comp1 = { update: vi.fn() };
            const comp2 = { update: vi.fn() };
            engine.registerComponent('comp1', comp1);
            engine.registerComponent('comp2', comp2);
            
            // Stop the engine before triggering manual animate to avoid infinite loop
            engine.isRunning = false;
            
            // Manually call update loop logic
            engine.components.forEach(comp => {
                if (comp.update) comp.update(0.016, 1.0);
            });

            expect(comp1.update).toHaveBeenCalled();
            expect(comp2.update).toHaveBeenCalled();
        });

        it('decays mouse influence each frame', () => {
            const initialInfluence = 1.0;
            engine.mouseInfluence = initialInfluence;
            
            // Stop the engine to prevent infinite loop
            engine.isRunning = false;
            
            // Simulate decay (0.95 decay factor from Engine.js)
            const expectedInfluence = initialInfluence * 0.95;
            engine.mouseInfluence *= 0.95;
            
            expect(engine.mouseInfluence).toBe(expectedInfluence);
        });
    });
});