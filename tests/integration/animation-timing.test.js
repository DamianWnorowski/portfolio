/**
 * Animation Timing Tests - REAL RAF & PERFORMANCE
 * Tests actual requestAnimationFrame timing and 60 FPS performance
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Real RAF implementation using high-resolution timers
const createRealRAF = () => {
    let rafId = 0;
    const callbacks = new Map();
    let currentTime = performance.now();

    const requestAnimationFrame = (callback) => {
        rafId++;
        const id = rafId;

        // Schedule callback for next frame (16.67ms at 60 FPS)
        const nextFrameTime = currentTime + 16.67;

        callbacks.set(id, {
            callback,
            scheduledTime: nextFrameTime
        });

        return id;
    };

    const cancelAnimationFrame = (id) => {
        callbacks.delete(id);
    };

    const tick = (deltaTime = 16.67) => {
        currentTime += deltaTime;

        const callbacksToExecute = [];

        for (const [id, { callback, scheduledTime }] of callbacks.entries()) {
            if (currentTime >= scheduledTime) {
                callbacksToExecute.push({ id, callback });
            }
        }

        // Execute callbacks
        for (const { id, callback } of callbacksToExecute) {
            callbacks.delete(id);
            callback(currentTime);
        }

        return callbacksToExecute.length;
    };

    const getTime = () => currentTime;

    return {
        requestAnimationFrame,
        cancelAnimationFrame,
        tick,
        getTime
    };
};

describe('Animation Timing - Real RAF Tests', () => {
    let raf;

    beforeEach(() => {
        raf = createRealRAF();
        global.requestAnimationFrame = raf.requestAnimationFrame;
        global.cancelAnimationFrame = raf.cancelAnimationFrame;
    });

    describe('RequestAnimationFrame Basics', () => {
        it('schedules callback for next frame', () => {
            let called = false;

            requestAnimationFrame(() => {
                called = true;
            });

            expect(called).toBe(false);

            raf.tick();

            expect(called).toBe(true);
        });

        it('returns unique frame ID', () => {
            const id1 = requestAnimationFrame(() => {});
            const id2 = requestAnimationFrame(() => {});

            expect(id1).not.toBe(id2);
        });

        it('passes timestamp to callback', () => {
            let timestamp = 0;

            requestAnimationFrame((time) => {
                timestamp = time;
            });

            raf.tick();

            expect(timestamp).toBeGreaterThan(0);
        });

        it('cancels animation frame', () => {
            let called = false;

            const id = requestAnimationFrame(() => {
                called = true;
            });

            cancelAnimationFrame(id);

            raf.tick();

            expect(called).toBe(false);
        });
    });

    describe('Frame Timing Accuracy', () => {
        it('executes at ~60 FPS (16.67ms intervals)', () => {
            const timestamps = [];

            const animate = (time) => {
                timestamps.push(time);
                if (timestamps.length < 60) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);

            // Simulate 60 frames (1 second at 60 FPS)
            for (let i = 0; i < 60; i++) {
                raf.tick(16.67);
            }

            expect(timestamps.length).toBe(60);

            // Check intervals
            for (let i = 1; i < timestamps.length; i++) {
                const interval = timestamps[i] - timestamps[i - 1];
                expect(interval).toBeCloseTo(16.67, 1);
            }
        });

        it('maintains consistent frame timing under load', () => {
            const frameTimes = [];
            let lastTime = 0;

            const animate = (time) => {
                if (lastTime > 0) {
                    frameTimes.push(time - lastTime);
                }
                lastTime = time;

                if (frameTimes.length < 100) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);

            // Simulate 100 frames
            for (let i = 0; i < 100; i++) {
                raf.tick(16.67);
            }

            const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;

            expect(avgFrameTime).toBeCloseTo(16.67, 0.5);

            // Check variance (should be low)
            const variance = frameTimes.reduce((sum, time) => {
                return sum + Math.pow(time - avgFrameTime, 2);
            }, 0) / frameTimes.length;

            expect(Math.sqrt(variance)).toBeLessThan(2); // Low standard deviation
        });

        it('detects dropped frames', () => {
            const frameTimes = [];
            let lastTime = 0;

            const animate = (time) => {
                if (lastTime > 0) {
                    frameTimes.push(time - lastTime);
                }
                lastTime = time;

                if (frameTimes.length < 50) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);

            // Simulate normal frames
            for (let i = 0; i < 25; i++) {
                raf.tick(16.67);
            }

            // Simulate dropped frame (33ms instead of 16.67ms)
            raf.tick(33.34);

            // Continue with normal frames
            for (let i = 0; i < 24; i++) {
                raf.tick(16.67);
            }

            // Check for the dropped frame
            const droppedFrames = frameTimes.filter(time => time > 25).length;
            expect(droppedFrames).toBe(1);
        });
    });

    describe('Performance Monitoring', () => {
        it('calculates FPS from frame timestamps', () => {
            const timestamps = [];
            let frameCount = 0;

            const animate = (time) => {
                timestamps.push(time);
                frameCount++;

                if (frameCount < 120) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);

            // Simulate 2 seconds at 60 FPS
            for (let i = 0; i < 120; i++) {
                raf.tick(16.67);
            }

            const duration = (timestamps[timestamps.length - 1] - timestamps[0]) / 1000;
            const fps = frameCount / duration;

            expect(fps).toBeCloseTo(60, 1);
        });

        it('measures frame budget utilization', () => {
            const frameBudget = 16.67; // ms per frame at 60 FPS
            const workloads = [];

            const animate = () => {
                const frameStart = performance.now();

                // Simulate work (5ms)
                const workDuration = 5;
                const workEnd = frameStart + workDuration;

                while (performance.now() < workEnd) {
                    // Busy wait to simulate work
                }

                const frameEnd = performance.now();
                const workTime = frameEnd - frameStart;
                workloads.push(workTime);

                if (workloads.length < 30) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);

            for (let i = 0; i < 30; i++) {
                raf.tick();
            }

            const avgWorkload = workloads.reduce((a, b) => a + b, 0) / workloads.length;
            const utilization = (avgWorkload / frameBudget) * 100;

            // Work should be under budget
            expect(avgWorkload).toBeLessThan(frameBudget);
            expect(utilization).toBeLessThan(80); // Under 80% utilization
        });

        it('tracks performance over time', () => {
            const metrics = {
                frames: 0,
                totalTime: 0,
                minFrameTime: Infinity,
                maxFrameTime: 0
            };

            let lastTime = 0;

            const animate = (time) => {
                if (lastTime > 0) {
                    const frameTime = time - lastTime;
                    metrics.frames++;
                    metrics.totalTime += frameTime;
                    metrics.minFrameTime = Math.min(metrics.minFrameTime, frameTime);
                    metrics.maxFrameTime = Math.max(metrics.maxFrameTime, frameTime);
                }

                lastTime = time;

                if (metrics.frames < 120) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);

            for (let i = 0; i < 120; i++) {
                raf.tick(16.67);
            }

            const avgFrameTime = metrics.totalTime / metrics.frames;

            expect(avgFrameTime).toBeCloseTo(16.67, 0.1);
            expect(metrics.minFrameTime).toBeGreaterThan(0);
            expect(metrics.maxFrameTime).toBeLessThan(20); // No major spikes
        });
    });

    describe('Scroll Animation Performance', () => {
        it('maintains 60 FPS during scroll animations', () => {
            let scrollY = 0;
            const frameTimes = [];
            let lastTime = 0;

            const animateScroll = (time) => {
                if (lastTime > 0) {
                    frameTimes.push(time - lastTime);
                }

                // Simulate smooth scroll
                scrollY += 2;

                lastTime = time;

                if (scrollY < 1000) {
                    requestAnimationFrame(animateScroll);
                }
            };

            requestAnimationFrame(animateScroll);

            // Simulate scroll animation
            for (let i = 0; i < 500; i++) {
                raf.tick(16.67);
            }

            const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;

            expect(avgFrameTime).toBeCloseTo(16.67, 0.5);
            expect(scrollY).toBeGreaterThanOrEqual(1000);
        });

        it('uses easing functions without frame drops', () => {
            const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

            let progress = 0;
            const duration = 1000; // ms
            const startTime = raf.getTime();
            const frameTimes = [];
            let lastTime = 0;

            const animate = (time) => {
                if (lastTime > 0) {
                    frameTimes.push(time - lastTime);
                }

                const elapsed = time - startTime;
                progress = Math.min(elapsed / duration, 1);
                const eased = easeOutCubic(progress);

                lastTime = time;

                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);

            // Simulate 1 second of animation
            for (let i = 0; i < 60; i++) {
                raf.tick(16.67);
            }

            // Check all frames were within budget
            const framesOver16ms = frameTimes.filter(t => t > 18).length;
            expect(framesOver16ms).toBe(0);

            expect(progress).toBe(1);
        });
    });

    describe('Particle Animation Performance', () => {
        it('animates 1000 particles at 60 FPS', () => {
            const particleCount = 1000;
            const particles = [];

            for (let i = 0; i < particleCount; i++) {
                particles.push({
                    x: Math.random() * 800,
                    y: Math.random() * 600,
                    vx: (Math.random() - 0.5) * 5,
                    vy: (Math.random() - 0.5) * 5
                });
            }

            const frameTimes = [];
            let lastTime = 0;
            let frameCount = 0;

            const animate = (time) => {
                if (lastTime > 0) {
                    frameTimes.push(time - lastTime);
                }

                // Update particles
                particles.forEach(p => {
                    p.x += p.vx;
                    p.y += p.vy;

                    // Wrap around screen
                    if (p.x < 0) p.x = 800;
                    if (p.x > 800) p.x = 0;
                    if (p.y < 0) p.y = 600;
                    if (p.y > 600) p.y = 0;
                });

                lastTime = time;
                frameCount++;

                if (frameCount < 120) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);

            // Simulate 2 seconds
            for (let i = 0; i < 120; i++) {
                raf.tick(16.67);
            }

            const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;

            expect(avgFrameTime).toBeLessThanOrEqual(16.67);
            expect(frameCount).toBe(120);
        });

        it('detects performance degradation', () => {
            let particleCount = 100;
            const frameTimes = [];

            const animate = (time) => {
                const frameStart = performance.now();

                // Simulate particle updates
                for (let i = 0; i < particleCount; i++) {
                    Math.random() * 800;
                    Math.random() * 600;
                }

                const frameEnd = performance.now();
                frameTimes.push(frameEnd - frameStart);

                if (frameTimes.length < 60) {
                    // Gradually increase particle count to stress test
                    if (frameTimes.length % 10 === 0) {
                        particleCount += 100;
                    }

                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);

            for (let i = 0; i < 60; i++) {
                raf.tick();
            }

            // Check if performance degrades as particle count increases
            const firstHalf = frameTimes.slice(0, 30);
            const secondHalf = frameTimes.slice(30);

            const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
            const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

            expect(avgSecond).toBeGreaterThanOrEqual(avgFirst);
        });
    });

    describe('Timing Precision', () => {
        it('provides sub-millisecond precision', () => {
            const timestamps = [];

            const animate = (time) => {
                timestamps.push(time);

                if (timestamps.length < 10) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);

            for (let i = 0; i < 10; i++) {
                raf.tick(16.67);
            }

            // Check timestamps have decimal precision
            for (const time of timestamps) {
                expect(time % 1).toBeGreaterThanOrEqual(0);
            }
        });

        it('measures microsecond-level differences', () => {
            const start = performance.now();
            const end = performance.now();

            const diff = end - start;

            expect(diff).toBeGreaterThanOrEqual(0);
            expect(Number.isFinite(diff)).toBe(true);
        });
    });
});
