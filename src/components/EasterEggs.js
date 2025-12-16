/**
 * Easter Eggs Module
 * Hidden surprises for explorers
 */

import { eventBus, Events } from '../core/EventBus.js';
import { audioService } from '../services/AudioService.js';
import { escapeHtml } from '../utils/security.js';

// Konami Code sequence
const KONAMI_CODE = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'KeyB', 'KeyA'
];

export class EasterEggs {
    constructor() {
        this.konamiIndex = 0;
        this.matrixMode = false;
        this.particles = [];

        this.init();
    }

    init() {
        // Listen for Konami code
        document.addEventListener('keydown', (e) => this.checkKonami(e));

        // Secret terminal commands are handled by EliteTerminal
        eventBus.on('terminal:secret', (command) => this.handleSecretCommand(command));

        // Triple-click logo for surprise
        const logo = document.querySelector('.logo');
        if (logo) {
            let clickCount = 0;
            let clickTimer = null;

            logo.addEventListener('click', () => {
                clickCount++;
                if (clickCount === 3) {
                    this.triggerLogoEaster();
                    clickCount = 0;
                }

                clearTimeout(clickTimer);
                clickTimer = setTimeout(() => clickCount = 0, 500);
            });
        }

        // Secret hover pattern on nav
        this.setupNavPattern();
    }

    checkKonami(e) {
        if (e.code === KONAMI_CODE[this.konamiIndex]) {
            this.konamiIndex++;

            if (this.konamiIndex === KONAMI_CODE.length) {
                this.triggerKonami();
                this.konamiIndex = 0;
            }
        } else {
            this.konamiIndex = 0;
        }
    }

    triggerKonami() {
        audioService.play('success');

        // Matrix rain effect
        this.startMatrixRain();

        // Show achievement
        this.showAchievement('KONAMI MASTER', 'You found the secret code!');
    }

    startMatrixRain() {
        if (this.matrixMode) return;
        this.matrixMode = true;

        const canvas = document.createElement('canvas');
        canvas.id = 'matrix-canvas';
        canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 9998;
            pointer-events: none;
            opacity: 0;
            transition: opacity 1s;
        `;
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const chars = 'KAIZEN01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
        const fontSize = 14;
        const columns = canvas.width / fontSize;
        const drops = Array(Math.floor(columns)).fill(1);

        // Fade in
        requestAnimationFrame(() => canvas.style.opacity = '0.8');

        const draw = () => {
            if (!this.matrixMode) {
                canvas.remove();
                return;
            }

            ctx.fillStyle = 'rgba(10, 12, 16, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#c9a227';
            ctx.font = `${fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const char = chars[Math.floor(Math.random() * chars.length)];
                ctx.fillText(char, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }

            requestAnimationFrame(draw);
        };

        draw();

        // Stop after 10 seconds
        setTimeout(() => {
            this.matrixMode = false;
            canvas.style.opacity = '0';
            setTimeout(() => canvas.remove(), 1000);
        }, 10000);
    }

    handleSecretCommand(command) {
        switch (command.toLowerCase()) {
            case 'sudo hire':
            case 'sudo hire-me':
                this.triggerConfetti();
                this.showAchievement('HIRED!', 'You have excellent judgment.');
                break;

            case 'hack':
            case 'hack gibson':
                this.triggerHackMode();
                break;

            case 'party':
            case 'disco':
                this.triggerPartyMode();
                break;

            case 'flip':
                this.triggerFlip();
                break;

            case 'gravity':
                this.triggerGravity();
                break;

            case '42':
            case 'meaning':
                this.showAchievement('42', 'The answer to life, the universe, and everything.');
                break;
        }
    }

    triggerConfetti() {
        audioService.play('success');

        const colors = ['#c9a227', '#4a9eff', '#22c55e', '#f59e0b', '#ef4444'];
        const confettiCount = 150;

        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.cssText = `
                position: fixed;
                width: ${Math.random() * 10 + 5}px;
                height: ${Math.random() * 10 + 5}px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                left: ${Math.random() * 100}vw;
                top: -20px;
                z-index: 9999;
                pointer-events: none;
                border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
                animation: confetti-fall ${Math.random() * 3 + 2}s ease-out forwards;
            `;
            document.body.appendChild(confetti);

            setTimeout(() => confetti.remove(), 5000);
        }

        // Add confetti animation if not exists
        if (!document.getElementById('confetti-styles')) {
            const style = document.createElement('style');
            style.id = 'confetti-styles';
            style.textContent = `
                @keyframes confetti-fall {
                    0% {
                        transform: translateY(0) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotate(${Math.random() * 720}deg);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    triggerHackMode() {
        audioService.play('boot');

        const overlay = document.createElement('div');
        overlay.id = 'hack-overlay';
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0, 20, 0, 0.95);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: 'Courier New', monospace;
            color: #00ff00;
        `;

        const messages = [
            'ACCESSING MAINFRAME...',
            'BYPASSING SECURITY...',
            'DOWNLOADING FILES...',
            '████████████░░░░░░░░ 60%',
            '████████████████████ 100%',
            'ACCESS GRANTED',
            '',
            'Just kidding. But you found an easter egg!',
            '',
            '[Click anywhere to exit]'
        ];

        // Create message divs programmatically for security
        messages.forEach((msg, i) => {
            const msgDiv = document.createElement('div');
            msgDiv.style.cssText = `animation: hack-type 0.5s ease ${i * 0.3}s both; opacity: 0;`;
            msgDiv.textContent = msg;
            overlay.appendChild(msgDiv);
        });

        document.body.appendChild(overlay);

        // Add animation
        const style = document.createElement('style');
        style.id = 'hack-styles';
        style.textContent = `
            @keyframes hack-type {
                from { opacity: 0; transform: translateX(-10px); }
                to { opacity: 1; transform: translateX(0); }
            }
        `;
        document.head.appendChild(style);

        overlay.addEventListener('click', () => {
            overlay.remove();
            style.remove();
        });

        setTimeout(() => {
            overlay.remove();
            style.remove();
        }, 10000);
    }

    triggerPartyMode() {
        audioService.play('success');

        document.body.style.animation = 'party-colors 0.5s infinite';

        if (!document.getElementById('party-styles')) {
            const style = document.createElement('style');
            style.id = 'party-styles';
            style.textContent = `
                @keyframes party-colors {
                    0% { filter: hue-rotate(0deg); }
                    100% { filter: hue-rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        setTimeout(() => {
            document.body.style.animation = '';
        }, 5000);
    }

    triggerFlip() {
        document.body.style.transition = 'transform 1s';
        document.body.style.transform = 'rotate(180deg)';

        setTimeout(() => {
            document.body.style.transform = '';
        }, 3000);
    }

    triggerGravity() {
        const panels = document.querySelectorAll('.panel');
        panels.forEach((panel, i) => {
            panel.style.transition = 'transform 2s ease-in';
            panel.style.transform = `translateY(${window.innerHeight + 100}px) rotate(${Math.random() * 30 - 15}deg)`;
        });

        setTimeout(() => {
            panels.forEach(panel => {
                panel.style.transition = 'transform 0.5s ease-out';
                panel.style.transform = '';
            });
        }, 3000);
    }

    triggerLogoEaster() {
        audioService.play('ping');

        const logo = document.querySelector('.logo');
        if (logo) {
            logo.style.animation = 'logo-spin 1s ease';
            setTimeout(() => logo.style.animation = '', 1000);
        }

        if (!document.getElementById('logo-easter-styles')) {
            const style = document.createElement('style');
            style.id = 'logo-easter-styles';
            style.textContent = `
                @keyframes logo-spin {
                    0% { transform: rotateY(0deg); }
                    100% { transform: rotateY(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        this.showAchievement('CURIOUS ONE', 'You like clicking things!');
    }

    setupNavPattern() {
        const navLinks = document.querySelectorAll('.nav-link');
        const pattern = ['PROFILE', 'ASSETS', 'TERMINAL', 'PROFILE'];
        let patternIndex = 0;

        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                const section = link.dataset.section?.toUpperCase();
                if (section === pattern[patternIndex]) {
                    patternIndex++;
                    if (patternIndex === pattern.length) {
                        this.showAchievement('PATTERN FINDER', 'You discovered the nav sequence!');
                        patternIndex = 0;
                    }
                } else {
                    patternIndex = 0;
                }
            });
        });
    }

    showAchievement(title, message) {
        const existing = document.getElementById('achievement-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'achievement-toast';

        // Create structure programmatically for security
        const iconDiv = document.createElement('div');
        iconDiv.className = 'achievement-icon';
        iconDiv.textContent = '🏆';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'achievement-content';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'achievement-title';
        titleDiv.textContent = escapeHtml(title);

        const messageDiv = document.createElement('div');
        messageDiv.className = 'achievement-message';
        messageDiv.textContent = escapeHtml(message);

        contentDiv.appendChild(titleDiv);
        contentDiv.appendChild(messageDiv);

        toast.appendChild(iconDiv);
        toast.appendChild(contentDiv);

        toast.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: linear-gradient(135deg, rgba(201, 162, 39, 0.2), rgba(74, 158, 255, 0.1));
            border: 1px solid rgba(201, 162, 39, 0.5);
            border-radius: 8px;
            padding: 16px 24px;
            display: flex;
            align-items: center;
            gap: 16px;
            z-index: 10000;
            animation: achievement-slide 0.5s ease, achievement-glow 2s ease infinite;
            backdrop-filter: blur(10px);
        `;

        if (!document.getElementById('achievement-styles')) {
            const style = document.createElement('style');
            style.id = 'achievement-styles';
            style.textContent = `
                @keyframes achievement-slide {
                    from { transform: translateX(100px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes achievement-glow {
                    0%, 100% { box-shadow: 0 0 20px rgba(201, 162, 39, 0.3); }
                    50% { box-shadow: 0 0 30px rgba(201, 162, 39, 0.6); }
                }
                .achievement-icon {
                    font-size: 2rem;
                }
                .achievement-title {
                    font-weight: 700;
                    color: #c9a227;
                    font-size: 0.9rem;
                    letter-spacing: 0.1em;
                }
                .achievement-message {
                    color: #94a3b8;
                    font-size: 0.8rem;
                    margin-top: 4px;
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'achievement-slide 0.5s ease reverse';
            setTimeout(() => toast.remove(), 500);
        }, 4000);
    }

    destroy() {
        this.matrixMode = false;
    }
}

// Auto-initialize
export const easterEggs = new EasterEggs();
