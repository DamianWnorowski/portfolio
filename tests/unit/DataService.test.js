/**
 * DataService Unit Tests
 * Tests for API communication and data caching
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock EventBus
vi.mock('../../src/core/EventBus.js', () => ({
    eventBus: {
        emit: vi.fn()
    },
    Events: {
        STATS_LOADED: 'stats:loaded'
    }
}));

describe('DataService', () => {
    let DataService;
    let dataService;
    let eventBusMock;
    let originalFetch;

    beforeEach(async () => {
        vi.resetModules();

        // Store original fetch
        originalFetch = global.fetch;

        // Mock fetch
        global.fetch = vi.fn();

        // Import mocks
        const eventBusModule = await import('../../src/core/EventBus.js');
        eventBusMock = eventBusModule.eventBus;

        // Import fresh module
        const module = await import('../../src/services/DataService.js');
        DataService = module.dataService.constructor;
        dataService = new DataService();
    });

    afterEach(() => {
        global.fetch = originalFetch;
        vi.restoreAllMocks();
    });

    describe('Initialization', () => {
        it('starts with empty cache', () => {
            expect(dataService.cache.size).toBe(0);
        });

        it('sets default cache TTL to 5 minutes', () => {
            expect(dataService.cacheTTL).toBe(5 * 60 * 1000);
        });

        it('sets empty base URL for same-origin', () => {
            expect(dataService.baseUrl).toBe('');
        });
    });

    describe('fetchStats', () => {
        const mockStats = {
            github: {
                username: 'testuser',
                repos: 50,
                stars: 500,
                commits: 2000
            },
            metrics: {
                cpu: 20,
                memory: 50
            },
            uptime: {
                percentage: 99.99
            }
        };

        it('fetches stats from API', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockStats)
            });

            const result = await dataService.fetchStats();

            expect(fetch).toHaveBeenCalledWith('/api/stats');
            expect(result).toEqual(mockStats);
        });

        it('emits STATS_LOADED event', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockStats)
            });

            await dataService.fetchStats();

            expect(eventBusMock.emit).toHaveBeenCalledWith('stats:loaded', mockStats);
        });

        it('caches response', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockStats)
            });

            await dataService.fetchStats();
            const cached = dataService.getFromCache('stats');

            expect(cached).toEqual(mockStats);
        });

        it('returns cached data on subsequent calls', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockStats)
            });

            await dataService.fetchStats();
            await dataService.fetchStats();

            expect(fetch).toHaveBeenCalledTimes(1);
        });

        it('returns fallback on fetch error', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await dataService.fetchStats();

            expect(result).toHaveProperty('github');
            expect(result).toHaveProperty('metrics');
            expect(result).toHaveProperty('uptime');
        });

        it('returns fallback on non-ok response', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false
            });

            const result = await dataService.fetchStats();

            expect(result.github.username).toBe('damianwnorowski');
        });
    });

    describe('fetchContributions', () => {
        const mockContributions = {
            total: 2000,
            weeks: [{ contributionDays: [] }],
            streak: { current: 30, longest: 100 }
        };

        it('fetches contributions from API', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockContributions)
            });

            const result = await dataService.fetchContributions();

            expect(fetch).toHaveBeenCalledWith('/api/github/contributions');
            expect(result).toEqual(mockContributions);
        });

        it('caches contributions', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockContributions)
            });

            await dataService.fetchContributions();
            const cached = dataService.getFromCache('contributions');

            expect(cached).toEqual(mockContributions);
        });

        it('returns fallback on error', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await dataService.fetchContributions();

            expect(result).toHaveProperty('total');
            expect(result).toHaveProperty('weeks');
            expect(result).toHaveProperty('streak');
        });

        it('fallback has 52 weeks', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Error'));

            const result = await dataService.fetchContributions();

            expect(result.weeks.length).toBe(52);
        });

        it('fallback weeks have 7 days each', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Error'));

            const result = await dataService.fetchContributions();

            result.weeks.forEach(week => {
                expect(week.contributionDays.length).toBe(7);
            });
        });
    });

    describe('fetchLogs', () => {
        const mockLogs = {
            logs: [
                { id: 1, message: 'Log 1' },
                { id: 2, message: 'Log 2' }
            ]
        };

        it('fetches logs from API', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockLogs)
            });

            const result = await dataService.fetchLogs();

            expect(fetch).toHaveBeenCalledWith('/api/logs/stream');
            expect(result).toEqual(mockLogs.logs);
        });

        it('returns empty array on error', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await dataService.fetchLogs();

            expect(result).toEqual([]);
        });

        it('accepts count parameter', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockLogs)
            });

            await dataService.fetchLogs(20);

            expect(fetch).toHaveBeenCalled();
        });
    });

    describe('Caching', () => {
        it('stores data with timestamp', () => {
            const now = Date.now();
            dataService.setCache('test', { foo: 'bar' });

            const cached = dataService.cache.get('test');
            expect(cached.data).toEqual({ foo: 'bar' });
            expect(cached.timestamp).toBeGreaterThanOrEqual(now);
        });

        it('returns null for missing cache key', () => {
            const result = dataService.getFromCache('nonexistent');

            expect(result).toBeNull();
        });

        it('returns data for valid cache entry', () => {
            dataService.setCache('test', { foo: 'bar' });

            const result = dataService.getFromCache('test');

            expect(result).toEqual({ foo: 'bar' });
        });

        it('returns null for expired cache entry', () => {
            dataService.setCache('test', { foo: 'bar' });

            // Manually expire the cache
            const cached = dataService.cache.get('test');
            cached.timestamp = Date.now() - (6 * 60 * 1000); // 6 minutes ago

            const result = dataService.getFromCache('test');

            expect(result).toBeNull();
        });

        it('removes expired entries from cache', () => {
            dataService.setCache('test', { foo: 'bar' });

            const cached = dataService.cache.get('test');
            cached.timestamp = Date.now() - (6 * 60 * 1000);

            dataService.getFromCache('test');

            expect(dataService.cache.has('test')).toBe(false);
        });

        it('clearCache removes all entries', () => {
            dataService.setCache('test1', { a: 1 });
            dataService.setCache('test2', { b: 2 });

            dataService.clearCache();

            expect(dataService.cache.size).toBe(0);
        });
    });

    describe('Fallback Data', () => {
        describe('getFallbackStats', () => {
            it('returns github stats', () => {
                const fallback = dataService.getFallbackStats();

                expect(fallback.github.username).toBe('damianwnorowski');
                expect(fallback.github.repos).toBe(42);
                expect(fallback.github.stars).toBe(284);
                expect(fallback.github.commits).toBe(1847);
            });

            it('returns top languages', () => {
                const fallback = dataService.getFallbackStats();

                expect(fallback.github.topLanguages).toHaveLength(3);
                expect(fallback.github.topLanguages[0].name).toBe('Python');
            });

            it('returns metrics', () => {
                const fallback = dataService.getFallbackStats();

                expect(fallback.metrics.cpu).toBe(18);
                expect(fallback.metrics.memory).toBe(45);
                expect(fallback.metrics.requests.total).toBe(1247000);
            });

            it('returns uptime', () => {
                const fallback = dataService.getFallbackStats();

                expect(fallback.uptime.percentage).toBe(99.97);
                expect(fallback.uptime.days).toBe(362);
            });
        });

        describe('getFallbackContributions', () => {
            it('returns total contributions', () => {
                const fallback = dataService.getFallbackContributions();

                expect(fallback.total).toBe(1847);
            });

            it('returns 52 weeks', () => {
                const fallback = dataService.getFallbackContributions();

                expect(fallback.weeks.length).toBe(52);
            });

            it('each week has 7 days', () => {
                const fallback = dataService.getFallbackContributions();

                fallback.weeks.forEach(week => {
                    expect(week.contributionDays.length).toBe(7);
                });
            });

            it('days have contribution counts', () => {
                const fallback = dataService.getFallbackContributions();

                fallback.weeks[0].contributionDays.forEach(day => {
                    expect(day.contributionCount).toBeGreaterThanOrEqual(0);
                    expect(day.contributionCount).toBeLessThan(10);
                });
            });

            it('days have weekday property', () => {
                const fallback = dataService.getFallbackContributions();

                fallback.weeks[0].contributionDays.forEach((day, i) => {
                    expect(day.weekday).toBe(i);
                });
            });

            it('returns streak data', () => {
                const fallback = dataService.getFallbackContributions();

                expect(fallback.streak.current).toBe(45);
                expect(fallback.streak.longest).toBe(89);
            });
        });
    });
});

describe('DataService Singleton', () => {
    it('exports singleton instance', async () => {
        vi.resetModules();

        const { dataService } = await import('../../src/services/DataService.js');
        expect(dataService).toBeDefined();
        expect(dataService.constructor.name).toBe('DataService');
    });
});
