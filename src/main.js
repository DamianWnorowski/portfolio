/**
 * KAIZEN Elite Portfolio - Main Application Entry Point
 * Defense-Tech / FinTech Executive Terminal v13
 */

// CSS Import - Vite handles this
import './styles/main.css';
import './styles/showcase.css';

import { getEngine } from './core/Engine.js';
import { eventBus, Events } from './core/EventBus.js';

// Core Components
import { EliteTerminal } from './components/EliteTerminal.js';
import { NeuralBackground } from './components/NeuralBackground.js';
import { HolographicGlobe } from './components/HolographicGlobe.js';
import { SkillsConstellation } from './components/SkillsConstellation.js';
import { LoadingScreen } from './components/LoadingScreen.js';
import { CursorTrail } from './components/CursorTrail.js';
import { ThemeToggle } from './components/ThemeToggle.js';
import { CommandPalette } from './components/CommandPalette.js';
import { ProjectModal } from './components/ProjectModal.js';
import { ContactForm } from './components/ContactForm.js';
import { EasterEggs } from './components/EasterEggs.js';
import { Testimonials } from './components/Testimonials.js';
import { SpotifyWidget } from './components/SpotifyWidget.js';
import { WakaTimeWidget } from './components/WakaTimeWidget.js';
import { ParticleHover } from './components/ParticleHover.js';
import { VisitorCounter } from './components/VisitorCounter.js';
import { TypeWriter, MultiTypeWriter } from './components/TypeWriter.js';
import { initProjectShowcase } from './components/ProjectShowcase.js';

// Services
import { dataService } from './services/DataService.js';
import { analytics as analyticsService } from './services/AnalyticsService.js';
import { audioService } from './services/AudioService.js';
import { githubService } from './services/GitHubService.js';

// Utils
import { initAccessibility } from './utils/accessibility.js';
import { injectStructuredData as initSEO } from './utils/seo.js';
import { ScrollAnimations } from './utils/scrollAnimations.js';
import { SecurityHeadersConfig } from './utils/ConfigureSecurityHeaders.js';

// Observability
import { logger } from './services/Logger.js';
import { metrics } from './services/MetricsCollector.js';
import { errorTracker } from './services/ErrorTracker.js';

class KaizenElite {
    constructor() {
        this.components = new Map();
        this.isInitialized = false;
        this.isDev = import.meta.env?.DEV ?? false;
    }

    async init() {
        if (this.isDev) console.log('[KAIZEN] Initializing Executive Terminal v13...');

        try {
            // Initialize security headers
            SecurityHeadersConfig.init();

            // Initialize observability
            logger.info('Initializing KAIZEN Elite', { version: 'v13' });
            const bootTimer = metrics.startTimer('app.boot');

            // Show loading screen
            const loadingScreen = new LoadingScreen();
            this.components.set('loading', loadingScreen);

            // Initialize core services
            await this.initServices();

            // Initialize UI components
            await this.initComponents();

            // Setup event listeners
            this.setupEventListeners();

            // Initialize accessibility & SEO
            initAccessibility();
            initSEO();

            // Hide loading screen
            loadingScreen.hide();

            // Initialize scroll animations
            const scrollAnims = new ScrollAnimations();
            this.components.set('scrollAnimations', scrollAnims);

            // Initialize particle hover effects
            const particles = new ParticleHover();
            this.components.set('particles', particles);

            // Start engine
            const engine = getEngine();
            engine.init();

            this.isInitialized = true;
            if (this.isDev) console.log('[KAIZEN] Executive Terminal ready.');

            // Record boot completion
            metrics.endTimer(bootTimer, { status: 'success' });
            metrics.incrementCounter('app.boots', 1);
            logger.info('KAIZEN Elite initialized successfully', { bootTime: metrics.getHistogramStats('app.boot') });

            // Play boot sound
            audioService.play('boot');

        } catch (error) {
            metrics.incrementCounter('app.boot_errors', 1);
            errorTracker.captureError(error, { source: 'app_init' });
            logger.error('Initialization failed', error, { version: 'v13' });
            if (this.isDev) console.error('[KAIZEN] Initialization failed:', error);
        }
    }

    async initServices() {
        // Fetch initial data
        await dataService.fetchStats();
        await dataService.fetchGitHubData();
    }

    async initComponents() {
        // Background effects
        try {
            const neural = new NeuralBackground('neural-bg');
            this.components.set('neural', neural);
        } catch (e) {
            if (this.isDev) console.warn('[KAIZEN] NeuralBackground skipped:', e.message);
        }

        // Globe visualization
        try {
            const globe = new HolographicGlobe('globe-container');
            this.components.set('globe', globe);
        } catch (e) {
            if (this.isDev) console.warn('[KAIZEN] HolographicGlobe skipped:', e.message);
        }

        // Terminal
        const terminal = new EliteTerminal('terminal-output');
        this.components.set('terminal', terminal);

        // Skills constellation
        try {
            const skills = new SkillsConstellation('skills-constellation');
            this.components.set('skills', skills);
        } catch (e) {
            if (this.isDev) console.warn('[KAIZEN] SkillsConstellation skipped:', e.message);
        }

        // UI Components
        const cursorTrail = new CursorTrail();
        this.components.set('cursor', cursorTrail);

        const themeToggle = new ThemeToggle();
        this.components.set('theme', themeToggle);

        const commandPalette = new CommandPalette();
        this.components.set('command', commandPalette);

        const projectModal = new ProjectModal();
        this.components.set('projectModal', projectModal);

        const contactForm = new ContactForm('contact-form');
        this.components.set('contact', contactForm);

        const easterEggs = new EasterEggs();
        this.components.set('easter', easterEggs);

        const testimonials = new Testimonials('testimonials');
        this.components.set('testimonials', testimonials);

        // Live Data Widgets
        const spotifyContainer = document.getElementById('spotify-container');
        if (spotifyContainer) {
            // SpotifyWidget now creates its own element inside the container
            const spotify = new SpotifyWidget(spotifyContainer);
            this.components.set('spotify', spotify);
        }

        const wakatimeContainer = document.getElementById('wakatime-container');
        if (wakatimeContainer) {
            const wakatime = new WakaTimeWidget(wakatimeContainer);
            this.components.set('wakatime', wakatime);
        }

        const visitor = new VisitorCounter('visitor-counter');
        this.components.set('visitor', visitor);

        // TypeWriter effects
        const roleText = document.querySelector('.profile-role');
        if (roleText) {
            new MultiTypeWriter(roleText, [
                'Full-Stack Engineer',
                'Systems Architect',
                'AI/ML Specialist',
                'DevOps Engineer'
            ], { speed: 80, deleteSpeed: 40, pauseBetween: 3000 });
        }

        // Project Showcase - Real projects with live demos
        const showcaseContainer = document.getElementById('project-showcase');
        if (showcaseContainer) {
            const showcase = initProjectShowcase('project-showcase');
            this.components.set('showcase', showcase);
        }

        // Fetch real GitHub stats
        this.updateGitHubStats();
    }

    async updateGitHubStats() {
        // Fallback values in case API fails
        const fallback = {
            repos: 86,
            stars: 142,
            commits: 2847,
            languages: [
                { name: 'Rust', count: 24 },
                { name: 'TypeScript', count: 18 },
                { name: 'Python', count: 15 }
            ]
        };

        try {
            const stats = await githubService.getStats();

            // Get values with fallbacks (check for valid numbers, not '--' strings)
            const rawRepos = stats?.totalRepos ?? stats?.publicRepos;
            const repoCount = (typeof rawRepos === 'number' && rawRepos > 0) ? rawRepos : fallback.repos;
            const starCount = (typeof stats?.totalStars === 'number') ? stats.totalStars : fallback.stars;
            const commitCount = fallback.commits; // GitHub API doesn't provide total commits easily
            const languages = (stats?.languages?.length > 0) ? stats.languages : fallback.languages;

            // Update UI with stats
            const reposEl = document.getElementById('stat-repos');
            const starsEl = document.getElementById('stat-stars');
            const commitsEl = document.getElementById('stat-commits');
            const ossEl = document.getElementById('chip-oss');

            if (reposEl) reposEl.textContent = repoCount;
            if (starsEl) starsEl.textContent = starCount;
            if (commitsEl) commitsEl.textContent = commitCount.toLocaleString();
            if (ossEl) ossEl.textContent = `${repoCount} REPOS`;

            // Update languages display if element exists
            const langContainer = document.getElementById('language-stats');
            if (langContainer) {
                langContainer.innerHTML = languages.map(l =>
                    `<span class="lang-chip">${l.name}: ${l.count}</span>`
                ).join('');
            }

            logger.info('GitHub stats updated', { repoCount, starCount, commitCount });
        } catch (error) {
            logger.warn('Failed to fetch GitHub stats, using fallbacks', error);

            // Apply fallback values on error
            const reposEl = document.getElementById('stat-repos');
            const starsEl = document.getElementById('stat-stars');
            const commitsEl = document.getElementById('stat-commits');
            const ossEl = document.getElementById('chip-oss');

            if (reposEl) reposEl.textContent = fallback.repos;
            if (starsEl) starsEl.textContent = fallback.stars;
            if (commitsEl) commitsEl.textContent = fallback.commits.toLocaleString();
            if (ossEl) ossEl.textContent = `${fallback.repos} REPOS`;
        }
    }

    setupEventListeners() {
        // Modal controls
        const acquireBtn = document.getElementById('btn-acquire');
        const modalOverlay = document.getElementById('modal-overlay');
        const modalClose = document.getElementById('modal-close');

        if (acquireBtn && modalOverlay) {
            acquireBtn.addEventListener('click', () => {
                modalOverlay.classList.remove('hidden');
                eventBus.emit(Events.MODAL_OPEN, 'acquisition');
                audioService.play('ping');
            });
        }

        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    modalOverlay.classList.add('hidden');
                    eventBus.emit(Events.MODAL_CLOSE);
                }
            });
        }

        if (modalClose) {
            modalClose.addEventListener('click', () => {
                modalOverlay?.classList.add('hidden');
                eventBus.emit(Events.MODAL_CLOSE);
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modalOverlay) {
                modalOverlay.classList.add('hidden');
            }
        });

        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                const href = link.getAttribute('href');
                const target = document.getElementById(section) ||
                               document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                    // Update URL hash
                    if (href) {
                        history.pushState(null, '', href);
                    }
                    // Update active state
                    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                    audioService.play('key');
                }
            });
        });

        // Asset cards
        document.querySelectorAll('.asset-card').forEach(card => {
            card.addEventListener('click', () => {
                const projectId = card.dataset.project;
                if (projectId) {
                    eventBus.emit(Events.PROJECT_SELECT, projectId);
                    audioService.play('ping');
                }
            });
        });
    }

    destroy() {
        this.components.forEach((component, name) => {
            if (component.destroy) {
                component.destroy();
            }
        });
        this.components.clear();
    }
}

// Initialize app
const kaizen = new KaizenElite();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => kaizen.init());
} else {
    kaizen.init();
}

// Cleanup on unload
window.addEventListener('beforeunload', () => kaizen.destroy());

// Export for debugging
window.KaizenElite = kaizen;
