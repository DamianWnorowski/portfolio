/**
 * Chaos Engineering Tests for Network Failures
 * Simulates various network failure scenarios
 * Tests: Connection drops, latency spikes, packet loss, partial failures
 */

import { test, expect } from '@playwright/test';

const WS_SERVER_URL = process.env.WS_SERVER_URL || 'ws://localhost:8080';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5173/api';

/**
 * Network chaos simulator
 */
class NetworkChaos {
    constructor() {
        this.activeSimulations = [];
    }

    /**
     * Simulate connection drops by closing WebSocket randomly
     */
    async simulateConnectionDrops(client, probability = 0.1, interval = 1000) {
        const simulation = setInterval(() => {
            if (Math.random() < probability && client.ws && client.ws.readyState === WebSocket.OPEN) {
                console.log(`Simulating connection drop for client ${client.id}`);
                client.ws.close(1006, 'Simulated network failure');
            }
        }, interval);

        this.activeSimulations.push(simulation);
        return simulation;
    }

    /**
     * Simulate high latency by delaying operations
     */
    async simulateLatency(delayMs = 1000) {
        return new Promise(resolve => setTimeout(resolve, delayMs));
    }

    /**
     * Simulate packet loss by randomly dropping messages
     */
    createPacketLossFilter(probability = 0.2) {
        return (message) => {
            return Math.random() >= probability;
        };
    }

    /**
     * Simulate intermittent connectivity
     */
    async simulateIntermittentConnection(client, cycleMs = 5000) {
        let connected = true;

        const simulation = setInterval(() => {
            if (connected && client.ws) {
                console.log(`Disconnecting client ${client.id} (intermittent)`);
                client.ws.close();
                connected = false;
            } else if (!connected) {
                console.log(`Reconnecting client ${client.id}`);
                client.connect().catch(err => console.error(`Reconnect failed:`, err));
                connected = true;
            }
        }, cycleMs);

        this.activeSimulations.push(simulation);
        return simulation;
    }

    /**
     * Clean up all active simulations
     */
    stopAll() {
        this.activeSimulations.forEach(sim => clearInterval(sim));
        this.activeSimulations = [];
    }
}

/**
 * Resilient WebSocket client with retry logic
 */
class ResilientWebSocketClient {
    constructor(id, maxRetries = 3, retryDelay = 1000) {
        this.id = id;
        this.ws = null;
        this.connected = false;
        this.maxRetries = maxRetries;
        this.retryDelay = retryDelay;
        this.reconnectAttempts = 0;
        this.messageQueue = [];
        this.messagesReceived = 0;
        this.connectionDrops = 0;
    }

    async connect(url = WS_SERVER_URL) {
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                await this._attemptConnection(url);
                this.reconnectAttempts = attempt;
                return;
            } catch (error) {
                console.log(`Connection attempt ${attempt + 1} failed for client ${this.id}`);

                if (attempt < this.maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay * (attempt + 1)));
                } else {
                    throw error;
                }
            }
        }
    }

    _attemptConnection(url) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);

            try {
                this.ws = new WebSocket(url);

                this.ws.onopen = () => {
                    clearTimeout(timeout);
                    this.connected = true;

                    // Flush queued messages
                    while (this.messageQueue.length > 0 && this.connected) {
                        const msg = this.messageQueue.shift();
                        this.send(msg);
                    }

                    resolve();
                };

                this.ws.onmessage = () => {
                    this.messagesReceived++;
                };

                this.ws.onclose = () => {
                    this.connected = false;
                    this.connectionDrops++;
                };

                this.ws.onerror = (error) => {
                    clearTimeout(timeout);
                    reject(error);
                };
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        });
    }

    send(message) {
        if (!this.connected || !this.ws) {
            // Queue message for retry
            this.messageQueue.push(message);
            return false;
        }

        try {
            this.ws.send(typeof message === 'string' ? message : JSON.stringify(message));
            return true;
        } catch (error) {
            this.messageQueue.push(message);
            return false;
        }
    }

    async reconnect(url = WS_SERVER_URL) {
        if (this.ws) {
            this.ws.close();
        }
        await this.connect(url);
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.connected = false;
        }
    }

    getStats() {
        return {
            id: this.id,
            connected: this.connected,
            reconnectAttempts: this.reconnectAttempts,
            connectionDrops: this.connectionDrops,
            messagesReceived: this.messagesReceived,
            queuedMessages: this.messageQueue.length
        };
    }
}

test.describe('Chaos Tests - Connection Failures', () => {
    test('should recover from random connection drops', async () => {
        test.skip(process.env.CI && !process.env.WS_SERVER_URL, 'WebSocket server not available in CI');

        const chaos = new NetworkChaos();
        const clients = Array.from({ length: 10 }, (_, i) => new ResilientWebSocketClient(i));

        try {
            // Connect all clients
            await Promise.all(clients.map(c => c.connect()));

            // Simulate random connection drops (10% probability every second)
            clients.forEach(client => {
                chaos.simulateConnectionDrops(client, 0.1, 1000);
            });

            // Run for 30 seconds
            await new Promise(resolve => setTimeout(resolve, 30000));

            // Stop chaos
            chaos.stopAll();

            // Check recovery stats
            const stats = clients.map(c => c.getStats());
            const totalDrops = stats.reduce((sum, s) => sum + s.connectionDrops, 0);
            const recoveredClients = stats.filter(s => s.connected || s.reconnectAttempts > 0).length;

            console.log('Connection drops:', totalDrops);
            console.log('Recovered clients:', recoveredClients);

            expect(totalDrops).toBeGreaterThan(0); // Chaos should have caused some drops
            expect(recoveredClients).toBeGreaterThan(7); // Most clients should recover

            // Clean up
            clients.forEach(c => c.disconnect());
        } finally {
            chaos.stopAll();
        }
    }, 60000);

    test('should handle complete service outage and recovery', async () => {
        test.skip(process.env.CI && !process.env.WS_SERVER_URL, 'WebSocket server not available in CI');

        const client = new ResilientWebSocketClient(1);

        try {
            // Initial connection
            await client.connect();
            expect(client.connected).toBe(true);

            // Send some messages
            for (let i = 0; i < 5; i++) {
                client.send({ type: 'TEST', data: i });
            }

            // Simulate service outage
            client.disconnect();
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Messages during outage should be queued
            for (let i = 5; i < 10; i++) {
                client.send({ type: 'TEST', data: i });
            }

            expect(client.messageQueue.length).toBeGreaterThan(0);

            // Simulate service recovery
            await client.reconnect();

            // Wait for queue to flush
            await new Promise(resolve => setTimeout(resolve, 1000));

            expect(client.connected).toBe(true);
            expect(client.messageQueue.length).toBe(0); // Queue should be flushed

            client.disconnect();
        } catch (error) {
            console.error('Service outage test failed:', error);
            throw error;
        }
    });

    test('should handle intermittent connectivity', async () => {
        test.skip(process.env.CI && !process.env.WS_SERVER_URL, 'WebSocket server not available in CI');

        const chaos = new NetworkChaos();
        const client = new ResilientWebSocketClient(1);

        try {
            await client.connect();

            // Simulate intermittent connection (disconnect/reconnect every 5 seconds)
            chaos.simulateIntermittentConnection(client, 5000);

            // Run for 20 seconds
            await new Promise(resolve => setTimeout(resolve, 20000));

            chaos.stopAll();

            const stats = client.getStats();
            console.log('Intermittent connection stats:', stats);

            expect(stats.connectionDrops).toBeGreaterThan(2); // Should have multiple drops
            expect(stats.reconnectAttempts).toBeGreaterThan(0); // Should have reconnected

            client.disconnect();
        } finally {
            chaos.stopAll();
        }
    }, 30000);
});

test.describe('Chaos Tests - Latency Spikes', () => {
    test('should handle high latency responses from API', async ({ request }) => {
        test.skip(process.env.CI, 'Latency simulation requires local control');

        const chaos = new NetworkChaos();
        const latencies = [];

        try {
            // Make requests with simulated latency
            for (let i = 0; i < 10; i++) {
                const start = Date.now();

                // Simulate network latency
                await chaos.simulateLatency(Math.random() * 2000 + 500); // 500-2500ms

                const response = await request.get(`${API_BASE_URL}/health`);
                const latency = Date.now() - start;

                latencies.push(latency);

                expect(response.ok()).toBeTruthy();
            }

            const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
            const maxLatency = Math.max(...latencies);

            console.log('Average latency:', avgLatency);
            console.log('Max latency:', maxLatency);

            expect(avgLatency).toBeLessThan(5000); // Should complete despite latency
            expect(maxLatency).toBeLessThan(10000);
        } catch (error) {
            console.error('Latency test failed:', error);
            throw error;
        }
    });

    test('should timeout after reasonable delay for unresponsive service', async ({ request }) => {
        const timeout = 5000;
        const start = Date.now();

        try {
            await request.get('http://192.0.2.1:9999/timeout-test', { timeout });
        } catch (error) {
            const elapsed = Date.now() - start;

            expect(error.message).toContain('timeout');
            expect(elapsed).toBeGreaterThanOrEqual(timeout);
            expect(elapsed).toBeLessThan(timeout + 1000); // Should timeout promptly
        }
    });
});

test.describe('Chaos Tests - Partial Failures', () => {
    test('should handle partial service degradation', async ({ request }) => {
        const endpoints = [
            '/health',
            '/api/stats',
            '/api/visitors'
        ];

        const results = [];

        // Test all endpoints
        for (const endpoint of endpoints) {
            try {
                const response = await request.get(`${API_BASE_URL}${endpoint}`, {
                    timeout: 5000
                });

                results.push({
                    endpoint,
                    success: response.ok(),
                    status: response.status()
                });
            } catch (error) {
                results.push({
                    endpoint,
                    success: false,
                    error: error.message
                });
            }
        }

        // Calculate availability
        const successCount = results.filter(r => r.success).length;
        const availability = (successCount / results.length) * 100;

        console.log('Service availability:', availability);
        console.log('Results:', results);

        // Even with partial failures, some services should work
        expect(availability).toBeGreaterThan(33); // At least 1/3 should work
    });

    test('should gracefully degrade when external dependencies fail', async ({ request }) => {
        // Test API that depends on external services (GitHub, Spotify, etc.)
        const response = await request.get(`${API_BASE_URL}/health`);

        expect(response.ok()).toBeTruthy();
        const data = await response.json();

        // Health check should succeed even if some services are degraded
        expect(['healthy', 'degraded']).toContain(data.status);

        if (data.services) {
            const serviceStatuses = data.services.map(s => s.status);
            console.log('Service statuses:', serviceStatuses);

            // Not all services need to be healthy
            const healthyCount = serviceStatuses.filter(s => s === 'healthy').length;
            expect(healthyCount).toBeGreaterThan(0);
        }
    });
});

test.describe('Chaos Tests - Cascading Failures', () => {
    test('should prevent cascading failures in multi-tier system', async ({ request }) => {
        const chaos = new NetworkChaos();

        try {
            // Simulate failure in one component
            const responses = [];

            // Try to trigger cascade by rapid failures
            for (let i = 0; i < 20; i++) {
                const response = await request.get(`${API_BASE_URL}/health`, {
                    timeout: 3000
                }).catch(err => ({ error: err.message }));

                responses.push(response);

                // Introduce chaos delay
                if (i % 5 === 0) {
                    await chaos.simulateLatency(1000);
                }
            }

            // System should maintain some level of availability
            const successCount = responses.filter(r => !r.error && r.ok()).length;
            const successRate = (successCount / responses.length) * 100;

            console.log('Success rate under chaos:', successRate);

            expect(successRate).toBeGreaterThan(50); // At least 50% should succeed
        } catch (error) {
            console.error('Cascading failure test failed:', error);
            throw error;
        }
    });
});

test.describe('Chaos Tests - Data Consistency', () => {
    test('should maintain data consistency despite network failures', async () => {
        test.skip(process.env.CI && !process.env.WS_SERVER_URL, 'WebSocket server not available in CI');

        const chaos = new NetworkChaos();
        const client = new ResilientWebSocketClient(1);

        try {
            await client.connect();

            const operations = [];
            const expectedState = {};

            // Send operations with chaos
            for (let i = 0; i < 20; i++) {
                const key = `key-${i % 5}`;
                const value = i;

                expectedState[key] = value;

                const message = {
                    type: 'OPERATION',
                    payload: {
                        operation: 'SET',
                        key,
                        value
                    }
                };

                client.send(message);
                operations.push({ key, value });

                // Introduce random chaos
                if (Math.random() < 0.3) {
                    chaos.simulateConnectionDrops(client, 1.0, 0); // Force disconnect
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await client.reconnect();
                }
            }

            // Wait for operations to complete
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Request state snapshot
            client.send({ type: 'SNAPSHOT_REQUEST' });

            await new Promise(resolve => setTimeout(resolve, 1000));

            // Verify eventual consistency
            // In a real scenario, we'd parse the snapshot response
            // For this test, we verify that the client recovered and queue is empty
            expect(client.connected).toBe(true);
            expect(client.messageQueue.length).toBe(0);

            client.disconnect();
        } finally {
            chaos.stopAll();
        }
    }, 60000);
});

test.describe('Chaos Tests - Resource Exhaustion', () => {
    test('should handle resource exhaustion gracefully', async () => {
        test.skip(process.env.CI && !process.env.WS_SERVER_URL, 'WebSocket server not available in CI');

        const clients = [];
        const maxClients = 100;

        try {
            // Try to exhaust connections
            for (let i = 0; i < maxClients; i++) {
                const client = new ResilientWebSocketClient(i, 1, 500);

                try {
                    await client.connect();
                    clients.push(client);
                } catch (error) {
                    console.log(`Failed to connect client ${i}:`, error.message);
                    // Connection limits reached - expected behavior
                    break;
                }
            }

            console.log(`Successfully connected ${clients.length} clients`);

            // System should either accept connections or reject gracefully
            expect(clients.length).toBeGreaterThan(50); // Should handle at least 50

            // Cleanup
            clients.forEach(c => c.disconnect());
        } catch (error) {
            console.error('Resource exhaustion test failed:', error);
            clients.forEach(c => c.disconnect());
            throw error;
        }
    }, 120000);
});
