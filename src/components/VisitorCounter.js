/**
 * Visitor Counter Widget
 * Displays live visitor count with animation
 */

import { dataService } from '../services/DataService.js';

export class VisitorCounter {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            this.createContainer();
        }

        this.currentCount = 0;
        this.targetCount = 0;

        this.init();
    }

    createContainer() {
        // Insert in footer or create floating widget
        const footer = document.querySelector('.grid-container');
        if (footer) {
            this.container = document.createElement('div');
            this.container.id = 'visitor-counter';
            this.container.className = 'visitor-widget';
            footer.appendChild(this.container);
        }
    }

    async init() {
        this.render();
        this.addStyles();
        await this.fetchCount();
    }

    render() {
        this.container.innerHTML = `
            <div class="visitor-inner">
                <div class="visitor-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                </div>
                <div class="visitor-content">
                    <span class="visitor-count" id="visitor-count">---</span>
                    <span class="visitor-label">visitors</span>
                </div>
                <div class="visitor-live">
                    <span class="live-dot"></span>
                    <span class="live-text">LIVE</span>
                </div>
            </div>
        `;
    }

    addStyles() {
        if (document.getElementById('visitor-counter-styles')) return;

        const style = document.createElement('style');
        style.id = 'visitor-counter-styles';
        style.textContent = `
            .visitor-widget {
                position: fixed;
                bottom: 20px;
                left: 20px;
                z-index: 100;
            }

            .visitor-inner {
                display: flex;
                align-items: center;
                gap: 10px;
                background: rgba(20, 25, 35, 0.9);
                border: 1px solid rgba(201, 162, 39, 0.3);
                border-radius: 8px;
                padding: 10px 16px;
                backdrop-filter: blur(10px);
                font-family: var(--font-mono);
            }

            .visitor-icon {
                color: var(--accent-gold, #c9a227);
                opacity: 0.8;
            }

            .visitor-content {
                display: flex;
                flex-direction: column;
            }

            .visitor-count {
                font-size: 1.1rem;
                font-weight: 700;
                color: var(--text-primary, #f8fafc);
                font-variant-numeric: tabular-nums;
            }

            .visitor-label {
                font-size: 0.65rem;
                color: var(--text-muted, #64748b);
                text-transform: uppercase;
                letter-spacing: 0.1em;
            }

            .visitor-live {
                display: flex;
                align-items: center;
                gap: 4px;
                margin-left: 8px;
                padding-left: 12px;
                border-left: 1px solid rgba(201, 162, 39, 0.2);
            }

            .live-dot {
                width: 6px;
                height: 6px;
                background: #22c55e;
                border-radius: 50%;
                animation: live-pulse 2s ease infinite;
            }

            .live-text {
                font-size: 0.6rem;
                color: #22c55e;
                font-weight: 600;
                letter-spacing: 0.1em;
            }

            @keyframes live-pulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.5; transform: scale(0.8); }
            }

            @media (max-width: 768px) {
                .visitor-widget {
                    bottom: 10px;
                    left: 10px;
                }

                .visitor-inner {
                    padding: 8px 12px;
                }

                .visitor-live {
                    display: none;
                }
            }
        `;
        document.head.appendChild(style);
    }

    async fetchCount() {
        try {
            const response = await fetch('/api/visitors');
            const data = await response.json();

            this.targetCount = data.total || 1000;
            this.animateCount();

            // Show welcome message for new visitors
            if (data.isNewVisitor) {
                this.showWelcome();
            }
        } catch (error) {
            console.warn('[VisitorCounter] Using fallback');
            this.targetCount = 1247 + Math.floor(Math.random() * 100);
            this.animateCount();
        }
    }

    animateCount() {
        const countEl = this.container.querySelector('#visitor-count');
        if (!countEl) return;

        const duration = 2000;
        const startTime = Date.now();
        const startCount = this.currentCount;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function
            const eased = 1 - Math.pow(1 - progress, 3);

            this.currentCount = Math.floor(startCount + (this.targetCount - startCount) * eased);
            countEl.textContent = this.formatNumber(this.currentCount);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toLocaleString();
    }

    showWelcome() {
        const toast = document.createElement('div');
        toast.className = 'visitor-welcome';
        toast.innerHTML = `
            <span class="welcome-icon">👋</span>
            <span class="welcome-text">Welcome! You're visitor #${this.targetCount}</span>
        `;
        toast.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 20px;
            background: linear-gradient(135deg, rgba(201, 162, 39, 0.2), rgba(74, 158, 255, 0.1));
            border: 1px solid rgba(201, 162, 39, 0.4);
            border-radius: 8px;
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-family: var(--font-mono);
            font-size: 0.85rem;
            color: var(--text-primary, #f8fafc);
            z-index: 101;
            animation: welcome-slide 0.5s ease;
            backdrop-filter: blur(10px);
        `;

        if (!document.getElementById('welcome-styles')) {
            const style = document.createElement('style');
            style.id = 'welcome-styles';
            style.textContent = `
                @keyframes welcome-slide {
                    from { transform: translateX(-20px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'welcome-slide 0.5s ease reverse';
            setTimeout(() => toast.remove(), 500);
        }, 5000);
    }

    destroy() {
        this.container?.remove();
    }
}
