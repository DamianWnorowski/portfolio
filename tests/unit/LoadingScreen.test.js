/**
 * LoadingScreen Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LoadingScreen } from '../../src/components/LoadingScreen.js';

describe('LoadingScreen', () => {
    let loadingScreen;

    beforeEach(() => {
        vi.useFakeTimers();
        document.body.innerHTML = '';
        loadingScreen = new LoadingScreen();
    });

    afterEach(() => {
        vi.useRealTimers();
        if (loadingScreen && loadingScreen.element && loadingScreen.element.parentNode) {
            loadingScreen.element.remove();
        }
    });

    describe('Rendering', () => {
        it('creates the loading screen element', () => {
            expect(loadingScreen.element).not.toBeNull();
            expect(document.getElementById('loading-screen')).not.toBeNull();
        });

        it('renders the logo', () => {
            const logo = loadingScreen.element.querySelector('.loader-logo');
            expect(logo).not.toBeNull();
            const letter = logo.querySelector('.logo-letter');
            expect(letter.textContent).toBe('K');
        });

        it('renders the title and subtitle', () => {
            const title = loadingScreen.element.querySelector('.loader-title');
            expect(title).not.toBeNull();
            expect(title.textContent).toBe('KAIZEN');
            const subtitle = loadingScreen.element.querySelector('.loader-subtitle');
            expect(subtitle).not.toBeNull();
            expect(subtitle.textContent).toBe('EXECUTIVE TERMINAL v13');
        });

        it('renders the progress bar and initial state', () => {
            const progressFill = loadingScreen.element.querySelector('#progress-fill');
            expect(progressFill).not.toBeNull();
            expect(progressFill.style.width).toBe('0%');
            const progressText = loadingScreen.element.querySelector('#progress-text');
            expect(progressText).not.toBeNull();
            expect(progressText.textContent).toBe('0%');
        });

        it('renders the initial message', () => {
            const message = loadingScreen.element.querySelector('#loader-message');
            expect(message).not.toBeNull();
            expect(message.textContent).toBe('Initializing...');
        });
    });

    describe('start()', () => {
        it('progresses through all steps', async () => {
            const startPromise = loadingScreen.start();

            await vi.advanceTimersByTimeAsync(3000);

            await startPromise;

            const progressFill = loadingScreen.element.querySelector('#progress-fill');
            expect(progressFill.style.width).toBe('100%');
            const progressText = loadingScreen.element.querySelector('#progress-text');
            expect(progressText.textContent).toBe('100%');

            const message = loadingScreen.element.querySelector('#loader-message');
            expect(message.textContent).toBe('System ready.');
        }, 5000);

        it('hides the loading screen at the end', async () => {
            const hideSpy = vi.spyOn(loadingScreen, 'hide');
            loadingScreen.start();
            await vi.advanceTimersByTimeAsync(3000);
            expect(hideSpy).toHaveBeenCalled();
        }, 5000);
    });

    describe('hide()', () => {
        it('adds the hidden class', () => {
            loadingScreen.hide();
            expect(loadingScreen.element.classList.contains('hidden')).toBe(true);
        });

        it('removes the element from the DOM after a delay', () => {
            loadingScreen.hide();
            expect(document.getElementById('loading-screen')).not.toBeNull();
            vi.runAllTimers();
            expect(document.getElementById('loading-screen')).toBeNull();
        });
    });
});
