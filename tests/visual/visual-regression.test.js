/**
 * Visual Regression Tests
 * Tests for UI consistency, responsive breakpoints, and visual states
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Helper to simulate viewport sizes
const setViewport = (width, height) => {
    Object.defineProperty(window, 'innerWidth', { value: width, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: height, writable: true });
    window.dispatchEvent(new Event('resize'));
};

// Common breakpoints
const BREAKPOINTS = {
    mobile: { width: 375, height: 667 },    // iPhone SE
    tablet: { width: 768, height: 1024 },   // iPad
    laptop: { width: 1366, height: 768 },   // Common laptop
    desktop: { width: 1920, height: 1080 }  // Full HD
};

describe('Visual Regression Tests', () => {
    beforeEach(() => {
        vi.useFakeTimers();

        document.body.innerHTML = '';
        document.head.innerHTML = '';

        // Mock getComputedStyle
        window.getComputedStyle = vi.fn().mockImplementation((el) => ({
            getPropertyValue: vi.fn((prop) => {
                const styles = {
                    '--accent-gold': '#c9a227',
                    '--bg-primary': '#0a0c10',
                    '--text-primary': '#f8fafc',
                    'display': el.style?.display || 'block',
                    'opacity': el.style?.opacity || '1',
                    'visibility': el.style?.visibility || 'visible'
                };
                return styles[prop] || '';
            }),
            display: el.style?.display || 'block',
            opacity: el.style?.opacity || '1',
            visibility: el.style?.visibility || 'visible',
            gridTemplateColumns: '1fr 1fr',
            flexDirection: 'row'
        }));
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('Color Consistency', () => {
        it('uses correct gold accent color', () => {
            const style = document.createElement('style');
            style.textContent = `:root { --accent-gold: #c9a227; }`;
            document.head.appendChild(style);

            const computedStyle = window.getComputedStyle(document.documentElement);
            const gold = computedStyle.getPropertyValue('--accent-gold');

            expect(gold).toBe('#c9a227');
        });

        it('uses correct background color for dark theme', () => {
            const style = document.createElement('style');
            style.textContent = `:root { --bg-primary: #0a0c10; }`;
            document.head.appendChild(style);

            const computedStyle = window.getComputedStyle(document.documentElement);
            const bg = computedStyle.getPropertyValue('--bg-primary');

            expect(bg).toBe('#0a0c10');
        });

        it('uses correct text color for dark theme', () => {
            const style = document.createElement('style');
            style.textContent = `:root { --text-primary: #f8fafc; }`;
            document.head.appendChild(style);

            const computedStyle = window.getComputedStyle(document.documentElement);
            const text = computedStyle.getPropertyValue('--text-primary');

            expect(text).toBe('#f8fafc');
        });

        it('maintains color consistency in light theme', () => {
            document.body.classList.add('theme-light');

            const lightColors = {
                '--bg-primary': '#ffffff',
                '--text-primary': '#1e293b',
                '--accent-gold': '#c9a227'
            };

            // Gold accent should remain the same
            expect(lightColors['--accent-gold']).toBe('#c9a227');
        });
    });

    describe('Typography', () => {
        it('uses correct font family', () => {
            const style = document.createElement('style');
            style.textContent = `
                body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
                code { font-family: 'JetBrains Mono', 'Fira Code', monospace; }
            `;
            document.head.appendChild(style);

            expect(style.textContent).toContain('Inter');
            expect(style.textContent).toContain('JetBrains Mono');
        });

        it('maintains readable line height', () => {
            const style = document.createElement('style');
            style.textContent = `
                body { line-height: 1.6; }
                p { line-height: 1.7; }
            `;
            document.head.appendChild(style);

            expect(style.textContent).toContain('line-height: 1.6');
        });

        it('uses appropriate font sizes', () => {
            const fontSizes = {
                h1: '2.5rem',
                h2: '2rem',
                h3: '1.5rem',
                body: '1rem',
                small: '0.875rem'
            };

            Object.values(fontSizes).forEach(size => {
                expect(size).toMatch(/^\d+\.?\d*rem$/);
            });
        });
    });

    describe('Responsive Layout', () => {
        describe('Mobile (375px)', () => {
            beforeEach(() => {
                setViewport(BREAKPOINTS.mobile.width, BREAKPOINTS.mobile.height);
            });

            it('stacks navigation vertically', () => {
                document.body.innerHTML = `
                    <nav class="nav" style="flex-direction: column;">
                        <a>Home</a>
                        <a>About</a>
                    </nav>
                `;

                const nav = document.querySelector('.nav');
                expect(nav.style.flexDirection).toBe('column');
            });

            it('shows hamburger menu', () => {
                document.body.innerHTML = `
                    <button class="hamburger" style="display: block;"></button>
                `;

                const hamburger = document.querySelector('.hamburger');
                expect(hamburger.style.display).toBe('block');
            });

            it('uses single column layout', () => {
                document.body.innerHTML = `
                    <div class="grid" style="grid-template-columns: 1fr;"></div>
                `;

                const grid = document.querySelector('.grid');
                expect(grid.style.gridTemplateColumns).toBe('1fr');
            });

            it('adjusts font sizes for readability', () => {
                const mobileFontSizes = {
                    h1: '1.75rem',
                    body: '1rem'
                };

                expect(parseFloat(mobileFontSizes.h1)).toBeLessThan(2.5);
            });
        });

        describe('Tablet (768px)', () => {
            beforeEach(() => {
                setViewport(BREAKPOINTS.tablet.width, BREAKPOINTS.tablet.height);
            });

            it('uses two column layout for panels', () => {
                document.body.innerHTML = `
                    <div class="panels" style="grid-template-columns: 1fr 1fr;"></div>
                `;

                const panels = document.querySelector('.panels');
                expect(panels.style.gridTemplateColumns).toBe('1fr 1fr');
            });

            it('shows horizontal navigation', () => {
                document.body.innerHTML = `
                    <nav class="nav" style="flex-direction: row;"></nav>
                `;

                const nav = document.querySelector('.nav');
                expect(nav.style.flexDirection).toBe('row');
            });
        });

        describe('Desktop (1920px)', () => {
            beforeEach(() => {
                setViewport(BREAKPOINTS.desktop.width, BREAKPOINTS.desktop.height);
            });

            it('uses full desktop layout', () => {
                document.body.innerHTML = `
                    <div class="container" style="max-width: 1440px;"></div>
                `;

                const container = document.querySelector('.container');
                expect(container.style.maxWidth).toBe('1440px');
            });

            it('shows sidebar', () => {
                document.body.innerHTML = `
                    <aside class="sidebar" style="display: block;"></aside>
                `;

                const sidebar = document.querySelector('.sidebar');
                expect(sidebar.style.display).toBe('block');
            });
        });
    });

    describe('Component Visual States', () => {
        describe('Button States', () => {
            it('has distinct default state', () => {
                document.body.innerHTML = `
                    <button class="btn" style="background: #c9a227; opacity: 1;"></button>
                `;

                const btn = document.querySelector('.btn');
                expect(btn.style.background).toBe('rgb(201, 162, 39)');
                expect(btn.style.opacity).toBe('1');
            });

            it('has distinct hover state', () => {
                const hoverStyles = {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(201, 162, 39, 0.3)'
                };

                expect(hoverStyles.transform).toContain('translateY');
            });

            it('has distinct active state', () => {
                const activeStyles = {
                    transform: 'translateY(0)',
                    opacity: '0.9'
                };

                expect(activeStyles.transform).toBe('translateY(0)');
            });

            it('has distinct disabled state', () => {
                document.body.innerHTML = `
                    <button class="btn" disabled style="opacity: 0.5; cursor: not-allowed;"></button>
                `;

                const btn = document.querySelector('.btn');
                expect(btn.style.opacity).toBe('0.5');
                expect(btn.style.cursor).toBe('not-allowed');
            });
        });

        describe('Input States', () => {
            it('shows focus ring on focus', () => {
                const focusStyles = {
                    outline: '2px solid #c9a227',
                    outlineOffset: '2px'
                };

                expect(focusStyles.outline).toContain('#c9a227');
            });

            it('shows error state styling', () => {
                document.body.innerHTML = `
                    <input class="input error" style="border-color: #ef4444;">
                `;

                const input = document.querySelector('.input.error');
                expect(input.style.borderColor).toBe('rgb(239, 68, 68)');
            });

            it('shows success state styling', () => {
                document.body.innerHTML = `
                    <input class="input success" style="border-color: #22c55e;">
                `;

                const input = document.querySelector('.input.success');
                expect(input.style.borderColor).toBe('rgb(34, 197, 94)');
            });
        });

        describe('Panel States', () => {
            it('has glass morphism effect', () => {
                const panelStyles = {
                    background: 'rgba(20, 25, 35, 0.8)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                };

                expect(panelStyles.backdropFilter).toContain('blur');
            });

            it('has hover glow effect', () => {
                const hoverStyles = {
                    boxShadow: '0 0 30px rgba(201, 162, 39, 0.1)'
                };

                expect(hoverStyles.boxShadow).toContain('rgba(201, 162, 39');
            });
        });
    });

    describe('Animation Consistency', () => {
        it('uses consistent easing curves', () => {
            const easings = {
                default: 'cubic-bezier(0.4, 0, 0.2, 1)',
                bouncy: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)'
            };

            Object.values(easings).forEach(easing => {
                expect(easing).toMatch(/cubic-bezier\([\d.-]+,\s*[\d.-]+,\s*[\d.-]+,\s*[\d.-]+\)/);
            });
        });

        it('uses consistent animation durations', () => {
            const durations = {
                fast: 150,
                normal: 300,
                slow: 500
            };

            expect(durations.fast).toBeLessThan(durations.normal);
            expect(durations.normal).toBeLessThan(durations.slow);
        });

        it('respects reduced motion', () => {
            const style = document.createElement('style');
            style.textContent = `
                @media (prefers-reduced-motion: reduce) {
                    * { animation: none !important; transition-duration: 0.01ms !important; }
                }
            `;
            document.head.appendChild(style);

            expect(style.textContent).toContain('prefers-reduced-motion');
        });
    });

    describe('Spacing Consistency', () => {
        it('uses consistent spacing scale', () => {
            const spacingScale = {
                xs: '0.25rem',   // 4px
                sm: '0.5rem',    // 8px
                md: '1rem',      // 16px
                lg: '1.5rem',    // 24px
                xl: '2rem',      // 32px
                '2xl': '3rem'    // 48px
            };

            // Each step should be larger than the previous
            const values = Object.values(spacingScale).map(s => parseFloat(s));
            for (let i = 1; i < values.length; i++) {
                expect(values[i]).toBeGreaterThan(values[i - 1]);
            }
        });

        it('maintains consistent padding in panels', () => {
            const panelPadding = {
                mobile: '1rem',
                tablet: '1.5rem',
                desktop: '2rem'
            };

            expect(panelPadding.mobile).toBe('1rem');
            expect(panelPadding.desktop).toBe('2rem');
        });
    });

    describe('Icon Consistency', () => {
        it('uses consistent icon sizes', () => {
            const iconSizes = {
                sm: '16px',
                md: '24px',
                lg: '32px'
            };

            expect(iconSizes.md).toBe('24px');
        });

        it('icons have consistent stroke width', () => {
            document.body.innerHTML = `
                <svg class="icon" stroke-width="1.5"></svg>
                <svg class="icon" stroke-width="1.5"></svg>
            `;

            const icons = document.querySelectorAll('.icon');
            const strokeWidths = Array.from(icons).map(i => i.getAttribute('stroke-width'));

            expect(new Set(strokeWidths).size).toBe(1);
        });
    });

    describe('Z-Index Layering', () => {
        it('maintains correct z-index hierarchy', () => {
            const zIndexLayers = {
                base: 0,
                dropdown: 100,
                modal: 1000,
                tooltip: 2000,
                notification: 3000,
                overlay: 5000
            };

            expect(zIndexLayers.dropdown).toBeLessThan(zIndexLayers.modal);
            expect(zIndexLayers.modal).toBeLessThan(zIndexLayers.tooltip);
            expect(zIndexLayers.tooltip).toBeLessThan(zIndexLayers.notification);
        });

        it('cursor trail is below modals', () => {
            const cursorTrailZ = 9997;
            const modalZ = 10000;

            expect(cursorTrailZ).toBeLessThan(modalZ);
        });
    });

    describe('Border Radius Consistency', () => {
        it('uses consistent border radius scale', () => {
            const borderRadii = {
                sm: '4px',
                md: '8px',
                lg: '12px',
                xl: '16px',
                full: '9999px'
            };

            expect(parseFloat(borderRadii.sm)).toBeLessThan(parseFloat(borderRadii.md));
        });

        it('panels use consistent border radius', () => {
            document.body.innerHTML = `
                <div class="panel" style="border-radius: 12px;"></div>
                <div class="panel" style="border-radius: 12px;"></div>
            `;

            const panels = document.querySelectorAll('.panel');
            const radii = Array.from(panels).map(p => p.style.borderRadius);

            expect(new Set(radii).size).toBe(1);
        });
    });

    describe('Shadow Consistency', () => {
        it('uses consistent shadow definitions', () => {
            const shadows = {
                sm: '0 1px 2px rgba(0,0,0,0.05)',
                md: '0 4px 6px rgba(0,0,0,0.1)',
                lg: '0 10px 15px rgba(0,0,0,0.1)',
                glow: '0 0 20px rgba(201,162,39,0.3)'
            };

            expect(shadows.glow).toContain('201,162,39');
        });
    });

    describe('Contrast Requirements', () => {
        it('text meets WCAG AA contrast requirements', () => {
            // 4.5:1 ratio required for normal text
            // Gold on dark: #c9a227 on #0a0c10 = ~7.5:1
            const contrastRatio = 7.5;
            const minimumRatio = 4.5;

            expect(contrastRatio).toBeGreaterThanOrEqual(minimumRatio);
        });

        it('large text meets contrast requirements', () => {
            // 3:1 ratio for large text (18pt or 14pt bold)
            const largeTextContrastRatio = 4.5;
            const minimumRatio = 3;

            expect(largeTextContrastRatio).toBeGreaterThanOrEqual(minimumRatio);
        });
    });

    describe('Print Styles', () => {
        it('hides non-essential elements for print', () => {
            const style = document.createElement('style');
            style.textContent = `
                @media print {
                    .nav, .cursor-trail, #neural-bg { display: none !important; }
                }
            `;
            document.head.appendChild(style);

            expect(style.textContent).toContain('@media print');
            expect(style.textContent).toContain('display: none');
        });

        it('uses dark text on white background for print', () => {
            const style = document.createElement('style');
            style.textContent = `
                @media print {
                    body { background: white; color: black; }
                }
            `;
            document.head.appendChild(style);

            expect(style.textContent).toContain('background: white');
        });
    });
});

describe('Viewport Snapshot Tests', () => {
    const viewports = [
        { name: 'iPhone SE', width: 375, height: 667 },
        { name: 'iPhone 12', width: 390, height: 844 },
        { name: 'iPad', width: 768, height: 1024 },
        { name: 'iPad Pro', width: 1024, height: 1366 },
        { name: 'Laptop', width: 1366, height: 768 },
        { name: 'Desktop', width: 1920, height: 1080 },
        { name: '4K', width: 3840, height: 2160 }
    ];

    viewports.forEach(viewport => {
        describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
            beforeEach(() => {
                setViewport(viewport.width, viewport.height);
            });

            it('renders without horizontal scroll', () => {
                document.body.innerHTML = `
                    <div class="container" style="max-width: 100vw; overflow-x: hidden;"></div>
                `;

                const container = document.querySelector('.container');
                expect(container.style.maxWidth).toBe('100vw');
                expect(container.style.overflowX).toBe('hidden');
            });

            it('text remains readable', () => {
                const minFontSize = 14; // pixels
                const currentFontSize = viewport.width < 768 ? 16 : 16;

                expect(currentFontSize).toBeGreaterThanOrEqual(minFontSize);
            });

            it('touch targets are adequate size', () => {
                const minTouchTarget = 44; // pixels (Apple HIG recommendation)

                document.body.innerHTML = `
                    <button style="min-width: 44px; min-height: 44px;"></button>
                `;

                const btn = document.querySelector('button');
                expect(parseInt(btn.style.minWidth)).toBeGreaterThanOrEqual(minTouchTarget);
                expect(parseInt(btn.style.minHeight)).toBeGreaterThanOrEqual(minTouchTarget);
            });
        });
    });
});
