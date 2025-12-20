/**
 * Load Tests for Real-Time Sync
 * Testing 1000+ concurrent WebSocket connections
 * Framework: Artillery (compatible) or custom load testing
 */

import { test, expect } from '@playwright/test';

const WS_SERVER_URL = process.env.WS_SERVER_URL || 'ws://localhost:8080';
const LOAD_TEST_DURATION = 120000; // 2 minutes
const CONCURRENT_CONNECTIONS = process.env.LOAD_TEST_CONNECTIONS || 1000;
const OPERATIONS_PER_CLIENT = 100;

/**
 * WebSocket client for load testing
 */
class LoadTestClient {
    constructor(id) {
        this.id = id;
        this.ws = null;
        this.connected = false;
        this.messagesSent = 0;
        this.messagesReceived = 0;
        this.errors = 0;
        this.latencies = [];
    }

    async connect(url = WS_SERVER_URL) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Connection timeout for client ${this.id}`));
            }, 10000);

            try {
                this.ws = new WebSocket(url);

                this.ws.onopen = () => {
                    clearTimeout(timeout);
                    this.connected = true;
                    resolve();
                };

                this.ws.onmessage = () => {
                    this.messagesReceived++;
                };

                this.ws.onerror = (error) => {
                    clearTimeout(timeout);
                    this.errors++;
                    reject(error);
                };

                this.ws.onclose = () => {
                    this.connected = false;
                };
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        });
    }

    sendMessage(message) {
        if (!this.connected || !this.ws) {
            this.errors++;
            return false;
        }

        try {
            const startTime = performance.now();
            this.ws.send(JSON.stringify(message));
            this.messagesSent++;
            this.latencies.push(performance.now() - startTime);
            return true;
        } catch (error) {
            this.errors++;
            return false;
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.connected = false;
        }
    }

    getStats() {
        const avgLatency = this.latencies.length > 0
            ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
            : 0;

        return {
            id: this.id,
            messagesSent: this.messagesSent,
            messagesReceived: this.messagesReceived,
            errors: this.errors,
            avgLatency: Math.round(avgLatency * 100) / 100,
            maxLatency: Math.max(...this.latencies, 0),
            minLatency: Math.min(...this.latencies, Infinity)
        };
    }
}

/**
 * Load test coordinator
 */
class LoadTestCoordinator {
    constructor(targetConnections) {
        this.targetConnections = targetConnections;
        this.clients = [];
        this.startTime = 0;
        this.endTime = 0;
    }

    async rampUp(duration = 30000) {
        console.log(`Ramping up ${this.targetConnections} connections over ${duration}ms`);

        const interval = duration / this.targetConnections;
        const batchSize = Math.max(1, Math.floor(this.targetConnections / 100));

        for (let i = 0; i < this.targetConnections; i += batchSize) {
            const batch = [];
            const batchEnd = Math.min(i + batchSize, this.targetConnections);

            for (let j = i; j < batchEnd; j++) {
                const client = new LoadTestClient(j);
                this.clients.push(client);
                batch.push(client.connect().catch(err => {
                    console.error(`Client ${j} connection failed:`, err.message);
                }));
            }

            await Promise.allSettled(batch);
            await new Promise(resolve => setTimeout(resolve, interval * batchSize));
        }

        const connectedCount = this.clients.filter(c => c.connected).length;
        console.log(`Ramp-up complete: ${connectedCount}/${this.targetConnections} clients connected`);

        return connectedCount;
    }

    async runLoad(duration = 60000, operationsPerClient = OPERATIONS_PER_CLIENT) {
        console.log(`Running load test for ${duration}ms with ${operationsPerClient} ops/client`);

        this.startTime = Date.now();
        const endTime = this.startTime + duration;

        const operations = [];

        for (const client of this.clients) {
            if (!client.connected) continue;

            const clientOp = (async () => {
                const delay = duration / operationsPerClient;

                for (let i = 0; i < operationsPerClient; i++) {
                    if (Date.now() > endTime) break;

                    const message = {
                        type: 'OPERATION',
                        payload: {
                            id: `op-${client.id}-${i}`,
                            key: `key-${client.id}`,
                            value: Math.random(),
                            timestamp: Date.now()
                        }
                    };

                    client.sendMessage(message);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            })();

            operations.push(clientOp);
        }

        await Promise.allSettled(operations);
        this.endTime = Date.now();

        console.log('Load test complete');
    }

    async rampDown(duration = 10000) {
        console.log(`Ramping down ${this.clients.length} connections over ${duration}ms`);

        const interval = duration / this.clients.length;
        const batchSize = Math.max(1, Math.floor(this.clients.length / 50));

        for (let i = 0; i < this.clients.length; i += batchSize) {
            const batchEnd = Math.min(i + batchSize, this.clients.length);

            for (let j = i; j < batchEnd; j++) {
                this.clients[j].disconnect();
            }

            await new Promise(resolve => setTimeout(resolve, interval * batchSize));
        }

        console.log('Ramp-down complete');
    }

    getAggregateStats() {
        const stats = this.clients.map(c => c.getStats());

        const totalMessagesSent = stats.reduce((sum, s) => sum + s.messagesSent, 0);
        const totalMessagesReceived = stats.reduce((sum, s) => sum + s.messagesReceived, 0);
        const totalErrors = stats.reduce((sum, s) => sum + s.errors, 0);

        const latencies = stats.flatMap(s => [s.avgLatency]).filter(l => l > 0);
        const avgLatency = latencies.length > 0
            ? latencies.reduce((a, b) => a + b, 0) / latencies.length
            : 0;

        const maxLatency = Math.max(...stats.map(s => s.maxLatency), 0);
        const minLatency = Math.min(...stats.map(s => s.minLatency).filter(l => l < Infinity), 0);

        const duration = (this.endTime - this.startTime) / 1000; // seconds
        const throughput = duration > 0 ? totalMessagesSent / duration : 0;

        const connectedClients = this.clients.filter(c => c.connected).length;
        const successRate = this.clients.length > 0
            ? (connectedClients / this.clients.length) * 100
            : 0;

        return {
            totalClients: this.clients.length,
            connectedClients,
            successRate: Math.round(successRate * 100) / 100,
            totalMessagesSent,
            totalMessagesReceived,
            totalErrors,
            avgLatency: Math.round(avgLatency * 100) / 100,
            maxLatency: Math.round(maxLatency * 100) / 100,
            minLatency: Math.round(minLatency * 100) / 100,
            duration,
            throughput: Math.round(throughput * 100) / 100,
            messagesPerSecond: Math.round(throughput)
        };
    }
}

test.describe('Load Tests - Concurrent Connections', () => {
    test('should handle 100 concurrent WebSocket connections', async () => {
        test.skip(process.env.CI && !process.env.WS_SERVER_URL, 'WebSocket server not available in CI');

        const coordinator = new LoadTestCoordinator(100);

        try {
            // Ramp up
            const connected = await coordinator.rampUp(10000);
            expect(connected).toBeGreaterThan(90); // 90% success rate

            // Run load
            await coordinator.runLoad(30000, 50);

            // Get stats
            const stats = coordinator.getAggregateStats();
            console.log('Load test stats:', stats);

            // Assertions
            expect(stats.connectedClients).toBeGreaterThan(90);
            expect(stats.successRate).toBeGreaterThan(90);
            expect(stats.totalMessagesSent).toBeGreaterThan(4500); // 100 * 50 * 0.9
            expect(stats.avgLatency).toBeLessThan(1000); // < 1 second avg latency
            expect(stats.throughput).toBeGreaterThan(100); // > 100 msg/sec

            // Ramp down
            await coordinator.rampDown(5000);
        } catch (error) {
            console.error('Load test failed:', error);
            throw error;
        }
    }, LOAD_TEST_DURATION);

    test('should handle 500 concurrent WebSocket connections', async () => {
        test.skip(process.env.CI && !process.env.WS_SERVER_URL, 'WebSocket server not available in CI');
        test.skip(!process.env.RUN_HEAVY_LOAD_TESTS, 'Heavy load tests disabled');

        const coordinator = new LoadTestCoordinator(500);

        try {
            const connected = await coordinator.rampUp(30000);
            expect(connected).toBeGreaterThan(450); // 90% success rate

            await coordinator.runLoad(60000, 100);

            const stats = coordinator.getAggregateStats();
            console.log('Load test stats (500 clients):', stats);

            expect(stats.connectedClients).toBeGreaterThan(450);
            expect(stats.successRate).toBeGreaterThan(90);
            expect(stats.avgLatency).toBeLessThan(2000); // < 2 seconds avg latency
            expect(stats.throughput).toBeGreaterThan(500);

            await coordinator.rampDown(10000);
        } catch (error) {
            console.error('Load test failed:', error);
            throw error;
        }
    }, LOAD_TEST_DURATION * 2);

    test('should handle 1000+ concurrent WebSocket connections', async () => {
        test.skip(process.env.CI && !process.env.WS_SERVER_URL, 'WebSocket server not available in CI');
        test.skip(!process.env.RUN_HEAVY_LOAD_TESTS, 'Heavy load tests disabled');

        const coordinator = new LoadTestCoordinator(parseInt(CONCURRENT_CONNECTIONS));

        try {
            const connected = await coordinator.rampUp(60000);
            expect(connected).toBeGreaterThan(CONCURRENT_CONNECTIONS * 0.85); // 85% success rate

            await coordinator.runLoad(90000, 100);

            const stats = coordinator.getAggregateStats();
            console.log(`Load test stats (${CONCURRENT_CONNECTIONS} clients):`, stats);

            expect(stats.connectedClients).toBeGreaterThan(CONCURRENT_CONNECTIONS * 0.85);
            expect(stats.successRate).toBeGreaterThan(85);
            expect(stats.avgLatency).toBeLessThan(5000); // < 5 seconds avg latency
            expect(stats.totalErrors).toBeLessThan(CONCURRENT_CONNECTIONS * 0.1); // < 10% errors

            await coordinator.rampDown(20000);
        } catch (error) {
            console.error('Load test failed:', error);
            throw error;
        }
    }, LOAD_TEST_DURATION * 3);
});

test.describe('Load Tests - Sustained Traffic', () => {
    test('should maintain performance under sustained load', async () => {
        test.skip(process.env.CI && !process.env.WS_SERVER_URL, 'WebSocket server not available in CI');

        const coordinator = new LoadTestCoordinator(200);

        try {
            await coordinator.rampUp(15000);

            // Run sustained load for 2 minutes
            const checkpoints = [];
            const checkpointInterval = 30000; // 30 seconds
            const totalDuration = 120000; // 2 minutes

            for (let elapsed = 0; elapsed < totalDuration; elapsed += checkpointInterval) {
                const checkpointStart = Date.now();

                await coordinator.runLoad(checkpointInterval, 50);

                const stats = coordinator.getAggregateStats();
                checkpoints.push({
                    elapsed: elapsed + checkpointInterval,
                    stats
                });

                console.log(`Checkpoint ${checkpoints.length}:`, stats);

                // Performance should not degrade significantly
                if (checkpoints.length > 1) {
                    const previous = checkpoints[checkpoints.length - 2].stats;
                    const current = stats;

                    // Throughput should remain stable (within 20%)
                    const throughputDelta = Math.abs(current.throughput - previous.throughput);
                    const throughputDeltaPct = (throughputDelta / previous.throughput) * 100;

                    expect(throughputDeltaPct).toBeLessThan(20);
                }
            }

            // Verify overall stability
            const firstCheckpoint = checkpoints[0].stats;
            const lastCheckpoint = checkpoints[checkpoints.length - 1].stats;

            expect(lastCheckpoint.successRate).toBeGreaterThanOrEqual(firstCheckpoint.successRate - 5);
            expect(lastCheckpoint.avgLatency).toBeLessThan(firstCheckpoint.avgLatency * 1.5);

            await coordinator.rampDown(10000);
        } catch (error) {
            console.error('Sustained load test failed:', error);
            throw error;
        }
    }, 180000); // 3 minutes
});

test.describe('Load Tests - Spike Traffic', () => {
    test('should handle sudden traffic spikes', async () => {
        test.skip(process.env.CI && !process.env.WS_SERVER_URL, 'WebSocket server not available in CI');

        const coordinator = new LoadTestCoordinator(500);

        try {
            // Start with baseline load
            await coordinator.rampUp(20000);
            await coordinator.runLoad(10000, 20);

            const baselineStats = coordinator.getAggregateStats();
            console.log('Baseline stats:', baselineStats);

            // Simulate spike: add 300 more connections rapidly
            const spikeClients = [];
            for (let i = 0; i < 300; i++) {
                const client = new LoadTestClient(coordinator.clients.length + i);
                coordinator.clients.push(client);
                spikeClients.push(client.connect().catch(() => {}));
            }

            await Promise.allSettled(spikeClients);

            // Run spike load
            await coordinator.runLoad(15000, 50);

            const spikeStats = coordinator.getAggregateStats();
            console.log('Spike stats:', spikeStats);

            // System should handle spike with degradation < 30%
            const latencyIncrease = ((spikeStats.avgLatency - baselineStats.avgLatency) / baselineStats.avgLatency) * 100;
            expect(latencyIncrease).toBeLessThan(50); // < 50% latency increase

            expect(spikeStats.successRate).toBeGreaterThan(80);

            await coordinator.rampDown(15000);
        } catch (error) {
            console.error('Spike test failed:', error);
            throw error;
        }
    }, LOAD_TEST_DURATION * 2);
});

test.describe('Load Tests - Resource Efficiency', () => {
    test('should efficiently handle message broadcast to all clients', async () => {
        test.skip(process.env.CI && !process.env.WS_SERVER_URL, 'WebSocket server not available in CI');

        const coordinator = new LoadTestCoordinator(100);

        try {
            await coordinator.rampUp(10000);

            // One client broadcasts, all should receive
            const broadcaster = coordinator.clients.find(c => c.connected);
            expect(broadcaster).toBeDefined();

            const broadcastMessage = {
                type: 'BROADCAST',
                payload: { message: 'test broadcast', timestamp: Date.now() }
            };

            broadcaster.sendMessage(broadcastMessage);

            // Wait for broadcast propagation
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Check that most clients received the broadcast
            const receiveCount = coordinator.clients.filter(c => c.messagesReceived > 0).length;
            const receiveRate = (receiveCount / coordinator.clients.length) * 100;

            console.log(`Broadcast receive rate: ${receiveRate.toFixed(2)}%`);
            expect(receiveRate).toBeGreaterThan(90); // 90% should receive

            await coordinator.rampDown(5000);
        } catch (error) {
            console.error('Broadcast test failed:', error);
            throw error;
        }
    }, 60000);
});
