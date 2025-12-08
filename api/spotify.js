/**
 * Spotify Now Playing API - Edge Function
 * Shows currently playing or recently played track
 */

export const config = {
    runtime: 'edge'
};

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;

const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const NOW_PLAYING_ENDPOINT = 'https://api.spotify.com/v1/me/player/currently-playing';
const RECENTLY_PLAYED_ENDPOINT = 'https://api.spotify.com/v1/me/player/recently-played?limit=1';

async function getAccessToken() {
    const basic = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);

    const response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: REFRESH_TOKEN
        })
    });

    return response.json();
}

export default async function handler(req) {
    try {
        if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
            return new Response(JSON.stringify({
                isPlaying: false,
                message: 'Spotify not configured'
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, s-maxage=60'
                }
            });
        }

        const { access_token } = await getAccessToken();

        // Try currently playing first
        const nowPlayingRes = await fetch(NOW_PLAYING_ENDPOINT, {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        });

        if (nowPlayingRes.status === 200) {
            const song = await nowPlayingRes.json();

            if (song.item) {
                return new Response(JSON.stringify({
                    isPlaying: song.is_playing,
                    title: song.item.name,
                    artist: song.item.artists.map(a => a.name).join(', '),
                    album: song.item.album.name,
                    albumArt: song.item.album.images[0]?.url,
                    songUrl: song.item.external_urls.spotify,
                    progress: song.progress_ms,
                    duration: song.item.duration_ms
                }), {
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'public, s-maxage=30',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }
        }

        // Fall back to recently played
        const recentRes = await fetch(RECENTLY_PLAYED_ENDPOINT, {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        });

        if (recentRes.status === 200) {
            const recent = await recentRes.json();

            if (recent.items && recent.items.length > 0) {
                const track = recent.items[0].track;

                return new Response(JSON.stringify({
                    isPlaying: false,
                    title: track.name,
                    artist: track.artists.map(a => a.name).join(', '),
                    album: track.album.name,
                    albumArt: track.album.images[0]?.url,
                    songUrl: track.external_urls.spotify,
                    playedAt: recent.items[0].played_at
                }), {
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'public, s-maxage=60',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }
        }

        return new Response(JSON.stringify({
            isPlaying: false,
            message: 'No recent tracks'
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, s-maxage=60',
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (error) {
        console.error('Spotify API error:', error);

        return new Response(JSON.stringify({
            isPlaying: false,
            error: 'Failed to fetch Spotify data'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}
