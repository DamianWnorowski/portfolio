/**
 * RealtimeService Unit Tests
 * Tests for Server-Sent Events connections and fallback polling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock EventBus
vi.mock('../../src/core/EventBus.js', () => ({
    eventBus: {
        emit: vi.fn()
    },
    Events: {
        LOGS_RECEIVED: 'logs:received',
        METRICS_UPDATE: 'metrics:update'
    }
}));

describe('RealtimeService', () => {
    let RealtimeService;
    let realtimeService;
    let MockEventSource;
    let eventBusMock;

    beforeEach(async () => {
        vi.resetModules();
        vi.useFakeTimers();

        // Create mock EventSource
        MockEventSource = vi.fn().mockImplementation((url) => {
            const instance = {
                url,
                readyState: 0,
                CONNECTING: 0,
                OPEN: 1,
                CLOSED: 2,
                close: vi.fn(),
                onopen: null,
                onmessage: null,
                onerror: null
            };

            // Simulate connection open
            setTimeout(() => {
                instance.readyState = 1;
                if (instance.onopen) {
                    instance.onopen();
                }
            }, 10);

            return instance;
        });

        global.EventSource = MockEventSource;
        global.EventSource.OPEN = 1;

        // Mock fetch
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ logs: [{ id: 1, message: 'test' }] })
        });

        // Import mocks
        const eventBusModule = await import('../../src/core/EventBus.js');
        eventBusMock = eventBusModule.eventBus;

        // Import service
        const module = await import('../../src/services/RealtimeService.js');
        RealtimeService = module.realtimeService.constructor;
        realtimeService = new RealtimeService();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('Initialization', () => {
        it('starts with empty connections map', () => {
            expect(realtimeService.connections.size).toBe(0);
        });

        it('starts with empty reconnect attempts map', () => {
            expect(realtimeService.reconnectAttempts.size).toBe(0);
        });

        it('sets max reconnect attempts to 5', () => {
            expect(realtimeService.maxReconnectAttempts).toBe(5);
        });

        it('sets reconnect delay to 1000ms', () => {
            expect(realtimeService.reconnectDelay).toBe(1000);
        });
    });

    describe('connect', () => {
        it('creates EventSource with provided URL', () => {
            realtimeService.connect('logs', '/api/logs/stream');

            expect(MockEventSource).toHaveBeenCalledWith('/api/logs/stream');
        });

        it('stores connection in connections map', () => {
            realtimeService.connect('logs', '/api/logs/stream');

            expect(realtimeService.connections.has('logs')).toBe(true);
        });

        it('does not create duplicate connections', () => {
            realtimeService.connect('logs', '/api/logs/stream');
            realtimeService.connect('logs', '/api/logs/stream');

            expect(MockEventSource).toHaveBeenCalledTimes(1);
        });

        it('calls onOpen handler when connection opens', () => {
            const onOpen = vi.fn();
            realtimeService.connect('logs', '/api/logs/stream', { onOpen });

            vi.advanceTimersByTime(20);

            expect(onOpen).toHaveBeenCalled();
        });

        it('resets reconnect attempts on successful connection', () => {
            realtimeService.reconnectAttempts.set('logs', 3);
            realtimeService.connect('logs', '/api/logs/stream');

            vi.advanceTimersByTime(20);

            expect(realtimeService.reconnectAttempts.get('logs')).toBe(0);
        });

        it('parses and passes message data to handler', () => {
            const onMessage = vi.fn();
            realtimeService.connect('logs', '/api/logs/stream', { onMessage });

            const connection = realtimeService.connections.get('logs');
            connection.onmessage({ data: JSON.stringify({ id: 1, message: 'test' }) });

            expect(onMessage).toHaveBeenCalledWith({ id: 1, message: 'test' });
        });

        it('emits LOGS_RECEIVED for logs connection', () => {
            realtimeService.connect('logs', '/api/logs/stream');

            const connection = realtimeService.connections.get('logs');
            connection.onmessage({ data: JSON.stringify({ id: 1 }) });

            expect(eventBusMock.emit).toHaveBeenCalledWith('logs:received', [{ id: 1 }]);
        });

        it('emits METRICS_UPDATE for metrics connection', () => {
            realtimeService.connect('metrics', '/api/metrics/stream');

            const connection = realtimeService.connections.get('metrics');
            connection.onmessage({ data: JSON.stringify({ cpu: 50 }) });

            expect(eventBusMock.emit).toHaveBeenCalledWith('metrics:update', { cpu: 50 });
        });

        it('handles JSON parse errors gracefully', () => {
            const onMessage = vi.fn();
            realtimeService.connect('logs', '/api/logs/stream', { onMessage });

            const connection = realtimeService.connections.get('logs');
            expect(() => {
                connection.onmessage({ data: 'invalid json' });
            }).not.toThrow();

            expect(onMessage).not.toHaveBeenCalled();
        });

        it('calls onError handler on error', () => {
            const onError = vi.fn();
            realtimeService.connect('logs', '/api/logs/stream', { onError });

            const connection = realtimeService.connections.get('logs');
            connection.onerror(new Error('Connection failed'));

            expect(onError).toHaveBeenCalled();
        });

        it('falls back to polling if EventSource throws', () => {
            MockEventSource.mockImplementation(() => {
                throw new Error('EventSource not supported');
            });

            realtimeService.connect('logs', '/api/logs/stream');

            expect(realtimeService.connections.has('logs_poll')).toBe(true);
        });
    });

    describe('handleDisconnect', () => {
        it('increments reconnect attempts', () => {
            realtimeService.connect('logs', '/api/logs/stream');
            realtimeService.handleDisconnect('logs', '/api/logs/stream', {});

            expect(realtimeService.reconnectAttempts.get('logs')).toBe(1);
        });

        it('uses exponential backoff for reconnection delay', () => {
            realtimeService.connect('logs', '/api/logs/stream');

            realtimeService.reconnectAttempts.set('logs', 0);
            realtimeService.handleDisconnect('logs', '/api/logs/stream', {});

            // First attempt: 1000 * 2^0 = 1000ms
            expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 1000);

            vi.advanceTimersByTime(1000);
            realtimeService.handleDisconnect('logs', '/api/logs/stream', {});

            // Second attempt: 1000 * 2^1 = 2000ms
            expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 2000);
        });

        it('falls back to polling after max attempts', () => {
            realtimeService.connect('logs', '/api/logs/stream');
            realtimeService.reconnectAttempts.set('logs', 5);

            realtimeService.handleDisconnect('logs', '/api/logs/stream', {});

            expect(realtimeService.connections.has('logs_poll')).toBe(true);
        });

        it('disconnects before reconnecting', () => {
            realtimeService.connect('logs', '/api/logs/stream');
            const connection = realtimeService.connections.get('logs');

            realtimeService.handleDisconnect('logs', '/api/logs/stream', {});

            vi.advanceTimersByTime(1000);

            expect(connection.close).toHaveBeenCalled();
        });
    });

    describe('startPolling', () => {
        it('removes /stream from URL for polling', () => {
            realtimeService.startPolling('logs', '/api/logs/stream', {});

            expect(fetch).toHaveBeenCalledWith('/api/logs');
        });

        it('stores interval ID in connections map', () => {
            realtimeService.startPolling('logs', '/api/logs/stream', {});

            expect(realtimeService.connections.has('logs_poll')).toBe(true);
        });

        it('polls at specified interval', () => {
            realtimeService.startPolling('logs', '/api/logs/stream', {}, 3000);

            // Initial poll
            expect(fetch).toHaveBeenCalledTimes(1);

            vi.advanceTimersByTime(3000);
            expect(fetch).toHaveBeenCalledTimes(2);

            vi.advanceTimersByTime(3000);
            expect(fetch).toHaveBeenCalledTimes(3);
        });

        it('calls onMessage for each log item', async () => {
            const onMessage = vi.fn();
            realtimeService.startPolling('logs', '/api/logs/stream', { onMessage });

            await vi.advanceTimersByTimeAsync(100);

            expect(onMessage).toHaveBeenCalledWith({ id: 1, message: 'test' });
        });

        it('handles fetch errors gracefully', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            expect(() => {
                realtimeService.startPolling('logs', '/api/logs/stream', {});
            }).not.toThrow();
        });
    });

    describe('disconnect', () => {
        it('closes EventSource connection', () => {
            realtimeService.connect('logs', '/api/logs/stream');
            const connection = realtimeService.connections.get('logs');

            realtimeService.disconnect('logs');

            expect(connection.close).toHaveBeenCalled();
        });

        it('removes connection from map', () => {
            realtimeService.connect('logs', '/api/logs/stream');

            realtimeService.disconnect('logs');

            expect(realtimeService.connections.has('logs')).toBe(false);
        });

        it('clears polling interval', () => {
            realtimeService.startPolling('logs', '/api/logs/stream', {});
            const intervalId = realtimeService.connections.get('logs_poll');

            realtimeService.disconnect('logs');

            expect(realtimeService.connections.has('logs_poll')).toBe(false);
        });

        it('handles non-existent connection gracefully', () => {
            expect(() => {
                realtimeService.disconnect('nonexistent');
            }).not.toThrow();
        });
    });

    describe('disconnectAll', () => {
        it('closes all EventSource connections', () => {
            realtimeService.connect('logs', '/api/logs/stream');
            realtimeService.connect('metrics', '/api/metrics/stream');

            const logsConn = realtimeService.connections.get('logs');
            const metricsConn = realtimeService.connections.get('metrics');

            realtimeService.disconnectAll();

            expect(logsConn.close).toHaveBeenCalled();
            expect(metricsConn.close).toHaveBeenCalled();
        });

        it('clears all polling intervals', () => {
            realtimeService.startPolling('logs', '/api/logs/stream', {});
            realtimeService.startPolling('metrics', '/api/metrics/stream', {});

            realtimeService.disconnectAll();

            expect(realtimeService.connections.size).toBe(0);
        });

        it('clears connections map', () => {
            realtimeService.connect('logs', '/api/logs/stream');

            realtimeService.disconnectAll();

            expect(realtimeService.connections.size).toBe(0);
        });

        it('clears reconnect attempts map', () => {
            realtimeService.reconnectAttempts.set('logs', 3);

            realtimeService.disconnectAll();

            expect(realtimeService.reconnectAttempts.size).toBe(0);
        });
    });

    describe('isConnected', () => {
        it('returns true when connected and open', () => {
            realtimeService.connect('logs', '/api/logs/stream');
            const connection = realtimeService.connections.get('logs');
            connection.readyState = global.EventSource.OPEN;

            expect(realtimeService.isConnected('logs')).toBe(true);
        });

        it('returns false when not connected', () => {
            expect(realtimeService.isConnected('logs')).toBe(false);
        });

        it('returns false when connection is not EventSource', () => {
            realtimeService.connections.set('logs_poll', 123);

            expect(realtimeService.isConnected('logs_poll')).toBe(false);
        });

        it('returns false when EventSource is not open', () => {
            realtimeService.connect('logs', '/api/logs/stream');
            const connection = realtimeService.connections.get('logs');
            connection.readyState = 0; // CONNECTING

            expect(realtimeService.isConnected('logs')).toBe(false);
        });
    });
});

describe('RealtimeService Singleton', () => {
    it('exports singleton instance', async () => {
        vi.resetModules();

        global.EventSource = vi.fn().mockImplementation(() => ({
            close: vi.fn(),
            readyState: 1
        }));

        const { realtimeService } = await import('../../src/services/RealtimeService.js');
        expect(realtimeService).toBeDefined();
        expect(realtimeService.constructor.name).toBe('RealtimeService');
    });
});
