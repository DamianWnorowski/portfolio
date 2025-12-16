/**
 * KAIZEN Elite Engine
 * Core WebGL rendering engine with shader management
 */

import * as THREE from 'three';

export class Engine {
    constructor() {
        this.clock = new THREE.Clock();
        this.mouse = new THREE.Vector2(0.5, 0.5);
        this.mouseInfluence = 0;
        this.components = new Map();
        this.isRunning = false;

        // Store bound handlers for cleanup
        this.boundMouseMove = this.onMouseMove.bind(this);
        this.boundResize = this.onResize.bind(this);

        this.init();
    }

    init() {
        // Setup mouse tracking
        window.addEventListener('mousemove', this.boundMouseMove);
        window.addEventListener('resize', this.boundResize);

        // Start animation loop
        this.isRunning = true;
        this.animate();
    }

    onMouseMove(event) {
        this.mouse.x = event.clientX / window.innerWidth;
        this.mouse.y = 1.0 - event.clientY / window.innerHeight;
        this.mouseInfluence = Math.min(this.mouseInfluence + 0.1, 1.0);
    }

    onResize() {
        this.components.forEach(component => {
            if (component.onResize) {
                component.onResize();
            }
        });
    }

    registerComponent(name, component) {
        this.components.set(name, component);
    }

    getComponent(name) {
        return this.components.get(name);
    }

    animate() {
        if (!this.isRunning) return;

        requestAnimationFrame(this.animate.bind(this));

        const delta = this.clock.getDelta();
        const elapsed = this.clock.getElapsedTime();

        // Decay mouse influence
        this.mouseInfluence *= 0.95;

        // Update all components
        this.components.forEach(component => {
            if (component.update) {
                component.update(elapsed, delta, this.mouse, this.mouseInfluence);
            }
        });
    }

    destroy() {
        this.isRunning = false;

        // Remove event listeners
        window.removeEventListener('mousemove', this.boundMouseMove);
        window.removeEventListener('resize', this.boundResize);

        // Destroy all components
        this.components.forEach(component => {
            if (component.destroy) {
                component.destroy();
            }
        });
        this.components.clear();
    }
}

// Singleton instance
let engineInstance = null;

export function getEngine() {
    if (!engineInstance) {
        engineInstance = new Engine();
    }
    return engineInstance;
}
