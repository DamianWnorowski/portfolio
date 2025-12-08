/**
 * Loading Screen
 * Boot sequence animation with progress bar
 */

export class LoadingScreen {
    constructor() {
        this.element = null;
        this.progress = 0;
        this.messages = [
            'Initializing neural interface...',
            'Loading competency matrix...',
            'Connecting to global network...',
            'Calibrating holographic display...',
            'Synchronizing deployment nodes...',
            'Establishing secure connection...',
            'System ready.'
        ];
        this.currentMessage = 0;
        this.create();
    }

    create() {
        this.element = document.createElement('div');
        this.element.id = 'loading-screen';
        this.element.innerHTML = `
            <div class="loader-content">
                <div class="loader-logo">
                    <span class="logo-letter">K</span>
                    <div class="logo-ring"></div>
                    <div class="logo-ring ring-2"></div>
                </div>
                <div class="loader-title">KAIZEN</div>
                <div class="loader-subtitle">EXECUTIVE TERMINAL v13</div>
                <div class="loader-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress-fill"></div>
                        <div class="progress-glow"></div>
                    </div>
                    <div class="progress-text" id="progress-text">0%</div>
                </div>
                <div class="loader-message" id="loader-message">Initializing...</div>
                <div class="loader-stats">
                    <span class="stat">SYS: <span class="hl">NOMINAL</span></span>
                    <span class="stat">SEC: <span class="hl">ENCRYPTED</span></span>
                    <span class="stat">NET: <span class="hl">CONNECTED</span></span>
                </div>
            </div>
        `;
        document.body.prepend(this.element);
        this.addStyles();
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #loading-screen {
                position: fixed;
                inset: 0;
                background: #0a0c10;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: opacity 0.5s ease, visibility 0.5s ease;
            }

            #loading-screen.hidden {
                opacity: 0;
                visibility: hidden;
            }

            .loader-content {
                text-align: center;
                color: #f8fafc;
            }

            .loader-logo {
                position: relative;
                width: 120px;
                height: 120px;
                margin: 0 auto 30px;
            }

            .logo-letter {
                position: absolute;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 3rem;
                font-weight: 700;
                color: #c9a227;
                z-index: 2;
            }

            .logo-ring {
                position: absolute;
                inset: 0;
                border: 2px solid rgba(201, 162, 39, 0.3);
                border-top-color: #c9a227;
                border-radius: 50%;
                animation: spin 1.5s linear infinite;
            }

            .logo-ring.ring-2 {
                inset: 10px;
                border-color: rgba(74, 158, 255, 0.2);
                border-top-color: #4a9eff;
                animation-duration: 2s;
                animation-direction: reverse;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            .loader-title {
                font-size: 2rem;
                font-weight: 700;
                letter-spacing: 8px;
                margin-bottom: 5px;
            }

            .loader-subtitle {
                font-family: 'JetBrains Mono', monospace;
                font-size: 0.7rem;
                color: #64748b;
                letter-spacing: 2px;
                margin-bottom: 40px;
            }

            .loader-progress {
                width: 300px;
                margin: 0 auto 20px;
            }

            .progress-bar {
                position: relative;
                height: 4px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 2px;
                overflow: hidden;
            }

            .progress-fill {
                height: 100%;
                width: 0%;
                background: linear-gradient(90deg, #4a9eff, #c9a227);
                border-radius: 2px;
                transition: width 0.3s ease;
            }

            .progress-glow {
                position: absolute;
                top: -10px;
                bottom: -10px;
                left: 0;
                width: 50px;
                background: linear-gradient(90deg, transparent, rgba(201, 162, 39, 0.3), transparent);
                animation: glow-sweep 2s ease-in-out infinite;
            }

            @keyframes glow-sweep {
                0% { transform: translateX(-50px); }
                100% { transform: translateX(350px); }
            }

            .progress-text {
                font-family: 'JetBrains Mono', monospace;
                font-size: 0.75rem;
                color: #c9a227;
                margin-top: 10px;
            }

            .loader-message {
                font-family: 'JetBrains Mono', monospace;
                font-size: 0.75rem;
                color: #94a3b8;
                margin-bottom: 30px;
                min-height: 20px;
            }

            .loader-stats {
                display: flex;
                justify-content: center;
                gap: 30px;
                font-family: 'JetBrains Mono', monospace;
                font-size: 0.65rem;
                color: #64748b;
            }

            .loader-stats .hl {
                color: #22c55e;
            }
        `;
        document.head.appendChild(style);
    }

    async start() {
        const fill = document.getElementById('progress-fill');
        const text = document.getElementById('progress-text');
        const message = document.getElementById('loader-message');

        // Simulate loading progress
        const steps = [
            { progress: 15, delay: 300 },
            { progress: 30, delay: 400 },
            { progress: 45, delay: 350 },
            { progress: 60, delay: 300 },
            { progress: 75, delay: 400 },
            { progress: 90, delay: 300 },
            { progress: 100, delay: 200 }
        ];

        for (let i = 0; i < steps.length; i++) {
            await this.delay(steps[i].delay);
            this.progress = steps[i].progress;
            fill.style.width = `${this.progress}%`;
            text.textContent = `${this.progress}%`;

            if (this.messages[i]) {
                message.textContent = this.messages[i];
            }
        }

        // Final delay before hiding
        await this.delay(500);
        this.hide();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    hide() {
        this.element.classList.add('hidden');
        setTimeout(() => {
            this.element.remove();
        }, 500);
    }
}
