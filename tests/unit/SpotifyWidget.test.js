/**
 * SpotifyWidget Unit Tests
 * Tests for Spotify now playing widget
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('SpotifyWidget', () => {
    let SpotifyWidget;
    let originalFetch;
    let originalOpen;

    const mockSpotifyData = {
        title: 'Test Song',
        artist: 'Test Artist',
        albumArt: 'https://example.com/album.jpg',
        isPlaying: true,
        progress: 60000,
        duration: 180000,
        songUrl: 'https://open.spotify.com/track/123'
    };

    let currentInstance = null;

    beforeEach(async () => {
        vi.resetModules();
        vi.useFakeTimers();

        // Store originals
        originalFetch = global.fetch;
        originalOpen = window.open;

        // Mock fetch
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockSpotifyData)
        });

        // Mock window.open
        window.open = vi.fn();

        document.body.innerHTML = '';
        document.head.innerHTML = '';

        const module = await import('../../src/components/SpotifyWidget.js');
        SpotifyWidget = module.SpotifyWidget;
    });

    afterEach(async () => {
        // Clean up any active instance to prevent unhandled rejections
        if (currentInstance) {
            currentInstance.stopPolling();
            currentInstance = null;
        }
        // Flush pending promises
        await vi.runAllTimersAsync();
        vi.useRealTimers();
        vi.restoreAllMocks();
        global.fetch = originalFetch;
        window.open = originalOpen;
    });

    describe('Initialization', () => {
        it('creates widget element', async () => {
            new SpotifyWidget();
            await vi.advanceTimersByTimeAsync(100);

            const widget = document.querySelector('.spotify-widget');
            expect(widget).not.toBeNull();
        });

        it('starts with null data', () => {
            const instance = new SpotifyWidget();
            expect(instance.data).toBeNull();
        });

        it('starts not visible', () => {
            const instance = new SpotifyWidget();
            expect(instance.isVisible).toBe(false);
        });

        it('fetches now playing on creation', async () => {
            new SpotifyWidget();
            await vi.advanceTimersByTimeAsync(100);

            expect(fetch).toHaveBeenCalledWith('/api/spotify');
        });

        it('starts polling', () => {
            const instance = new SpotifyWidget();

            expect(instance.pollInterval).not.toBeNull();
        });

        it('appends to sidebar profile-content if exists', async () => {
            document.body.innerHTML = `
                <div class="sidebar">
                    <div class="profile-content"></div>
                </div>
            `;

            new SpotifyWidget();
            await vi.advanceTimersByTimeAsync(100);

            const profileContent = document.querySelector('.profile-content');
            expect(profileContent.querySelector('.spotify-widget')).not.toBeNull();
        });
    });

    describe('Rendering', () => {
        let instance;

        beforeEach(async () => {
            instance = new SpotifyWidget();
            await vi.advanceTimersByTimeAsync(100);
        });

        it('renders spotify icon', () => {
            const icon = instance.element.querySelector('.spotify-icon');
            expect(icon).not.toBeNull();
            expect(icon.querySelector('svg')).not.toBeNull();
        });

        it('renders status element', () => {
            const status = instance.element.querySelector('.spotify-status');
            expect(status).not.toBeNull();
        });

        it('renders track element', () => {
            const track = instance.element.querySelector('.spotify-track');
            expect(track).not.toBeNull();
        });

        it('renders artist element', () => {
            const artist = instance.element.querySelector('.spotify-artist');
            expect(artist).not.toBeNull();
        });

        it('renders album art element', () => {
            const art = instance.element.querySelector('.spotify-art');
            expect(art).not.toBeNull();
        });

        it('renders progress bar', () => {
            const progress = instance.element.querySelector('.spotify-progress');
            expect(progress).not.toBeNull();
        });

        it('renders progress fill', () => {
            const fill = instance.element.querySelector('.progress-fill');
            expect(fill).not.toBeNull();
        });
    });

    describe('fetchNowPlaying', () => {
        it('fetches from /api/spotify', async () => {
            new SpotifyWidget();
            await vi.advanceTimersByTimeAsync(100);

            expect(fetch).toHaveBeenCalledWith('/api/spotify');
        });

        it('stores response data', async () => {
            const instance = new SpotifyWidget();
            await vi.advanceTimersByTimeAsync(100);

            expect(instance.data).toEqual(mockSpotifyData);
        });

        it('hides widget on error', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            const instance = new SpotifyWidget();
            await vi.advanceTimersByTimeAsync(100);

            expect(instance.element.classList.contains('visible')).toBe(false);
        });

        it('hides widget on non-ok response', async () => {
            global.fetch.mockResolvedValueOnce({ ok: false });

            const instance = new SpotifyWidget();
            await vi.advanceTimersByTimeAsync(100);

            expect(instance.element.classList.contains('visible')).toBe(false);
        });
    });

    describe('render()', () => {
        describe('When playing', () => {
            let instance;

            beforeEach(async () => {
                instance = new SpotifyWidget();
                await vi.advanceTimersByTimeAsync(100);
            });

            it('shows NOW PLAYING status', () => {
                const status = instance.element.querySelector('.spotify-status');
                expect(status.textContent).toBe('NOW PLAYING');
            });

            it('displays track title', () => {
                const track = instance.element.querySelector('.spotify-track');
                expect(track.textContent).toBe('Test Song');
            });

            it('displays artist name', () => {
                const artist = instance.element.querySelector('.spotify-artist');
                expect(artist.textContent).toBe('Test Artist');
            });

            it('sets album art background', () => {
                const art = instance.element.querySelector('.spotify-art');
                expect(art.style.backgroundImage).toContain('album.jpg');
            });

            it('calculates progress percentage', () => {
                const fill = instance.element.querySelector('.progress-fill');
                // 60000 / 180000 = 33.33%
                expect(fill.style.width).toBe('33.333333333333336%');
            });

            it('adds playing class', () => {
                expect(instance.element.classList.contains('playing')).toBe(true);
            });

            it('adds visible class', () => {
                expect(instance.element.classList.contains('visible')).toBe(true);
            });
        });

        describe('When recently played', () => {
            beforeEach(() => {
                global.fetch.mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({
                        ...mockSpotifyData,
                        isPlaying: false
                    })
                });
            });

            it('shows RECENTLY PLAYED status', async () => {
                const instance = new SpotifyWidget();
                await vi.advanceTimersByTimeAsync(100);

                const status = instance.element.querySelector('.spotify-status');
                expect(status.textContent).toBe('RECENTLY PLAYED');
            });

            it('removes playing class', async () => {
                const instance = new SpotifyWidget();
                await vi.advanceTimersByTimeAsync(100);

                expect(instance.element.classList.contains('playing')).toBe(false);
            });
        });

        describe('When no data', () => {
            beforeEach(() => {
                global.fetch.mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({})
                });
            });

            it('hides widget when no title', async () => {
                const instance = new SpotifyWidget();
                await vi.advanceTimersByTimeAsync(100);

                expect(instance.element.classList.contains('visible')).toBe(false);
            });
        });

        it('does nothing when data is null', async () => {
            const instance = new SpotifyWidget();
            instance.data = null;

            expect(() => instance.render()).not.toThrow();
        });
    });

    describe('Click handling', () => {
        it('opens song URL on click', async () => {
            const instance = new SpotifyWidget();
            await vi.advanceTimersByTimeAsync(100);

            instance.element.click();

            expect(window.open).toHaveBeenCalledWith(
                'https://open.spotify.com/track/123',
                '_blank'
            );
        });

        it('does nothing when no song URL', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    ...mockSpotifyData,
                    songUrl: null
                })
            });

            const instance = new SpotifyWidget();
            await vi.advanceTimersByTimeAsync(100);

            instance.element.click();

            expect(window.open).not.toHaveBeenCalled();
        });
    });

    describe('Polling', () => {
        it('polls every 30 seconds', async () => {
            new SpotifyWidget();
            await vi.advanceTimersByTimeAsync(100);

            expect(fetch).toHaveBeenCalledTimes(1);

            vi.advanceTimersByTime(30000);
            expect(fetch).toHaveBeenCalledTimes(2);

            vi.advanceTimersByTime(30000);
            expect(fetch).toHaveBeenCalledTimes(3);
        });

        it('stopPolling clears interval', async () => {
            const instance = new SpotifyWidget();
            await vi.advanceTimersByTimeAsync(100);

            instance.stopPolling();

            const callCount = fetch.mock.calls.length;
            vi.advanceTimersByTime(60000);

            expect(fetch).toHaveBeenCalledTimes(callCount);
        });

        it('handles null pollInterval gracefully', () => {
            const instance = new SpotifyWidget();
            instance.pollInterval = null;

            expect(() => instance.stopPolling()).not.toThrow();
        });
    });

    describe('Styles', () => {
        it('adds styles to document', async () => {
            new SpotifyWidget();
            await vi.advanceTimersByTimeAsync(100);

            const styles = document.querySelector('style');
            expect(styles).not.toBeNull();
            expect(styles.textContent).toContain('.spotify-widget');
        });

        it('includes Spotify green color', async () => {
            new SpotifyWidget();
            await vi.advanceTimersByTimeAsync(100);

            const styles = document.querySelector('style');
            expect(styles.textContent).toContain('#1DB954');
        });

        it('includes playing state styles', async () => {
            new SpotifyWidget();
            await vi.advanceTimersByTimeAsync(100);

            const styles = document.querySelector('style');
            expect(styles.textContent).toContain('.spotify-widget.playing');
        });

        it('includes visible state styles', async () => {
            new SpotifyWidget();
            await vi.advanceTimersByTimeAsync(100);

            const styles = document.querySelector('style');
            expect(styles.textContent).toContain('.spotify-widget.visible');
        });

        it('includes hover styles', async () => {
            new SpotifyWidget();
            await vi.advanceTimersByTimeAsync(100);

            const styles = document.querySelector('style');
            expect(styles.textContent).toContain('.spotify-widget:hover');
        });
    });

    describe('destroy()', () => {
        it('stops polling', async () => {
            const instance = new SpotifyWidget();
            await vi.advanceTimersByTimeAsync(100);

            const stopPollingSpy = vi.spyOn(instance, 'stopPolling');
            instance.destroy();

            expect(stopPollingSpy).toHaveBeenCalled();
        });

        it('removes element from DOM', async () => {
            document.body.innerHTML = `
                <div class="sidebar">
                    <div class="profile-content"></div>
                </div>
            `;

            const instance = new SpotifyWidget();
            await vi.advanceTimersByTimeAsync(100);

            instance.destroy();

            expect(document.querySelector('.spotify-widget')).toBeNull();
        });

        it('handles null element gracefully', async () => {
            const instance = new SpotifyWidget();
            await vi.advanceTimersByTimeAsync(100);
            instance.stopPolling();
            instance.element = null;

            expect(() => instance.destroy()).not.toThrow();
        });
    });

    describe('Progress calculation', () => {
        it('calculates 0% when progress is 0', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    ...mockSpotifyData,
                    progress: 0
                })
            });

            const instance = new SpotifyWidget();
            await vi.advanceTimersByTimeAsync(100);

            const fill = instance.element.querySelector('.progress-fill');
            expect(fill.style.width).toBe('0%');
        });

        it('calculates 50% when halfway', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    ...mockSpotifyData,
                    progress: 90000,
                    duration: 180000
                })
            });

            const instance = new SpotifyWidget();
            await vi.advanceTimersByTimeAsync(100);

            const fill = instance.element.querySelector('.progress-fill');
            expect(fill.style.width).toBe('50%');
        });

        it('calculates 100% when complete', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    ...mockSpotifyData,
                    progress: 180000,
                    duration: 180000
                })
            });

            const instance = new SpotifyWidget();
            await vi.advanceTimersByTimeAsync(100);

            const fill = instance.element.querySelector('.progress-fill');
            expect(fill.style.width).toBe('100%');
        });
    });
});
