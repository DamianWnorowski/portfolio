/**
 * Theme Toggle Component
 * Dark/Light mode switcher with smooth transitions
 */

import { audioService } from '../services/AudioService.js';

export class ThemeToggle {
    constructor() {
        this.theme = this.getInitialTheme();
        this.button = null;

        this.init();
    }

    getInitialTheme() {
        // Check localStorage first
        const stored = localStorage.getItem('kaizen-theme');
        if (stored) return stored;

        // Check system preference
        if (window.matchMedia('(prefers-color-scheme: light)').matches) {
            return 'light';
        }

        return 'dark';
    }

    init() {
        this.applyTheme(this.theme);
        this.createButton();
        this.addStyles();
        this.setupSystemListener();
    }

    createButton() {
        // Find existing button or create new one
        this.button = document.getElementById('theme-toggle');

        if (!this.button) {
            this.button = document.createElement('button');
            this.button.id = 'theme-toggle';
            this.button.className = 'theme-toggle';
            this.button.setAttribute('aria-label', 'Toggle theme');
            this.button.setAttribute('title', 'Toggle theme (T)');

            // Insert in header or fixed position
            const header = document.querySelector('header .social-links') ||
                           document.querySelector('header');
            if (header) {
                header.appendChild(this.button);
            } else {
                document.body.appendChild(this.button);
            }
        }

        this.updateButton();
        this.bindEvents();
    }

    updateButton() {
        const isDark = this.theme === 'dark';

        this.button.innerHTML = isDark ? `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
        ` : `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
        `;

        this.button.setAttribute('aria-pressed', isDark ? 'false' : 'true');
    }

    addStyles() {
        if (document.getElementById('theme-toggle-styles')) return;

        const style = document.createElement('style');
        style.id = 'theme-toggle-styles';
        style.textContent = `
            /* Toggle button */
            .theme-toggle {
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: transparent;
                border: 1px solid var(--border-primary);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
                color: var(--text-muted);
            }

            .theme-toggle:hover {
                background: var(--accent-gold);
                border-color: var(--accent-gold);
                color: var(--bg-primary);
            }

            /* Theme transition */
            html.theme-transition,
            html.theme-transition *,
            html.theme-transition *::before,
            html.theme-transition *::after {
                transition: background-color 0.3s ease,
                            color 0.3s ease,
                            border-color 0.3s ease,
                            box-shadow 0.3s ease !important;
            }

            /* Light theme variables */
            body.light-theme {
                --bg-primary: #f8fafc;
                --bg-secondary: #f1f5f9;
                --bg-tertiary: #e2e8f0;
                --text-primary: #0f172a;
                --text-secondary: #334155;
                --text-muted: #64748b;
                --border-primary: #cbd5e1;
                --border-secondary: #e2e8f0;
                --accent-gold: #b8860b;
                --accent-blue: #2563eb;
                --glass-bg: rgba(255, 255, 255, 0.8);
            }

            /* Light theme adjustments */
            body.light-theme .panel {
                background: var(--glass-bg);
                border-color: var(--border-primary);
            }

            body.light-theme header {
                background: rgba(248, 250, 252, 0.9);
                border-color: var(--border-primary);
            }

            body.light-theme .logo {
                color: var(--accent-gold);
            }

            body.light-theme .nav-link.active {
                color: var(--text-primary);
            }

            body.light-theme .stat-value {
                color: var(--accent-gold);
            }

            body.light-theme .skill-fill {
                background: linear-gradient(90deg, var(--accent-blue), var(--accent-gold));
            }

            body.light-theme .terminal-panel {
                background: rgba(15, 23, 42, 0.95);
            }

            body.light-theme .terminal-panel .terminal-line {
                color: #22c55e;
            }

            body.light-theme .profile-avatar {
                border-color: var(--accent-gold);
            }

            body.light-theme .btn-primary {
                background: var(--accent-gold);
                color: white;
            }

            body.light-theme .btn-primary:hover {
                background: #996515;
            }

            /* Keep neural background dark in light mode */
            body.light-theme #neural-bg {
                opacity: 0.05;
            }

            /* Adjust globe for light mode */
            body.light-theme #globe-container {
                filter: brightness(0.8) contrast(1.2);
            }

            /* Card shadows for light mode */
            body.light-theme .panel {
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1),
                            0 4px 6px rgba(0, 0, 0, 0.05);
            }

            body.light-theme .panel:hover {
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1),
                            0 10px 15px rgba(0, 0, 0, 0.05);
            }

            /* Fix modal in light mode */
            body.light-theme .modal-content {
                background: var(--bg-primary);
                border-color: var(--border-primary);
            }

            /* Command palette light mode */
            body.light-theme .cmd-modal {
                background: rgba(248, 250, 252, 0.98);
            }

            body.light-theme .cmd-item:hover,
            body.light-theme .cmd-item.selected {
                background: rgba(37, 99, 235, 0.1);
            }
        `;
        document.head.appendChild(style);
    }

    bindEvents() {
        this.button.addEventListener('click', () => this.toggle());

        // Keyboard shortcut (T key)
        document.addEventListener('keydown', (e) => {
            if (e.key === 't' &&
                !e.ctrlKey &&
                !e.metaKey &&
                document.activeElement.tagName !== 'INPUT' &&
                document.activeElement.tagName !== 'TEXTAREA') {
                this.toggle();
            }
        });
    }

    setupSystemListener() {
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            // Only auto-switch if user hasn't set a preference
            if (!localStorage.getItem('kaizen-theme')) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    toggle() {
        const newTheme = this.theme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
        audioService.play('key');

        // Announce for screen readers
        if (window.announce) {
            window.announce(`Switched to ${newTheme} theme`);
        }
    }

    setTheme(theme) {
        this.theme = theme;
        localStorage.setItem('kaizen-theme', theme);
        this.applyTheme(theme);
        this.updateButton();
    }

    applyTheme(theme) {
        // Add transition class
        document.documentElement.classList.add('theme-transition');

        // Apply theme
        if (theme === 'light') {
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
        }

        // Update meta theme-color
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
            metaTheme.content = theme === 'light' ? '#f8fafc' : '#0a0c10';
        }

        // Remove transition class after animation
        setTimeout(() => {
            document.documentElement.classList.remove('theme-transition');
        }, 300);
    }

    destroy() {
        this.button?.remove();
    }
}

// Auto-initialize
export const themeToggle = new ThemeToggle();
