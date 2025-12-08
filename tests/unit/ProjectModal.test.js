/**
 * ProjectModal Unit Tests
 * Tests for project case study modal component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock EventBus
vi.mock('../../src/core/EventBus.js', () => ({
    eventBus: {
        emit: vi.fn()
    },
    Events: {
        MODAL_OPEN: 'modal:open',
        MODAL_CLOSE: 'modal:close'
    }
}));

describe('ProjectModal', () => {
    let ProjectModal;
    let modal;
    let eventBusMock;

    beforeEach(async () => {
        vi.resetModules();

        document.body.innerHTML = '';
        document.head.innerHTML = '';

        // Import mocks
        const eventBusModule = await import('../../src/core/EventBus.js');
        eventBusMock = eventBusModule.eventBus;

        const module = await import('../../src/components/ProjectModal.js');
        ProjectModal = module.ProjectModal;

        modal = new ProjectModal();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Initialization', () => {
        it('creates overlay element', () => {
            const overlay = document.querySelector('.project-modal-overlay');
            expect(overlay).not.toBeNull();
        });

        it('overlay starts hidden', () => {
            expect(modal.overlay.classList.contains('hidden')).toBe(true);
        });

        it('creates close button', () => {
            const closeBtn = document.getElementById('project-modal-close');
            expect(closeBtn).not.toBeNull();
        });

        it('creates content container', () => {
            const content = document.getElementById('project-modal-content');
            expect(content).not.toBeNull();
        });

        it('sets currentProject to null', () => {
            expect(modal.currentProject).toBeNull();
        });
    });

    describe('Opening Modal', () => {
        it('opens with valid project id', () => {
            modal.open('kaizen-os');

            expect(modal.overlay.classList.contains('hidden')).toBe(false);
        });

        it('sets currentProject', () => {
            modal.open('kaizen-os');

            expect(modal.currentProject).not.toBeNull();
            expect(modal.currentProject.title).toBe('Kaizen OS');
        });

        it('sets body overflow to hidden', () => {
            modal.open('kaizen-os');

            expect(document.body.style.overflow).toBe('hidden');
        });

        it('emits MODAL_OPEN event', () => {
            modal.open('kaizen-os');

            expect(eventBusMock.emit).toHaveBeenCalledWith('modal:open', 'project');
        });

        it('handles invalid project id', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            modal.open('nonexistent-project');

            expect(warnSpy).toHaveBeenCalled();
            expect(modal.overlay.classList.contains('hidden')).toBe(true);
        });
    });

    describe('Closing Modal', () => {
        beforeEach(() => {
            modal.open('kaizen-os');
        });

        it('hides overlay', () => {
            modal.close();

            expect(modal.overlay.classList.contains('hidden')).toBe(true);
        });

        it('restores body overflow', () => {
            modal.close();

            expect(document.body.style.overflow).toBe('');
        });

        it('emits MODAL_CLOSE event', () => {
            modal.close();

            expect(eventBusMock.emit).toHaveBeenCalledWith('modal:close');
        });
    });

    describe('Event Handlers', () => {
        it('closes on close button click', () => {
            modal.open('kaizen-os');
            const closeBtn = document.getElementById('project-modal-close');

            closeBtn.click();

            expect(modal.overlay.classList.contains('hidden')).toBe(true);
        });

        it('closes on overlay click', () => {
            modal.open('kaizen-os');

            // Click directly on overlay (not modal content)
            modal.overlay.dispatchEvent(new MouseEvent('click', {
                bubbles: true,
                target: modal.overlay
            }));

            // The click handler checks if target === overlay
            expect(modal.overlay.classList.contains('hidden')).toBe(true);
        });

        it('closes on ESC key', () => {
            modal.open('kaizen-os');

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

            expect(modal.overlay.classList.contains('hidden')).toBe(true);
        });

        it('does not close on ESC when already hidden', () => {
            // Modal is hidden by default
            const emitCallsBefore = eventBusMock.emit.mock.calls.length;

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

            // Should not emit additional close event
            expect(eventBusMock.emit.mock.calls.length).toBe(emitCallsBefore);
        });
    });

    describe('Content Rendering', () => {
        beforeEach(() => {
            modal.open('kaizen-os');
        });

        it('renders project title', () => {
            const title = modal.overlay.querySelector('.project-title');
            expect(title.textContent).toBe('Kaizen OS');
        });

        it('renders project tagline', () => {
            const tagline = modal.overlay.querySelector('.project-tagline');
            expect(tagline.textContent).toBe('Industrial Fleet Management Platform');
        });

        it('renders project status', () => {
            const status = modal.overlay.querySelector('.project-status');
            expect(status.textContent).toBe('LIVE');
        });

        it('applies correct status class', () => {
            const status = modal.overlay.querySelector('.project-status');
            expect(status.classList.contains('live')).toBe(true);
        });

        it('renders all metrics', () => {
            const metrics = modal.overlay.querySelectorAll('.metric-card');
            expect(metrics.length).toBe(4);
        });

        it('renders metric values', () => {
            const values = modal.overlay.querySelectorAll('.metric-value');
            expect(values[0].textContent).toBe('1.2M');
        });

        it('renders metric labels', () => {
            const labels = modal.overlay.querySelectorAll('.metric-label');
            expect(labels[0].textContent).toBe('Requests/Day');
        });

        it('renders description', () => {
            const content = modal.overlay.querySelector('.section-content');
            expect(content.textContent).toContain('Enterprise-grade fleet management');
        });

        it('renders tech stack badges', () => {
            const badges = modal.overlay.querySelectorAll('.tech-badge');
            expect(badges.length).toBeGreaterThan(0);
        });

        it('renders tech stack items', () => {
            const badges = modal.overlay.querySelectorAll('.tech-badge');
            const techItems = Array.from(badges).map(b => b.textContent);
            expect(techItems).toContain('Python');
            expect(techItems).toContain('FastAPI');
        });

        it('renders github link when available', () => {
            const githubLink = modal.overlay.querySelector('.project-link');
            expect(githubLink).not.toBeNull();
            expect(githubLink.href).toContain('github.com');
        });

        it('renders live demo link when available', () => {
            const links = modal.overlay.querySelectorAll('.project-link');
            const liveLink = Array.from(links).find(l => l.textContent.includes('Live Demo'));
            expect(liveLink).not.toBeNull();
        });
    });

    describe('Different Projects', () => {
        it('renders Hive Agent', () => {
            modal.open('hive-agent');

            expect(modal.currentProject.title).toBe('Hive Agent');
            expect(modal.overlay.querySelector('.project-status').textContent).toBe('BETA');
        });

        it('renders Sentient Core', () => {
            modal.open('sentient-core');

            expect(modal.currentProject.title).toBe('Sentient Core');
            expect(modal.currentProject.tagline).toContain('WebGL');
        });

        it('renders Titan Search', () => {
            modal.open('titan-search');

            expect(modal.currentProject.title).toBe('Titan Search');
            expect(modal.currentProject.status).toBe('PROD');
        });
    });

    describe('Status Classes', () => {
        it('applies live class', () => {
            modal.open('kaizen-os');
            const status = modal.overlay.querySelector('.project-status');
            expect(status.classList.contains('live')).toBe(true);
        });

        it('applies beta class', () => {
            modal.open('hive-agent');
            const status = modal.overlay.querySelector('.project-status');
            expect(status.classList.contains('beta')).toBe(true);
        });

        it('applies rd class for R&D', () => {
            modal.open('sentient-core');
            const status = modal.overlay.querySelector('.project-status');
            expect(status.classList.contains('rd')).toBe(true);
        });

        it('applies prod class', () => {
            modal.open('titan-search');
            const status = modal.overlay.querySelector('.project-status');
            expect(status.classList.contains('prod')).toBe(true);
        });
    });

    describe('Links', () => {
        it('github link opens in new tab', () => {
            modal.open('kaizen-os');
            const githubLink = modal.overlay.querySelector('.project-link[href*="github"]');
            expect(githubLink.target).toBe('_blank');
        });

        it('github link has noopener', () => {
            modal.open('kaizen-os');
            const githubLink = modal.overlay.querySelector('.project-link[href*="github"]');
            expect(githubLink.rel).toContain('noopener');
        });

        it('demo link has primary class', () => {
            modal.open('sentient-core');
            const demoLink = modal.overlay.querySelector('.project-link.primary');
            expect(demoLink).not.toBeNull();
        });
    });

    describe('Styles', () => {
        it('adds styles to document', () => {
            const styles = document.head.querySelectorAll('style');
            expect(styles.length).toBeGreaterThan(0);
        });

        it('includes modal overlay styles', () => {
            const styles = document.head.querySelector('style');
            expect(styles.textContent).toContain('.project-modal-overlay');
        });

        it('includes responsive styles', () => {
            const styles = document.head.querySelector('style');
            expect(styles.textContent).toContain('@media');
        });
    });

    describe('Multiple Opens', () => {
        it('can open different projects', () => {
            modal.open('kaizen-os');
            expect(modal.currentProject.title).toBe('Kaizen OS');

            modal.close();
            modal.open('hive-agent');
            expect(modal.currentProject.title).toBe('Hive Agent');
        });

        it('updates content on new open', () => {
            modal.open('kaizen-os');
            const firstTitle = modal.overlay.querySelector('.project-title').textContent;

            modal.open('hive-agent');
            const secondTitle = modal.overlay.querySelector('.project-title').textContent;

            expect(firstTitle).not.toBe(secondTitle);
        });
    });
});
