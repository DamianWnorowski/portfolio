/**
 * SpotifyWidget Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpotifyWidget } from '../../src/components/SpotifyWidget.js';

const mockSpotifyData = {
    title: 'Test Song',
    artist: 'Test Artist',
    albumArt: 'https://example.com/album.jpg',
    isPlaying: true,
    progress: 60000,
    duration: 180000,
    songUrl: 'https://open.spotify.com/track/123'
};

describe('SpotifyWidget', () => {
    let spotifyWidget;
    let originalFetch;
    let originalOpen;

    beforeEach(() => {
        vi.useFakeTimers();
        originalFetch = global.fetch;
        originalOpen = window.open;
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockSpotifyData)
        });
        window.open = vi.fn();
        document.body.innerHTML = '<div class="sidebar"><div class="profile-content"></div></div>';
        spotifyWidget = new SpotifyWidget();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        global.fetch = originalFetch;
        window.open = originalOpen;
        if (spotifyWidget && spotifyWidget.element && spotifyWidget.element.parentNode) {
            spotifyWidget.element.remove();
        }
    });

    describe('Initialization', () => {
        it('creates the widget element', () => {
            expect(spotifyWidget.element).not.toBeNull();
            expect(document.querySelector('.spotify-widget')).not.toBeNull();
        });

        it('fetches now playing on creation', () => {
            expect(fetch).toHaveBeenCalledWith('/api/spotify');
        });

        it('starts polling', () => {
            expect(spotifyWidget.pollInterval).not.toBeNull();
        });
    });

    describe('Rendering', () => {
        it('renders the correct data when playing', async () => {
            await spotifyWidget.fetchNowPlaying();
            spotifyWidget.render();
            
            const status = spotifyWidget.element.querySelector('.spotify-status');
            const track = spotifyWidget.element.querySelector('.spotify-track');
            const artist = spotifyWidget.element.querySelector('.spotify-artist');
            const art = spotifyWidget.element.querySelector('.spotify-art');
            const progress = spotifyWidget.element.querySelector('.progress-fill');

            expect(status.textContent).toBe('NOW PLAYING');
            expect(track.textContent).toBe('Test Song');
            expect(artist.textContent).toBe('Test Artist');
            expect(art.style.backgroundImage).toContain('album.jpg');
            expect(progress.style.width).toBe('33.33333333333333%');
            expect(spotifyWidget.element.classList.contains('playing')).toBe(true);
            expect(spotifyWidget.element.classList.contains('visible')).toBe(true);
        });

        it('renders correctly when recently played', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ ...mockSpotifyData, isPlaying: false })
            });
            await spotifyWidget.fetchNowPlaying();
            spotifyWidget.render();

            const status = spotifyWidget.element.querySelector('.spotify-status');
            expect(status.textContent).toBe('RECENTLY PLAYED');
            expect(spotifyWidget.element.classList.contains('playing')).toBe(false);
        });

        it('hides widget when there is no title', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({})
            });
            await spotifyWidget.fetchNowPlaying();
            spotifyWidget.render();
            expect(spotifyWidget.element.classList.contains('visible')).toBe(false);
        });
    });

    describe('Click Handling', () => {
        it('opens song URL on click', async () => {
            await spotifyWidget.fetchNowPlaying();
            spotifyWidget.render();
            spotifyWidget.element.click();
            expect(window.open).toHaveBeenCalledWith('https://open.spotify.com/track/123', '_blank');
        });

        it('does nothing if there is no song URL', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ ...mockSpotifyData, songUrl: null })
            });
            await spotifyWidget.fetchNowPlaying();
            spotifyWidget.render();
            spotifyWidget.element.click();
            expect(window.open).not.toHaveBeenCalled();
        });
    });

    describe('Polling', () => {
        it('polls every 30 seconds', () => {
            expect(fetch).toHaveBeenCalledTimes(1);
            vi.advanceTimersByTime(30000);
            expect(fetch).toHaveBeenCalledTimes(2);
            vi.advanceTimersByTime(30000);
            expect(fetch).toHaveBeenCalledTimes(3);
        });

        it('stopPolling clears interval', () => {
            const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
            spotifyWidget.stopPolling();
            expect(clearIntervalSpy).toHaveBeenCalledWith(spotifyWidget.pollInterval);
        });
    });

    describe('destroy()', () => {
        it('stops polling and removes element', () => {
            const stopPollingSpy = vi.spyOn(spotifyWidget, 'stopPolling');
            const removeSpy = vi.spyOn(spotifyWidget.element, 'remove');
            spotifyWidget.destroy();
            expect(stopPollingSpy).toHaveBeenCalled();
            expect(removeSpy).toHaveBeenCalled();
        });
    });
});
