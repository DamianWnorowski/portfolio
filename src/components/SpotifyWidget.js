/**
 * Spotify Now Playing Widget
 * Shows current or recently played track
 */

export class SpotifyWidget {
    constructor() {
        this.data = null;
        this.element = null;
        this.isVisible = false;
        this.pollInterval = null;

        this.create();
        this.fetchNowPlaying();
        this.startPolling();
    }

    create() {
        this.element = document.createElement('div');
        this.element.className = 'spotify-widget';
        this.element.innerHTML = `
            <div class="spotify-content">
                <div class="spotify-icon">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                </div>
                <div class="spotify-info">
                    <div class="spotify-status">NOT PLAYING</div>
                    <div class="spotify-track">--</div>
                    <div class="spotify-artist">--</div>
                </div>
                <div class="spotify-art"></div>
            </div>
            <div class="spotify-progress">
                <div class="progress-fill"></div>
            </div>
        `;

        // Insert into page
        const sidebar = document.querySelector('.sidebar .profile-content');
        if (sidebar) {
            sidebar.appendChild(this.element);
        }

        this.addStyles();
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .spotify-widget {
                margin-top: 20px;
                padding: 15px;
                background: var(--bg-secondary, #0d1117);
                border: 1px solid var(--border-primary, rgba(255,255,255,0.1));
                border-radius: 6px;
                opacity: 0;
                transform: translateY(10px);
                transition: all 0.3s ease;
            }

            .spotify-widget.visible {
                opacity: 1;
                transform: translateY(0);
            }

            .spotify-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .spotify-icon {
                color: #1DB954;
                flex-shrink: 0;
            }

            .spotify-info {
                flex: 1;
                min-width: 0;
            }

            .spotify-status {
                font-family: var(--font-mono);
                font-size: 0.6rem;
                color: var(--text-muted);
                letter-spacing: 0.5px;
                margin-bottom: 2px;
            }

            .spotify-widget.playing .spotify-status {
                color: #1DB954;
            }

            .spotify-track {
                font-size: 0.8rem;
                font-weight: 500;
                color: var(--text-primary);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .spotify-artist {
                font-size: 0.7rem;
                color: var(--text-muted);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .spotify-art {
                width: 40px;
                height: 40px;
                border-radius: 4px;
                background: var(--bg-panel);
                background-size: cover;
                background-position: center;
                flex-shrink: 0;
            }

            .spotify-progress {
                height: 2px;
                background: var(--border-primary);
                border-radius: 1px;
                margin-top: 10px;
                overflow: hidden;
                opacity: 0;
                transition: opacity 0.3s;
            }

            .spotify-widget.playing .spotify-progress {
                opacity: 1;
            }

            .spotify-progress .progress-fill {
                height: 100%;
                background: #1DB954;
                width: 0%;
                transition: width 1s linear;
            }

            .spotify-widget:hover {
                border-color: #1DB954;
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
    }

    async fetchNowPlaying() {
        try {
            const response = await fetch('/api/spotify');
            if (!response.ok) throw new Error('Spotify fetch failed');

            this.data = await response.json();
            this.render();
        } catch (error) {
            console.warn('[SpotifyWidget] Error:', error);
            this.element.classList.remove('visible');
        }
    }

    render() {
        if (!this.data) return;

        const statusEl = this.element.querySelector('.spotify-status');
        const trackEl = this.element.querySelector('.spotify-track');
        const artistEl = this.element.querySelector('.spotify-artist');
        const artEl = this.element.querySelector('.spotify-art');
        const progressEl = this.element.querySelector('.progress-fill');

        if (this.data.title) {
            statusEl.textContent = this.data.isPlaying ? 'NOW PLAYING' : 'RECENTLY PLAYED';
            trackEl.textContent = this.data.title;
            artistEl.textContent = this.data.artist;

            if (this.data.albumArt) {
                artEl.style.backgroundImage = `url(${this.data.albumArt})`;
            }

            if (this.data.isPlaying && this.data.progress && this.data.duration) {
                const percent = (this.data.progress / this.data.duration) * 100;
                progressEl.style.width = `${percent}%`;
                this.element.classList.add('playing');
            } else {
                this.element.classList.remove('playing');
            }

            // Make clickable
            this.element.onclick = () => {
                if (this.data.songUrl) {
                    window.open(this.data.songUrl, '_blank');
                }
            };

            this.element.classList.add('visible');
        } else {
            this.element.classList.remove('visible');
        }
    }

    startPolling() {
        // Poll every 30 seconds
        this.pollInterval = setInterval(() => {
            this.fetchNowPlaying();
        }, 30000);
    }

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
    }

    destroy() {
        this.stopPolling();
        this.element?.remove();
    }
}
