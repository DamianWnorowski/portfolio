/**
 * Cursor Trail Effect
 * Elegant particle trail following mouse movement
 */

export class CursorTrail {
    constructor() {
        this.particles = [];
        this.particlePool = []; // Object pool for reuse
        this.maxParticles = 20;
        this.mouseX = 0;
        this.mouseY = 0;
        this.enabled = true;
        this.container = null;
        this.animationFrame = null;

        this.init();
    }

    init() {
        // Check for reduced motion preference
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.enabled = false;
            return;
        }

        // Create container
        this.container = document.createElement('div');
        this.container.id = 'cursor-trail';
        this.container.style.cssText = `
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 9997;
            overflow: hidden;
        `;
        document.body.appendChild(this.container);

        // Add styles
        this.addStyles();

        // Track mouse
        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
            this.createParticle();
        });

        // Start animation loop
        this.animate();
    }

    addStyles() {
        if (document.getElementById('cursor-trail-styles')) return;

        const style = document.createElement('style');
        style.id = 'cursor-trail-styles';
        style.textContent = `
            .trail-particle {
                position: absolute;
                border-radius: 50%;
                pointer-events: none;
                mix-blend-mode: screen;
            }

            .trail-particle.gold {
                background: radial-gradient(circle, rgba(201, 162, 39, 0.8), rgba(201, 162, 39, 0) 70%);
            }

            .trail-particle.blue {
                background: radial-gradient(circle, rgba(74, 158, 255, 0.6), rgba(74, 158, 255, 0) 70%);
            }

            .trail-glow {
                position: fixed;
                width: 200px;
                height: 200px;
                border-radius: 50%;
                pointer-events: none;
                background: radial-gradient(circle, rgba(201, 162, 39, 0.1), transparent 70%);
                transform: translate(-50%, -50%);
                z-index: 9996;
                transition: opacity 0.3s;
            }

            @media (prefers-reduced-motion: reduce) {
                .trail-particle,
                .trail-glow {
                    display: none !important;
                }
            }
        `;
        document.head.appendChild(style);

        // Add subtle glow that follows cursor
        this.glow = document.createElement('div');
        this.glow.className = 'trail-glow';
        document.body.appendChild(this.glow);
    }

    getPooledParticle() {
        // Reuse from pool if available
        if (this.particlePool.length > 0) {
            return this.particlePool.pop();
        }
        // Create new element only when pool is empty
        const particle = document.createElement('div');
        particle.className = 'trail-particle';
        particle.style.transform = 'translate(-50%, -50%)';
        return particle;
    }

    returnToPool(particleData) {
        // Hide and return to pool instead of removing
        particleData.element.style.display = 'none';
        this.particlePool.push(particleData.element);
    }

    createParticle() {
        if (!this.enabled || this.particles.length >= this.maxParticles) return;

        const particle = this.getPooledParticle();
        const isGold = Math.random() > 0.3;
        const size = Math.random() * 8 + 4;

        particle.className = `trail-particle ${isGold ? 'gold' : 'blue'}`;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${this.mouseX}px`;
        particle.style.top = `${this.mouseY}px`;
        particle.style.display = 'block';
        particle.style.opacity = '1';

        if (!particle.parentNode) {
            this.container.appendChild(particle);
        }

        const particleData = {
            element: particle,
            x: this.mouseX,
            y: this.mouseY,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            life: 1,
            decay: 0.02 + Math.random() * 0.02,
            size
        };

        this.particles.push(particleData);
    }

    animate() {
        // Update glow position
        if (this.glow) {
            this.glow.style.left = `${this.mouseX}px`;
            this.glow.style.top = `${this.mouseY}px`;
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            // Apply velocity
            p.x += p.vx;
            p.y += p.vy;

            // Apply gravity/drift
            p.vy += 0.05;

            // Decay
            p.life -= p.decay;

            // Update element
            p.element.style.left = `${p.x}px`;
            p.element.style.top = `${p.y}px`;
            p.element.style.opacity = p.life;
            p.element.style.transform = `translate(-50%, -50%) scale(${p.life})`;

            // Return dead particles to pool
            if (p.life <= 0) {
                this.returnToPool(p);
                this.particles.splice(i, 1);
            }
        }

        this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    toggle() {
        this.enabled = !this.enabled;
        if (this.container) {
            this.container.style.display = this.enabled ? 'block' : 'none';
        }
        if (this.glow) {
            this.glow.style.display = this.enabled ? 'block' : 'none';
        }
        return this.enabled;
    }

    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        this.container?.remove();
        this.glow?.remove();
        this.particles = [];
        this.particlePool = [];
    }
}

// Auto-initialize
export const cursorTrail = new CursorTrail();
