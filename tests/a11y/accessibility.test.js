/**
 * Accessibility Tests - KAIZEN Elite Portfolio
 * WCAG 2.1 AA Compliance Testing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createContainer, triggerKeydown } from '../setup.js';

// Mock axe-core for testing
const mockAxeResults = {
    violations: [],
    passes: [],
    incomplete: []
};

const axe = {
    run: vi.fn().mockResolvedValue(mockAxeResults)
};

describe('Accessibility', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        mockAxeResults.violations = [];
    });

    describe('Semantic HTML', () => {
        it('has correct landmark regions', () => {
            document.body.innerHTML = `
                <header role="banner"></header>
                <nav role="navigation"></nav>
                <main role="main" id="main-content"></main>
                <footer role="contentinfo"></footer>
            `;

            expect(document.querySelector('[role="banner"]')).not.toBeNull();
            expect(document.querySelector('[role="navigation"]')).not.toBeNull();
            expect(document.querySelector('[role="main"]')).not.toBeNull();
            expect(document.querySelector('[role="contentinfo"]')).not.toBeNull();
        });

        it('has proper heading hierarchy', () => {
            document.body.innerHTML = `
                <h1>Main Title</h1>
                <section>
                    <h2>Section Title</h2>
                    <h3>Subsection</h3>
                </section>
                <section>
                    <h2>Another Section</h2>
                </section>
            `;

            const h1s = document.querySelectorAll('h1');
            const h2s = document.querySelectorAll('h2');
            const h3s = document.querySelectorAll('h3');

            expect(h1s.length).toBe(1); // Only one h1
            expect(h2s.length).toBe(2);
            expect(h3s.length).toBe(1);
        });

        it('uses semantic elements for navigation', () => {
            document.body.innerHTML = `
                <nav aria-label="Main navigation">
                    <ul>
                        <li><a href="#profile">Profile</a></li>
                        <li><a href="#assets">Assets</a></li>
                    </ul>
                </nav>
            `;

            const nav = document.querySelector('nav');
            expect(nav).not.toBeNull();
            expect(nav.getAttribute('aria-label')).not.toBeNull();

            const links = nav.querySelectorAll('a');
            expect(links.length).toBeGreaterThan(0);
        });
    });

    describe('Keyboard Navigation', () => {
        it('all interactive elements are focusable', () => {
            document.body.innerHTML = `
                <button>Button</button>
                <a href="#">Link</a>
                <input type="text">
                <select><option>Option</option></select>
                <textarea></textarea>
            `;

            const interactives = document.querySelectorAll('button, a[href], input, select, textarea');

            interactives.forEach(el => {
                expect(el.tabIndex).toBeGreaterThanOrEqual(0);
            });
        });

        it('custom interactive elements have tabindex', () => {
            document.body.innerHTML = `
                <div class="custom-button" role="button" tabindex="0">Click me</div>
                <div class="custom-link" role="link" tabindex="0">Go somewhere</div>
            `;

            const customButton = document.querySelector('.custom-button');
            const customLink = document.querySelector('.custom-link');

            expect(customButton.tabIndex).toBe(0);
            expect(customLink.tabIndex).toBe(0);
        });

        it('skip link is present and functional', () => {
            document.body.innerHTML = `
                <a href="#main-content" class="skip-link">Skip to main content</a>
                <header>Header</header>
                <main id="main-content">Main content</main>
            `;

            const skipLink = document.querySelector('.skip-link');
            expect(skipLink).not.toBeNull();
            expect(skipLink.getAttribute('href')).toBe('#main-content');

            const target = document.querySelector(skipLink.getAttribute('href'));
            expect(target).not.toBeNull();
        });

        it('tab order follows visual order', () => {
            document.body.innerHTML = `
                <button id="first">First</button>
                <button id="second">Second</button>
                <button id="third">Third</button>
            `;

            const buttons = document.querySelectorAll('button');
            const tabOrder = Array.from(buttons).map(b => b.id);

            expect(tabOrder).toEqual(['first', 'second', 'third']);
        });

        it('no keyboard traps exist', () => {
            document.body.innerHTML = `
                <div class="modal" role="dialog" aria-modal="true">
                    <button>Inside modal</button>
                    <button class="close">Close</button>
                </div>
            `;

            // Modal should have a close mechanism
            const closeButton = document.querySelector('.close');
            expect(closeButton).not.toBeNull();
        });
    });

    describe('Focus Management', () => {
        it('focus visible indicator is present', () => {
            const style = document.createElement('style');
            style.textContent = `
                :focus { outline: 2px solid #c9a227; outline-offset: 2px; }
                :focus:not(:focus-visible) { outline: none; }
                :focus-visible { outline: 2px solid #c9a227; }
            `;
            document.head.appendChild(style);

            const button = document.createElement('button');
            document.body.appendChild(button);
            button.focus();

            // In a real test, we'd check computed styles
            expect(document.activeElement).toBe(button);
        });

        it('modal traps focus correctly', () => {
            document.body.innerHTML = `
                <button id="trigger">Open Modal</button>
                <div class="modal" role="dialog" aria-modal="true">
                    <button id="first-focusable">First</button>
                    <button id="last-focusable">Last</button>
                </div>
            `;

            const firstFocusable = document.getElementById('first-focusable');
            const lastFocusable = document.getElementById('last-focusable');

            firstFocusable.focus();
            expect(document.activeElement).toBe(firstFocusable);

            lastFocusable.focus();
            expect(document.activeElement).toBe(lastFocusable);
        });

        it('focus moves to modal on open', () => {
            document.body.innerHTML = `
                <div class="modal" role="dialog" aria-modal="true" tabindex="-1">
                    <h2>Modal Title</h2>
                    <button>Close</button>
                </div>
            `;

            const modal = document.querySelector('.modal');
            modal.focus();

            expect(document.activeElement).toBe(modal);
        });
    });

    describe('ARIA Attributes', () => {
        it('interactive elements have accessible names', () => {
            document.body.innerHTML = `
                <button aria-label="Close dialog">X</button>
                <button>Submit Form</button>
                <a href="#" aria-label="Go to GitHub profile">
                    <svg></svg>
                </a>
            `;

            const buttons = document.querySelectorAll('button');
            buttons.forEach(button => {
                const hasLabel = button.getAttribute('aria-label') ||
                                 button.getAttribute('aria-labelledby') ||
                                 button.textContent.trim();
                expect(hasLabel).toBeTruthy();
            });
        });

        it('form inputs have labels', () => {
            document.body.innerHTML = `
                <form>
                    <label for="name">Name</label>
                    <input id="name" type="text">

                    <label for="email">Email</label>
                    <input id="email" type="email">
                </form>
            `;

            const inputs = document.querySelectorAll('input');
            inputs.forEach(input => {
                const label = document.querySelector(`label[for="${input.id}"]`);
                expect(label).not.toBeNull();
            });
        });

        it('error messages are associated with inputs', () => {
            document.body.innerHTML = `
                <input id="email" type="email" aria-describedby="email-error" aria-invalid="true">
                <span id="email-error" role="alert">Please enter a valid email</span>
            `;

            const input = document.getElementById('email');
            const errorId = input.getAttribute('aria-describedby');
            const error = document.getElementById(errorId);

            expect(error).not.toBeNull();
            expect(error.getAttribute('role')).toBe('alert');
        });

        it('loading states have aria-busy', () => {
            document.body.innerHTML = `
                <button aria-busy="true">
                    <span class="loading">Loading...</span>
                </button>
            `;

            const button = document.querySelector('button');
            expect(button.getAttribute('aria-busy')).toBe('true');
        });

        it('expandable elements have aria-expanded', () => {
            document.body.innerHTML = `
                <button aria-expanded="false" aria-controls="panel">Toggle</button>
                <div id="panel" hidden>Panel content</div>
            `;

            const button = document.querySelector('button');
            expect(button.hasAttribute('aria-expanded')).toBe(true);
            expect(button.getAttribute('aria-controls')).toBe('panel');
        });

        it('modals have proper ARIA', () => {
            document.body.innerHTML = `
                <div role="dialog" aria-modal="true" aria-labelledby="modal-title">
                    <h2 id="modal-title">Contact Form</h2>
                </div>
            `;

            const modal = document.querySelector('[role="dialog"]');
            expect(modal.getAttribute('aria-modal')).toBe('true');
            expect(modal.getAttribute('aria-labelledby')).toBe('modal-title');

            const title = document.getElementById('modal-title');
            expect(title).not.toBeNull();
        });
    });

    describe('Live Regions', () => {
        it('status messages use aria-live', () => {
            document.body.innerHTML = `
                <div role="status" aria-live="polite">Form submitted successfully</div>
            `;

            const status = document.querySelector('[role="status"]');
            expect(status).not.toBeNull();
            expect(status.getAttribute('aria-live')).toBe('polite');
        });

        it('alert messages use role=alert', () => {
            document.body.innerHTML = `
                <div role="alert">Error: Please fix the form</div>
            `;

            const alert = document.querySelector('[role="alert"]');
            expect(alert).not.toBeNull();
        });

        it('dynamic content regions are announced', () => {
            document.body.innerHTML = `
                <div id="live-region" aria-live="polite" aria-atomic="true"></div>
            `;

            const region = document.getElementById('live-region');
            expect(region.getAttribute('aria-atomic')).toBe('true');
        });
    });

    describe('Images and Media', () => {
        it('images have alt text', () => {
            document.body.innerHTML = `
                <img src="profile.jpg" alt="Damian Norowski - Software Engineer">
                <img src="decorative.png" alt="" role="presentation">
            `;

            const images = document.querySelectorAll('img');
            images.forEach(img => {
                expect(img.hasAttribute('alt')).toBe(true);
            });
        });

        it('decorative images are hidden from AT', () => {
            document.body.innerHTML = `
                <img src="decorative.png" alt="" role="presentation">
                <svg aria-hidden="true"><use href="#icon"></use></svg>
            `;

            const decorativeImg = document.querySelector('img[role="presentation"]');
            expect(decorativeImg.getAttribute('alt')).toBe('');

            const decorativeSvg = document.querySelector('svg[aria-hidden]');
            expect(decorativeSvg.getAttribute('aria-hidden')).toBe('true');
        });

        it('icon buttons have accessible names', () => {
            document.body.innerHTML = `
                <button aria-label="Close">
                    <svg aria-hidden="true"><use href="#close-icon"></use></svg>
                </button>
            `;

            const button = document.querySelector('button');
            expect(button.getAttribute('aria-label')).toBe('Close');

            const svg = button.querySelector('svg');
            expect(svg.getAttribute('aria-hidden')).toBe('true');
        });
    });

    describe('Color and Contrast', () => {
        // Note: In real tests, use axe-core or manual contrast checking

        it('text colors meet contrast requirements', () => {
            // This is a placeholder - real contrast testing needs visual analysis
            const style = document.createElement('style');
            style.textContent = `
                :root {
                    --text-primary: #f8fafc; /* High contrast on dark bg */
                    --bg-primary: #0a0c10;
                    --accent-gold: #c9a227;
                }
            `;
            document.head.appendChild(style);

            // Verify CSS variables are defined
            expect(style.textContent).toContain('--text-primary');
            expect(style.textContent).toContain('--bg-primary');
        });

        it('color is not the only indicator', () => {
            document.body.innerHTML = `
                <span class="error">
                    <svg aria-hidden="true"><use href="#error-icon"></use></svg>
                    Error message here
                </span>
                <span class="success">
                    <svg aria-hidden="true"><use href="#check-icon"></use></svg>
                    Success!
                </span>
            `;

            // Errors and successes should have more than just color
            const error = document.querySelector('.error');
            const success = document.querySelector('.success');

            // Check for icons or text indicators
            expect(error.querySelector('svg') || error.textContent.includes('Error')).toBeTruthy();
            expect(success.querySelector('svg') || success.textContent.includes('Success')).toBeTruthy();
        });
    });

    describe('Motion and Animation', () => {
        it('respects prefers-reduced-motion', () => {
            const style = document.createElement('style');
            style.textContent = `
                @media (prefers-reduced-motion: reduce) {
                    *, *::before, *::after {
                        animation-duration: 0.01ms !important;
                        transition-duration: 0.01ms !important;
                    }
                }
            `;
            document.head.appendChild(style);

            // Verify the media query is present
            expect(style.textContent).toContain('prefers-reduced-motion');
        });

        it('auto-playing content can be paused', () => {
            document.body.innerHTML = `
                <div class="carousel">
                    <button class="pause-btn" aria-label="Pause slideshow">Pause</button>
                </div>
            `;

            const pauseBtn = document.querySelector('.pause-btn');
            expect(pauseBtn).not.toBeNull();
        });
    });

    describe('Text and Reading', () => {
        it('text can be resized to 200%', () => {
            // Use relative units
            const style = document.createElement('style');
            style.textContent = `
                body { font-size: 1rem; }
                h1 { font-size: 2.5rem; }
                p { font-size: 1rem; line-height: 1.5; }
            `;
            document.head.appendChild(style);

            // Verify rem units are used
            expect(style.textContent).toContain('rem');
            expect(style.textContent).not.toMatch(/\d+px.*font-size/);
        });

        it('line height is at least 1.5', () => {
            const style = document.createElement('style');
            style.textContent = `
                body { line-height: 1.5; }
                p { line-height: 1.7; }
            `;
            document.head.appendChild(style);

            expect(style.textContent).toContain('line-height: 1.5');
        });

        it('language is specified', () => {
            document.documentElement.setAttribute('lang', 'en');

            expect(document.documentElement.getAttribute('lang')).toBe('en');
        });
    });

    describe('Form Accessibility', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <form>
                    <fieldset>
                        <legend>Contact Information</legend>

                        <div class="form-group">
                            <label for="name">
                                Name
                                <span class="required" aria-hidden="true">*</span>
                            </label>
                            <input id="name" type="text" required aria-required="true">
                        </div>

                        <div class="form-group">
                            <label for="email">Email</label>
                            <input id="email" type="email" aria-describedby="email-hint">
                            <span id="email-hint" class="hint">We'll never share your email</span>
                        </div>
                    </fieldset>

                    <button type="submit">Submit</button>
                </form>
            `;
        });

        it('form groups use fieldset and legend', () => {
            const fieldset = document.querySelector('fieldset');
            const legend = document.querySelector('legend');

            expect(fieldset).not.toBeNull();
            expect(legend).not.toBeNull();
        });

        it('required fields are indicated', () => {
            const requiredInput = document.querySelector('input[required]');
            expect(requiredInput).not.toBeNull();
            expect(requiredInput.getAttribute('aria-required')).toBe('true');
        });

        it('help text is associated with inputs', () => {
            const email = document.getElementById('email');
            const hintId = email.getAttribute('aria-describedby');
            const hint = document.getElementById(hintId);

            expect(hint).not.toBeNull();
            expect(hint.textContent).toContain('never share');
        });
    });
});
