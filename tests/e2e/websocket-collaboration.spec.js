/**
 * WebSocket Collaboration E2E Tests
 * Multi-user scenarios with real WebSocket connections
 * Tests: Connection lifecycle, sync protocol, conflict resolution
 */

import { test, expect } from '@playwright/test';
import { SyncMessage, MessageType, Operation, OperationType } from '../../src/utils/SyncProtocol.js';

// WebSocket test server URL (mock or real)
const WS_SERVER_URL = process.env.WS_SERVER_URL || 'ws://localhost:8080';
const TEST_TIMEOUT = 30000;

/**
 * Create WebSocket connection helper
 */
class WebSocketClient {
    constructor(deviceId) {
        this.deviceId = deviceId;
        this.ws = null;
        this.messages = [];
        this.connected = false;
    }

    async connect(url = WS_SERVER_URL) {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                this.connected = true;
                const msg = new SyncMessage(MessageType.CONNECT, { deviceId: this.deviceId });
                this.send(msg);
                resolve();
            };

            this.ws.onmessage = (event) => {
                const msg = SyncMessage.fromJSON(event.data);
                this.messages.push(msg);
            };

            this.ws.onerror = (error) => {
                reject(error);
            };

            setTimeout(() => reject(new Error('Connection timeout')), 5000);
        });
    }

    send(message) {
        if (this.ws && this.connected) {
            this.ws.send(message.toString());
        }
    }

    async waitForMessage(type, timeout = 5000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const msg = this.messages.find(m => m.type === type);
            if (msg) {
                this.messages = this.messages.filter(m => m !== msg);
                return msg;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        throw new Error(`Timeout waiting for message type: ${type}`);
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.connected = false;
        }
    }
}

test.describe('WebSocket Collaboration - Connection Lifecycle', () => {
    test('should establish WebSocket connection and receive CONNECT_ACK', async () => {
        // Note: This test requires a WebSocket server to be running
        // For CI/CD, you may want to mock this or skip if server is unavailable

        test.skip(process.env.CI && !process.env.WS_SERVER_URL, 'WebSocket server not available in CI');

        const client = new WebSocketClient('device-1');

        try {
            await client.connect();
            expect(client.connected).toBe(true);

            // Wait for CONNECT_ACK
            const ack = await client.waitForMessage(MessageType.CONNECT_ACK);
            expect(ack.type).toBe(MessageType.CONNECT_ACK);
            expect(ack.payload).toBeDefined();
        } finally {
            client.disconnect();
        }
    });

    test('should handle multiple concurrent connections', async () => {
        test.skip(process.env.CI && !process.env.WS_SERVER_URL, 'WebSocket server not available in CI');

        const clients = [
            new WebSocketClient('device-1'),
            new WebSocketClient('device-2'),
            new WebSocketClient('device-3')
        ];

        try {
            // Connect all clients
            await Promise.all(clients.map(c => c.connect()));

            // Verify all connected
            clients.forEach(client => {
                expect(client.connected).toBe(true);
            });

            // Each should receive CONNECT_ACK
            const acks = await Promise.all(
                clients.map(c => c.waitForMessage(MessageType.CONNECT_ACK))
            );

            expect(acks).toHaveLength(3);
            acks.forEach(ack => {
                expect(ack.type).toBe(MessageType.CONNECT_ACK);
            });
        } finally {
            clients.forEach(c => c.disconnect());
        }
    });

    test('should handle ping/pong heartbeat', async () => {
        test.skip(process.env.CI && !process.env.WS_SERVER_URL, 'WebSocket server not available in CI');

        const client = new WebSocketClient('device-1');

        try {
            await client.connect();

            // Send PING
            const ping = new SyncMessage(MessageType.PING);
            client.send(ping);

            // Wait for PONG
            const pong = await client.waitForMessage(MessageType.PONG, 3000);
            expect(pong.type).toBe(MessageType.PONG);
        } finally {
            client.disconnect();
        }
    });
});

test.describe('WebSocket Collaboration - Multi-User Sync', () => {
    test('should sync operations between two clients', async () => {
        test.skip(process.env.CI && !process.env.WS_SERVER_URL, 'WebSocket server not available in CI');

        const client1 = new WebSocketClient('device-1');
        const client2 = new WebSocketClient('device-2');

        try {
            await Promise.all([client1.connect(), client2.connect()]);

            // Client 1 sends an operation
            const operation = new Operation(
                OperationType.SET,
                'counter',
                42,
                'device-1',
                {}
            );

            const opMessage = new SyncMessage(MessageType.OPERATION, operation.toJSON());
            client1.send(opMessage);

            // Client 2 should receive the operation
            const receivedOp = await client2.waitForMessage(MessageType.OPERATION, 5000);
            expect(receivedOp.type).toBe(MessageType.OPERATION);
            expect(receivedOp.payload.key).toBe('counter');
            expect(receivedOp.payload.value).toBe(42);
        } finally {
            client1.disconnect();
            client2.disconnect();
        }
    });

    test('should handle concurrent operations with vector clocks', async () => {
        test.skip(process.env.CI && !process.env.WS_SERVER_URL, 'WebSocket server not available in CI');

        const client1 = new WebSocketClient('device-1');
        const client2 = new WebSocketClient('device-2');

        try {
            await Promise.all([client1.connect(), client2.connect()]);

            // Both clients send operations concurrently
            const op1 = new Operation(
                OperationType.SET,
                'value',
                'A',
                'device-1',
                {}
            );

            const op2 = new Operation(
                OperationType.SET,
                'value',
                'B',
                'device-2',
                {}
            );

            client1.send(new SyncMessage(MessageType.OPERATION, op1.toJSON()));
            client2.send(new SyncMessage(MessageType.OPERATION, op2.toJSON()));

            // Both should receive each other's operations
            const client1Received = await client1.waitForMessage(MessageType.OPERATION, 5000);
            const client2Received = await client2.waitForMessage(MessageType.OPERATION, 5000);

            expect(client1Received.payload.deviceId).toBe('device-2');
            expect(client2Received.payload.deviceId).toBe('device-1');

            // Verify vector clocks are present
            expect(client1Received.payload.vectorClock).toBeDefined();
            expect(client2Received.payload.vectorClock).toBeDefined();
        } finally {
            client1.disconnect();
            client2.disconnect();
        }
    });

    test('should batch operations for efficiency', async () => {
        test.skip(process.env.CI && !process.env.WS_SERVER_URL, 'WebSocket server not available in CI');

        const client = new WebSocketClient('device-1');

        try {
            await client.connect();

            // Create batch of operations
            const operations = Array.from({ length: 10 }, (_, i) =>
                new Operation(
                    OperationType.SET,
                    `key-${i}`,
                    `value-${i}`,
                    'device-1',
                    {}
                ).toJSON()
            );

            const batchMessage = new SyncMessage(MessageType.BATCH_OPERATION, {
                operations,
                count: operations.length
            });

            client.send(batchMessage);

            // Should receive ACK for batch
            const ack = await client.waitForMessage(MessageType.OPERATION_ACK, 5000);
            expect(ack.type).toBe(MessageType.OPERATION_ACK);
            expect(ack.payload.count).toBe(10);
        } finally {
            client.disconnect();
        }
    });
});

test.describe('WebSocket Collaboration - Conflict Resolution', () => {
    test('should detect concurrent conflicting operations', async () => {
        test.skip(process.env.CI && !process.env.WS_SERVER_URL, 'WebSocket server not available in CI');

        const client1 = new WebSocketClient('device-1');
        const client2 = new WebSocketClient('device-2');

        try {
            await Promise.all([client1.connect(), client2.connect()]);

            // Both clients update the same key with different values
            const op1 = new Operation(OperationType.SET, 'shared', 100, 'device-1', {});
            const op2 = new Operation(OperationType.SET, 'shared', 200, 'device-2', {});

            // Send operations at roughly the same time
            client1.send(new SyncMessage(MessageType.OPERATION, op1.toJSON()));
            client2.send(new SyncMessage(MessageType.OPERATION, op2.toJSON()));

            // Server should detect conflict and send CONFLICT message
            const conflict1 = await client1.waitForMessage(MessageType.CONFLICT, 5000);
            const conflict2 = await client2.waitForMessage(MessageType.CONFLICT, 5000);

            expect(conflict1.type).toBe(MessageType.CONFLICT);
            expect(conflict2.type).toBe(MessageType.CONFLICT);
            expect(conflict1.payload.key).toBe('shared');
        } finally {
            client1.disconnect();
            client2.disconnect();
        }
    });

    test('should resolve conflicts using last-write-wins', async () => {
        test.skip(process.env.CI && !process.env.WS_SERVER_URL, 'WebSocket server not available in CI');

        const client1 = new WebSocketClient('device-1');
        const client2 = new WebSocketClient('device-2');

        try {
            await Promise.all([client1.connect(), client2.connect()]);

            // Send conflicting operations with timestamps
            const timestamp1 = Date.now();
            await new Promise(resolve => setTimeout(resolve, 100));
            const timestamp2 = Date.now();

            const op1 = new Operation(OperationType.SET, 'lww', 'first', 'device-1', {});
            op1.timestamp = timestamp1;

            const op2 = new Operation(OperationType.SET, 'lww', 'second', 'device-2', {});
            op2.timestamp = timestamp2;

            client1.send(new SyncMessage(MessageType.OPERATION, op1.toJSON()));
            client2.send(new SyncMessage(MessageType.OPERATION, op2.toJSON()));

            // Wait for merge result
            const merge1 = await client1.waitForMessage(MessageType.MERGE, 5000);
            const merge2 = await client2.waitForMessage(MessageType.MERGE, 5000);

            // Last write (op2) should win
            expect(merge1.payload.value).toBe('second');
            expect(merge2.payload.value).toBe('second');
        } finally {
            client1.disconnect();
            client2.disconnect();
        }
    });
});

test.describe('WebSocket Collaboration - State Synchronization', () => {
    test('should request and receive full state snapshot', async () => {
        test.skip(process.env.CI && !process.env.WS_SERVER_URL, 'WebSocket server not available in CI');

        const client = new WebSocketClient('device-1');

        try {
            await client.connect();

            // Request snapshot
            const snapshotRequest = new SyncMessage(MessageType.SNAPSHOT_REQUEST);
            client.send(snapshotRequest);

            // Should receive snapshot
            const snapshot = await client.waitForMessage(MessageType.SNAPSHOT, 5000);
            expect(snapshot.type).toBe(MessageType.SNAPSHOT);
            expect(snapshot.payload.state).toBeDefined();
            expect(snapshot.payload.vectorClock).toBeDefined();
        } finally {
            client.disconnect();
        }
    });

    test('should sync state between late-joining client and existing clients', async () => {
        test.skip(process.env.CI && !process.env.WS_SERVER_URL, 'WebSocket server not available in CI');

        const client1 = new WebSocketClient('device-1');
        const client2 = new WebSocketClient('device-2');

        try {
            // Client 1 connects first and creates some state
            await client1.connect();
            await client1.waitForMessage(MessageType.CONNECT_ACK);

            const op = new Operation(OperationType.SET, 'initial', 'data', 'device-1', {});
            client1.send(new SyncMessage(MessageType.OPERATION, op.toJSON()));

            // Wait for operation to be processed
            await new Promise(resolve => setTimeout(resolve, 500));

            // Client 2 joins late
            await client2.connect();
            await client2.waitForMessage(MessageType.CONNECT_ACK);

            // Request sync
            const syncRequest = new SyncMessage(MessageType.SYNC_REQUEST);
            client2.send(syncRequest);

            // Should receive sync response with existing state
            const syncResponse = await client2.waitForMessage(MessageType.SYNC_RESPONSE, 5000);
            expect(syncResponse.type).toBe(MessageType.SYNC_RESPONSE);
            expect(syncResponse.payload.operations).toBeDefined();
            expect(syncResponse.payload.operations.length).toBeGreaterThan(0);
        } finally {
            client1.disconnect();
            client2.disconnect();
        }
    });
});

test.describe('WebSocket Collaboration - Error Handling', () => {
    test('should handle disconnection and reconnection', async () => {
        test.skip(process.env.CI && !process.env.WS_SERVER_URL, 'WebSocket server not available in CI');

        const client = new WebSocketClient('device-1');

        try {
            // Initial connection
            await client.connect();
            expect(client.connected).toBe(true);

            // Disconnect
            client.disconnect();
            expect(client.connected).toBe(false);

            // Reconnect
            await client.connect();
            expect(client.connected).toBe(true);

            // Should receive new CONNECT_ACK
            const ack = await client.waitForMessage(MessageType.CONNECT_ACK);
            expect(ack.type).toBe(MessageType.CONNECT_ACK);
        } finally {
            client.disconnect();
        }
    });

    test('should retry failed operations', async () => {
        test.skip(process.env.CI && !process.env.WS_SERVER_URL, 'WebSocket server not available in CI');

        const client = new WebSocketClient('device-1');

        try {
            await client.connect();

            // Send operation that will fail (invalid format)
            const invalidOp = new SyncMessage(MessageType.OPERATION, {
                invalid: 'data'
            });
            client.send(invalidOp);

            // Should receive ERROR message
            const error = await client.waitForMessage(MessageType.ERROR, 5000);
            expect(error.type).toBe(MessageType.ERROR);
            expect(error.payload.message).toBeDefined();

            // Send RETRY with corrected operation
            const validOp = new Operation(OperationType.SET, 'key', 'value', 'device-1', {});
            const retry = new SyncMessage(MessageType.RETRY, validOp.toJSON());
            client.send(retry);

            // Should receive ACK
            const ack = await client.waitForMessage(MessageType.OPERATION_ACK, 5000);
            expect(ack.type).toBe(MessageType.OPERATION_ACK);
        } finally {
            client.disconnect();
        }
    });
});

test.describe('WebSocket Collaboration - Performance', () => {
    test('should handle high-frequency operations', async () => {
        test.skip(process.env.CI && !process.env.WS_SERVER_URL, 'WebSocket server not available in CI');

        const client = new WebSocketClient('device-1');

        try {
            await client.connect();

            const startTime = Date.now();
            const operationCount = 100;

            // Send 100 operations rapidly
            for (let i = 0; i < operationCount; i++) {
                const op = new Operation(
                    OperationType.INCREMENT,
                    'counter',
                    1,
                    'device-1',
                    {}
                );
                client.send(new SyncMessage(MessageType.OPERATION, op.toJSON()));
            }

            // Wait for all ACKs (with timeout)
            const acks = [];
            for (let i = 0; i < operationCount; i++) {
                const ack = await client.waitForMessage(MessageType.OPERATION_ACK, 10000);
                acks.push(ack);
            }

            const duration = Date.now() - startTime;
            const throughput = (operationCount / duration) * 1000; // ops/sec

            expect(acks.length).toBe(operationCount);
            expect(throughput).toBeGreaterThan(10); // At least 10 ops/sec

            console.log(`Throughput: ${throughput.toFixed(2)} ops/sec`);
        } finally {
            client.disconnect();
        }
    }, TEST_TIMEOUT);
});
