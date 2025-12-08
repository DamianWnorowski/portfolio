/**
 * WebGLErrorBoundary Unit Tests
 * Tests for WebGL support detection and fallback handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('WebGLErrorBoundary', () => {
    let WebGLErrorBoundary;
    let webglErrorBoundary;
    let mockWebGLContext;
    let mockWebGL2Context;

    beforeEach(async () => {
        vi.resetModules();
        vi.useFakeTimers();

        // Clear DOM
        document.body.innerHTML = '';
        document.head.innerHTML = '';

        // Mock WebGL contexts
        mockWebGLContext = {
            getParameter: vi.fn((param) => {
                if (param === 0x1F00) return 'Test Vendor'; // GL.VENDOR
                if (param === 0x1F01) return 'Test Renderer'; // GL.RENDERER
                if (param === 0x0D33) return 4096; // GL.MAX_TEXTURE_SIZE
                return null;
            }),
            VENDOR: 0x1F00,
            RENDERER: 0x1F01,
            MAX_TEXTURE_SIZE: 0x0D33
        };

        mockWebGL2Context = {
            ...mockWebGLContext
        };

        // Mock canvas.getContext
        HTMLCanvasElement.prototype.getContext = vi.fn((type) => {
            if (type === 'webgl2' || type === 'experimental-webgl2') {
                return mockWebGL2Context;
            }
            if (type === 'webgl' || type === 'experimental-webgl') {
                return mockWebGLContext;
            }
            return null;
        });

        // Import fresh module
        const module = await import('../../src/components/WebGLErrorBoundary.js');
        WebGLErrorBoundary = module.WebGLErrorBoundary;
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('WebGL Detection', () => {
        it('detects WebGL support', () => {
            const instance = new WebGLErrorBoundary();

            expect(instance.hasWebGL).toBe(true);
        });

        it('detects WebGL2 support', () => {
            const instance = new WebGLErrorBoundary();

            expect(instance.hasWebGL2).toBe(true);
        });

        it('detects vendor', () => {
            const instance = new WebGLErrorBoundary();

            expect(instance.vendor).toBe('Test Vendor');
        });

        it('detects renderer', () => {
            const instance = new WebGLErrorBoundary();

            expect(instance.renderer).toBe('Test Renderer');
        });

        it('detects max texture size', () => {
            const instance = new WebGLErrorBoundary();

            expect(instance.maxTextureSize).toBe(4096);
        });

        it('handles missing WebGL2', async () => {
            HTMLCanvasElement.prototype.getContext = vi.fn((type) => {
                if (type === 'webgl' || type === 'experimental-webgl') {
                    return mockWebGLContext;
                }
                return null;
            });

            vi.resetModules();
            const module = await import('../../src/components/WebGLErrorBoundary.js');
            const instance = new module.WebGLErrorBoundary();

            expect(instance.hasWebGL).toBe(true);
            expect(instance.hasWebGL2).toBe(false);
        });

        it('handles missing all WebGL', async () => {
            HTMLCanvasElement.prototype.getContext = vi.fn(() => null);

            vi.resetModules();
            const module = await import('../../src/components/WebGLErrorBoundary.js');
            const instance = new module.WebGLErrorBoundary();

            expect(instance.hasWebGL).toBe(false);
            expect(instance.hasWebGL2).toBe(false);
            expect(instance.fallbackMode).toBe(true);
        });

        it('handles context creation exception', async () => {
            HTMLCanvasElement.prototype.getContext = vi.fn(() => {
                throw new Error('WebGL creation failed');
            });

            vi.resetModules();
            const module = await import('../../src/components/WebGLErrorBoundary.js');
            const instance = new module.WebGLErrorBoundary();

            expect(instance.hasWebGL).toBe(false);
            expect(instance.hasWebGL2).toBe(false);
        });
    });

    describe('Error Handling', () => {
        it('initializes empty errors array', () => {
            const instance = new WebGLErrorBoundary();

            expect(instance.errors).toEqual([]);
        });

        it('logs WebGL errors', () => {
            const instance = new WebGLErrorBoundary();

            instance.logError('shader', 'Shader compilation failed');

            expect(instance.errors.length).toBe(1);
            expect(instance.errors[0].type).toBe('shader');
            expect(instance.errors[0].message).toBe('Shader compilation failed');
        });

        it('includes timestamp in error logs', () => {
            const instance = new WebGLErrorBoundary();
            const now = Date.now();

            instance.logError('runtime', 'Error');

            expect(instance.errors[0].timestamp).toBeGreaterThanOrEqual(now);
        });

        it('enables fallback after 5 errors', () => {
            const instance = new WebGLErrorBoundary();

            for (let i = 0; i < 6; i++) {
                instance.logError('test', `Error ${i}`);
            }

            expect(instance.fallbackMode).toBe(true);
        });

        it('listens for webglcontextlost events', () => {
            const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
            new WebGLErrorBoundary();

            expect(addEventListenerSpy).toHaveBeenCalledWith(
                'webglcontextlost',
                expect.any(Function)
            );
        });

        it('listens for webglcontextrestored events', () => {
            const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
            new WebGLErrorBoundary();

            expect(addEventListenerSpy).toHaveBeenCalledWith(
                'webglcontextrestored',
                expect.any(Function)
            );
        });

        it('catches WebGL-related window errors', () => {
            const instance = new WebGLErrorBoundary();

            const errorEvent = new ErrorEvent('error', {
                message: 'WebGL: INVALID_OPERATION'
            });
            window.dispatchEvent(errorEvent);

            expect(instance.errors.length).toBeGreaterThanOrEqual(1);
        });

        it('catches shader errors', () => {
            const instance = new WebGLErrorBoundary();

            const errorEvent = new ErrorEvent('error', {
                message: 'shader compilation failed'
            });
            window.dispatchEvent(errorEvent);

            expect(instance.errors.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('Context Loss Handling', () => {
        it('shows notification on context loss', () => {
            const instance = new WebGLErrorBoundary();
            instance.handleContextLoss();

            const notification = document.querySelector('.webgl-notification');
            expect(notification).not.toBeNull();
        });

        it('enables fallback if context not restored within 5 seconds', () => {
            const instance = new WebGLErrorBoundary();
            instance.handleContextLoss();

            vi.advanceTimersByTime(5000);

            expect(instance.fallbackMode).toBe(true);
        });

        it('clears errors on context restore', () => {
            const instance = new WebGLErrorBoundary();
            instance.errors = [{ type: 'test', message: 'error', timestamp: Date.now() }];

            instance.handleContextRestore();

            expect(instance.errors).toEqual([]);
        });

        it('shows success notification on context restore', () => {
            const instance = new WebGLErrorBoundary();
            instance.handleContextRestore();

            const notification = document.querySelector('.webgl-notification');
            expect(notification.textContent).toContain('restored');
        });
    });

    describe('Fallback Mode', () => {
        it('starts in non-fallback mode', () => {
            const instance = new WebGLErrorBoundary();

            expect(instance.fallbackMode).toBe(false);
        });

        it('does not double-enable fallback', () => {
            const instance = new WebGLErrorBoundary();

            instance.enableFallback('Reason 1');
            instance.enableFallback('Reason 2');

            // Should only add class once
            expect(document.body.classList.contains('webgl-fallback')).toBe(true);
        });

        it('adds webgl-fallback class to body', () => {
            const instance = new WebGLErrorBoundary();
            instance.enableFallback('Test');

            expect(document.body.classList.contains('webgl-fallback')).toBe(true);
        });

        it('injects fallback styles', () => {
            const instance = new WebGLErrorBoundary();
            instance.enableFallback('Test');

            const styles = document.getElementById('webgl-fallback-styles');
            expect(styles).not.toBeNull();
        });

        it('shows info notification', () => {
            const instance = new WebGLErrorBoundary();
            instance.enableFallback('Test');

            const notification = document.querySelector('.webgl-notification');
            expect(notification).not.toBeNull();
        });
    });

    describe('Fallback Styles', () => {
        it('hides neural background in fallback mode', () => {
            const instance = new WebGLErrorBoundary();
            instance.injectFallbackStyles();

            const styles = document.getElementById('webgl-fallback-styles');
            expect(styles.textContent).toContain('#neural-bg');
            expect(styles.textContent).toContain('display: none');
        });

        it('provides gradient fallback for neural background', () => {
            const instance = new WebGLErrorBoundary();
            instance.injectFallbackStyles();

            const styles = document.getElementById('webgl-fallback-styles');
            expect(styles.textContent).toContain('.neural-fallback');
            expect(styles.textContent).toContain('radial-gradient');
        });

        it('hides globe canvas in fallback mode', () => {
            const instance = new WebGLErrorBoundary();
            instance.injectFallbackStyles();

            const styles = document.getElementById('webgl-fallback-styles');
            expect(styles.textContent).toContain('#globe-container canvas');
        });

        it('provides static globe fallback', () => {
            const instance = new WebGLErrorBoundary();
            instance.injectFallbackStyles();

            const styles = document.getElementById('webgl-fallback-styles');
            expect(styles.textContent).toContain('.globe-fallback');
        });

        it('provides skills constellation fallback', () => {
            const instance = new WebGLErrorBoundary();
            instance.injectFallbackStyles();

            const styles = document.getElementById('webgl-fallback-styles');
            expect(styles.textContent).toContain('.constellation-fallback');
        });

        it('does not duplicate styles', () => {
            const instance = new WebGLErrorBoundary();
            instance.injectFallbackStyles();
            instance.injectFallbackStyles();

            const styles = document.querySelectorAll('#webgl-fallback-styles');
            expect(styles.length).toBe(1);
        });
    });

    describe('Canvas Replacement', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="neural-bg"><canvas></canvas></div>
                <div id="globe-container"><canvas></canvas></div>
                <div id="skills-constellation"><canvas></canvas></div>
            `;
        });

        it('creates neural fallback element', () => {
            const instance = new WebGLErrorBoundary();
            instance.replaceCanvases();

            const fallback = document.querySelector('.neural-fallback');
            expect(fallback).not.toBeNull();
        });

        it('creates globe fallback element', () => {
            const instance = new WebGLErrorBoundary();
            instance.replaceCanvases();

            const fallback = document.querySelector('.globe-fallback');
            expect(fallback).not.toBeNull();
        });

        it('globe fallback has SVG icon', () => {
            const instance = new WebGLErrorBoundary();
            instance.replaceCanvases();

            const svg = document.querySelector('.globe-fallback svg');
            expect(svg).not.toBeNull();
        });

        it('creates skills constellation fallback', () => {
            const instance = new WebGLErrorBoundary();
            instance.replaceCanvases();

            const fallback = document.querySelector('.constellation-fallback');
            expect(fallback).not.toBeNull();
        });

        it('shows skill badges in constellation fallback', () => {
            const instance = new WebGLErrorBoundary();
            instance.replaceCanvases();

            const badges = document.querySelectorAll('.skill-badge');
            expect(badges.length).toBeGreaterThan(0);
        });

        it('includes expected skills', () => {
            const instance = new WebGLErrorBoundary();
            instance.replaceCanvases();

            const fallback = document.querySelector('.constellation-fallback');
            expect(fallback.textContent).toContain('TypeScript');
            expect(fallback.textContent).toContain('React');
            expect(fallback.textContent).toContain('Python');
        });
    });

    describe('Notifications', () => {
        it('creates notification element', () => {
            const instance = new WebGLErrorBoundary();
            instance.showNotification('Test message', 'info');

            const notification = document.querySelector('.webgl-notification');
            expect(notification).not.toBeNull();
        });

        it('displays message text', () => {
            const instance = new WebGLErrorBoundary();
            instance.showNotification('Test message', 'info');

            const notification = document.querySelector('.webgl-notification');
            expect(notification.textContent).toContain('Test message');
        });

        it('applies correct color for info type', () => {
            const instance = new WebGLErrorBoundary();
            instance.showNotification('Info', 'info');

            const notification = document.querySelector('.webgl-notification');
            // Browser converts hex to rgb, so check for the rgb value
            expect(notification.style.border).toMatch(/rgb\(74,?\s*158,?\s*255\)/);
        });

        it('applies correct color for warning type', () => {
            const instance = new WebGLErrorBoundary();
            instance.showNotification('Warning', 'warning');

            const notification = document.querySelector('.webgl-notification');
            expect(notification.style.border).toMatch(/rgb\(245,?\s*158,?\s*11\)/);
        });

        it('applies correct color for error type', () => {
            const instance = new WebGLErrorBoundary();
            instance.showNotification('Error', 'error');

            const notification = document.querySelector('.webgl-notification');
            expect(notification.style.border).toMatch(/rgb\(239,?\s*68,?\s*68\)/);
        });

        it('applies correct color for success type', () => {
            const instance = new WebGLErrorBoundary();
            instance.showNotification('Success', 'success');

            const notification = document.querySelector('.webgl-notification');
            expect(notification.style.border).toMatch(/rgb\(34,?\s*197,?\s*94\)/);
        });

        it('auto-removes after 4 seconds', () => {
            const instance = new WebGLErrorBoundary();
            instance.showNotification('Test', 'info');

            vi.advanceTimersByTime(4300); // 4000 + 300 animation

            const notification = document.querySelector('.webgl-notification');
            expect(notification).toBeNull();
        });

        it('adds notification animation styles', () => {
            const instance = new WebGLErrorBoundary();
            instance.showNotification('Test', 'info');

            const styles = document.getElementById('notification-styles');
            expect(styles).not.toBeNull();
            expect(styles.textContent).toContain('notification-slide');
        });
    });

    describe('Public Methods', () => {
        it('shouldUseWebGL returns true when supported and not in fallback', () => {
            const instance = new WebGLErrorBoundary();

            expect(instance.shouldUseWebGL()).toBe(true);
        });

        it('shouldUseWebGL returns false in fallback mode', () => {
            const instance = new WebGLErrorBoundary();
            instance.enableFallback('Test');

            expect(instance.shouldUseWebGL()).toBe(false);
        });

        it('shouldUseWebGL returns false when WebGL not supported', async () => {
            HTMLCanvasElement.prototype.getContext = vi.fn(() => null);

            vi.resetModules();
            const module = await import('../../src/components/WebGLErrorBoundary.js');
            const instance = new module.WebGLErrorBoundary();

            expect(instance.shouldUseWebGL()).toBe(false);
        });

        it('getCapabilities returns all info', () => {
            const instance = new WebGLErrorBoundary();
            const caps = instance.getCapabilities();

            expect(caps).toHaveProperty('webgl', true);
            expect(caps).toHaveProperty('webgl2', true);
            expect(caps).toHaveProperty('fallbackMode', false);
            expect(caps).toHaveProperty('vendor', 'Test Vendor');
            expect(caps).toHaveProperty('renderer', 'Test Renderer');
            expect(caps).toHaveProperty('maxTextureSize', 4096);
            expect(caps).toHaveProperty('errors');
        });
    });
});

describe('WebGLErrorBoundary Singleton', () => {
    it('exports singleton instance', async () => {
        vi.resetModules();

        HTMLCanvasElement.prototype.getContext = vi.fn((type) => {
            if (type.includes('webgl')) {
                return {
                    getParameter: vi.fn(() => null),
                    VENDOR: 0x1F00,
                    RENDERER: 0x1F01,
                    MAX_TEXTURE_SIZE: 0x0D33
                };
            }
            return null;
        });

        const { webglErrorBoundary } = await import('../../src/components/WebGLErrorBoundary.js');
        expect(webglErrorBoundary).toBeDefined();
        expect(webglErrorBoundary.constructor.name).toBe('WebGLErrorBoundary');
    });
});
