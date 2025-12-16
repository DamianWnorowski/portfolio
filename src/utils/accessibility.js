/**
 * Accessibility Utilities
 * WCAG 2.1 AA compliance helpers
 */

export function initAccessibility() {
    // Skip to main content link
    addSkipLink();

    // Focus management
    setupFocusManagement();

    // ARIA live regions
    setupLiveRegions();

    // Keyboard navigation enhancements
    enhanceKeyboardNav();

    // Reduced motion support
    handleReducedMotion();

    // High contrast support
    handleHighContrast();

    // Screen reader announcements
    setupAnnouncer();
}

function addSkipLink() {
    if (document.getElementById('skip-link')) return;

    const skipLink = document.createElement('a');
    skipLink.id = 'skip-link';
    skipLink.href = '#main-content';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Skip to main content';

    // Add styles
    const style = document.createElement('style');
    style.id = 'skip-link-styles';
    style.textContent = `
        .skip-link {
            position: fixed;
            top: -100px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--accent-gold, #c9a227);
            color: var(--bg-primary, #0a0c10);
            padding: 12px 24px;
            border-radius: 0 0 8px 8px;
            text-decoration: none;
            font-weight: 600;
            z-index: 100000;
            transition: top 0.3s;
        }

        .skip-link:focus {
            top: 0;
            outline: 3px solid var(--accent-blue, #4a9eff);
            outline-offset: 2px;
        }
    `;
    document.head.appendChild(style);
    document.body.insertBefore(skipLink, document.body.firstChild);

    // Add main-content id to first main element
    const main = document.querySelector('main') || document.querySelector('.grid-container');
    if (main && !main.id) {
        main.id = 'main-content';
    }
}

function setupFocusManagement() {
    // Focus visible polyfill behavior
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            document.body.classList.add('keyboard-nav');
        }
    });

    document.addEventListener('mousedown', () => {
        document.body.classList.remove('keyboard-nav');
    });

    // Add focus styles
    const style = document.createElement('style');
    style.id = 'focus-styles';
    style.textContent = `
        /* Remove default focus for mouse users */
        :focus:not(:focus-visible) {
            outline: none;
        }

        /* Visible focus for keyboard users */
        .keyboard-nav :focus,
        :focus-visible {
            outline: 2px solid var(--accent-gold, #c9a227);
            outline-offset: 2px;
        }

        /* Custom focus ring for buttons */
        .keyboard-nav button:focus,
        button:focus-visible {
            outline: 2px solid var(--accent-gold, #c9a227);
            outline-offset: 2px;
            box-shadow: 0 0 0 4px rgba(201, 162, 39, 0.3);
        }

        /* Focus trap indicator */
        [role="dialog"]:focus {
            outline: none;
        }
    `;
    document.head.appendChild(style);
}

function setupLiveRegions() {
    // Status announcer for dynamic content
    if (!document.getElementById('aria-status')) {
        const status = document.createElement('div');
        status.id = 'aria-status';
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');
        status.setAttribute('aria-atomic', 'true');
        status.className = 'sr-only';
        document.body.appendChild(status);
    }

    // Alert region for important messages
    if (!document.getElementById('aria-alert')) {
        const alert = document.createElement('div');
        alert.id = 'aria-alert';
        alert.setAttribute('role', 'alert');
        alert.setAttribute('aria-live', 'assertive');
        alert.setAttribute('aria-atomic', 'true');
        alert.className = 'sr-only';
        document.body.appendChild(alert);
    }

    // Screen reader only styles
    const style = document.createElement('style');
    style.id = 'sr-only-styles';
    style.textContent = `
        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        }

        .sr-only-focusable:focus {
            position: static;
            width: auto;
            height: auto;
            padding: inherit;
            margin: inherit;
            overflow: visible;
            clip: auto;
            white-space: normal;
        }
    `;
    document.head.appendChild(style);
}

function enhanceKeyboardNav() {
    // Add role and tabindex to interactive elements
    document.querySelectorAll('.panel').forEach(panel => {
        if (!panel.hasAttribute('tabindex')) {
            panel.setAttribute('tabindex', '0');
        }
    });

    // Arrow key navigation for carousels/lists
    document.querySelectorAll('[role="tablist"]').forEach(tablist => {
        tablist.addEventListener('keydown', (e) => {
            const tabs = tablist.querySelectorAll('[role="tab"]');
            const currentIndex = Array.from(tabs).findIndex(t => t === document.activeElement);

            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                const nextIndex = (currentIndex + 1) % tabs.length;
                tabs[nextIndex].focus();
                tabs[nextIndex].click();
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                tabs[prevIndex].focus();
                tabs[prevIndex].click();
            }
        });
    });

    // Escape key closes modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.querySelector('[role="dialog"]:not(.hidden)');
            if (modal) {
                const closeBtn = modal.querySelector('[aria-label="Close"]') ||
                                 modal.querySelector('.modal-close');
                closeBtn?.click();
            }
        }
    });
}

function handleReducedMotion() {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    function applyReducedMotion(shouldReduce) {
        if (shouldReduce) {
            const style = document.createElement('style');
            style.id = 'reduced-motion-styles';
            style.textContent = `
                *,
                *::before,
                *::after {
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01ms !important;
                    scroll-behavior: auto !important;
                }
            `;
            document.head.appendChild(style);
        } else {
            document.getElementById('reduced-motion-styles')?.remove();
        }
    }

    applyReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', (e) => applyReducedMotion(e.matches));
}

function handleHighContrast() {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');

    function applyHighContrast(isHigh) {
        document.body.classList.toggle('high-contrast', isHigh);

        if (isHigh && !document.getElementById('high-contrast-styles')) {
            const style = document.createElement('style');
            style.id = 'high-contrast-styles';
            style.textContent = `
                .high-contrast {
                    --bg-primary: #000000;
                    --text-primary: #ffffff;
                    --accent-gold: #ffcc00;
                    --border-primary: #ffffff;
                }

                .high-contrast .panel {
                    border-width: 2px;
                }

                .high-contrast a,
                .high-contrast button {
                    text-decoration: underline;
                }
            `;
            document.head.appendChild(style);
        }
    }

    applyHighContrast(mediaQuery.matches);
    mediaQuery.addEventListener('change', (e) => applyHighContrast(e.matches));
}

function setupAnnouncer() {
    // Global announce function
    window.announce = (message, priority = 'polite') => {
        const region = priority === 'assertive'
            ? document.getElementById('aria-alert')
            : document.getElementById('aria-status');

        if (region) {
            region.textContent = '';
            // Small delay for screen readers
            setTimeout(() => {
                region.textContent = message;
            }, 100);
        }
    };
}

// Export utilities
export const a11y = {
    init: initAccessibility,
    announce: (msg, priority) => window.announce?.(msg, priority),

    // Focus trap for modals
    trapFocus: (element) => {
        const focusable = element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        element.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        });

        first?.focus();
    },

    // Accessible hide/show
    hide: (element) => {
        element.setAttribute('aria-hidden', 'true');
        element.setAttribute('inert', '');
    },

    show: (element) => {
        element.removeAttribute('aria-hidden');
        element.removeAttribute('inert');
    }
};
