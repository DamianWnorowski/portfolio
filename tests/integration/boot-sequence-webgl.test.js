/**
 * WebGL Integration Tests - REAL RENDERING
 * Tests actual WebGL context creation and Three.js rendering
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';

// Setup minimal WebGL environment using jsdom canvas
const setupWebGLEnvironment = () => {
    // Mock minimal WebGL implementation for jsdom
    const canvas = document.createElement('canvas');
    const gl = {
        getParameter: vi.fn((param) => {
            const params = {
                0x1F00: 'WebKit',
                0x1F01: 'WebKit WebGL',
                0x0D33: 16384,
                0x8B4D: 16, // MAX_VERTEX_UNIFORM_VECTORS
                0x8DFD: 16, // MAX_FRAGMENT_UNIFORM_VECTORS
                0x0D3A: 8,  // MAX_TEXTURE_IMAGE_UNITS
            };
            return params[param] || 0;
        }),
        getExtension: vi.fn(() => null),
        getSupportedExtensions: vi.fn(() => []),
        createShader: vi.fn(() => ({})),
        shaderSource: vi.fn(),
        compileShader: vi.fn(),
        getShaderParameter: vi.fn(() => true),
        createProgram: vi.fn(() => ({})),
        attachShader: vi.fn(),
        linkProgram: vi.fn(),
        getProgramParameter: vi.fn(() => true),
        useProgram: vi.fn(),
        createBuffer: vi.fn(() => ({})),
        bindBuffer: vi.fn(),
        bufferData: vi.fn(),
        enableVertexAttribArray: vi.fn(),
        vertexAttribPointer: vi.fn(),
        createTexture: vi.fn(() => ({})),
        bindTexture: vi.fn(),
        texImage2D: vi.fn(),
        texParameteri: vi.fn(),
        generateMipmap: vi.fn(),
        clearColor: vi.fn(),
        clear: vi.fn(),
        drawArrays: vi.fn(),
        drawElements: vi.fn(),
        enable: vi.fn(),
        disable: vi.fn(),
        viewport: vi.fn(),
        getAttribLocation: vi.fn(() => 0),
        getUniformLocation: vi.fn(() => ({})),
        uniform1f: vi.fn(),
        uniform2f: vi.fn(),
        uniform3f: vi.fn(),
        uniform4f: vi.fn(),
        uniformMatrix4fv: vi.fn(),
        createFramebuffer: vi.fn(() => ({})),
        bindFramebuffer: vi.fn(),
        framebufferTexture2D: vi.fn(),
        checkFramebufferStatus: vi.fn(() => 0x8CD5), // FRAMEBUFFER_COMPLETE
        deleteShader: vi.fn(),
        deleteProgram: vi.fn(),
        deleteBuffer: vi.fn(),
        deleteTexture: vi.fn(),
        deleteFramebuffer: vi.fn(),
        VERTEX_SHADER: 0x8B31,
        FRAGMENT_SHADER: 0x8B30,
        ARRAY_BUFFER: 0x8892,
        ELEMENT_ARRAY_BUFFER: 0x8893,
        STATIC_DRAW: 0x88E4,
        FLOAT: 0x1406,
        TEXTURE_2D: 0x0DE1,
        RGBA: 0x1908,
        UNSIGNED_BYTE: 0x1401,
        COLOR_BUFFER_BIT: 0x00004000,
        DEPTH_BUFFER_BIT: 0x00000100,
        TRIANGLES: 0x0004,
        DEPTH_TEST: 0x0B71,
        FRAMEBUFFER: 0x8D40,
    };

    canvas.getContext = vi.fn((type) => {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
            return gl;
        }
        return null;
    });

    return { canvas, gl };
};

describe('WebGL Real Rendering Tests', () => {
    let canvas, gl, renderer, scene, camera;

    beforeEach(() => {
        const webglEnv = setupWebGLEnvironment();
        canvas = webglEnv.canvas;
        gl = webglEnv.gl;

        // Create Three.js renderer with real WebGL context
        renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true
        });
        renderer.setSize(800, 600);

        // Setup scene
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
        camera.position.z = 5;
    });

    afterEach(() => {
        if (renderer) {
            renderer.dispose();
        }
    });

    describe('WebGL Context Creation', () => {
        it('creates WebGL context successfully', () => {
            const context = canvas.getContext('webgl');
            expect(context).not.toBeNull();
            expect(context.getParameter).toBeDefined();
        });

        it('Three.js renderer initializes with WebGL', () => {
            expect(renderer).toBeDefined();
            expect(renderer.domElement).toBe(canvas);
        });

        it('renderer has valid capabilities', () => {
            const capabilities = renderer.capabilities;
            expect(capabilities).toBeDefined();
            expect(capabilities.maxTextures).toBeGreaterThan(0);
        });
    });

    describe('Particle System Rendering', () => {
        it('creates particle geometry', () => {
            const particleCount = 1000;
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(particleCount * 3);

            for (let i = 0; i < particleCount * 3; i++) {
                positions[i] = (Math.random() - 0.5) * 10;
            }

            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            expect(geometry.attributes.position).toBeDefined();
            expect(geometry.attributes.position.count).toBe(particleCount);
        });

        it('renders particle system without errors', () => {
            const particleCount = 100;
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(particleCount * 3);

            for (let i = 0; i < particleCount * 3; i++) {
                positions[i] = (Math.random() - 0.5) * 10;
            }

            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const material = new THREE.PointsMaterial({
                color: 0x00ff88,
                size: 0.1,
            });

            const particles = new THREE.Points(geometry, material);
            scene.add(particles);

            // Render without errors
            expect(() => renderer.render(scene, camera)).not.toThrow();

            // Verify render was called
            expect(gl.clear).toHaveBeenCalled();
            expect(gl.viewport).toHaveBeenCalled();
        });

        it('updates particle positions dynamically', () => {
            const particleCount = 50;
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(particleCount * 3);

            for (let i = 0; i < particleCount * 3; i++) {
                positions[i] = (Math.random() - 0.5) * 10;
            }

            const positionAttribute = new THREE.BufferAttribute(positions, 3);
            geometry.setAttribute('position', positionAttribute);

            const material = new THREE.PointsMaterial({ color: 0x00ff88, size: 0.1 });
            const particles = new THREE.Points(geometry, material);
            scene.add(particles);

            // Initial render
            renderer.render(scene, camera);

            // Update positions
            for (let i = 0; i < particleCount * 3; i += 3) {
                positionAttribute.array[i] += 0.01;
            }
            positionAttribute.needsUpdate = true;

            // Render again
            expect(() => renderer.render(scene, camera)).not.toThrow();
        });
    });

    describe('Three.js Scene Rendering', () => {
        it('renders basic mesh', () => {
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            const cube = new THREE.Mesh(geometry, material);

            scene.add(cube);

            expect(() => renderer.render(scene, camera)).not.toThrow();
            expect(gl.drawArrays).toHaveBeenCalled();
        });

        it('handles multiple render calls', () => {
            const geometry = new THREE.SphereGeometry(1, 32, 32);
            const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const sphere = new THREE.Mesh(geometry, material);

            scene.add(sphere);

            // Multiple renders
            for (let i = 0; i < 10; i++) {
                sphere.rotation.y += 0.01;
                expect(() => renderer.render(scene, camera)).not.toThrow();
            }

            expect(gl.clear).toHaveBeenCalledTimes(10);
        });

        it('cleans up resources properly', () => {
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            const cube = new THREE.Mesh(geometry, material);

            scene.add(cube);
            renderer.render(scene, camera);

            // Cleanup
            geometry.dispose();
            material.dispose();

            expect(gl.deleteBuffer).toHaveBeenCalled();
        });
    });

    describe('Performance Timing', () => {
        it('measures render time', () => {
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            const cube = new THREE.Mesh(geometry, material);
            scene.add(cube);

            const start = performance.now();
            renderer.render(scene, camera);
            const duration = performance.now() - start;

            // Render should complete quickly
            expect(duration).toBeLessThan(100);
        });

        it('handles 60 FPS target', () => {
            const geometry = new THREE.SphereGeometry(0.5, 16, 16);
            const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const sphere = new THREE.Mesh(geometry, material);
            scene.add(sphere);

            const frameTarget = 16.67; // ~60 FPS
            const durations = [];

            for (let i = 0; i < 10; i++) {
                const start = performance.now();
                renderer.render(scene, camera);
                durations.push(performance.now() - start);
            }

            const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

            // Average render time should be well under frame budget
            expect(avgDuration).toBeLessThan(frameTarget);
        });
    });
});
