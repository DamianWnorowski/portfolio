/**
 * KAIZEN Elite v13 - Main Application Entry Point
 * Orchestrates all components and services
 */

import { getEngine } from './core/Engine.js';
import { eventBus, Events } from './core/EventBus.js';
import { NeuralBackground } from './components/NeuralBackground.js';
import { HolographicGlobe } from './components/HolographicGlobe.js';
import { EliteTerminal } from './components/EliteTerminal.js';
import { SkillsConstellation } from './components/SkillsConstellation.js';
import { dataService } from './services/DataService.js';
import { realtimeService } from './services/RealtimeService.js';
import { audioService } from './services/AudioService.js';
import { analytics } from './services/AnalyticsService.js';

// New components
import { LoadingScreen } from './components/LoadingScreen.js';
import { Testimonials } from './components/Testimonials.js';
import { ContactForm } from './components/ContactForm.js';
import { SpotifyWidget } from './components/SpotifyWidget.js';
import { VisitorCounter } from './components/VisitorCounter.js';
import { webglErrorBoundary } from './components/WebGLErrorBoundary.js';

// Auto-initializing modules
import './components/EasterEggs.js';
import './components/CommandPalette.js';
import './components/CursorTrail.js';
import './components/ThemeToggle.js';

// Utilities
import { seo } from './utils/seo.js';
import { a11y } from './utils/accessibility.js';

class KaizenApp {
    constructor() {
        this.engine = null;
        this.components = {};
        this.isInitialized = false;
    }

    async init() {
        console.log('[Kaizen] Initializing Executive Terminal v13...');

        try {
            // Show loading screen
            this.loadingScreen = new LoadingScreen();

            // Initialize audio service
            await audioService.init();

            // Initialize SEO and accessibility
            seo.init();
            a11y.init();

            // Check WebGL support
            if (!webglErrorBoundary.shouldUseWebGL()) {
                console.warn('[Kaizen] Running in fallback mode');
            }

            // Initialize engine
            this.engine = getEngine();

            // Initialize components
            await this.initComponents();

            // Load initial data
            await this.loadData();

            // Setup event listeners
            this.setupEventListeners();

            // Connect to real-time services
            this.connectRealtime();

            // Mark as ready
            this.isInitialized = true;
            eventBus.emit(Events.READY);

            // Complete loading and play boot sound
            this.loadingScreen.complete();
            audioService.play('boot');

            console.log('[Kaizen] Initialization complete');
        } catch (error) {
            console.error('[Kaizen] Initialization error:', error);
            eventBus.emit(Events.ERROR, error);
            analytics.trackError(error, 'init');
        }
    }

    async initComponents() {
        // Only init WebGL components if supported
        if (webglErrorBoundary.shouldUseWebGL()) {
            // Neural background
            this.components.neural = new NeuralBackground('neural-bg');
            this.engine.registerComponent('neural', this.components.neural);

            // Holographic globe
            this.components.globe = new HolographicGlobe('globe-container');
            this.engine.registerComponent('globe', this.components.globe);

            // Skills constellation (lazy init - only when visible)
            this.components.skills = new SkillsConstellation('skills-constellation');
            this.engine.registerComponent('skills', this.components.skills);
        }

        // Terminal (works without WebGL)
        this.components.terminal = new EliteTerminal();

        // Testimonials carousel
        this.components.testimonials = new Testimonials('testimonials');

        // Contact form
        this.components.contactForm = new ContactForm('contact-form');

        // Spotify widget
        this.components.spotify = new SpotifyWidget('spotify-widget');

        // Visitor counter
        this.components.visitors = new VisitorCounter('visitor-counter');
    }

    async loadData() {
        try {
            const stats = await dataService.fetchStats();

            if (stats && stats.github) {
                this.updateGitHubStats(stats.github);
            }

            if (stats && stats.metrics) {
                this.updateMetrics(stats.metrics);
            }
        } catch (error) {
            console.warn('[Kaizen] Using fallback data:', error);
        }
    }

    updateGitHubStats(github) {
        const reposEl = document.getElementById('stat-repos');
        const starsEl = document.getElementById('stat-stars');
        const commitsEl = document.getElementById('stat-commits');

        if (reposEl) reposEl.textContent = github.repos || '--';
        if (starsEl) starsEl.textContent = github.stars || '--';
        if (commitsEl) commitsEl.textContent = github.commits || '--';
    }

    updateMetrics(metrics) {
        const uptimeEl = document.getElementById('uptime-value');
        if (uptimeEl && metrics.uptime) {
            uptimeEl.textContent = `${metrics.uptime}%`;
        }
    }

    setupEventListeners() {
        // Acquisition modal
        const acquireBtn = document.getElementById('btn-acquire');
        const modalOverlay = document.getElementById('modal-overlay');
        const modalClose = document.getElementById('modal-close');

        if (acquireBtn && modalOverlay) {
            acquireBtn.addEventListener('click', () => {
                modalOverlay.classList.remove('hidden');
                eventBus.emit(Events.MODAL_OPEN, 'acquisition');
            });
        }

        if (modalClose && modalOverlay) {
            modalClose.addEventListener('click', () => {
                modalOverlay.classList.add('hidden');
                eventBus.emit(Events.MODAL_CLOSE);
            });

            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    modalOverlay.classList.add('hidden');
                    eventBus.emit(Events.MODAL_CLOSE);
                }
            });
        }

        // Skills view toggle
        const skillsToggle = document.getElementById('skills-toggle');
        const skillsBars = document.getElementById('skills-bars');
        const skillsConstellation = document.getElementById('skills-constellation');

        if (skillsToggle) {
            skillsToggle.addEventListener('click', (e) => {
                const opt = e.target.closest('.toggle-opt');
                if (!opt) return;

                const view = opt.dataset.view;

                // Update toggle buttons
                skillsToggle.querySelectorAll('.toggle-opt').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');

                // Switch views
                if (view === 'bars') {
                    skillsBars?.classList.remove('hidden');
                    skillsConstellation?.classList.add('hidden');
                    this.components.skills?.hide();
                } else {
                    skillsBars?.classList.add('hidden');
                    skillsConstellation?.classList.remove('hidden');
                    this.components.skills?.show();
                }
            });
        }

        // Navigation
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;

                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                eventBus.emit(Events.SECTION_CHANGE, section);
            });
        });

        // Globe node interactions
        eventBus.on(Events.NODE_HOVER, (node) => {
            if (node) {
                this.showNodeTooltip(node);
            } else {
                this.hideNodeTooltip();
            }
        });

        eventBus.on(Events.NODE_CLICK, (node) => {
            console.log('[Kaizen] Node clicked:', node);
            // Could open deployment details modal
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // ESC to close modal
            if (e.key === 'Escape') {
                modalOverlay?.classList.add('hidden');
            }

            // G for GitHub
            if (e.key === 'g' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT') {
                window.open('https://github.com/damianwnorowski', '_blank');
            }

            // C for Contact
            if (e.key === 'c' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT') {
                modalOverlay?.classList.remove('hidden');
            }
        });
    }

    connectRealtime() {
        // Connect to log stream
        try {
            realtimeService.connect('logs', '/api/logs/stream', {
                onOpen: () => {
                    console.log('[Kaizen] Log stream connected');
                },
                onMessage: (log) => {
                    // Terminal handles this via event bus
                },
                onError: (error) => {
                    console.warn('[Kaizen] Log stream error, using fallback');
                }
            });
        } catch (error) {
            console.warn('[Kaizen] Realtime connection failed, using polling');
        }
    }

    showNodeTooltip(node) {
        // Create or update tooltip
        let tooltip = document.getElementById('node-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'node-tooltip';
            tooltip.style.cssText = `
                position: fixed;
                background: rgba(12, 18, 30, 0.95);
                border: 1px solid rgba(201, 162, 39, 0.5);
                border-radius: 4px;
                padding: 12px;
                font-family: var(--font-mono);
                font-size: 0.75rem;
                z-index: 1000;
                pointer-events: none;
                backdrop-filter: blur(10px);
            `;
            document.body.appendChild(tooltip);
        }

        tooltip.innerHTML = `
            <div style="color: #c9a227; font-weight: 600; margin-bottom: 4px;">${node.name}</div>
            <div style="color: #94a3b8;">Status: <span style="color: #22c55e;">${node.status.toUpperCase()}</span></div>
            <div style="color: #94a3b8;">Ping: <span style="color: #4a9eff;">${node.ping}ms</span></div>
        `;

        // Position near mouse (handled by mousemove)
        document.addEventListener('mousemove', this.positionTooltip);
        tooltip.style.display = 'block';
    }

    positionTooltip = (e) => {
        const tooltip = document.getElementById('node-tooltip');
        if (tooltip) {
            tooltip.style.left = `${e.clientX + 15}px`;
            tooltip.style.top = `${e.clientY + 15}px`;
        }
    }

    hideNodeTooltip() {
        const tooltip = document.getElementById('node-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
        document.removeEventListener('mousemove', this.positionTooltip);
    }

    destroy() {
        realtimeService.disconnectAll();
        this.engine?.destroy();

        Object.values(this.components).forEach(component => {
            if (component?.destroy) {
                component.destroy();
            }
        });
    }
}

// Initialize on DOM ready
const app = new KaizenApp();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}

// Cleanup on unload
window.addEventListener('beforeunload', () => app.destroy());

// Export for debugging
window.KaizenApp = app;
