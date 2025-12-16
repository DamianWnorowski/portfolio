/**
 * RealtimeService
 * Manages Server-Sent Events connections for real-time data
 */

import { eventBus, Events } from '../core/EventBus.js';

class RealtimeService {
    constructor() {
        this.connections = new Map();
        this.reconnectAttempts = new Map();
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.isDev = import.meta.env?.DEV ?? false;
    }

    /**
     * Connect to a Server-Sent Events stream
     */
    connect(name, url, handlers = {}) {
        if (this.connections.has(name)) {
            if (this.isDev) console.warn(`Connection ${name} already exists`);
            return;
        }

        try {
            const eventSource = new EventSource(url);

            eventSource.onopen = () => {
                if (this.isDev) console.log(`[RealtimeService] Connected to ${name}`);
                this.reconnectAttempts.set(name, 0);

                if (handlers.onOpen) {
                    handlers.onOpen();
                }
            };

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (handlers.onMessage) {
                        handlers.onMessage(data);
                    }

                    // Emit to event bus
                    if (name === 'logs') {
                        eventBus.emit(Events.LOGS_RECEIVED, [data]);
                    } else if (name === 'metrics') {
                        eventBus.emit(Events.METRICS_UPDATE, data);
                    }
                } catch (e) {
                    if (this.isDev) console.error(`[RealtimeService] Parse error:`, e);
                }
            };

            eventSource.onerror = (error) => {
                if (this.isDev) console.error(`[RealtimeService] Error on ${name}:`, error);

                if (handlers.onError) {
                    handlers.onError(error);
                }

                // Attempt reconnection
                this.handleDisconnect(name, url, handlers);
            };

            this.connections.set(name, eventSource);

        } catch (error) {
            if (this.isDev) console.error(`[RealtimeService] Failed to connect to ${name}:`, error);

            // Fallback to polling
            this.startPolling(name, url, handlers);
        }
    }

    /**
     * Handle disconnection and reconnection
     */
    handleDisconnect(name, url, handlers) {
        const attempts = this.reconnectAttempts.get(name) || 0;

        if (attempts >= this.maxReconnectAttempts) {
            if (this.isDev) console.warn(`[RealtimeService] Max reconnect attempts reached for ${name}`);
            this.disconnect(name);

            // Fall back to polling
            this.startPolling(name, url, handlers);
            return;
        }

        this.reconnectAttempts.set(name, attempts + 1);

        const delay = this.reconnectDelay * Math.pow(2, attempts);
        if (this.isDev) console.log(`[RealtimeService] Reconnecting to ${name} in ${delay}ms...`);

        setTimeout(() => {
            this.disconnect(name);
            this.connect(name, url, handlers);
        }, delay);
    }

    /**
     * Fallback polling when SSE is not available
     */
    startPolling(name, url, handlers = {}, interval = 5000) {
        if (this.isDev) console.log(`[RealtimeService] Starting polling for ${name}`);

        const pollUrl = url.replace('/stream', '');

        const poll = async () => {
            try {
                const response = await fetch(pollUrl);
                if (response.ok) {
                    const data = await response.json();

                    if (handlers.onMessage && data.logs) {
                        data.logs.forEach(log => handlers.onMessage(log));
                    }
                }
            } catch (e) {
                if (this.isDev) console.error(`[RealtimeService] Polling error:`, e);
            }
        };

        // Store interval ID so we can stop it
        const intervalId = setInterval(poll, interval);
        this.connections.set(`${name}_poll`, intervalId);

        // Initial poll
        poll();
    }

    /**
     * Disconnect from a stream
     */
    disconnect(name) {
        const connection = this.connections.get(name);
        if (connection) {
            if (typeof connection.close === 'function') {
                connection.close();
            }
            this.connections.delete(name);
        }

        // Also clear any polling
        const pollId = this.connections.get(`${name}_poll`);
        if (pollId) {
            clearInterval(pollId);
            this.connections.delete(`${name}_poll`);
        }
    }

    /**
     * Disconnect all streams
     */
    disconnectAll() {
        this.connections.forEach((conn, name) => {
            if (name.endsWith('_poll')) {
                clearInterval(conn);
            } else if (typeof conn.close === 'function') {
                conn.close();
            }
        });
        this.connections.clear();
        this.reconnectAttempts.clear();
    }

    /**
     * Check if connected
     */
    isConnected(name) {
        const conn = this.connections.get(name);
        return !!(conn && typeof conn.close === 'function' && conn.readyState === 1);
    }
}

// Singleton
export const realtimeService = new RealtimeService();
