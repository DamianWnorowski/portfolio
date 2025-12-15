/**
 * Scroll-triggered animations using Intersection Observer
 * Adds smooth fade-in effects as elements enter viewport
 */

export class ScrollAnimations {
    constructor(options = {}) {
        this.options = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px',
            animationClass: 'animate-in',
            ...options
        };

        this.observer = null;
        this.init();
    }

    init() {
        // Add base styles
        this.addStyles();

        // Create observer
        this.observer = new IntersectionObserver(
            this.handleIntersect.bind(this),
            {
                threshold: this.options.threshold,
                rootMargin: this.options.rootMargin
            }
        );

        // Observe elements
        this.observeElements();
    }

    addStyles() {
        if (document.getElementById('scroll-animation-styles')) return;

        const style = document.createElement('style');
        style.id = 'scroll-animation-styles';
        style.textContent = `
            /* Base state - hidden */
            [data-animate] {
                opacity: 0;
                transform: translateY(30px);
                transition: opacity 0.6s ease, transform 0.6s ease;
            }

            /* Animated in */
            [data-animate].animate-in {
                opacity: 1;
                transform: translateY(0);
            }

            /* Animation variants */
            [data-animate="fade-up"] {
                transform: translateY(30px);
            }

            [data-animate="fade-down"] {
                transform: translateY(-30px);
            }

            [data-animate="fade-left"] {
                transform: translateX(30px);
            }

            [data-animate="fade-right"] {
                transform: translateX(-30px);
            }

            [data-animate="scale"] {
                transform: scale(0.9);
            }

            [data-animate="scale"].animate-in {
                transform: scale(1);
            }

            [data-animate="fade-left"].animate-in,
            [data-animate="fade-right"].animate-in {
                transform: translateX(0);
            }

            /* Staggered delays */
            [data-animate-delay="1"] { transition-delay: 0.1s; }
            [data-animate-delay="2"] { transition-delay: 0.2s; }
            [data-animate-delay="3"] { transition-delay: 0.3s; }
            [data-animate-delay="4"] { transition-delay: 0.4s; }
            [data-animate-delay="5"] { transition-delay: 0.5s; }
            [data-animate-delay="6"] { transition-delay: 0.6s; }

            /* Glitch effect on animate */
            [data-animate="glitch"].animate-in {
                animation: glitch-in 0.4s ease forwards;
            }

            @keyframes glitch-in {
                0% {
                    opacity: 0;
                    transform: translateX(-5px);
                    filter: blur(2px);
                }
                20% {
                    opacity: 0.5;
                    transform: translateX(3px);
                }
                40% {
                    opacity: 0.7;
                    transform: translateX(-2px);
                }
                60% {
                    opacity: 0.9;
                    transform: translateX(1px);
                    filter: blur(0);
                }
                100% {
                    opacity: 1;
                    transform: translateX(0);
                }
            }

            /* Typewriter reveal */
            [data-animate="typewriter"] {
                opacity: 1;
                transform: none;
            }

            [data-animate="typewriter"]::after {
                content: '';
                position: absolute;
                right: 0;
                top: 0;
                bottom: 0;
                width: 100%;
                background: var(--bg-panel, #0d1117);
                transition: width 0.8s steps(20);
            }

            [data-animate="typewriter"].animate-in::after {
                width: 0;
            }
        `;
        document.head.appendChild(style);
    }

    observeElements() {
        // Find all elements with data-animate attribute
        const elements = document.querySelectorAll('[data-animate]');
        elements.forEach(el => this.observer.observe(el));

        // Auto-add to common elements if not already marked
        this.autoMarkElements();
    }

    autoMarkElements() {
        // Asset cards
        document.querySelectorAll('.asset-card').forEach((el, i) => {
            if (!el.hasAttribute('data-animate')) {
                el.setAttribute('data-animate', 'fade-up');
                el.setAttribute('data-animate-delay', String(Math.min(i + 1, 6)));
                this.observer.observe(el);
            }
        });

        // Skill items
        document.querySelectorAll('.skill-item').forEach((el, i) => {
            if (!el.hasAttribute('data-animate')) {
                el.setAttribute('data-animate', 'fade-left');
                el.setAttribute('data-animate-delay', String(Math.min(i + 1, 6)));
                this.observer.observe(el);
            }
        });

        // Stat cards
        document.querySelectorAll('.stat-card, .insight-card').forEach((el, i) => {
            if (!el.hasAttribute('data-animate')) {
                el.setAttribute('data-animate', 'scale');
                el.setAttribute('data-animate-delay', String(Math.min(i + 1, 6)));
                this.observer.observe(el);
            }
        });

        // Panels
        document.querySelectorAll('.panel').forEach((el, i) => {
            if (!el.hasAttribute('data-animate')) {
                el.setAttribute('data-animate', 'fade-up');
                el.setAttribute('data-animate-delay', String(Math.min(i + 1, 4)));
                this.observer.observe(el);
            }
        });
    }

    handleIntersect(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add(this.options.animationClass);
                // Optionally unobserve after animation
                // this.observer.unobserve(entry.target);
            }
        });
    }

    // Manually trigger animation on an element
    animate(element) {
        element.classList.add(this.options.animationClass);
    }

    // Reset element to pre-animation state
    reset(element) {
        element.classList.remove(this.options.animationClass);
    }

    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }
}

// Auto-initialize
export const scrollAnimations = typeof document !== 'undefined'
    ? new ScrollAnimations()
    : null;
