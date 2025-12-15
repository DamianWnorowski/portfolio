/**
 * Particle Hover Effect
 * Creates particle explosion effect on element hover
 */

export class ParticleHover {
    constructor(selector = '.asset-card, .acq-option, .btn-acquire') {
        this.selector = selector;
        this.particles = [];
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
        this.isActive = false;

        this.init();
    }

    init() {
        this.createCanvas();
        this.addStyles();
        this.bindEvents();
    }

    createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'particle-canvas';
        this.canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
        `;
        document.body.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');
        this.resize();

        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    addStyles() {
        if (document.getElementById('particle-hover-styles')) return;

        const style = document.createElement('style');
        style.id = 'particle-hover-styles';
        style.textContent = `
            .particle-hover-target {
                position: relative;
                overflow: visible;
            }

            .particle-hover-target::before {
                content: '';
                position: absolute;
                inset: -2px;
                border-radius: inherit;
                opacity: 0;
                transition: opacity 0.3s ease;
                background: linear-gradient(
                    45deg,
                    rgba(201, 162, 39, 0.1),
                    rgba(74, 158, 255, 0.1)
                );
            }

            .particle-hover-target:hover::before {
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
    }

    bindEvents() {
        document.querySelectorAll(this.selector).forEach(el => {
            el.classList.add('particle-hover-target');

            el.addEventListener('mouseenter', (e) => this.onHover(e));
            el.addEventListener('mousemove', (e) => this.onMove(e));
            el.addEventListener('mouseleave', () => this.onLeave());
        });
    }

    onHover(e) {
        this.isActive = true;
        this.spawnBurst(e.clientX, e.clientY, 12);
        this.startAnimation();
    }

    onMove(e) {
        if (this.isActive && Math.random() > 0.7) {
            this.spawnParticle(e.clientX, e.clientY);
        }
    }

    onLeave() {
        this.isActive = false;
    }

    spawnBurst(x, y, count) {
        for (let i = 0; i < count; i++) {
            this.spawnParticle(x, y, true);
        }
    }

    spawnParticle(x, y, burst = false) {
        const colors = ['#c9a227', '#4a9eff', '#22c55e', '#f8fafc'];
        const angle = burst ? Math.random() * Math.PI * 2 : Math.random() * Math.PI * 2;
        const speed = burst ? 2 + Math.random() * 4 : 1 + Math.random() * 2;

        this.particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 2 + Math.random() * 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            alpha: 1,
            decay: 0.02 + Math.random() * 0.02,
            gravity: 0.05
        });
    }

    startAnimation() {
        if (this.animationId) return;
        this.animate();
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.particles = this.particles.filter(p => {
            // Update
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.alpha -= p.decay;
            p.size *= 0.98;

            // Draw
            if (p.alpha > 0) {
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fillStyle = p.color;
                this.ctx.globalAlpha = p.alpha;
                this.ctx.fill();
                this.ctx.globalAlpha = 1;
                return true;
            }
            return false;
        });

        if (this.particles.length > 0 || this.isActive) {
            this.animationId = requestAnimationFrame(() => this.animate());
        } else {
            this.animationId = null;
        }
    }

    // Trigger effect programmatically
    trigger(element) {
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        this.spawnBurst(x, y, 20);
        this.startAnimation();
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.canvas) {
            this.canvas.remove();
        }
    }
}

// Auto-initialize
export const particleHover = typeof document !== 'undefined'
    ? new ParticleHover()
    : null;
