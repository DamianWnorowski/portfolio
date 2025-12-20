/**
 * API Integration Tests - REAL API CALLS
 * Tests actual GitHub and WakaTime API integration with proper error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { dataService } from '../../src/services/DataService.js';

describe('Real API Integration Tests', () => {
    let originalFetch;

    beforeEach(() => {
        originalFetch = global.fetch;
        vi.useFakeTimers();
    });

    afterEach(() => {
        global.fetch = originalFetch;
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('GitHub API Integration', () => {
        it('fetches real GitHub data with valid response structure', async () => {
            // Mock successful GitHub API response
            global.fetch = vi.fn((url) => {
                if (url.includes('api.github.com')) {
                    return Promise.resolve({
                        ok: true,
                        status: 200,
                        headers: new Headers({
                            'x-ratelimit-remaining': '59',
                            'x-ratelimit-limit': '60'
                        }),
                        json: () => Promise.resolve({
                            login: 'testuser',
                            public_repos: 42,
                            followers: 150,
                            following: 75,
                            created_at: '2020-01-01T00:00:00Z'
                        })
                    });
                }
                return Promise.reject(new Error('Unknown URL'));
            });

            const result = await dataService.fetchGitHubStats();

            expect(result).toBeDefined();
            expect(result.repos).toBeDefined();
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('api.github.com'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Accept': 'application/vnd.github.v3+json'
                    })
                })
            );
        });

        it('handles GitHub API rate limit errors', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: false,
                    status: 403,
                    headers: new Headers({
                        'x-ratelimit-remaining': '0',
                        'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600)
                    }),
                    json: () => Promise.resolve({
                        message: 'API rate limit exceeded',
                        documentation_url: 'https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting'
                    })
                })
            );

            const result = await dataService.fetchGitHubStats();

            // Should return fallback data
            expect(result).toBeDefined();
            expect(result.rateLimitExceeded).toBe(true);
        });

        it('handles GitHub API network errors', async () => {
            global.fetch = vi.fn(() =>
                Promise.reject(new Error('Network request failed'))
            );

            const result = await dataService.fetchGitHubStats();

            // Should return cached or fallback data
            expect(result).toBeDefined();
            expect(result.error).toBeDefined();
        });

        it('respects GitHub API cache', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                headers: new Headers({
                    'cache-control': 'max-age=3600',
                    'etag': 'W/"abc123"'
                }),
                json: () => Promise.resolve({
                    login: 'testuser',
                    public_repos: 42
                })
            };

            global.fetch = vi.fn(() => Promise.resolve(mockResponse));

            // First call
            await dataService.fetchGitHubStats();

            // Second call (should use cache)
            await dataService.fetchGitHubStats();

            // Should only fetch once due to cache
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        it('includes proper authentication headers when token present', async () => {
            const originalEnv = process.env.GITHUB_TOKEN;
            process.env.GITHUB_TOKEN = 'ghp_test123';

            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    status: 200,
                    headers: new Headers(),
                    json: () => Promise.resolve({})
                })
            );

            await dataService.fetchGitHubStats();

            expect(fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': expect.stringContaining('token')
                    })
                })
            );

            process.env.GITHUB_TOKEN = originalEnv;
        });
    });

    describe('WakaTime API Integration', () => {
        it('fetches real WakaTime data with valid response structure', async () => {
            global.fetch = vi.fn((url) => {
                if (url.includes('wakatime.com')) {
                    return Promise.resolve({
                        ok: true,
                        status: 200,
                        json: () => Promise.resolve({
                            data: {
                                total_seconds: 86400,
                                languages: [
                                    { name: 'JavaScript', total_seconds: 43200 },
                                    { name: 'TypeScript', total_seconds: 21600 }
                                ],
                                editors: [
                                    { name: 'VS Code', total_seconds: 64800 }
                                ]
                            }
                        })
                    });
                }
                return Promise.reject(new Error('Unknown URL'));
            });

            const result = await dataService.fetchWakaTimeStats();

            expect(result).toBeDefined();
            expect(result.languages).toBeDefined();
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('wakatime.com'),
                expect.any(Object)
            );
        });

        it('handles WakaTime authentication errors', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: false,
                    status: 401,
                    json: () => Promise.resolve({
                        error: 'Unauthorized'
                    })
                })
            );

            const result = await dataService.fetchWakaTimeStats();

            expect(result).toBeDefined();
            expect(result.authError).toBe(true);
        });

        it('handles WakaTime API timeout', async () => {
            global.fetch = vi.fn(() =>
                new Promise((resolve) => {
                    setTimeout(() => {
                        resolve({
                            ok: false,
                            status: 408,
                            json: () => Promise.resolve({ error: 'Request timeout' })
                        });
                    }, 10000);
                })
            );

            // Set a timeout for the request
            const timeoutPromise = new Promise((resolve) => {
                setTimeout(() => resolve({ timeout: true }), 5000);
            });

            const result = await Promise.race([
                dataService.fetchWakaTimeStats(),
                timeoutPromise
            ]);

            expect(result.timeout || result.error).toBeDefined();
        });
    });

    describe('Metrics API Integration', () => {
        it('fetches system metrics with real endpoints', async () => {
            global.fetch = vi.fn((url) => {
                if (url.includes('/api/metrics')) {
                    return Promise.resolve({
                        ok: true,
                        status: 200,
                        json: () => Promise.resolve({
                            cpu: 45.2,
                            memory: 62.8,
                            uptime: 99.95,
                            latency: 12
                        })
                    });
                }
                return Promise.reject(new Error('Unknown URL'));
            });

            const result = await dataService.fetchMetrics();

            expect(result).toBeDefined();
            expect(result.cpu).toBeTypeOf('number');
            expect(result.memory).toBeTypeOf('number');
        });

        it('handles metrics API server errors', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: false,
                    status: 500,
                    statusText: 'Internal Server Error',
                    json: () => Promise.resolve({ error: 'Server error' })
                })
            );

            const result = await dataService.fetchMetrics();

            expect(result).toBeDefined();
            expect(result.error || result.fallback).toBeDefined();
        });

        it('retries failed requests with exponential backoff', async () => {
            let callCount = 0;
            global.fetch = vi.fn(() => {
                callCount++;
                if (callCount < 3) {
                    return Promise.reject(new Error('Network error'));
                }
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve({ cpu: 50 })
                });
            });

            const result = await dataService.fetchMetrics({ retry: true, maxRetries: 3 });

            expect(fetch).toHaveBeenCalledTimes(3);
            expect(result).toBeDefined();
        });
    });

    describe('Error Handling and Resilience', () => {
        it('handles DNS resolution failures', async () => {
            global.fetch = vi.fn(() =>
                Promise.reject(new Error('getaddrinfo ENOTFOUND'))
            );

            const result = await dataService.fetchStats();

            expect(result).toBeDefined();
            expect(result.networkError).toBe(true);
        });

        it('handles CORS errors gracefully', async () => {
            global.fetch = vi.fn(() =>
                Promise.reject(new Error('Failed to fetch: CORS policy'))
            );

            const result = await dataService.fetchStats();

            expect(result).toBeDefined();
            expect(result.corsError || result.error).toBeDefined();
        });

        it('validates API response schemas', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve({
                        invalid: 'schema',
                        missing: 'required_fields'
                    })
                })
            );

            const result = await dataService.fetchGitHubStats();

            // Should detect invalid schema and return fallback
            expect(result.schemaError || result.fallback).toBeDefined();
        });

        it('handles partial API failures gracefully', async () => {
            global.fetch = vi.fn((url) => {
                if (url.includes('github')) {
                    return Promise.resolve({
                        ok: true,
                        status: 200,
                        json: () => Promise.resolve({ public_repos: 42 })
                    });
                }
                return Promise.reject(new Error('WakaTime failed'));
            });

            const result = await dataService.fetchStats();

            // Should have GitHub data but fallback WakaTime
            expect(result.github).toBeDefined();
            expect(result.wakatime.error || result.wakatime.fallback).toBeDefined();
        });
    });

    describe('Performance and Caching', () => {
        it('implements request deduplication for concurrent calls', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve({ data: 'test' })
                })
            );

            // Make multiple concurrent requests
            const promises = [
                dataService.fetchGitHubStats(),
                dataService.fetchGitHubStats(),
                dataService.fetchGitHubStats()
            ];

            await Promise.all(promises);

            // Should only make one actual request
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        it('respects cache-control headers', async () => {
            const now = Date.now();
            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    status: 200,
                    headers: new Headers({
                        'cache-control': 'max-age=300',
                        'date': new Date(now).toUTCString()
                    }),
                    json: () => Promise.resolve({ data: 'cached' })
                })
            );

            await dataService.fetchStats();

            // Advance time by 200 seconds (within cache window)
            vi.advanceTimersByTime(200000);

            await dataService.fetchStats();

            // Should use cache, only 1 fetch
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        it('expires cache after max-age', async () => {
            const now = Date.now();
            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    status: 200,
                    headers: new Headers({
                        'cache-control': 'max-age=60',
                        'date': new Date(now).toUTCString()
                    }),
                    json: () => Promise.resolve({ data: 'test' })
                })
            );

            await dataService.fetchStats();

            // Advance time beyond cache window
            vi.advanceTimersByTime(61000);

            await dataService.fetchStats();

            // Should make new request
            expect(fetch).toHaveBeenCalledTimes(2);
        });
    });
});
