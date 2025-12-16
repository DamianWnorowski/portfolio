/**
 * Spotify Now Playing Widget
 * Real-time display of currently playing or recently played track
 */

import { eventBus, Events } from '../core/EventBus.js';

export class SpotifyWidget {
    constructor(container) {
        // Support both container-based and auto-discovery initialization
        if (container) {
            this.container = typeof container === 'string'
                ? document.querySelector(container)
                : container;
        } else {
            // Auto-discover container for backwards compatibility with tests
            const sidebar = document.querySelector('.sidebar .profile-content') || document.querySelector('.sidebar');
            if (sidebar) {
                this.container = sidebar;
            }
        }

        this.data = null;
        this.pollInterval = null;
        this.isPlaying = false;
        this.progressInterval = null;
        this.currentProgress = 0;
        this.element = null;

        if (this.container) {
            this.init();
        }
    }

    async init() {
        this.createWidget();
        await this.fetchNowPlaying();
        this.render();
        this.startPolling();
    }

    createWidget() {
        this.element = document.createElement('div');
        this.element.className = 'spotify-widget';
        this.element.innerHTML = `
            <div class="spotify-header">
                <svg class="spotify-icon" viewBox="0 0 24 24" width="20" height="20">
                    <path fill="currentColor" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                <span class="spotify-status">LOADING</span>
            </div>
            <div class="spotify-content">
                <div class="spotify-art"></div>
                <div class="spotify-info">
                    <div class="spotify-track"></div>
                    <div class="spotify-artist"></div>
                </div>
            </div>
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
        `;
        this.container.appendChild(this.element);

        // Add click handler
        this.element.addEventListener('click', () => this.handleClick());

        this.addStyles();
    }

    handleClick() {
        if (this.data && this.data.songUrl) {
            window.open(this.data.songUrl, '_blank');
        }
    }
    
    addStyles() {
        if (document.getElementById('spotify-widget-styles')) return;

        const style = document.createElement('style');
        style.id = 'spotify-widget-styles';
        style.textContent = `
            .spotify-widget {
                background: var(--bg-tertiary, #1a1d23);
                border: 1px solid var(--border-color, #2a2f3a);
                border-radius: 12px;
                padding: 16px;
                transition: all 0.3s ease;
                cursor: pointer;
                opacity: 0;
                transform: translateY(10px);
            }

            .spotify-widget.visible {
                opacity: 1;
                transform: translateY(0);
            }

            .spotify-widget.playing {
                border-color: #1db954;
                box-shadow: 0 0 20px rgba(29, 185, 84, 0.1);
            }

            .spotify-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 12px;
                padding-bottom: 12px;
                border-bottom: 1px solid var(--border-color, #2a2f3a);
            }

            .spotify-icon {
                color: #1db954;
            }

            .spotify-status {
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: var(--text-muted, #6e7681);
                flex: 1;
            }

            .spotify-content {
                display: flex;
                gap: 12px;
                align-items: center;
                min-height: 48px;
            }

            .spotify-art {
                width: 48px;
                height: 48px;
                border-radius: 6px;
                background: var(--bg-secondary, #161b22);
                background-size: cover;
                background-position: center;
                flex-shrink: 0;
            }

            .spotify-info {
                flex: 1;
                min-width: 0;
            }

            .spotify-track {
                font-size: 13px;
                font-weight: 600;
                color: var(--text-primary, #f0f6fc);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                margin-bottom: 2px;
            }

            .spotify-artist {
                font-size: 11px;
                color: var(--text-secondary, #8b949e);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .progress-bar {
                height: 3px;
                background: var(--bg-secondary, #161b22);
                border-radius: 2px;
                overflow: hidden;
                margin-top: 12px;
            }

            .progress-fill {
                height: 100%;
                background: #1db954;
                border-radius: 2px;
                transition: width 1s linear;
                width: 0%;
            }
        `;
        document.head.appendChild(style);
    }
    
    async fetchNowPlaying() {
        try {
            const response = await fetch('/api/spotify');
            if (!response.ok) throw new Error('Failed to fetch');

            this.data = await response.json();

        } catch (error) {
            this.data = null;
        }
    }

    render() {
        if (!this.element) return;

        const status = this.element.querySelector('.spotify-status');
        const track = this.element.querySelector('.spotify-track');
        const artist = this.element.querySelector('.spotify-artist');
        const art = this.element.querySelector('.spotify-art');
        const progressFill = this.element.querySelector('.progress-fill');

        // Hide if no data or no title
        if (!this.data || !this.data.title) {
            this.element.classList.remove('visible');
            this.element.classList.remove('playing');
            return;
        }

        // Update content
        this.isPlaying = this.data.isPlaying;

        if (status) status.textContent = this.isPlaying ? 'NOW PLAYING' : 'RECENTLY PLAYED';
        if (track) track.textContent = this.data.title;
        if (artist) artist.textContent = this.data.artist;

        if (art && this.data.albumArt) {
            art.style.backgroundImage = `url(${this.data.albumArt})`;
        }

        // Update progress bar
        if (progressFill && this.data.progress && this.data.duration) {
            const progressPercent = (this.data.progress / this.data.duration) * 100;
            progressFill.style.width = `${progressPercent}%`;
            this.currentProgress = this.data.progress;
        }

        // Update classes
        this.element.classList.add('visible');
        if (this.isPlaying) {
            this.element.classList.add('playing');
            this.startProgressAnimation();
        } else {
            this.element.classList.remove('playing');
            this.stopProgressAnimation();
        }

        eventBus.emit(Events.DATA_LOADED, { type: 'spotify', data: this.data });
    }
    
    startProgressAnimation() {
        this.stopProgressAnimation();

        this.progressInterval = setInterval(() => {
            if (!this.isPlaying || !this.data || !this.data.duration) return;

            this.currentProgress += 1000;
            const progressPercent = (this.currentProgress / this.data.duration) * 100;

            const fill = this.element?.querySelector('.progress-fill');
            if (fill) fill.style.width = `${Math.min(progressPercent, 100)}%`;

            // Refetch when track should be ending
            if (this.currentProgress >= this.data.duration) {
                this.fetchNowPlaying().then(() => this.render());
            }
        }, 1000);
    }

    stopProgressAnimation() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    startPolling() {
        // Poll every 30 seconds
        this.pollInterval = setInterval(async () => {
            await this.fetchNowPlaying();
            this.render();
        }, 30000);
    }

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    destroy() {
        this.stopPolling();
        this.stopProgressAnimation();
        if (this.element && this.element.parentNode) {
            this.element.remove();
        }
    }
}

// Auto-init
export const spotifyWidget = typeof document !== 'undefined'
    ? null // Will be initialized when container is ready
    : null;
