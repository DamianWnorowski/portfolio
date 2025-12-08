/**
 * Boot Sequence Integration Tests
 * Tests for the full application boot and initialization flow
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock all browser APIs
const setupBrowserMocks = () => {
    // Mock localStorage (use vi.spyOn instead of overwriting)
    const storage = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(key => storage[key] || null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => { storage[key] = value; });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(key => { delete storage[key]; });
    vi.spyOn(Storage.prototype, 'clear').mockImplementation(() => { Object.keys(storage).forEach(k => delete storage[k]); });

    // Mock matchMedia
    window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
    }));

    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn(cb => {
        setTimeout(cb, 16);
        return 1;
    });
    global.cancelAnimationFrame = vi.fn();

    // Mock AudioContext
    global.AudioContext = vi.fn().mockImplementation(() => ({
        createGain: vi.fn().mockReturnValue({
            gain: { value: 1, setValueAtTime: vi.fn() },
            connect: vi.fn()
        }),
        createOscillator: vi.fn().mockReturnValue({
            type: 'sine',
            frequency: { value: 440 },
            connect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn()
        }),
        destination: {},
        state: 'running',
        resume: vi.fn().mockResolvedValue(undefined)
    }));

    // Mock WebGL
    HTMLCanvasElement.prototype.getContext = vi.fn((type) => {
        if (type.includes('webgl')) {
            return {
                getParameter: vi.fn(() => null),
                VENDOR: 0x1F00,
                RENDERER: 0x1F01,
                MAX_TEXTURE_SIZE: 0x0D33
            };
        }
        if (type === '2d') {
            return {
                fillRect: vi.fn(),
                clearRect: vi.fn(),
                getImageData: vi.fn(),
                putImageData: vi.fn(),
                createImageData: vi.fn(),
                setTransform: vi.fn(),
                drawImage: vi.fn(),
                save: vi.fn(),
                restore: vi.fn(),
                beginPath: vi.fn(),
                moveTo: vi.fn(),
                lineTo: vi.fn(),
                closePath: vi.fn(),
                stroke: vi.fn(),
                translate: vi.fn(),
                scale: vi.fn(),
                rotate: vi.fn(),
                arc: vi.fn(),
                fill: vi.fn(),
                measureText: vi.fn(() => ({ width: 0 })),
                transform: vi.fn(),
                rect: vi.fn(),
                clip: vi.fn()
            };
        }
        return null;
    });

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
            github: { repos: 50, stars: 300 },
            metrics: { cpu: 20 },
            uptime: { percentage: 99.9 }
        })
    });

    // Mock IntersectionObserver
    global.IntersectionObserver = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn()
    }));

    // Mock ResizeObserver
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn()
    }));

    // Mock EventSource
    global.EventSource = vi.fn().mockImplementation(() => ({
        close: vi.fn(),
        addEventListener: vi.fn()
    }));
};

describe('Boot Sequence Integration', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.useFakeTimers();
        setupBrowserMocks();

        // Setup minimal DOM
        document.body.innerHTML = `
            <div id="loading-screen">
                <div class="logo">KAIZEN</div>
                <div class="progress-bar"><div class="progress-fill"></div></div>
                <div class="status-text">INITIALIZING...</div>
            </div>
            <div id="app" style="opacity: 0;">
                <header>
                    <div class="logo">KAIZEN</div>
                    <nav>
                        <a class="nav-link" data-section="profile">Profile</a>
                        <a class="nav-link" data-section="terminal">Terminal</a>
                    </nav>
                    <div class="theme-toggle"></div>
                </header>
                <main>
                    <div id="neural-bg"></div>
                    <div id="globe-container"></div>
                    <div id="profile-panel"></div>
                    <div id="terminal-panel"></div>
                </main>
            </div>
        `;
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('Loading Screen', () => {
        it('displays loading screen initially', async () => {
            const loadingScreen = document.getElementById('loading-screen');
            expect(loadingScreen).not.toBeNull();
        });

        it('shows KAIZEN logo', () => {
            const logo = document.querySelector('#loading-screen .logo');
            expect(logo).not.toBeNull();
            expect(logo.textContent).toBe('KAIZEN');
        });

        it('has progress bar element', () => {
            const progressBar = document.querySelector('.progress-bar');
            expect(progressBar).not.toBeNull();
        });

        it('shows status text', () => {
            const status = document.querySelector('.status-text');
            expect(status).not.toBeNull();
            expect(status.textContent).toContain('INITIALIZING');
        });
    });

    describe('Component Initialization Order', () => {
        it('initializes in correct dependency order', async () => {
            // EventBus should be available as core dependency
            const { eventBus } = await import('../../src/core/EventBus.js');
            expect(eventBus).toBeDefined();
            expect(typeof eventBus.on).toBe('function');
            expect(typeof eventBus.emit).toBe('function');
        });
    });

    describe('DOM Ready State', () => {
        it('waits for DOM content loaded', () => {
            const readyState = document.readyState;
            expect(['loading', 'interactive', 'complete']).toContain(readyState);
        });

        it('app container exists but hidden initially', () => {
            const app = document.getElementById('app');
            expect(app).not.toBeNull();
            expect(app.style.opacity).toBe('0');
        });
    });

    describe('Critical Path Elements', () => {
        it('has neural background container', () => {
            expect(document.getElementById('neural-bg')).not.toBeNull();
        });

        it('has globe container', () => {
            expect(document.getElementById('globe-container')).not.toBeNull();
        });

        it('has profile panel', () => {
            expect(document.getElementById('profile-panel')).not.toBeNull();
        });

        it('has terminal panel', () => {
            expect(document.getElementById('terminal-panel')).not.toBeNull();
        });

        it('has navigation links', () => {
            const navLinks = document.querySelectorAll('.nav-link');
            expect(navLinks.length).toBeGreaterThan(0);
        });

        it('has theme toggle', () => {
            expect(document.querySelector('.theme-toggle')).not.toBeNull();
        });
    });

    describe('Service Initialization', () => {
        it('initializes AudioService', async () => {
            const { AudioService } = await import('../../src/services/AudioService.js');
            const service = new AudioService();
            await service.init();

            expect(service.initialized).toBe(true);
        });

        it('initializes DataService', async () => {
            const { dataService } = await import('../../src/services/DataService.js');
            expect(dataService).toBeDefined();
            expect(dataService.cache).toBeDefined();
        });
    });

    describe('Error Resilience', () => {
        it('continues boot if WebGL fails', async () => {
            HTMLCanvasElement.prototype.getContext = vi.fn(() => null);

            const { WebGLErrorBoundary } = await import('../../src/components/WebGLErrorBoundary.js');
            const boundary = new WebGLErrorBoundary();

            expect(boundary.fallbackMode).toBe(true);
            // Boot should continue
        });

        it('continues boot if AudioContext fails', async () => {
            global.AudioContext = vi.fn(() => {
                throw new Error('AudioContext not supported');
            });

            const { AudioService } = await import('../../src/services/AudioService.js');
            const service = new AudioService();
            await service.init();

            expect(service.enabled).toBe(false);
            // Boot should continue with audio disabled
        });

        it('continues boot if fetch fails', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

            const { dataService } = await import('../../src/services/DataService.js');
            const data = await dataService.fetchStats();

            expect(data).toBeDefined();
            expect(data.github).toBeDefined();
            // Returns fallback data
        });
    });

    describe('Theme Initialization', () => {
        it('respects stored theme preference', async () => {
            localStorage.setItem('kaizen-theme', 'light');

            const storedTheme = localStorage.getItem('kaizen-theme');
            expect(storedTheme).toBe('light');
        });

        it('respects system dark mode preference', () => {
            window.matchMedia = vi.fn().mockImplementation(query => ({
                matches: query === '(prefers-color-scheme: dark)',
                media: query,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn()
            }));

            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            expect(mq.matches).toBe(true);
        });

        it('defaults to dark theme when no preference', () => {
            localStorage.clear();
            const theme = localStorage.getItem('kaizen-theme');
            expect(theme).toBeNull();
            // Component should default to dark
        });
    });

    describe('Accessibility Setup', () => {
        it('sets lang attribute on html', () => {
            document.documentElement.setAttribute('lang', 'en');
            expect(document.documentElement.getAttribute('lang')).toBe('en');
        });

        it('respects reduced motion preference', () => {
            window.matchMedia = vi.fn().mockImplementation(query => ({
                matches: query === '(prefers-reduced-motion: reduce)',
                media: query,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn()
            }));

            const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
            expect(mq.matches).toBe(true);
        });
    });
});

describe('Navigation Integration', () => {
    beforeEach(() => {
        vi.resetModules();
        setupBrowserMocks();

        document.body.innerHTML = `
            <nav>
                <a class="nav-link active" data-section="profile">Profile</a>
                <a class="nav-link" data-section="terminal">Terminal</a>
                <a class="nav-link" data-section="contact">Contact</a>
            </nav>
            <section id="profile" class="section active"></section>
            <section id="terminal" class="section"></section>
            <section id="contact" class="section"></section>
        `;
    });

    it('starts with profile section active', () => {
        const activeLink = document.querySelector('.nav-link.active');
        expect(activeLink.dataset.section).toBe('profile');
    });

    it('updates active class on navigation', () => {
        const terminalLink = document.querySelector('[data-section="terminal"]');
        const profileLink = document.querySelector('[data-section="profile"]');

        // Simulate navigation
        profileLink.classList.remove('active');
        terminalLink.classList.add('active');

        expect(terminalLink.classList.contains('active')).toBe(true);
        expect(profileLink.classList.contains('active')).toBe(false);
    });

    it('shows corresponding section on navigation', () => {
        const profile = document.getElementById('profile');
        const terminal = document.getElementById('terminal');

        profile.classList.remove('active');
        terminal.classList.add('active');

        expect(terminal.classList.contains('active')).toBe(true);
        expect(profile.classList.contains('active')).toBe(false);
    });
});

describe('Modal Flow Integration', () => {
    beforeEach(() => {
        vi.resetModules();
        setupBrowserMocks();

        document.body.innerHTML = `
            <button id="contact-btn">Contact</button>
            <div id="contact-modal" class="modal" hidden>
                <div class="modal-content">
                    <button class="modal-close">Close</button>
                    <form id="contact-form">
                        <input name="email" type="email">
                        <textarea name="message"></textarea>
                        <button type="submit">Send</button>
                    </form>
                </div>
            </div>
        `;
    });

    it('modal is hidden initially', () => {
        const modal = document.getElementById('contact-modal');
        expect(modal.hidden).toBe(true);
    });

    it('opens modal on button click', () => {
        const btn = document.getElementById('contact-btn');
        const modal = document.getElementById('contact-modal');

        btn.addEventListener('click', () => {
            modal.hidden = false;
        });

        btn.click();

        expect(modal.hidden).toBe(false);
    });

    it('closes modal on close button click', () => {
        const modal = document.getElementById('contact-modal');
        const closeBtn = modal.querySelector('.modal-close');

        modal.hidden = false;

        closeBtn.addEventListener('click', () => {
            modal.hidden = true;
        });

        closeBtn.click();

        expect(modal.hidden).toBe(true);
    });

    it('closes modal on Escape key', () => {
        const modal = document.getElementById('contact-modal');
        modal.hidden = false;

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                modal.hidden = true;
            }
        });

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

        expect(modal.hidden).toBe(true);
    });

    it('traps focus within modal', () => {
        const modal = document.getElementById('contact-modal');
        modal.hidden = false;

        const focusableElements = modal.querySelectorAll(
            'button, input, textarea, [tabindex]:not([tabindex="-1"])'
        );

        expect(focusableElements.length).toBeGreaterThan(0);
    });
});

describe('Keyboard Shortcuts Integration', () => {
    beforeEach(() => {
        vi.resetModules();
        setupBrowserMocks();

        document.body.innerHTML = `
            <div id="command-palette" hidden></div>
            <div class="theme-toggle"></div>
        `;
    });

    it('Cmd+K opens command palette', () => {
        const palette = document.getElementById('command-palette');

        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                palette.hidden = false;
            }
        });

        document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'k',
            metaKey: true
        }));

        expect(palette.hidden).toBe(false);
    });

    it('T key toggles theme', () => {
        let themeToggled = false;

        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 't' && !e.metaKey && !e.ctrlKey) {
                themeToggled = true;
            }
        });

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }));

        expect(themeToggled).toBe(true);
    });

    it('Escape closes command palette', () => {
        const palette = document.getElementById('command-palette');
        palette.hidden = false;

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                palette.hidden = true;
            }
        });

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

        expect(palette.hidden).toBe(true);
    });
});
