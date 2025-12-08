/**
 * WebGL Error Boundary
 * Graceful fallback when WebGL isn't available or fails
 */

export class WebGLErrorBoundary {
    constructor() {
        this.hasWebGL = false;
        this.hasWebGL2 = false;
        this.errors = [];
        this.fallbackMode = false;

        this.checkSupport();
        this.setupErrorHandling();
    }

    checkSupport() {
        try {
            const canvas = document.createElement('canvas');

            // Check WebGL 2
            this.hasWebGL2 = !!(
                canvas.getContext('webgl2') ||
                canvas.getContext('experimental-webgl2')
            );

            // Check WebGL 1
            this.hasWebGL = !!(
                canvas.getContext('webgl') ||
                canvas.getContext('experimental-webgl')
            );

            // Check for specific features
            if (this.hasWebGL || this.hasWebGL2) {
                const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
                this.vendor = gl.getParameter(gl.VENDOR);
                this.renderer = gl.getParameter(gl.RENDERER);

                console.log('[WebGL] Support detected:', {
                    webgl2: this.hasWebGL2,
                    webgl: this.hasWebGL,
                    vendor: this.vendor,
                    renderer: this.renderer
                });
            }
        } catch (error) {
            console.warn('[WebGL] Detection failed:', error);
            this.hasWebGL = false;
            this.hasWebGL2 = false;
        }

        // If no WebGL, immediately enable fallback
        if (!this.hasWebGL && !this.hasWebGL2) {
            this.enableFallback('WebGL not supported');
        }
    }

    setupErrorHandling() {
        // Global error handler for WebGL context loss
        window.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            console.error('[WebGL] Context lost');
            this.handleContextLoss();
        });

        window.addEventListener('webglcontextrestored', () => {
            console.log('[WebGL] Context restored');
            this.handleContextRestore();
        });

        // Catch shader compilation errors
        this.originalGetShaderInfoLog = null;
        this.patchShaderMethods();
    }

    patchShaderMethods() {
        // Intercept Three.js or raw WebGL shader errors
        const self = this;

        window.addEventListener('error', (e) => {
            if (e.message?.includes('WebGL') ||
                e.message?.includes('shader') ||
                e.message?.includes('GL_')) {
                self.logError('runtime', e.message);
            }
        });
    }

    logError(type, message) {
        this.errors.push({
            type,
            message,
            timestamp: Date.now()
        });

        // If too many errors, enable fallback
        if (this.errors.length > 5) {
            this.enableFallback('Multiple WebGL errors detected');
        }
    }

    handleContextLoss() {
        this.showNotification('Graphics context lost. Attempting recovery...', 'warning');

        // Give time for recovery
        setTimeout(() => {
            if (!this.fallbackMode) {
                this.enableFallback('WebGL context could not be restored');
            }
        }, 5000);
    }

    handleContextRestore() {
        this.showNotification('Graphics restored!', 'success');
        this.errors = [];
    }

    enableFallback(reason) {
        if (this.fallbackMode) return;

        this.fallbackMode = true;
        console.warn('[WebGL] Enabling fallback mode:', reason);

        // Add fallback class to body
        document.body.classList.add('webgl-fallback');

        // Inject fallback styles
        this.injectFallbackStyles();

        // Replace WebGL canvases with static alternatives
        this.replaceCanvases();

        // Show notification
        this.showNotification('Running in compatibility mode for best performance', 'info');
    }

    injectFallbackStyles() {
        if (document.getElementById('webgl-fallback-styles')) return;

        const style = document.createElement('style');
        style.id = 'webgl-fallback-styles';
        style.textContent = `
            .webgl-fallback #neural-bg {
                display: none !important;
            }

            .webgl-fallback .neural-fallback {
                position: fixed;
                inset: 0;
                z-index: -1;
                background:
                    radial-gradient(ellipse at 20% 30%, rgba(201, 162, 39, 0.1) 0%, transparent 50%),
                    radial-gradient(ellipse at 80% 70%, rgba(74, 158, 255, 0.1) 0%, transparent 50%),
                    linear-gradient(180deg, #0a0c10 0%, #0f1419 100%);
            }

            .webgl-fallback #globe-container canvas {
                display: none !important;
            }

            .webgl-fallback .globe-fallback {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                background:
                    radial-gradient(circle, rgba(74, 158, 255, 0.2) 0%, transparent 70%);
            }

            .webgl-fallback .globe-fallback-content {
                text-align: center;
                color: var(--text-muted);
            }

            .webgl-fallback .globe-fallback svg {
                width: 120px;
                height: 120px;
                opacity: 0.5;
                animation: globe-pulse 3s ease infinite;
            }

            @keyframes globe-pulse {
                0%, 100% { transform: scale(1); opacity: 0.5; }
                50% { transform: scale(1.05); opacity: 0.7; }
            }

            .webgl-fallback #skills-constellation canvas {
                display: none !important;
            }

            .webgl-fallback .constellation-fallback {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                justify-content: center;
                padding: 20px;
            }

            .webgl-fallback .skill-badge {
                background: rgba(201, 162, 39, 0.1);
                border: 1px solid rgba(201, 162, 39, 0.3);
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 0.8rem;
                color: var(--text-secondary);
            }
        `;
        document.head.appendChild(style);
    }

    replaceCanvases() {
        // Neural background fallback
        const neuralBg = document.getElementById('neural-bg');
        if (neuralBg) {
            const fallback = document.createElement('div');
            fallback.className = 'neural-fallback';
            document.body.insertBefore(fallback, document.body.firstChild);
        }

        // Globe fallback
        const globeContainer = document.getElementById('globe-container');
        if (globeContainer) {
            const fallback = document.createElement('div');
            fallback.className = 'globe-fallback';
            fallback.innerHTML = `
                <div class="globe-fallback-content">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M2 12h20"/>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                    <p>Global Deployments Active</p>
                </div>
            `;
            globeContainer.appendChild(fallback);
        }

        // Skills constellation fallback
        const skillsContainer = document.getElementById('skills-constellation');
        if (skillsContainer) {
            const skills = ['TypeScript', 'React', 'Node.js', 'Python', 'Rust', 'AWS', 'Docker', 'GraphQL'];
            const fallback = document.createElement('div');
            fallback.className = 'constellation-fallback';
            fallback.innerHTML = skills.map(s => `<span class="skill-badge">${s}</span>`).join('');
            skillsContainer.appendChild(fallback);
        }
    }

    showNotification(message, type = 'info') {
        const colors = {
            info: '#4a9eff',
            warning: '#f59e0b',
            error: '#ef4444',
            success: '#22c55e'
        };

        const notification = document.createElement('div');
        notification.className = 'webgl-notification';
        notification.innerHTML = `
            <span class="notification-icon">${type === 'error' ? '!' : type === 'warning' ? '!' : 'i'}</span>
            <span class="notification-text">${message}</span>
        `;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(20, 25, 35, 0.95);
            border: 1px solid ${colors[type]};
            border-radius: 8px;
            padding: 12px 20px;
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 10000;
            font-family: var(--font-mono);
            font-size: 0.85rem;
            color: var(--text-primary);
            animation: notification-slide 0.3s ease;
            backdrop-filter: blur(10px);
        `;

        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes notification-slide {
                    from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
                .notification-icon {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 0.75rem;
                }
            `;
            document.head.appendChild(style);
        }

        const iconEl = notification.querySelector('.notification-icon');
        iconEl.style.cssText = `
            background: ${colors[type]};
            color: #0a0c10;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 0.75rem;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'notification-slide 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    // Public method to check if we should use WebGL
    shouldUseWebGL() {
        return (this.hasWebGL || this.hasWebGL2) && !this.fallbackMode;
    }

    // Get capabilities
    getCapabilities() {
        return {
            webgl: this.hasWebGL,
            webgl2: this.hasWebGL2,
            fallbackMode: this.fallbackMode,
            vendor: this.vendor,
            renderer: this.renderer,
            maxTextureSize: this.maxTextureSize,
            errors: this.errors
        };
    }
}

// Singleton instance
export const webglErrorBoundary = new WebGLErrorBoundary();
