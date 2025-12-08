/**
 * Testimonials Unit Tests
 * Tests for testimonials carousel component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Testimonials', () => {
    let Testimonials;

    beforeEach(async () => {
        vi.resetModules();
        vi.useFakeTimers();

        document.body.innerHTML = '';
        document.head.innerHTML = '';

        const module = await import('../../src/components/Testimonials.js');
        Testimonials = module.Testimonials;
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('Initialization', () => {
        it('creates container if not found', () => {
            document.body.innerHTML = `<div class="assets"></div>`;

            new Testimonials('testimonials');

            const container = document.getElementById('testimonials');
            expect(container).not.toBeNull();
        });

        it('uses existing container if found', () => {
            document.body.innerHTML = `<section id="testimonials"></section>`;

            const instance = new Testimonials('testimonials');

            expect(instance.container).toBe(document.getElementById('testimonials'));
        });

        it('starts at index 0', () => {
            document.body.innerHTML = `<section id="testimonials"></section>`;

            const instance = new Testimonials('testimonials');

            expect(instance.currentIndex).toBe(0);
        });

        it('starts not paused', () => {
            document.body.innerHTML = `<section id="testimonials"></section>`;

            const instance = new Testimonials('testimonials');

            expect(instance.isPaused).toBe(false);
        });

        it('starts autoplay on creation', () => {
            document.body.innerHTML = `<section id="testimonials"></section>`;

            const instance = new Testimonials('testimonials');

            expect(instance.autoPlayInterval).not.toBeNull();
        });
    });

    describe('Rendering', () => {
        let instance;

        beforeEach(() => {
            document.body.innerHTML = `<section id="testimonials"></section>`;
            instance = new Testimonials('testimonials');
        });

        it('renders panel header', () => {
            const header = instance.container.querySelector('.panel-header');
            expect(header).not.toBeNull();
        });

        it('renders panel title', () => {
            const title = instance.container.querySelector('.panel-title');
            expect(title.textContent).toBe('CLIENT TESTIMONIALS');
        });

        it('renders navigation buttons', () => {
            const prevBtn = instance.container.querySelector('#test-prev');
            const nextBtn = instance.container.querySelector('#test-next');

            expect(prevBtn).not.toBeNull();
            expect(nextBtn).not.toBeNull();
        });

        it('renders carousel track', () => {
            const track = instance.container.querySelector('#testimonials-track');
            expect(track).not.toBeNull();
        });

        it('renders all testimonial cards', () => {
            const cards = instance.container.querySelectorAll('.testimonial-card');
            expect(cards.length).toBe(5);
        });

        it('first card is active by default', () => {
            const firstCard = instance.container.querySelector('.testimonial-card');
            expect(firstCard.classList.contains('active')).toBe(true);
        });

        it('renders navigation dots', () => {
            const dots = instance.container.querySelectorAll('.dot');
            expect(dots.length).toBe(5);
        });

        it('first dot is active by default', () => {
            const firstDot = instance.container.querySelector('.dot');
            expect(firstDot.classList.contains('active')).toBe(true);
        });
    });

    describe('Testimonial Card Content', () => {
        let instance;

        beforeEach(() => {
            document.body.innerHTML = `<section id="testimonials"></section>`;
            instance = new Testimonials('testimonials');
        });

        it('displays quote text', () => {
            const quote = instance.container.querySelector('.testimonial-quote p');
            expect(quote.textContent).toContain('3 months ahead of schedule');
        });

        it('displays quote icon', () => {
            const icon = instance.container.querySelector('.quote-icon');
            expect(icon).not.toBeNull();
        });

        it('displays author name', () => {
            const name = instance.container.querySelector('.author-name');
            expect(name.textContent).toBe('Michael Chen');
        });

        it('displays author role', () => {
            const role = instance.container.querySelector('.author-role');
            expect(role.textContent).toBe('CTO, TechVentures Inc');
        });

        it('displays author initials as avatar', () => {
            const avatar = instance.container.querySelector('.author-avatar');
            expect(avatar.textContent).toBe('MC');
        });
    });

    describe('Navigation', () => {
        let instance;

        beforeEach(() => {
            document.body.innerHTML = `<section id="testimonials"></section>`;
            instance = new Testimonials('testimonials');
        });

        describe('next()', () => {
            it('advances to next testimonial', () => {
                instance.next();

                expect(instance.currentIndex).toBe(1);
            });

            it('wraps around to first at end', () => {
                instance.currentIndex = 4;
                instance.next();

                expect(instance.currentIndex).toBe(0);
            });

            it('updates track transform', () => {
                instance.next();

                const track = instance.container.querySelector('#testimonials-track');
                expect(track.style.transform).toBe('translateX(-100%)');
            });

            it('updates active card', () => {
                instance.next();

                const cards = instance.container.querySelectorAll('.testimonial-card');
                expect(cards[0].classList.contains('active')).toBe(false);
                expect(cards[1].classList.contains('active')).toBe(true);
            });

            it('updates active dot', () => {
                instance.next();

                const dots = instance.container.querySelectorAll('.dot');
                expect(dots[0].classList.contains('active')).toBe(false);
                expect(dots[1].classList.contains('active')).toBe(true);
            });
        });

        describe('prev()', () => {
            it('goes to previous testimonial', () => {
                instance.currentIndex = 2;
                instance.prev();

                expect(instance.currentIndex).toBe(1);
            });

            it('wraps around to last at beginning', () => {
                instance.prev();

                expect(instance.currentIndex).toBe(4);
            });

            it('updates track transform', () => {
                instance.currentIndex = 2;
                instance.prev();

                const track = instance.container.querySelector('#testimonials-track');
                expect(track.style.transform).toBe('translateX(-100%)');
            });
        });

        describe('goTo()', () => {
            it('goes to specific index', () => {
                instance.goTo(3);

                expect(instance.currentIndex).toBe(3);
            });

            it('updates display correctly', () => {
                instance.goTo(2);

                const track = instance.container.querySelector('#testimonials-track');
                expect(track.style.transform).toBe('translateX(-200%)');
            });
        });

        describe('Button clicks', () => {
            it('next button advances carousel', () => {
                const nextBtn = instance.container.querySelector('#test-next');
                nextBtn.click();

                expect(instance.currentIndex).toBe(1);
            });

            it('prev button goes back', () => {
                instance.currentIndex = 2;
                instance.updateDisplay();

                const prevBtn = instance.container.querySelector('#test-prev');
                prevBtn.click();

                expect(instance.currentIndex).toBe(1);
            });
        });

        describe('Dot clicks', () => {
            it('clicking dot navigates to that index', () => {
                const dots = instance.container.querySelectorAll('.dot');
                dots[3].click();

                expect(instance.currentIndex).toBe(3);
            });
        });
    });

    describe('AutoPlay', () => {
        let instance;

        beforeEach(() => {
            document.body.innerHTML = `<section id="testimonials"></section>`;
            instance = new Testimonials('testimonials');
        });

        it('advances every 5 seconds', () => {
            expect(instance.currentIndex).toBe(0);

            vi.advanceTimersByTime(5000);
            expect(instance.currentIndex).toBe(1);

            vi.advanceTimersByTime(5000);
            expect(instance.currentIndex).toBe(2);
        });

        it('pauses on mouseenter', () => {
            instance.container.dispatchEvent(new Event('mouseenter'));

            expect(instance.isPaused).toBe(true);
        });

        it('resumes on mouseleave', () => {
            instance.container.dispatchEvent(new Event('mouseenter'));
            instance.container.dispatchEvent(new Event('mouseleave'));

            expect(instance.isPaused).toBe(false);
        });

        it('does not advance when paused', () => {
            instance.container.dispatchEvent(new Event('mouseenter'));

            vi.advanceTimersByTime(5000);

            expect(instance.currentIndex).toBe(0);
        });

        it('resumes advancing after unpause', () => {
            instance.container.dispatchEvent(new Event('mouseenter'));
            vi.advanceTimersByTime(5000);

            instance.container.dispatchEvent(new Event('mouseleave'));
            vi.advanceTimersByTime(5000);

            expect(instance.currentIndex).toBe(1);
        });
    });

    describe('Styles', () => {
        it('adds styles to document', () => {
            document.body.innerHTML = `<section id="testimonials"></section>`;
            new Testimonials('testimonials');

            const styles = document.getElementById('testimonials-styles');
            expect(styles).not.toBeNull();
        });

        it('does not duplicate styles', () => {
            document.body.innerHTML = `<section id="testimonials"></section>`;
            new Testimonials('testimonials');
            new Testimonials('testimonials-2');

            const styles = document.querySelectorAll('#testimonials-styles');
            expect(styles.length).toBe(1);
        });

        it('includes carousel styles', () => {
            document.body.innerHTML = `<section id="testimonials"></section>`;
            new Testimonials('testimonials');

            const styles = document.getElementById('testimonials-styles');
            expect(styles.textContent).toContain('.testimonials-carousel');
        });

        it('includes mobile responsive styles', () => {
            document.body.innerHTML = `<section id="testimonials"></section>`;
            new Testimonials('testimonials');

            const styles = document.getElementById('testimonials-styles');
            expect(styles.textContent).toContain('@media (max-width: 768px)');
        });
    });

    describe('Container Creation', () => {
        it('creates panel after assets panel', () => {
            document.body.innerHTML = `
                <div class="grid">
                    <div class="assets">Assets</div>
                </div>
            `;

            new Testimonials('testimonials');

            const container = document.getElementById('testimonials');
            const assets = document.querySelector('.assets');

            expect(container.previousElementSibling).toBe(assets);
        });

        it('has correct class names', () => {
            document.body.innerHTML = `<div class="assets"></div>`;

            new Testimonials('testimonials');

            const container = document.getElementById('testimonials');
            expect(container.classList.contains('panel')).toBe(true);
            expect(container.classList.contains('testimonials-panel')).toBe(true);
        });
    });

    describe('destroy()', () => {
        it('stops autoplay interval', () => {
            document.body.innerHTML = `<section id="testimonials"></section>`;
            const instance = new Testimonials('testimonials');

            const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
            instance.destroy();

            expect(clearIntervalSpy).toHaveBeenCalled();
        });
    });

    describe('stopAutoPlay()', () => {
        it('clears interval', () => {
            document.body.innerHTML = `<section id="testimonials"></section>`;
            const instance = new Testimonials('testimonials');

            instance.stopAutoPlay();

            // Advance time - should not change index
            const indexBefore = instance.currentIndex;
            vi.advanceTimersByTime(10000);

            expect(instance.currentIndex).toBe(indexBefore);
        });

        it('handles null interval gracefully', () => {
            document.body.innerHTML = `<section id="testimonials"></section>`;
            const instance = new Testimonials('testimonials');
            instance.autoPlayInterval = null;

            expect(() => instance.stopAutoPlay()).not.toThrow();
        });
    });
});
