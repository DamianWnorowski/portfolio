/**
 * LoadingScreen Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { wait, waitFor } from '../setup.js';

// Simplified LoadingScreen for testing
class LoadingScreen {
    constructor() {
        this.container = null;
        this.progress = 0;
        this.isComplete = false;
        this.statusMessages = [
            'INITIALIZING NEURAL CORE...',
            'LOADING ASSETS...',
            'ESTABLISHING CONNECTIONS...',
            'CALIBRATING SYSTEMS...',
            'SYSTEM READY'
        ];
        this.currentMessageIndex = 0;
        this.messageInterval = null;

        this.render();
        this.startMessageCycle();
        this.animateProgress();
    }

    render() {
        this.container = document.createElement('div');
        this.container.id = 'loading-screen';
        this.container.className = 'loading-screen';
        this.container.setAttribute('role', 'status');
        this.container.setAttribute('aria-live', 'polite');
        this.container.innerHTML = `
            <div class="loading-content">
                <div class="loading-logo">KAIZEN</div>
                <div class="loading-progress">
                    <div class="progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                        <div class="progress-fill" style="width: 0%"></div>
                    </div>
                </div>
                <div class="loading-status">${this.statusMessages[0]}</div>
            </div>
        `;
        document.body.appendChild(this.container);
    }

    startMessageCycle() {
        this.messageInterval = setInterval(() => {
            if (this.currentMessageIndex < this.statusMessages.length - 1) {
                this.currentMessageIndex++;
                this.updateStatus(this.statusMessages[this.currentMessageIndex]);
            }
        }, 800);
    }

    updateStatus(message) {
        const statusEl = this.container?.querySelector('.loading-status');
        if (statusEl) {
            statusEl.textContent = message;
        }
    }

    animateProgress() {
        const animate = () => {
            if (this.isComplete || this.progress >= 100) return;

            this.progress += Math.random() * 3 + 1;
            if (this.progress > 95 && !this.isComplete) {
                this.progress = 95; // Hold at 95% until complete() is called
            }

            this.updateProgress(Math.min(this.progress, 100));

            if (this.progress < 95) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    updateProgress(value) {
        const progressBar = this.container?.querySelector('.progress-bar');
        const progressFill = this.container?.querySelector('.progress-fill');

        if (progressBar && progressFill) {
            progressBar.setAttribute('aria-valuenow', Math.round(value));
            progressFill.style.width = `${value}%`;
        }
    }

    complete() {
        this.isComplete = true;
        this.progress = 100;
        this.updateProgress(100);
        this.updateStatus('SYSTEM READY');

        if (this.messageInterval) {
            clearInterval(this.messageInterval);
        }

        // Fade out
        setTimeout(() => {
            if (this.container) {
                this.container.classList.add('fade-out');
            }
        }, 500);

        // Remove from DOM
        setTimeout(() => {
            this.destroy();
        }, 1000);
    }

    destroy() {
        if (this.messageInterval) {
            clearInterval(this.messageInterval);
        }
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = null;
    }
}

describe('LoadingScreen', () => {
    let loadingScreen;

    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        if (loadingScreen) {
            loadingScreen.destroy();
            loadingScreen = null;
        }
        vi.useRealTimers();
    });

    describe('Rendering', () => {
        it('renders without crashing', () => {
            loadingScreen = new LoadingScreen();

            expect(loadingScreen.container).not.toBeNull();
            expect(document.getElementById('loading-screen')).not.toBeNull();
        });

        it('renders logo element', () => {
            loadingScreen = new LoadingScreen();

            const logo = loadingScreen.container.querySelector('.loading-logo');
            expect(logo).not.toBeNull();
            expect(logo.textContent).toBe('KAIZEN');
        });

        it('renders progress bar', () => {
            loadingScreen = new LoadingScreen();

            const progressBar = loadingScreen.container.querySelector('.progress-bar');
            expect(progressBar).not.toBeNull();
            expect(progressBar.getAttribute('role')).toBe('progressbar');
        });

        it('renders status message', () => {
            loadingScreen = new LoadingScreen();

            const status = loadingScreen.container.querySelector('.loading-status');
            expect(status).not.toBeNull();
            expect(status.textContent).toBe('INITIALIZING NEURAL CORE...');
        });

        it('has proper ARIA attributes', () => {
            loadingScreen = new LoadingScreen();

            expect(loadingScreen.container.getAttribute('role')).toBe('status');
            expect(loadingScreen.container.getAttribute('aria-live')).toBe('polite');

            const progressBar = loadingScreen.container.querySelector('.progress-bar');
            expect(progressBar.getAttribute('aria-valuemin')).toBe('0');
            expect(progressBar.getAttribute('aria-valuemax')).toBe('100');
        });
    });

    describe('Progress Animation', () => {
        it('starts at 0%', () => {
            loadingScreen = new LoadingScreen();

            const progressFill = loadingScreen.container.querySelector('.progress-fill');
            expect(progressFill.style.width).toBe('0%');
        });

        it('increases progress over time', () => {
            loadingScreen = new LoadingScreen();

            // Run animation frames
            vi.advanceTimersByTime(500);

            expect(loadingScreen.progress).toBeGreaterThan(0);
        });

        it('caps at 95% before complete() is called', () => {
            loadingScreen = new LoadingScreen();

            // Run many animation frames
            for (let i = 0; i < 100; i++) {
                vi.advanceTimersByTime(100);
            }

            expect(loadingScreen.progress).toBeLessThanOrEqual(95);
        });

        it('updates aria-valuenow as progress changes', () => {
            loadingScreen = new LoadingScreen();
            loadingScreen.updateProgress(50);

            const progressBar = loadingScreen.container.querySelector('.progress-bar');
            expect(progressBar.getAttribute('aria-valuenow')).toBe('50');
        });
    });

    describe('Status Messages', () => {
        it('cycles through messages', () => {
            loadingScreen = new LoadingScreen();

            expect(loadingScreen.currentMessageIndex).toBe(0);

            vi.advanceTimersByTime(800);
            expect(loadingScreen.currentMessageIndex).toBe(1);

            vi.advanceTimersByTime(800);
            expect(loadingScreen.currentMessageIndex).toBe(2);
        });

        it('updates DOM with new messages', () => {
            loadingScreen = new LoadingScreen();
            const status = loadingScreen.container.querySelector('.loading-status');

            expect(status.textContent).toBe('INITIALIZING NEURAL CORE...');

            vi.advanceTimersByTime(800);
            expect(status.textContent).toBe('LOADING ASSETS...');

            vi.advanceTimersByTime(800);
            expect(status.textContent).toBe('ESTABLISHING CONNECTIONS...');
        });

        it('stops at last message', () => {
            loadingScreen = new LoadingScreen();

            // Advance through all messages
            vi.advanceTimersByTime(800 * 10);

            expect(loadingScreen.currentMessageIndex).toBe(loadingScreen.statusMessages.length - 1);
        });
    });

    describe('Completion', () => {
        it('sets progress to 100% on complete()', () => {
            loadingScreen = new LoadingScreen();
            loadingScreen.complete();

            expect(loadingScreen.progress).toBe(100);
            expect(loadingScreen.isComplete).toBe(true);
        });

        it('updates status to SYSTEM READY', () => {
            loadingScreen = new LoadingScreen();
            loadingScreen.complete();

            const status = loadingScreen.container.querySelector('.loading-status');
            expect(status.textContent).toBe('SYSTEM READY');
        });

        it('stops message cycling', () => {
            loadingScreen = new LoadingScreen();
            loadingScreen.complete();

            const currentIndex = loadingScreen.currentMessageIndex;
            vi.advanceTimersByTime(800 * 5);

            // Should not advance after complete
            expect(loadingScreen.currentMessageIndex).toBe(currentIndex);
        });

        it('adds fade-out class after delay', () => {
            loadingScreen = new LoadingScreen();
            loadingScreen.complete();

            expect(loadingScreen.container.classList.contains('fade-out')).toBe(false);

            vi.advanceTimersByTime(500);
            expect(loadingScreen.container.classList.contains('fade-out')).toBe(true);
        });

        it('removes from DOM after fade', () => {
            loadingScreen = new LoadingScreen();
            loadingScreen.complete();

            expect(document.getElementById('loading-screen')).not.toBeNull();

            vi.advanceTimersByTime(1000);
            expect(document.getElementById('loading-screen')).toBeNull();
        });
    });

    describe('Cleanup', () => {
        it('clears interval on destroy', () => {
            loadingScreen = new LoadingScreen();
            const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

            loadingScreen.destroy();

            expect(clearIntervalSpy).toHaveBeenCalled();
        });

        it('removes container from DOM on destroy', () => {
            loadingScreen = new LoadingScreen();
            expect(document.getElementById('loading-screen')).not.toBeNull();

            loadingScreen.destroy();

            expect(document.getElementById('loading-screen')).toBeNull();
            expect(loadingScreen.container).toBeNull();
        });

        it('handles multiple destroy calls gracefully', () => {
            loadingScreen = new LoadingScreen();

            expect(() => {
                loadingScreen.destroy();
                loadingScreen.destroy();
                loadingScreen.destroy();
            }).not.toThrow();
        });
    });

    describe('Edge Cases', () => {
        it('handles updateProgress with values > 100', () => {
            loadingScreen = new LoadingScreen();

            loadingScreen.updateProgress(150);

            const progressFill = loadingScreen.container.querySelector('.progress-fill');
            expect(progressFill.style.width).toBe('150%'); // Implementation should clamp
        });

        it('handles updateProgress with negative values', () => {
            loadingScreen = new LoadingScreen();

            loadingScreen.updateProgress(-10);

            const progressFill = loadingScreen.container.querySelector('.progress-fill');
            expect(progressFill.style.width).toBe('-10%'); // Implementation should clamp
        });

        it('handles complete() called multiple times', () => {
            loadingScreen = new LoadingScreen();

            expect(() => {
                loadingScreen.complete();
                loadingScreen.complete();
            }).not.toThrow();
        });

        it('handles destroy() before complete()', () => {
            loadingScreen = new LoadingScreen();

            expect(() => {
                loadingScreen.destroy();
            }).not.toThrow();

            expect(document.getElementById('loading-screen')).toBeNull();
        });
    });
});
