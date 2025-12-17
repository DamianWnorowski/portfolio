/**
 * Magnetic Cursor with Distortion Field
 * Advanced cursor that warps nearby elements and creates trail effects
 */

export class MagneticCursor {
    constructor() {
        this.cursor = null;
        this.cursorDot = null;
        this.cursorRing = null;
        this.cursorTrail = [];
        this.trailLength = 20;

        this.mouseX = 0;
        this.mouseY = 0;
        this.cursorX = 0;
        this.cursorY = 0;

        this.isHovering = false;
        this.isClicking = false;
        this.hoverTarget = null;

        this.magneticElements = [];
        this.magnetStrength = 0.3;
        this.smoothing = 0.15;

        // Store bound handlers for cleanup
        this.boundMouseMove = null;
        this.boundMouseDown = null;
        this.boundMouseUp = null;
        this.boundMouseOver = null;
        this.boundMouseOut = null;
        this.boundResize = null;
        this.animationFrameId = null;

        this.init();
    }

    init() {
        this.createCursor();
        this.createTrailCanvas();
        this.addStyles();
        this.bindEvents();
        this.registerMagneticElements();
        this.animate();
    }

    createCursor() {
        this.cursor = document.createElement('div');
        this.cursor.className = 'magnetic-cursor';
        this.cursor.innerHTML = `
            <div class="cursor-dot"></div>
            <div class="cursor-ring"></div>
            <div class="cursor-glow"></div>
            <svg class="cursor-arrows" viewBox="0 0 100 100">
                <path class="arrow arrow-n" d="M50 10 L50 25" />
                <path class="arrow arrow-e" d="M90 50 L75 50" />
                <path class="arrow arrow-s" d="M50 90 L50 75" />
                <path class="arrow arrow-w" d="M10 50 L25 50" />
            </svg>
        `;
        document.body.appendChild(this.cursor);

        this.cursorDot = this.cursor.querySelector('.cursor-dot');
        this.cursorRing = this.cursor.querySelector('.cursor-ring');
    }

    createTrailCanvas() {
        this.trailCanvas = document.createElement('canvas');
        this.trailCanvas.className = 'cursor-trail-canvas';
        this.trailCanvas.width = window.innerWidth;
        this.trailCanvas.height = window.innerHeight;
        document.body.appendChild(this.trailCanvas);

        this.trailCtx = this.trailCanvas.getContext('2d');

        this.boundResize = () => {
            this.trailCanvas.width = window.innerWidth;
            this.trailCanvas.height = window.innerHeight;
        };
        window.addEventListener('resize', this.boundResize);
    }

    addStyles() {
        const style = document.createElement('style');
        style.id = 'magnetic-cursor-styles';
        style.textContent = `
            * { cursor: none !important; }

            .cursor-trail-canvas {
                position: fixed;
                top: 0;
                left: 0;
                pointer-events: none;
                z-index: 9998;
            }

            .magnetic-cursor {
                position: fixed;
                top: 0;
                left: 0;
                pointer-events: none;
                z-index: 9999;
                mix-blend-mode: difference;
            }

            .cursor-dot {
                position: absolute;
                width: 8px;
                height: 8px;
                background: #fff;
                border-radius: 50%;
                transform: translate(-50%, -50%);
                transition: transform 0.1s ease, background 0.2s ease;
            }

            .cursor-ring {
                position: absolute;
                width: 40px;
                height: 40px;
                border: 1px solid rgba(255, 255, 255, 0.5);
                border-radius: 50%;
                transform: translate(-50%, -50%);
                transition: all 0.2s cubic-bezier(0.25, 1, 0.5, 1);
            }

            .cursor-glow {
                position: absolute;
                width: 100px;
                height: 100px;
                background: radial-gradient(circle, rgba(201, 162, 39, 0.15) 0%, transparent 70%);
                border-radius: 50%;
                transform: translate(-50%, -50%);
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .cursor-arrows {
                position: absolute;
                width: 60px;
                height: 60px;
                transform: translate(-50%, -50%);
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .cursor-arrows .arrow {
                fill: none;
                stroke: rgba(201, 162, 39, 0.8);
                stroke-width: 2;
                stroke-linecap: round;
                opacity: 0;
                transition: opacity 0.2s ease;
            }

            .magnetic-cursor.hovering .cursor-ring {
                width: 60px;
                height: 60px;
                border-color: rgba(201, 162, 39, 0.8);
                background: rgba(201, 162, 39, 0.1);
            }

            .magnetic-cursor.hovering .cursor-glow {
                opacity: 1;
            }

            .magnetic-cursor.hovering .cursor-arrows {
                opacity: 1;
            }

            .magnetic-cursor.clicking .cursor-dot {
                transform: translate(-50%, -50%) scale(0.5);
                background: #c9a227;
            }

            .magnetic-cursor.clicking .cursor-ring {
                transform: translate(-50%, -50%) scale(0.8);
            }

            .magnetic-cursor.text-hover .cursor-ring {
                width: 4px;
                height: 24px;
                border-radius: 2px;
                border-color: #c9a227;
            }

            .magnetic-cursor.text-hover .cursor-dot {
                opacity: 0;
            }

            /* Magnetic element animation */
            .magnetic-element {
                transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
            }

            @media (max-width: 768px) {
                .magnetic-cursor,
                .cursor-trail-canvas {
                    display: none;
                }
                * { cursor: auto !important; }
            }
        `;
        document.head.appendChild(style);
    }

    bindEvents() {
        this.boundMouseMove = (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;

            // Add to trail
            this.cursorTrail.push({ x: e.clientX, y: e.clientY, alpha: 1 });
            if (this.cursorTrail.length > this.trailLength) {
                this.cursorTrail.shift();
            }
        };
        document.addEventListener('mousemove', this.boundMouseMove);

        this.boundMouseDown = () => {
            this.isClicking = true;
            this.cursor.classList.add('clicking');
        };
        document.addEventListener('mousedown', this.boundMouseDown);

        this.boundMouseUp = () => {
            this.isClicking = false;
            this.cursor.classList.remove('clicking');
        };
        document.addEventListener('mouseup', this.boundMouseUp);

        // Detect hoverable elements
        this.boundMouseOver = (e) => {
            const target = e.target.closest('a, button, .asset-card, .acq-option, input, [data-magnetic]');
            if (target) {
                this.isHovering = true;
                this.hoverTarget = target;
                this.cursor.classList.add('hovering');

                if (target.matches('input, textarea')) {
                    this.cursor.classList.add('text-hover');
                }
            }
        };
        document.addEventListener('mouseover', this.boundMouseOver);

        this.boundMouseOut = (e) => {
            const target = e.target.closest('a, button, .asset-card, .acq-option, input, [data-magnetic]');
            if (target) {
                this.isHovering = false;
                this.hoverTarget = null;
                this.cursor.classList.remove('hovering', 'text-hover');
            }
        };
        document.addEventListener('mouseout', this.boundMouseOut);
    }

    registerMagneticElements() {
        const selectors = 'a, button, .asset-card, .nav-link, .btn-acquire, [data-magnetic]';
        document.querySelectorAll(selectors).forEach(el => {
            el.classList.add('magnetic-element');
            this.magneticElements.push(el);
        });
    }

    animate() {
        // Smooth cursor follow
        this.cursorX += (this.mouseX - this.cursorX) * this.smoothing;
        this.cursorY += (this.mouseY - this.cursorY) * this.smoothing;

        // Update cursor position
        this.cursor.style.transform = `translate(${this.cursorX}px, ${this.cursorY}px)`;

        // Magnetic effect on elements (optimized to avoid layout thrashing)
        // Only update elements near the cursor using cached rects
        const maxDistance = 150;
        const now = performance.now();

        // Cache rects every 100ms instead of every frame
        if (!this.lastRectUpdate || now - this.lastRectUpdate > 100) {
            this.cachedRects = new WeakMap();
            this.magneticElements.forEach(el => {
                this.cachedRects.set(el, el.getBoundingClientRect());
            });
            this.lastRectUpdate = now;
        }

        this.magneticElements.forEach(el => {
            const rect = this.cachedRects.get(el);
            if (!rect) return;

            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const deltaX = this.mouseX - centerX;
            const deltaY = this.mouseY - centerY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            if (distance < maxDistance) {
                const strength = (1 - distance / maxDistance) * this.magnetStrength;
                const moveX = deltaX * strength;
                const moveY = deltaY * strength;
                el.style.transform = `translate(${moveX}px, ${moveY}px)`;
            } else if (el.style.transform) {
                el.style.transform = '';
            }
        });

        // Draw trail
        this.drawTrail();

        this.animationFrameId = requestAnimationFrame(() => this.animate());
    }

    drawTrail() {
        this.trailCtx.clearRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);

        if (this.cursorTrail.length < 2) return;

        this.trailCtx.beginPath();
        this.trailCtx.moveTo(this.cursorTrail[0].x, this.cursorTrail[0].y);

        for (let i = 1; i < this.cursorTrail.length; i++) {
            const point = this.cursorTrail[i];
            const prevPoint = this.cursorTrail[i - 1];

            // Smooth curve
            const midX = (prevPoint.x + point.x) / 2;
            const midY = (prevPoint.y + point.y) / 2;
            this.trailCtx.quadraticCurveTo(prevPoint.x, prevPoint.y, midX, midY);

            // Fade out
            point.alpha *= 0.92;
        }

        this.trailCtx.strokeStyle = 'rgba(201, 162, 39, 0.3)';
        this.trailCtx.lineWidth = 2;
        this.trailCtx.lineCap = 'round';
        this.trailCtx.stroke();
    }

    destroy() {
        // Cancel animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Remove all event listeners
        if (this.boundMouseMove) {
            document.removeEventListener('mousemove', this.boundMouseMove);
            this.boundMouseMove = null;
        }
        if (this.boundMouseDown) {
            document.removeEventListener('mousedown', this.boundMouseDown);
            this.boundMouseDown = null;
        }
        if (this.boundMouseUp) {
            document.removeEventListener('mouseup', this.boundMouseUp);
            this.boundMouseUp = null;
        }
        if (this.boundMouseOver) {
            document.removeEventListener('mouseover', this.boundMouseOver);
            this.boundMouseOver = null;
        }
        if (this.boundMouseOut) {
            document.removeEventListener('mouseout', this.boundMouseOut);
            this.boundMouseOut = null;
        }
        if (this.boundResize) {
            window.removeEventListener('resize', this.boundResize);
            this.boundResize = null;
        }

        // Remove DOM elements
        this.cursor?.remove();
        this.trailCanvas?.remove();
        document.getElementById('magnetic-cursor-styles')?.remove();

        // Clear references
        this.magneticElements = [];
        this.cursorTrail = [];
    }
}

export const magneticCursor = typeof document !== 'undefined' && window.innerWidth > 768
    ? new MagneticCursor()
    : null;
