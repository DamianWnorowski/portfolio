/**
 * Testimonials Carousel
 * Auto-rotating testimonials from clients/colleagues
 */

const TESTIMONIALS = [
    {
        quote: "Delivered 3 months ahead of schedule with zero critical bugs. The architecture he designed scaled to 10x our initial projections without modification.",
        author: "Michael Chen",
        role: "CTO, TechVentures Inc",
        avatar: null
    },
    {
        quote: "Damian's AI agent reduced our code review time by 60%. His technical depth combined with clear communication made him invaluable to our team.",
        author: "Sarah Rodriguez",
        role: "VP Engineering, DataFlow",
        avatar: null
    },
    {
        quote: "The fleet management system he built handles $1.2M in logistics daily. Uptime has been 99.99% since launch - exactly as promised.",
        author: "James Wilson",
        role: "Operations Director, LogiCore",
        avatar: null
    },
    {
        quote: "Working with Damian felt like having a senior architect and a full dev team combined. His output velocity is unlike anything I've seen.",
        author: "Emily Park",
        role: "Product Manager, StartupXYZ",
        avatar: null
    },
    {
        quote: "He didn't just build what we asked for - he identified issues we hadn't considered and solved them proactively. True engineering leadership.",
        author: "David Thompson",
        role: "Founder, InnovateTech",
        avatar: null
    }
];

export class Testimonials {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            this.createContainer();
        }

        this.currentIndex = 0;
        this.autoPlayInterval = null;
        this.isPaused = false;

        this.render();
        this.startAutoPlay();
    }

    createContainer() {
        // Find insertion point (after assets panel or in main grid)
        const assetsPanel = document.querySelector('.assets');
        if (assetsPanel) {
            this.container = document.createElement('section');
            this.container.id = 'testimonials';
            this.container.className = 'panel testimonials-panel';
            assetsPanel.parentNode.insertBefore(this.container, assetsPanel.nextSibling);
        }
    }

    render() {
        this.container.innerHTML = `
            <div class="panel-header">
                <span class="panel-title">CLIENT TESTIMONIALS</span>
                <div class="testimonial-controls">
                    <button class="test-btn" id="test-prev">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M15 18l-6-6 6-6"/>
                        </svg>
                    </button>
                    <button class="test-btn" id="test-next">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 18l6-6-6-6"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="testimonials-carousel">
                <div class="testimonials-track" id="testimonials-track">
                    ${TESTIMONIALS.map((t, i) => this.renderTestimonial(t, i)).join('')}
                </div>
            </div>
            <div class="testimonials-dots" id="testimonials-dots">
                ${TESTIMONIALS.map((_, i) => `
                    <button class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></button>
                `).join('')}
            </div>
        `;

        this.addStyles();
        this.bindEvents();
    }

    renderTestimonial(testimonial, index) {
        const initials = testimonial.author.split(' ').map(n => n[0]).join('');

        return `
            <div class="testimonial-card ${index === 0 ? 'active' : ''}" data-index="${index}">
                <div class="testimonial-quote">
                    <svg class="quote-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>
                    </svg>
                    <p>${testimonial.quote}</p>
                </div>
                <div class="testimonial-author">
                    <div class="author-avatar">${initials}</div>
                    <div class="author-info">
                        <span class="author-name">${testimonial.author}</span>
                        <span class="author-role">${testimonial.role}</span>
                    </div>
                </div>
            </div>
        `;
    }

    addStyles() {
        if (document.getElementById('testimonials-styles')) return;

        const style = document.createElement('style');
        style.id = 'testimonials-styles';
        style.textContent = `
            .testimonials-panel {
                grid-column: span 2;
                min-height: 200px;
            }

            .testimonial-controls {
                display: flex;
                gap: 8px;
            }

            .test-btn {
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: transparent;
                border: 1px solid var(--border-primary);
                color: var(--text-muted);
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .test-btn:hover {
                background: var(--accent-gold);
                border-color: var(--accent-gold);
                color: var(--bg-primary);
            }

            .testimonials-carousel {
                flex: 1;
                overflow: hidden;
                position: relative;
            }

            .testimonials-track {
                display: flex;
                transition: transform 0.5s ease;
            }

            .testimonial-card {
                min-width: 100%;
                padding: 30px;
                opacity: 0.3;
                transform: scale(0.95);
                transition: all 0.5s ease;
            }

            .testimonial-card.active {
                opacity: 1;
                transform: scale(1);
            }

            .testimonial-quote {
                position: relative;
                margin-bottom: 20px;
            }

            .quote-icon {
                position: absolute;
                top: -10px;
                left: -10px;
                color: var(--accent-gold);
                opacity: 0.3;
            }

            .testimonial-quote p {
                font-size: 1rem;
                line-height: 1.7;
                color: var(--text-secondary);
                font-style: italic;
                padding-left: 20px;
            }

            .testimonial-author {
                display: flex;
                align-items: center;
                gap: 15px;
                padding-left: 20px;
            }

            .author-avatar {
                width: 48px;
                height: 48px;
                background: linear-gradient(135deg, var(--accent-blue), var(--accent-gold));
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                font-size: 0.9rem;
                color: var(--bg-primary);
            }

            .author-info {
                display: flex;
                flex-direction: column;
            }

            .author-name {
                font-weight: 600;
                font-size: 0.9rem;
            }

            .author-role {
                font-size: 0.75rem;
                color: var(--text-muted);
            }

            .testimonials-dots {
                display: flex;
                justify-content: center;
                gap: 8px;
                padding: 15px;
            }

            .dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: var(--border-primary);
                border: none;
                cursor: pointer;
                transition: all 0.3s;
            }

            .dot.active {
                background: var(--accent-gold);
                transform: scale(1.2);
            }

            .dot:hover {
                background: var(--accent-blue);
            }

            @media (max-width: 768px) {
                .testimonials-panel {
                    grid-column: 1;
                }

                .testimonial-quote p {
                    font-size: 0.9rem;
                }
            }
        `;
        document.head.appendChild(style);
    }

    bindEvents() {
        const prevBtn = this.container.querySelector('#test-prev');
        const nextBtn = this.container.querySelector('#test-next');
        const dots = this.container.querySelectorAll('.dot');

        prevBtn?.addEventListener('click', () => this.prev());
        nextBtn?.addEventListener('click', () => this.next());

        dots.forEach(dot => {
            dot.addEventListener('click', () => {
                this.goTo(parseInt(dot.dataset.index));
            });
        });

        // Pause on hover
        this.container.addEventListener('mouseenter', () => {
            this.isPaused = true;
        });

        this.container.addEventListener('mouseleave', () => {
            this.isPaused = false;
        });
    }

    goTo(index) {
        this.currentIndex = index;
        this.updateDisplay();
    }

    next() {
        this.currentIndex = (this.currentIndex + 1) % TESTIMONIALS.length;
        this.updateDisplay();
    }

    prev() {
        this.currentIndex = (this.currentIndex - 1 + TESTIMONIALS.length) % TESTIMONIALS.length;
        this.updateDisplay();
    }

    updateDisplay() {
        const track = this.container.querySelector('#testimonials-track');
        const cards = this.container.querySelectorAll('.testimonial-card');
        const dots = this.container.querySelectorAll('.dot');

        // Move track
        track.style.transform = `translateX(-${this.currentIndex * 100}%)`;

        // Update active states
        cards.forEach((card, i) => {
            card.classList.toggle('active', i === this.currentIndex);
        });

        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === this.currentIndex);
        });
    }

    startAutoPlay() {
        this.autoPlayInterval = setInterval(() => {
            if (!this.isPaused) {
                this.next();
            }
        }, 5000);
    }

    stopAutoPlay() {
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
        }
    }

    destroy() {
        this.stopAutoPlay();
    }
}
