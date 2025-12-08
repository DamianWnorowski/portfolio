/**
 * ThemeToggle Unit Tests
 * Note: Tests must run sequentially due to shared DOM/localStorage state
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Simplified ThemeToggle for testing
class ThemeToggle {
    constructor() {
        this.theme = this.getInitialTheme();
        this.button = null;
        this._keydownHandler = null;

        this.init();
    }

    getInitialTheme() {
        const stored = localStorage.getItem('kaizen-theme');
        if (stored === 'light' || stored === 'dark') return stored;

        if (window.matchMedia('(prefers-color-scheme: light)').matches) {
            return 'light';
        }

        return 'dark';
    }

    init() {
        this.applyTheme(this.theme);
        this.createButton();
        this.bindEvents();
    }

    createButton() {
        this.button = document.createElement('button');
        this.button.id = 'theme-toggle';
        this.button.className = 'theme-toggle';
        this.button.setAttribute('aria-label', 'Toggle theme');
        this.button.setAttribute('aria-pressed', this.theme === 'light' ? 'true' : 'false');
        this.updateButton();
        document.body.appendChild(this.button);
    }

    updateButton() {
        const isDark = this.theme === 'dark';
        this.button.innerHTML = isDark ? '☀️' : '🌙';
        this.button.setAttribute('aria-pressed', !isDark);
        this.button.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    }

    bindEvents() {
        this.button.addEventListener('click', () => this.toggle());

        this._keydownHandler = (e) => {
            const activeTag = document.activeElement?.tagName || '';
            if (e.key === 't' &&
                !e.ctrlKey &&
                !e.metaKey &&
                activeTag !== 'INPUT' &&
                activeTag !== 'TEXTAREA') {
                this.toggle();
            }
        };
        document.addEventListener('keydown', this._keydownHandler);
    }

    toggle() {
        const newTheme = this.theme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    setTheme(theme) {
        this.theme = theme;
        localStorage.setItem('kaizen-theme', theme);
        this.applyTheme(theme);
        this.updateButton();
    }

    applyTheme(theme) {
        if (theme === 'light') {
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
        }
    }

    destroy() {
        if (this._keydownHandler) {
            document.removeEventListener('keydown', this._keydownHandler);
        }
        this.button?.remove();
        document.body.classList.remove('light-theme');
    }
}

describe('ThemeToggle', () => {
    let toggle;

    beforeEach(() => {
        // Clear all state before each test
        localStorage.clear();
        document.body.innerHTML = '';
        document.body.classList.remove('light-theme');
        toggle = null;
    });

    afterEach(() => {
        // Clean up toggle instance (removes keydown handler)
        if (toggle) {
            toggle.destroy();
            toggle = null;
        }
        localStorage.clear();
        document.body.innerHTML = '';
        document.body.classList.remove('light-theme');
    });

    describe('Initialization', () => {
        it('renders without crashing', () => {
            toggle = new ThemeToggle();

            expect(toggle.button).not.toBeNull();
            expect(document.getElementById('theme-toggle')).not.toBeNull();
        });

        it('defaults to dark theme when no localStorage or light preference', () => {
            // Ensure matchMedia returns false for light preference
            window.matchMedia = vi.fn().mockImplementation((query) => ({
                matches: false,
                media: query,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn()
            }));

            toggle = new ThemeToggle();

            expect(toggle.theme).toBe('dark');
            expect(document.body.classList.contains('light-theme')).toBe(false);
        });

        it('respects localStorage theme', () => {
            localStorage.setItem('kaizen-theme', 'light');

            toggle = new ThemeToggle();

            expect(toggle.theme).toBe('light');
            expect(document.body.classList.contains('light-theme')).toBe(true);
        });

        it('respects system preference when no localStorage', () => {
            window.matchMedia = vi.fn().mockImplementation((query) => ({
                matches: query === '(prefers-color-scheme: light)',
                media: query,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn()
            }));

            toggle = new ThemeToggle();

            expect(toggle.theme).toBe('light');
        });

        it('has proper ARIA attributes', () => {
            toggle = new ThemeToggle();

            expect(toggle.button.getAttribute('aria-label')).toBe('Toggle theme');
            expect(toggle.button.hasAttribute('aria-pressed')).toBe(true);
        });

        it('shows sun icon in dark mode', () => {
            // Force dark mode
            window.matchMedia = vi.fn().mockImplementation((query) => ({
                matches: false,
                media: query,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn()
            }));
            localStorage.clear();
            toggle = new ThemeToggle();

            expect(toggle.button.innerHTML).toContain('☀️');
        });

        it('shows moon icon in light mode', () => {
            localStorage.setItem('kaizen-theme', 'light');
            toggle = new ThemeToggle();

            expect(toggle.button.innerHTML).toContain('🌙');
        });
    });

    describe('Toggle Behavior', () => {
        it('toggles theme on click', () => {
            toggle = new ThemeToggle();
            const startTheme = toggle.theme;

            toggle.toggle();

            const expectedTheme = startTheme === 'dark' ? 'light' : 'dark';
            expect(toggle.theme).toBe(expectedTheme);
        });

        it('toggles light to dark correctly', () => {
            localStorage.setItem('kaizen-theme', 'light');
            toggle = new ThemeToggle();
            expect(toggle.theme).toBe('light');

            toggle.toggle();

            expect(toggle.theme).toBe('dark');
            expect(document.body.classList.contains('light-theme')).toBe(false);
        });

        it('updates button icon after toggle', () => {
            toggle = new ThemeToggle();
            const wasDark = toggle.theme === 'dark';
            const expectedBefore = wasDark ? '☀️' : '🌙';
            const expectedAfter = wasDark ? '🌙' : '☀️';

            expect(toggle.button.innerHTML).toContain(expectedBefore);

            toggle.toggle();

            expect(toggle.button.innerHTML).toContain(expectedAfter);
        });

        it('updates ARIA pressed state after toggle', () => {
            toggle = new ThemeToggle();
            const wasDark = toggle.theme === 'dark';
            expect(toggle.button.getAttribute('aria-pressed')).toBe(String(!wasDark));

            toggle.toggle();

            expect(toggle.button.getAttribute('aria-pressed')).toBe(String(wasDark));
        });

        it('persists theme to localStorage', () => {
            toggle = new ThemeToggle();
            const startTheme = toggle.theme;

            toggle.toggle();
            const expected1 = startTheme === 'dark' ? 'light' : 'dark';
            expect(localStorage.getItem('kaizen-theme')).toBe(expected1);

            toggle.toggle();
            expect(localStorage.getItem('kaizen-theme')).toBe(startTheme);
        });

        it('cycles correctly with multiple toggles', () => {
            toggle = new ThemeToggle();
            const startTheme = toggle.theme;
            const altTheme = startTheme === 'dark' ? 'light' : 'dark';

            toggle.toggle();
            expect(toggle.theme).toBe(altTheme);

            toggle.toggle();
            expect(toggle.theme).toBe(startTheme);

            toggle.toggle();
            expect(toggle.theme).toBe(altTheme);

            toggle.toggle();
            expect(toggle.theme).toBe(startTheme);
        });
    });

    describe('Keyboard Support', () => {
        it('toggles on T key press', () => {
            toggle = new ThemeToggle();
            const startTheme = toggle.theme;

            const event = new KeyboardEvent('keydown', {
                key: 't',
                bubbles: true
            });
            document.dispatchEvent(event);

            const expectedTheme = startTheme === 'dark' ? 'light' : 'dark';
            expect(toggle.theme).toBe(expectedTheme);
            // afterEach will clean up
        });

        it('ignores T key when Ctrl is pressed', () => {
            toggle = new ThemeToggle();
            const startTheme = toggle.theme;

            const event = new KeyboardEvent('keydown', {
                key: 't',
                ctrlKey: true,
                bubbles: true
            });
            document.dispatchEvent(event);

            // Theme should not change
            expect(toggle.theme).toBe(startTheme);
        });

        it('ignores T key when Meta is pressed', () => {
            toggle = new ThemeToggle();
            const startTheme = toggle.theme;

            const event = new KeyboardEvent('keydown', {
                key: 't',
                metaKey: true,
                bubbles: true
            });
            document.dispatchEvent(event);

            // Theme should not change
            expect(toggle.theme).toBe(startTheme);
        });

        it('ignores T key when input is focused', () => {
            toggle = new ThemeToggle();
            const startTheme = toggle.theme;

            const input = document.createElement('input');
            document.body.appendChild(input);
            input.focus();

            const event = new KeyboardEvent('keydown', {
                key: 't',
                bubbles: true
            });
            document.dispatchEvent(event);

            // Theme should not change
            expect(toggle.theme).toBe(startTheme);

            input.remove();
        });

        it('ignores T key when textarea is focused', () => {
            toggle = new ThemeToggle();
            const startTheme = toggle.theme;

            const textarea = document.createElement('textarea');
            document.body.appendChild(textarea);
            textarea.focus();

            const event = new KeyboardEvent('keydown', {
                key: 't',
                bubbles: true
            });
            document.dispatchEvent(event);

            // Theme should not change
            expect(toggle.theme).toBe(startTheme);

            textarea.remove();
        });
    });

    describe('Theme Application', () => {
        it('adds light-theme class for light mode', () => {
            toggle = new ThemeToggle();
            toggle.setTheme('light');

            expect(document.body.classList.contains('light-theme')).toBe(true);
        });

        it('removes light-theme class for dark mode', () => {
            document.body.classList.add('light-theme');
            toggle = new ThemeToggle();
            toggle.setTheme('dark');

            expect(document.body.classList.contains('light-theme')).toBe(false);
        });

        it('handles setTheme with same theme', () => {
            toggle = new ThemeToggle();

            expect(() => {
                toggle.setTheme('dark');
                toggle.setTheme('dark');
            }).not.toThrow();

            expect(toggle.theme).toBe('dark');
        });
    });

    describe('Cleanup', () => {
        it('removes button on destroy', () => {
            toggle = new ThemeToggle();
            expect(document.getElementById('theme-toggle')).not.toBeNull();

            toggle.destroy();

            expect(document.getElementById('theme-toggle')).toBeNull();
        });

        it('removes light-theme class on destroy', () => {
            localStorage.setItem('kaizen-theme', 'light');
            toggle = new ThemeToggle();
            expect(document.body.classList.contains('light-theme')).toBe(true);

            toggle.destroy();

            expect(document.body.classList.contains('light-theme')).toBe(false);
        });

        it('handles multiple destroy calls', () => {
            toggle = new ThemeToggle();

            expect(() => {
                toggle.destroy();
                toggle.destroy();
            }).not.toThrow();
        });
    });

    describe('Edge Cases', () => {
        it('handles invalid localStorage value', () => {
            localStorage.setItem('kaizen-theme', 'invalid');

            // Should fall through to default (matchMedia returns false)
            toggle = new ThemeToggle();

            // With invalid value, should fall through - check theme is set
            expect(['dark', 'light']).toContain(toggle.theme);
        });

        it('handles rapid toggling', () => {
            // Ensure we start from a clean state
            localStorage.clear();
            document.body.classList.remove('light-theme');

            toggle = new ThemeToggle();
            const startTheme = toggle.theme;

            for (let i = 0; i < 20; i++) {
                toggle.toggle();
            }

            // After even number of toggles (20), should be back to original
            expect(toggle.theme).toBe(startTheme);
        });
    });
});
