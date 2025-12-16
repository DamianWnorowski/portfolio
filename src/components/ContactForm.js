/**
 * Contact Form Component
 * Working contact form with validation
 */

import { eventBus, Events } from '../core/EventBus.js';
import { audioService } from '../services/AudioService.js';

export class ContactForm {
    constructor() {
        this.isSubmitting = false;
        this.create();
        this.bindEvents();
    }

    create() {
        // Replace the simple acquisition modal content
        const modalBody = document.querySelector('#acquisition-modal .modal-body');
        if (!modalBody) return;

        modalBody.innerHTML = `
            <div class="contact-tabs">
                <button class="tab-btn active" data-tab="quick">QUICK CONTACT</button>
                <button class="tab-btn" data-tab="form">DETAILED FORM</button>
            </div>

            <div class="tab-content active" id="tab-quick">
                <div class="acquisition-options">
                    <a href="https://calendly.com/damianwnorowski" target="_blank" class="acq-option">
                        <div class="acq-icon">CAL</div>
                        <div class="acq-text">
                            <span class="acq-title">SCHEDULE BRIEFING</span>
                            <span class="acq-desc">30-min strategy call</span>
                        </div>
                    </a>
                    <a href="mailto:damian@kaizen.dev" class="acq-option">
                        <div class="acq-icon">MSG</div>
                        <div class="acq-text">
                            <span class="acq-title">DIRECT EMAIL</span>
                            <span class="acq-desc">damian@kaizen.dev</span>
                        </div>
                    </a>
                    <a href="/resume.pdf" target="_blank" class="acq-option">
                        <div class="acq-icon">DOC</div>
                        <div class="acq-text">
                            <span class="acq-title">DOWNLOAD DOSSIER</span>
                            <span class="acq-desc">Full resume (PDF)</span>
                        </div>
                    </a>
                </div>
            </div>

            <div class="tab-content" id="tab-form">
                <form id="contact-form" class="contact-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="contact-name">NAME *</label>
                            <input type="text" id="contact-name" name="name" required
                                   placeholder="Your name">
                        </div>
                        <div class="form-group">
                            <label for="contact-email">EMAIL *</label>
                            <input type="email" id="contact-email" name="email" required
                                   placeholder="your@email.com">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="contact-company">COMPANY</label>
                            <input type="text" id="contact-company" name="company"
                                   placeholder="Your company">
                        </div>
                        <div class="form-group">
                            <label for="contact-type">INQUIRY TYPE</label>
                            <select id="contact-type" name="type">
                                <option value="hiring">Full-time Position</option>
                                <option value="contract">Contract Work</option>
                                <option value="consulting">Consulting</option>
                                <option value="collaboration">Collaboration</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="contact-message">MESSAGE *</label>
                        <textarea id="contact-message" name="message" rows="5" required
                                  placeholder="Tell me about your project or opportunity..."></textarea>
                    </div>

                    <div class="form-footer">
                        <div class="form-note">
                            <span class="note-icon">*</span>
                            Response within 24 hours
                        </div>
                        <button type="submit" class="submit-btn" id="submit-btn">
                            <span class="btn-text">TRANSMIT MESSAGE</span>
                            <span class="btn-loading">SENDING...</span>
                        </button>
                    </div>

                    <div class="form-status" id="form-status"></div>
                </form>
            </div>
        `;

        this.addStyles();
    }

    addStyles() {
        if (document.getElementById('contact-form-styles')) return;

        const style = document.createElement('style');
        style.id = 'contact-form-styles';
        style.textContent = `
            .contact-tabs {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
            }

            .tab-btn {
                flex: 1;
                padding: 12px;
                background: var(--bg-secondary);
                border: 1px solid var(--border-primary);
                color: var(--text-muted);
                font-family: var(--font-mono);
                font-size: 0.7rem;
                letter-spacing: 1px;
                cursor: pointer;
                transition: all 0.2s;
                border-radius: 4px;
            }

            .tab-btn:hover {
                border-color: var(--accent-blue);
                color: var(--text-primary);
            }

            .tab-btn.active {
                background: var(--accent-gold);
                border-color: var(--accent-gold);
                color: var(--bg-primary);
            }

            .tab-content {
                display: none;
            }

            .tab-content.active {
                display: block;
            }

            .contact-form {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }

            .form-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
            }

            .form-group {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .form-group label {
                font-family: var(--font-mono);
                font-size: 0.65rem;
                color: var(--text-muted);
                letter-spacing: 1px;
            }

            .form-group input,
            .form-group select,
            .form-group textarea {
                background: var(--bg-secondary);
                border: 1px solid var(--border-primary);
                border-radius: 4px;
                padding: 12px;
                color: var(--text-primary);
                font-family: var(--font-display);
                font-size: 0.9rem;
                transition: all 0.2s;
            }

            .form-group input:focus,
            .form-group select:focus,
            .form-group textarea:focus {
                outline: none;
                border-color: var(--accent-gold);
                box-shadow: 0 0 0 2px var(--accent-gold-dim);
            }

            .form-group input::placeholder,
            .form-group textarea::placeholder {
                color: var(--text-muted);
            }

            .form-group select {
                cursor: pointer;
            }

            .form-group textarea {
                resize: vertical;
                min-height: 100px;
            }

            .form-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .form-note {
                font-size: 0.75rem;
                color: var(--text-muted);
                display: flex;
                align-items: center;
                gap: 5px;
            }

            .note-icon {
                color: var(--accent-gold);
            }

            .submit-btn {
                padding: 12px 30px;
                background: var(--accent-gold);
                border: none;
                border-radius: 4px;
                color: var(--bg-primary);
                font-family: var(--font-mono);
                font-size: 0.8rem;
                font-weight: 600;
                letter-spacing: 1px;
                cursor: pointer;
                transition: all 0.2s;
                position: relative;
            }

            .submit-btn:hover {
                transform: translateY(-2px);
                box-shadow: var(--shadow-glow-gold);
            }

            .submit-btn:disabled {
                opacity: 0.7;
                cursor: not-allowed;
                transform: none;
            }

            .submit-btn .btn-loading {
                display: none;
            }

            .submit-btn.loading .btn-text {
                display: none;
            }

            .submit-btn.loading .btn-loading {
                display: inline;
            }

            .form-status {
                text-align: center;
                padding: 15px;
                border-radius: 4px;
                font-size: 0.85rem;
                display: none;
            }

            .form-status.success {
                display: block;
                background: var(--success-dim);
                color: var(--success);
                border: 1px solid var(--success);
            }

            .form-status.error {
                display: block;
                background: var(--error-dim);
                color: var(--error);
                border: 1px solid var(--error);
            }

            @media (max-width: 600px) {
                .form-row {
                    grid-template-columns: 1fr;
                }

                .form-footer {
                    flex-direction: column;
                    gap: 15px;
                }

                .submit-btn {
                    width: 100%;
                }
            }
        `;
        document.head.appendChild(style);
    }

    bindEvents() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;

                // Update buttons
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update content
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                document.getElementById(`tab-${tab}`)?.classList.add('active');

                audioService.play('key');
            });
        });

        // Form submission
        const form = document.getElementById('contact-form');
        form?.addEventListener('submit', (e) => this.handleSubmit(e));

        // Input sounds
        form?.querySelectorAll('input, textarea').forEach(input => {
            input.addEventListener('keydown', () => {
                if (Math.random() > 0.7) { // Don't play every keystroke
                    audioService.play('key');
                }
            });
        });
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (this.isSubmitting) return;

        const form = e.target;
        const submitBtn = document.getElementById('submit-btn');
        const status = document.getElementById('form-status');

        // Get form data
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Validate
        if (!data.name || !data.email || !data.message) {
            this.showStatus('error', 'Please fill in all required fields.');
            return;
        }

        // Submit
        this.isSubmitting = true;
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        status.className = 'form-status';

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                this.showStatus('success', result.message || 'Message sent successfully!');
                form.reset();
                audioService.play('success');
                eventBus.emit('contact:sent', data);
            } else {
                this.showStatus('error', result.error || 'Failed to send message.');
                audioService.play('error');
            }
        } catch (error) {
            const isDev = import.meta.env?.DEV ?? false;
            if (isDev) console.error('[ContactForm] Submit error:', error);
            this.showStatus('error', 'Network error. Please try again or email directly.');
            audioService.play('error');
        } finally {
            this.isSubmitting = false;
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    }

    showStatus(type, message) {
        const status = document.getElementById('form-status');
        if (status) {
            status.className = `form-status ${type}`;
            status.textContent = message;
        }
    }
}
