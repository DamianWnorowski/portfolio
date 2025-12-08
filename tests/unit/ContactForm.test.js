/**
 * ContactForm Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createContainer, mockFetch, mockFetchError, wait } from '../setup.js';

// Simplified ContactForm for testing
class ContactForm {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            this.container = createContainer(containerId);
        }

        this.isSubmitting = false;
        this.render();
        this.bindEvents();
    }

    render() {
        this.container.innerHTML = `
            <form class="contact-form" novalidate>
                <div class="form-group">
                    <label for="contact-name">Name</label>
                    <input type="text" id="contact-name" name="name" required
                           aria-describedby="name-error" autocomplete="name">
                    <span id="name-error" class="error-message" role="alert"></span>
                </div>
                <div class="form-group">
                    <label for="contact-email">Email</label>
                    <input type="email" id="contact-email" name="email" required
                           aria-describedby="email-error" autocomplete="email">
                    <span id="email-error" class="error-message" role="alert"></span>
                </div>
                <div class="form-group">
                    <label for="contact-message">Message</label>
                    <textarea id="contact-message" name="message" required rows="4"
                              aria-describedby="message-error"></textarea>
                    <span id="message-error" class="error-message" role="alert"></span>
                </div>
                <button type="submit" class="submit-btn" aria-busy="false">
                    <span class="btn-text">Send Message</span>
                    <span class="btn-loading hidden">Sending...</span>
                </button>
                <div class="form-status" role="status" aria-live="polite"></div>
            </form>
        `;

        this.form = this.container.querySelector('form');
        this.nameInput = this.container.querySelector('#contact-name');
        this.emailInput = this.container.querySelector('#contact-email');
        this.messageInput = this.container.querySelector('#contact-message');
        this.submitBtn = this.container.querySelector('.submit-btn');
        this.statusEl = this.container.querySelector('.form-status');
    }

    bindEvents() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Real-time validation
        this.nameInput.addEventListener('blur', () => this.validateField('name'));
        this.emailInput.addEventListener('blur', () => this.validateField('email'));
        this.messageInput.addEventListener('blur', () => this.validateField('message'));
    }

    validateField(fieldName) {
        const input = this.container.querySelector(`#contact-${fieldName}`);
        const errorEl = this.container.querySelector(`#${fieldName}-error`);
        let error = '';

        switch (fieldName) {
            case 'name':
                if (!input.value.trim()) {
                    error = 'Name is required';
                } else if (input.value.trim().length < 2) {
                    error = 'Name must be at least 2 characters';
                }
                break;

            case 'email':
                if (!input.value.trim()) {
                    error = 'Email is required';
                } else if (!this.isValidEmail(input.value)) {
                    error = 'Please enter a valid email';
                }
                break;

            case 'message':
                if (!input.value.trim()) {
                    error = 'Message is required';
                } else if (input.value.trim().length < 10) {
                    error = 'Message must be at least 10 characters';
                }
                break;
        }

        errorEl.textContent = error;
        input.setAttribute('aria-invalid', error ? 'true' : 'false');

        return !error;
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    validateAll() {
        const nameValid = this.validateField('name');
        const emailValid = this.validateField('email');
        const messageValid = this.validateField('message');

        return nameValid && emailValid && messageValid;
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (this.isSubmitting) return;

        if (!this.validateAll()) {
            return;
        }

        this.setSubmitting(true);

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: this.nameInput.value.trim(),
                    email: this.emailInput.value.trim(),
                    message: this.messageInput.value.trim()
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            this.showSuccess();
            this.form.reset();

        } catch (error) {
            this.showError(error.message);
        } finally {
            this.setSubmitting(false);
        }
    }

    setSubmitting(submitting) {
        this.isSubmitting = submitting;
        this.submitBtn.disabled = submitting;
        this.submitBtn.setAttribute('aria-busy', submitting);
        this.submitBtn.querySelector('.btn-text').classList.toggle('hidden', submitting);
        this.submitBtn.querySelector('.btn-loading').classList.toggle('hidden', !submitting);
    }

    showSuccess() {
        this.statusEl.className = 'form-status success';
        this.statusEl.textContent = 'Message sent successfully!';
    }

    showError(message) {
        this.statusEl.className = 'form-status error';
        this.statusEl.textContent = message || 'Failed to send message. Please try again.';
    }

    destroy() {
        this.container.innerHTML = '';
    }
}

describe('ContactForm', () => {
    let form;
    let container;

    beforeEach(() => {
        container = createContainer('contact-form');
        form = new ContactForm('contact-form');
    });

    afterEach(() => {
        form?.destroy();
        container?.remove();
    });

    describe('Rendering', () => {
        it('renders without crashing', () => {
            expect(form.form).not.toBeNull();
        });

        it('renders name field', () => {
            expect(form.nameInput).not.toBeNull();
            expect(form.nameInput.type).toBe('text');
            expect(form.nameInput.required).toBe(true);
        });

        it('renders email field', () => {
            expect(form.emailInput).not.toBeNull();
            expect(form.emailInput.type).toBe('email');
            expect(form.emailInput.required).toBe(true);
        });

        it('renders message field', () => {
            expect(form.messageInput).not.toBeNull();
            expect(form.messageInput.tagName).toBe('TEXTAREA');
            expect(form.messageInput.required).toBe(true);
        });

        it('renders submit button', () => {
            expect(form.submitBtn).not.toBeNull();
            expect(form.submitBtn.type).toBe('submit');
        });

        it('renders status area', () => {
            expect(form.statusEl).not.toBeNull();
            expect(form.statusEl.getAttribute('role')).toBe('status');
        });

        it('has proper labels', () => {
            const nameLabel = form.container.querySelector('label[for="contact-name"]');
            const emailLabel = form.container.querySelector('label[for="contact-email"]');
            const messageLabel = form.container.querySelector('label[for="contact-message"]');

            expect(nameLabel).not.toBeNull();
            expect(emailLabel).not.toBeNull();
            expect(messageLabel).not.toBeNull();
        });

        it('has autocomplete attributes', () => {
            expect(form.nameInput.autocomplete).toBe('name');
            expect(form.emailInput.autocomplete).toBe('email');
        });
    });

    describe('Validation - Name', () => {
        it('fails for empty name', () => {
            form.nameInput.value = '';
            const valid = form.validateField('name');

            expect(valid).toBe(false);
            expect(form.container.querySelector('#name-error').textContent).toBe('Name is required');
        });

        it('fails for whitespace-only name', () => {
            form.nameInput.value = '   ';
            const valid = form.validateField('name');

            expect(valid).toBe(false);
        });

        it('fails for single character name', () => {
            form.nameInput.value = 'A';
            const valid = form.validateField('name');

            expect(valid).toBe(false);
            expect(form.container.querySelector('#name-error').textContent).toContain('at least 2');
        });

        it('passes for valid name', () => {
            form.nameInput.value = 'John Doe';
            const valid = form.validateField('name');

            expect(valid).toBe(true);
            expect(form.container.querySelector('#name-error').textContent).toBe('');
        });

        it('sets aria-invalid attribute', () => {
            form.nameInput.value = '';
            form.validateField('name');

            expect(form.nameInput.getAttribute('aria-invalid')).toBe('true');

            form.nameInput.value = 'John';
            form.validateField('name');

            expect(form.nameInput.getAttribute('aria-invalid')).toBe('false');
        });
    });

    describe('Validation - Email', () => {
        it('fails for empty email', () => {
            form.emailInput.value = '';
            const valid = form.validateField('email');

            expect(valid).toBe(false);
            expect(form.container.querySelector('#email-error').textContent).toBe('Email is required');
        });

        it('fails for invalid email format', () => {
            const invalidEmails = [
                'notanemail',
                'missing@domain',
                '@nodomain.com',
                'spaces in@email.com',
                'double@@at.com'
            ];

            invalidEmails.forEach(email => {
                form.emailInput.value = email;
                const valid = form.validateField('email');

                expect(valid).toBe(false);
                expect(form.container.querySelector('#email-error').textContent).toContain('valid email');
            });
        });

        it('passes for valid emails', () => {
            const validEmails = [
                'test@example.com',
                'user.name@domain.org',
                'user+tag@subdomain.domain.co.uk'
            ];

            validEmails.forEach(email => {
                form.emailInput.value = email;
                const valid = form.validateField('email');

                expect(valid).toBe(true);
            });
        });
    });

    describe('Validation - Message', () => {
        it('fails for empty message', () => {
            form.messageInput.value = '';
            const valid = form.validateField('message');

            expect(valid).toBe(false);
            expect(form.container.querySelector('#message-error').textContent).toBe('Message is required');
        });

        it('fails for short message', () => {
            form.messageInput.value = 'Hi';
            const valid = form.validateField('message');

            expect(valid).toBe(false);
            expect(form.container.querySelector('#message-error').textContent).toContain('at least 10');
        });

        it('passes for valid message', () => {
            form.messageInput.value = 'Hello, I would like to discuss a project with you.';
            const valid = form.validateField('message');

            expect(valid).toBe(true);
        });
    });

    describe('Form Submission', () => {
        const fillValidForm = () => {
            form.nameInput.value = 'John Doe';
            form.emailInput.value = 'john@example.com';
            form.messageInput.value = 'Hello, I would like to discuss a project with you.';
        };

        it('prevents default form submission', async () => {
            fillValidForm();

            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            const preventDefaultSpy = vi.spyOn(submitEvent, 'preventDefault');

            mockFetch({ success: true });
            form.form.dispatchEvent(submitEvent);

            expect(preventDefaultSpy).toHaveBeenCalled();
        });

        it('validates before submission', async () => {
            form.nameInput.value = '';
            form.emailInput.value = '';
            form.messageInput.value = '';

            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.form.dispatchEvent(submitEvent);

            expect(fetch).not.toHaveBeenCalled();
        });

        it('shows loading state during submission', async () => {
            fillValidForm();
            mockFetch({ success: true });

            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.form.dispatchEvent(submitEvent);

            expect(form.isSubmitting).toBe(true);
            expect(form.submitBtn.disabled).toBe(true);
            expect(form.submitBtn.getAttribute('aria-busy')).toBe('true');
        });

        it('calls API with form data', async () => {
            fillValidForm();
            mockFetch({ success: true });

            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.form.dispatchEvent(submitEvent);

            await wait(0);

            expect(fetch).toHaveBeenCalledWith('/api/contact', expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }));
        });

        it('shows success message on successful submission', async () => {
            fillValidForm();
            mockFetch({ success: true });

            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.form.dispatchEvent(submitEvent);

            await wait(0);

            expect(form.statusEl.textContent).toContain('successfully');
            expect(form.statusEl.classList.contains('success')).toBe(true);
        });

        it('resets form on successful submission', async () => {
            fillValidForm();
            mockFetch({ success: true });

            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.form.dispatchEvent(submitEvent);

            await wait(0);

            expect(form.nameInput.value).toBe('');
            expect(form.emailInput.value).toBe('');
            expect(form.messageInput.value).toBe('');
        });

        it('shows error message on failed submission', async () => {
            fillValidForm();
            mockFetchError(500, 'Server Error');

            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.form.dispatchEvent(submitEvent);

            await wait(0);

            expect(form.statusEl.classList.contains('error')).toBe(true);
        });

        it('re-enables button after submission completes', async () => {
            fillValidForm();
            mockFetch({ success: true });

            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.form.dispatchEvent(submitEvent);

            await wait(0);

            expect(form.isSubmitting).toBe(false);
            expect(form.submitBtn.disabled).toBe(false);
        });

        it('prevents double submission', async () => {
            fillValidForm();
            form.isSubmitting = true;

            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.form.dispatchEvent(submitEvent);

            expect(fetch).not.toHaveBeenCalled();
        });
    });

    describe('Real-time Validation', () => {
        it('validates name on blur', () => {
            form.nameInput.value = '';
            form.nameInput.dispatchEvent(new Event('blur', { bubbles: true }));

            expect(form.container.querySelector('#name-error').textContent).not.toBe('');
        });

        it('validates email on blur', () => {
            form.emailInput.value = 'invalid';
            form.emailInput.dispatchEvent(new Event('blur', { bubbles: true }));

            expect(form.container.querySelector('#email-error').textContent).not.toBe('');
        });

        it('validates message on blur', () => {
            form.messageInput.value = 'Hi';
            form.messageInput.dispatchEvent(new Event('blur', { bubbles: true }));

            expect(form.container.querySelector('#message-error').textContent).not.toBe('');
        });
    });

    describe('Accessibility', () => {
        it('has aria-describedby linking errors to inputs', () => {
            expect(form.nameInput.getAttribute('aria-describedby')).toBe('name-error');
            expect(form.emailInput.getAttribute('aria-describedby')).toBe('email-error');
            expect(form.messageInput.getAttribute('aria-describedby')).toBe('message-error');
        });

        it('error messages have role=alert', () => {
            const errors = form.container.querySelectorAll('.error-message');
            errors.forEach(error => {
                expect(error.getAttribute('role')).toBe('alert');
            });
        });

        it('submit button has aria-busy', () => {
            expect(form.submitBtn.hasAttribute('aria-busy')).toBe(true);
        });

        it('status has aria-live', () => {
            expect(form.statusEl.getAttribute('aria-live')).toBe('polite');
        });
    });

    describe('Cleanup', () => {
        it('clears container on destroy', () => {
            form.destroy();

            expect(form.container.innerHTML).toBe('');
        });
    });
});
