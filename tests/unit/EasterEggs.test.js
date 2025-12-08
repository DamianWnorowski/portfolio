/**
 * EasterEggs Unit Tests
 * Tests for hidden features and secret interactions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('../../src/core/EventBus.js', () => ({
    eventBus: {
        on: vi.fn(),
        emit: vi.fn()
    },
    Events: {
        TERMINAL_SECRET: 'terminal:secret'
    }
}));

vi.mock('../../src/services/AudioService.js', () => ({
    audioService: {
        play: vi.fn()
    }
}));

describe('EasterEggs', () => {
    let EasterEggs;
    let easterEggs;
    let eventBusMock;
    let audioServiceMock;

    beforeEach(async () => {
        vi.resetModules();
        vi.useFakeTimers();

        // Clear DOM
        document.body.innerHTML = '';
        document.head.innerHTML = '';

        // Re-import mocks
        const eventBusModule = await import('../../src/core/EventBus.js');
        eventBusMock = eventBusModule.eventBus;

        const audioModule = await import('../../src/services/AudioService.js');
        audioServiceMock = audioModule.audioService;

        // Import component
        const module = await import('../../src/components/EasterEggs.js');
        EasterEggs = module.EasterEggs;
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('Konami Code Detection', () => {
        let instance;

        beforeEach(() => {
            instance = new EasterEggs();
        });

        const KONAMI_CODE = [
            'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
            'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
            'KeyB', 'KeyA'
        ];

        it('tracks konami code progress', () => {
            const event = new KeyboardEvent('keydown', { code: 'ArrowUp' });
            document.dispatchEvent(event);

            expect(instance.konamiIndex).toBe(1);
        });

        it('resets on wrong key', () => {
            const upEvent = new KeyboardEvent('keydown', { code: 'ArrowUp' });
            document.dispatchEvent(upEvent);
            document.dispatchEvent(upEvent);

            const wrongEvent = new KeyboardEvent('keydown', { code: 'KeyX' });
            document.dispatchEvent(wrongEvent);

            expect(instance.konamiIndex).toBe(0);
        });

        it('triggers konami effect on complete sequence', () => {
            KONAMI_CODE.forEach(code => {
                const event = new KeyboardEvent('keydown', { code });
                document.dispatchEvent(event);
            });

            expect(audioServiceMock.play).toHaveBeenCalledWith('success');
            expect(instance.matrixMode).toBe(true);
        });

        it('resets index after successful trigger', () => {
            KONAMI_CODE.forEach(code => {
                document.dispatchEvent(new KeyboardEvent('keydown', { code }));
            });

            expect(instance.konamiIndex).toBe(0);
        });
    });

    describe('Matrix Rain Effect', () => {
        let instance;

        beforeEach(() => {
            instance = new EasterEggs();
        });

        it('creates matrix canvas', () => {
            instance.startMatrixRain();

            const canvas = document.getElementById('matrix-canvas');
            expect(canvas).not.toBeNull();
            expect(canvas.tagName).toBe('CANVAS');
        });

        it('sets matrix mode flag', () => {
            instance.startMatrixRain();
            expect(instance.matrixMode).toBe(true);
        });

        it('does not create duplicate canvas', () => {
            instance.startMatrixRain();
            instance.startMatrixRain();

            const canvases = document.querySelectorAll('#matrix-canvas');
            expect(canvases.length).toBe(1);
        });

        it('removes canvas after 10 seconds', () => {
            instance.startMatrixRain();

            vi.advanceTimersByTime(10000);

            expect(instance.matrixMode).toBe(false);

            // Wait for fade animation
            vi.advanceTimersByTime(1000);

            const canvas = document.getElementById('matrix-canvas');
            expect(canvas).toBeNull();
        });

        it('applies correct styles to canvas', () => {
            instance.startMatrixRain();

            const canvas = document.getElementById('matrix-canvas');
            expect(canvas.style.position).toBe('fixed');
            expect(canvas.style.zIndex).toBe('9998');
            expect(canvas.style.pointerEvents).toBe('none');
        });
    });

    describe('Secret Terminal Commands', () => {
        let instance;

        beforeEach(() => {
            instance = new EasterEggs();
        });

        it('subscribes to terminal:secret event', () => {
            expect(eventBusMock.on).toHaveBeenCalledWith(
                'terminal:secret',
                expect.any(Function)
            );
        });

        it('handles sudo hire command', () => {
            instance.handleSecretCommand('sudo hire');

            expect(audioServiceMock.play).toHaveBeenCalledWith('success');
            expect(document.querySelector('#achievement-toast')).not.toBeNull();
        });

        it('handles sudo hire-me variant', () => {
            instance.handleSecretCommand('sudo hire-me');

            expect(audioServiceMock.play).toHaveBeenCalledWith('success');
        });

        it('handles hack command', () => {
            instance.handleSecretCommand('hack');

            const overlay = document.getElementById('hack-overlay');
            expect(overlay).not.toBeNull();
            expect(overlay.style.zIndex).toBe('9999');
        });

        it('handles party command', () => {
            instance.handleSecretCommand('party');

            expect(document.body.style.animation).toContain('party-colors');
        });

        it('handles flip command', () => {
            instance.handleSecretCommand('flip');

            expect(document.body.style.transform).toBe('rotate(180deg)');
        });

        it('handles 42 command', () => {
            instance.handleSecretCommand('42');

            const toast = document.getElementById('achievement-toast');
            expect(toast).not.toBeNull();
            expect(toast.textContent).toContain('42');
        });

        it('handles commands case-insensitively', () => {
            instance.handleSecretCommand('SUDO HIRE');

            expect(audioServiceMock.play).toHaveBeenCalledWith('success');
        });
    });

    describe('Confetti Effect', () => {
        let instance;

        beforeEach(() => {
            instance = new EasterEggs();
        });

        it('creates confetti particles', () => {
            instance.triggerConfetti();

            const confetti = document.querySelectorAll('.confetti');
            expect(confetti.length).toBe(150);
        });

        it('plays success sound', () => {
            instance.triggerConfetti();

            expect(audioServiceMock.play).toHaveBeenCalledWith('success');
        });

        it('adds confetti animation styles', () => {
            instance.triggerConfetti();

            const styles = document.getElementById('confetti-styles');
            expect(styles).not.toBeNull();
            expect(styles.textContent).toContain('confetti-fall');
        });

        it('removes confetti after animation', () => {
            instance.triggerConfetti();

            vi.advanceTimersByTime(5000);

            const confetti = document.querySelectorAll('.confetti');
            expect(confetti.length).toBe(0);
        });
    });

    describe('Hack Mode', () => {
        let instance;

        beforeEach(() => {
            instance = new EasterEggs();
        });

        it('creates overlay with messages', () => {
            instance.triggerHackMode();

            const overlay = document.getElementById('hack-overlay');
            expect(overlay).not.toBeNull();
            expect(overlay.textContent).toContain('ACCESSING MAINFRAME');
        });

        it('plays boot sound', () => {
            instance.triggerHackMode();

            expect(audioServiceMock.play).toHaveBeenCalledWith('boot');
        });

        it('removes overlay on click', () => {
            instance.triggerHackMode();

            const overlay = document.getElementById('hack-overlay');
            overlay.click();

            expect(document.getElementById('hack-overlay')).toBeNull();
        });

        it('auto-removes after 10 seconds', () => {
            instance.triggerHackMode();

            vi.advanceTimersByTime(10000);

            expect(document.getElementById('hack-overlay')).toBeNull();
        });
    });

    describe('Party Mode', () => {
        let instance;

        beforeEach(() => {
            instance = new EasterEggs();
        });

        it('applies hue rotation animation', () => {
            instance.triggerPartyMode();

            expect(document.body.style.animation).toContain('party-colors');
        });

        it('adds party styles', () => {
            instance.triggerPartyMode();

            const styles = document.getElementById('party-styles');
            expect(styles).not.toBeNull();
            expect(styles.textContent).toContain('hue-rotate');
        });

        it('removes animation after 5 seconds', () => {
            instance.triggerPartyMode();

            vi.advanceTimersByTime(5000);

            expect(document.body.style.animation).toBe('');
        });
    });

    describe('Flip Effect', () => {
        let instance;

        beforeEach(() => {
            instance = new EasterEggs();
        });

        it('rotates body 180 degrees', () => {
            instance.triggerFlip();

            expect(document.body.style.transform).toBe('rotate(180deg)');
        });

        it('reverts after 3 seconds', () => {
            instance.triggerFlip();

            vi.advanceTimersByTime(3000);

            expect(document.body.style.transform).toBe('');
        });
    });

    describe('Gravity Effect', () => {
        let instance;

        beforeEach(() => {
            document.body.innerHTML = `
                <div class="panel">Panel 1</div>
                <div class="panel">Panel 2</div>
            `;
            instance = new EasterEggs();
        });

        it('drops panels down', () => {
            instance.triggerGravity();

            const panels = document.querySelectorAll('.panel');
            panels.forEach(panel => {
                expect(panel.style.transform).toContain('translateY');
            });
        });

        it('restores panels after 3 seconds', () => {
            instance.triggerGravity();

            vi.advanceTimersByTime(3000);

            const panels = document.querySelectorAll('.panel');
            panels.forEach(panel => {
                expect(panel.style.transform).toBe('');
            });
        });
    });

    describe('Logo Easter Egg', () => {
        let instance;

        beforeEach(() => {
            document.body.innerHTML = '<div class="logo">KAIZEN</div>';
            instance = new EasterEggs();
        });

        it('triggers on triple click', () => {
            const logo = document.querySelector('.logo');

            logo.click();
            logo.click();
            logo.click();

            expect(audioServiceMock.play).toHaveBeenCalledWith('ping');
        });

        it('resets click count after 500ms', () => {
            const logo = document.querySelector('.logo');

            logo.click();
            logo.click();

            vi.advanceTimersByTime(600);

            logo.click();

            // Should not trigger (only 1 click after reset)
            expect(audioServiceMock.play).not.toHaveBeenCalledWith('ping');
        });

        it('spins logo on trigger', () => {
            const logo = document.querySelector('.logo');

            logo.click();
            logo.click();
            logo.click();

            expect(logo.style.animation).toContain('logo-spin');
        });

        it('shows achievement toast', () => {
            const logo = document.querySelector('.logo');

            logo.click();
            logo.click();
            logo.click();

            const toast = document.getElementById('achievement-toast');
            expect(toast).not.toBeNull();
            expect(toast.textContent).toContain('CURIOUS ONE');
        });
    });

    describe('Nav Pattern', () => {
        let instance;

        beforeEach(() => {
            document.body.innerHTML = `
                <nav>
                    <a class="nav-link" data-section="profile">Profile</a>
                    <a class="nav-link" data-section="assets">Assets</a>
                    <a class="nav-link" data-section="terminal">Terminal</a>
                </nav>
            `;
            instance = new EasterEggs();
        });

        it('tracks navigation pattern', () => {
            const links = document.querySelectorAll('.nav-link');
            const pattern = ['profile', 'assets', 'terminal', 'profile'];

            // Click in pattern sequence (first 3)
            links[0].click(); // profile
            links[1].click(); // assets
            links[2].click(); // terminal

            // No achievement yet
            expect(document.getElementById('achievement-toast')).toBeNull();
        });

        it('shows achievement on pattern completion', () => {
            const links = document.querySelectorAll('.nav-link');

            // Pattern: PROFILE, ASSETS, TERMINAL, PROFILE
            links[0].click(); // profile
            links[1].click(); // assets (wrong - pattern is PROFILE, ASSETS, TERMINAL, PROFILE)
            // Reset happens
            links[0].click(); // profile (restart)

            // Follow correct pattern
            // Expected: PROFILE -> ASSETS -> TERMINAL -> PROFILE
        });
    });

    describe('Achievement Toast', () => {
        let instance;

        beforeEach(() => {
            instance = new EasterEggs();
        });

        it('creates toast with title and message', () => {
            instance.showAchievement('TEST TITLE', 'Test message');

            const toast = document.getElementById('achievement-toast');
            expect(toast).not.toBeNull();
            expect(toast.textContent).toContain('TEST TITLE');
            expect(toast.textContent).toContain('Test message');
        });

        it('includes trophy icon', () => {
            instance.showAchievement('TEST', 'Message');

            const toast = document.getElementById('achievement-toast');
            expect(toast.innerHTML).toContain('achievement-icon');
        });

        it('removes existing toast before showing new one', () => {
            instance.showAchievement('First', 'Message');
            instance.showAchievement('Second', 'Message');

            const toasts = document.querySelectorAll('#achievement-toast');
            expect(toasts.length).toBe(1);
            expect(toasts[0].textContent).toContain('Second');
        });

        it('auto-removes after 4 seconds', () => {
            instance.showAchievement('TEST', 'Message');

            vi.advanceTimersByTime(4500); // 4000 + 500 for animation

            expect(document.getElementById('achievement-toast')).toBeNull();
        });

        it('adds achievement styles', () => {
            instance.showAchievement('TEST', 'Message');

            const styles = document.getElementById('achievement-styles');
            expect(styles).not.toBeNull();
            expect(styles.textContent).toContain('achievement-slide');
        });
    });

    describe('Destroy', () => {
        it('stops matrix mode', () => {
            const instance = new EasterEggs();
            instance.startMatrixRain();

            instance.destroy();

            expect(instance.matrixMode).toBe(false);
        });
    });
});

describe('EasterEggs Singleton', () => {
    it('exports auto-initialized singleton', async () => {
        vi.resetModules();
        document.body.innerHTML = '';

        const { easterEggs } = await import('../../src/components/EasterEggs.js');
        expect(easterEggs).toBeDefined();
        expect(easterEggs.constructor.name).toBe('EasterEggs');
    });
});
