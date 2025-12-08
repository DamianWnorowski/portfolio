/**
 * DataService
 * Handles all API communication and data fetching
 */

import { eventBus, Events } from '../core/EventBus.js';

class DataService {
    constructor() {
        this.baseUrl = '';  // Same origin in production
        this.cache = new Map();
        this.cacheTTL = 5 * 60 * 1000; // 5 minutes
    }

    async fetchStats() {
        try {
            const cached = this.getFromCache('stats');
            if (cached) return cached;

            const response = await fetch(`${this.baseUrl}/api/stats`);
            if (!response.ok) throw new Error('Stats fetch failed');

            const data = await response.json();
            this.setCache('stats', data);

            eventBus.emit(Events.STATS_LOADED, data);
            return data;
        } catch (error) {
            console.error('DataService.fetchStats error:', error);
            return this.getFallbackStats();
        }
    }

    async fetchContributions() {
        try {
            const cached = this.getFromCache('contributions');
            if (cached) return cached;

            const response = await fetch(`${this.baseUrl}/api/github/contributions`);
            if (!response.ok) throw new Error('Contributions fetch failed');

            const data = await response.json();
            this.setCache('contributions', data);

            return data;
        } catch (error) {
            console.error('DataService.fetchContributions error:', error);
            return this.getFallbackContributions();
        }
    }

    async fetchLogs(count = 10) {
        try {
            const response = await fetch(`${this.baseUrl}/api/logs/stream`);
            if (!response.ok) throw new Error('Logs fetch failed');

            const data = await response.json();
            return data.logs;
        } catch (error) {
            console.error('DataService.fetchLogs error:', error);
            return [];
        }
    }

    getFromCache(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() - item.timestamp > this.cacheTTL) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    clearCache() {
        this.cache.clear();
    }

    getFallbackStats() {
        return {
            github: {
                username: 'damianwnorowski',
                repos: 42,
                stars: 284,
                commits: 1847,
                topLanguages: [
                    { name: 'Python', count: 18 },
                    { name: 'TypeScript', count: 12 },
                    { name: 'JavaScript', count: 8 }
                ]
            },
            metrics: {
                cpu: 18,
                memory: 45,
                requests: {
                    total: 1247000,
                    perSecond: 52,
                    avgLatency: 12
                }
            },
            uptime: {
                percentage: 99.97,
                days: 362
            }
        };
    }

    getFallbackContributions() {
        const weeks = [];
        for (let w = 0; w < 52; w++) {
            const week = { contributionDays: [] };
            for (let d = 0; d < 7; d++) {
                week.contributionDays.push({
                    contributionCount: Math.floor(Math.random() * 10),
                    weekday: d
                });
            }
            weeks.push(week);
        }
        return { total: 1847, weeks, streak: { current: 45, longest: 89 } };
    }
}

// Singleton
export const dataService = new DataService();
