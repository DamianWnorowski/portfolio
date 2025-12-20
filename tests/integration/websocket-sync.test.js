/**
 * Integration tests for WebSocket synchronization layer
 * Tests CRDT-based sync, offline queue, and conflict resolution
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocketSync, ConnectionState, SyncMode } from '../../src/services/WebSocketSync.js';
import { SyncState } from '../../src/services/SyncState.js';
import { OfflineQueue, OperationStatus } from '../../src/services/OfflineQueue.js';
import {
    Operation,
    OperationType,
    SyncMessage,
    MessageType,
    CausalOrderBuffer,
    ProtocolValidator
} from '../../src/utils/SyncProtocol.js';

// Mock WebSocket
class MockWebSocket {
    constructor(url) {
        this.url = url;
        this.readyState = WebSocket.CONNECTING;
        this.onopen = null;
        this.onmessage = null;
        this.onclose = null;
        this.onerror = null;
        this.sentMessages = [];

        // Simulate connection
        setTimeout(() => {
            this.readyState = WebSocket.OPEN;
            if (this.onopen) this.onopen();
        }, 10);
    }

    send(data) {
        this.sentMessages.push(data);
    }

    close(code, reason) {
        this.readyState = WebSocket.CLOSED;
        if (this.onclose) this.onclose({ code, reason });
    }

    simulateMessage(message) {
        if (this.onmessage) {
            this.onmessage({ data: message instanceof SyncMessage ? message.toString() : message });
        }
    }
}

// Mock global WebSocket
global.WebSocket = MockWebSocket;
global.WebSocket.CONNECTING = 0;
global.WebSocket.OPEN = 1;
global.WebSocket.CLOSING = 2;
global.WebSocket.CLOSED = 3;

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = value.toString(); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; }
    };
})();
global.localStorage = localStorageMock;

describe('SyncProtocol', () => {
    describe('Operation', () => {
        it('should create operation with vector clock', () => {
            const op = new Operation(OperationType.SET, 'key1', 'value1', 'device1');

            expect(op.type).toBe(OperationType.SET);
            expect(op.key).toBe('key1');
            expect(op.value).toBe('value1');
            expect(op.deviceId).toBe('device1');
            expect(op.vectorClock).toHaveProperty('device1', 1);
        });

        it('should detect happens-before relationship', () => {
            const op1 = new Operation(OperationType.SET, 'key1', 'value1', 'device1');
            const op2 = new Operation(OperationType.SET, 'key1', 'value2', 'device2', op1.vectorClock);

            expect(op1.happensBefore(op2)).toBe(true);
            expect(op2.happensBefore(op1)).toBe(false);
        });

        it('should detect concurrent operations', () => {
            const op1 = new Operation(OperationType.SET, 'key1', 'value1', 'device1');
            const op2 = new Operation(OperationType.SET, 'key1', 'value2', 'device2');

            expect(op1.isConcurrentWith(op2)).toBe(true);
            expect(op2.isConcurrentWith(op1)).toBe(true);
        });

        it('should merge vector clocks', () => {
            const clock1 = { device1: 5, device2: 3 };
            const clock2 = { device1: 4, device2: 6, device3: 2 };

            const merged = Operation.mergeVectorClocks(clock1, clock2);

            expect(merged).toEqual({ device1: 5, device2: 6, device3: 2 });
        });

        it('should serialize and deserialize', () => {
            const op1 = new Operation(OperationType.UPDATE, 'key1', { nested: 'data' }, 'device1');
            const json = op1.toJSON();
            const op2 = Operation.fromJSON(json);

            expect(op2.type).toBe(op1.type);
            expect(op2.key).toBe(op1.key);
            expect(op2.value).toEqual(op1.value);
            expect(op2.deviceId).toBe(op1.deviceId);
            expect(op2.vectorClock).toEqual(op1.vectorClock);
        });
    });

    describe('SyncMessage', () => {
        it('should create valid message', () => {
            const msg = new SyncMessage(MessageType.OPERATION, { test: 'data' });

            expect(msg.type).toBe(MessageType.OPERATION);
            expect(msg.payload).toEqual({ test: 'data' });
            expect(msg.metadata.timestamp).toBeGreaterThan(0);
            expect(msg.id).toBeTruthy();
        });

        it('should serialize to JSON string', () => {
            const msg = new SyncMessage(MessageType.PING);
            const str = msg.toString();
            const parsed = JSON.parse(str);

            expect(parsed.type).toBe(MessageType.PING);
            expect(parsed.id).toBeTruthy();
        });

        it('should deserialize from JSON', () => {
            const msg1 = new SyncMessage(MessageType.SYNC_REQUEST, { deviceId: 'test' });
            const msg2 = SyncMessage.fromJSON(msg1.toString());

            expect(msg2.type).toBe(msg1.type);
            expect(msg2.payload).toEqual(msg1.payload);
        });
    });

    describe('ProtocolValidator', () => {
        it('should validate valid message', () => {
            const msg = new SyncMessage(MessageType.CONNECT);
            const result = ProtocolValidator.validateMessage(msg);

            expect(result.valid).toBe(true);
        });

        it('should reject invalid message type', () => {
            const msg = { type: 'INVALID', id: '123', metadata: { timestamp: Date.now() } };
            const result = ProtocolValidator.validateMessage(msg);

            expect(result.valid).toBe(false);
            expect(result.error).toContain('Invalid message type');
        });

        it('should validate operation', () => {
            const op = new Operation(OperationType.SET, 'key1', 'value1', 'device1');
            const result = ProtocolValidator.validateOperation(op);

            expect(result.valid).toBe(true);
        });
    });

    describe('CausalOrderBuffer', () => {
        it('should apply operations in causal order', () => {
            const buffer = new CausalOrderBuffer();

            const op1 = new Operation(OperationType.SET, 'key1', 'value1', 'device1');
            const op2 = new Operation(OperationType.SET, 'key2', 'value2', 'device1', op1.vectorClock);

            // Apply in order
            const ready1 = buffer.addOperation(op1);
            expect(ready1).toHaveLength(1);
            expect(ready1[0].id).toBe(op1.id);

            const ready2 = buffer.addOperation(op2);
            expect(ready2).toHaveLength(1);
            expect(ready2[0].id).toBe(op2.id);
        });

        it('should buffer out-of-order operations', () => {
            const buffer = new CausalOrderBuffer();

            const op1 = new Operation(OperationType.SET, 'key1', 'value1', 'device1');
            const op2 = new Operation(OperationType.SET, 'key2', 'value2', 'device1', op1.vectorClock);

            // Apply op2 first (out of order)
            const ready1 = buffer.addOperation(op2);
            expect(ready1).toHaveLength(0); // Buffered
            expect(buffer.getBufferSize()).toBe(1);

            // Apply op1, should release both
            const ready2 = buffer.addOperation(op1);
            expect(ready2).toHaveLength(2);
        });

        it('should handle concurrent operations', () => {
            const buffer = new CausalOrderBuffer();

            const op1 = new Operation(OperationType.SET, 'key1', 'value1', 'device1');
            const op2 = new Operation(OperationType.SET, 'key2', 'value2', 'device2');

            const ready1 = buffer.addOperation(op1);
            const ready2 = buffer.addOperation(op2);

            expect(ready1).toHaveLength(1);
            expect(ready2).toHaveLength(1);
        });
    });
});

describe('SyncState', () => {
    let state;

    beforeEach(() => {
        state = new SyncState('device1');
    });

    describe('Basic operations', () => {
        it('should set and get values', () => {
            state.set('key1', 'value1');
            expect(state.get('key1')).toBe('value1');
        });

        it('should update values', () => {
            state.set('key1', 'value1');
            state.set('key1', 'value2');
            expect(state.get('key1')).toBe('value2');
        });

        it('should delete values', () => {
            state.set('key1', 'value1');
            state.delete('key1');
            expect(state.has('key1')).toBe(false);
        });

        it('should increment counters', () => {
            state.increment('counter1', 5);
            expect(state.get('counter1')).toBe(5);

            state.increment('counter1', 3);
            expect(state.get('counter1')).toBe(8);
        });

        it('should decrement counters', () => {
            state.increment('counter1', 10);
            state.decrement('counter1', 3);
            expect(state.get('counter1')).toBe(7);
        });
    });

    describe('CRDT conflict resolution', () => {
        it('should resolve concurrent updates with LWW', () => {
            const state1 = new SyncState('device1');
            const state2 = new SyncState('device2');

            // Concurrent updates
            const op1 = state1.set('key1', 'value1');
            const op2 = state2.set('key1', 'value2');

            // Apply each other's operations
            state1.applyOperation(op2);
            state2.applyOperation(op1);

            // Both should converge to same value (last write wins by timestamp+deviceId)
            expect(state1.get('key1')).toBe(state2.get('key1'));
        });

        it('should merge counters correctly', () => {
            const state1 = new SyncState('device1');
            const state2 = new SyncState('device2');

            // Independent increments
            state1.increment('count', 5);
            state2.increment('count', 3);

            // Merge states
            state1.merge(state2);

            // Should sum both increments
            expect(state1.get('count')).toBe(8);
        });
    });

    describe('State synchronization', () => {
        it('should create snapshot', () => {
            state.set('key1', 'value1');
            state.set('key2', 'value2');
            state.increment('counter1', 10);

            const snapshot = state.getSnapshot();

            expect(snapshot.deviceId).toBe('device1');
            expect(snapshot.vectorClock).toBeTruthy();
            expect(snapshot.lwwSet).toBeTruthy();
            expect(snapshot.counters).toBeTruthy();
        });

        it('should restore from snapshot', () => {
            state.set('key1', 'value1');
            state.increment('counter1', 5);

            const snapshot = state.getSnapshot();

            const state2 = new SyncState('device2');
            state2.restoreSnapshot(snapshot);

            expect(state2.get('key1')).toBe('value1');
            expect(state2.get('counter1')).toBe(5);
        });

        it('should get operations since vector clock', () => {
            const initialClock = { ...state.vectorClock };

            state.set('key1', 'value1');
            state.set('key2', 'value2');
            state.increment('counter1', 5);

            const ops = state.getOperationsSince(initialClock);
            expect(ops.length).toBe(3);
        });
    });

    describe('Event subscription', () => {
        it('should notify subscribers on change', () => {
            const callback = vi.fn();
            state.subscribe('key1', callback);

            state.set('key1', 'value1');

            expect(callback).toHaveBeenCalledWith('value1', 'key1');
        });

        it('should support unsubscribe', () => {
            const callback = vi.fn();
            const unsubscribe = state.subscribe('key1', callback);

            state.set('key1', 'value1');
            expect(callback).toHaveBeenCalledTimes(1);

            unsubscribe();
            state.set('key1', 'value2');
            expect(callback).toHaveBeenCalledTimes(1); // Not called again
        });

        it('should notify wildcard subscribers', () => {
            const callback = vi.fn();
            state.subscribe('*', callback);

            state.set('key1', 'value1');
            state.set('key2', 'value2');

            expect(callback).toHaveBeenCalledTimes(2);
        });
    });
});

describe('OfflineQueue', () => {
    let queue;

    beforeEach(() => {
        localStorage.clear();
        queue = new OfflineQueue({ isDev: false });
    });

    afterEach(() => {
        queue.stopProcessing();
    });

    it('should enqueue and dequeue operations', () => {
        const op = new Operation(OperationType.SET, 'key1', 'value1', 'device1');
        const id = queue.enqueue(op);

        expect(queue.getStats().total).toBe(1);

        const dequeued = queue.dequeue(id);
        expect(dequeued.operation.id).toBe(op.id);
        expect(queue.getStats().total).toBe(0);
    });

    it('should prioritize operations', () => {
        const op1 = new Operation(OperationType.SET, 'key1', 'value1', 'device1');
        const op2 = new Operation(OperationType.SET, 'key2', 'value2', 'device1');
        const op3 = new Operation(OperationType.SET, 'key3', 'value3', 'device1');

        queue.enqueue(op1, 1);
        queue.enqueue(op2, 5);
        queue.enqueue(op3, 3);

        const next = queue.getNext();
        expect(next.operation.id).toBe(op2.id); // Highest priority
    });

    it('should persist and restore queue', () => {
        const op = new Operation(OperationType.SET, 'key1', 'value1', 'device1');
        queue.enqueue(op);

        const queue2 = new OfflineQueue({ storageKey: queue.storageKey });
        expect(queue2.getStats().total).toBe(1);
    });

    it('should process queue with handler', async () => {
        const handler = vi.fn().mockResolvedValue(true);
        const op = new Operation(OperationType.SET, 'key1', 'value1', 'device1');

        queue.enqueue(op);
        await queue.drain(handler);

        expect(handler).toHaveBeenCalledWith(op);
        expect(queue.getStats().total).toBe(0);
    });

    it('should retry failed operations', async () => {
        let attempts = 0;
        const handler = vi.fn().mockImplementation(() => {
            attempts++;
            if (attempts < 3) {
                throw new Error('Simulated failure');
            }
            return Promise.resolve(true);
        });

        const op = new Operation(OperationType.SET, 'key1', 'value1', 'device1');
        queue.enqueue(op);

        await queue.drain(handler);

        expect(handler).toHaveBeenCalledTimes(3);
        expect(queue.getStats().total).toBe(0);
    });

    it('should emit queue events', async () => {
        const events = [];
        queue.subscribe((event) => events.push(event.event));

        const op = new Operation(OperationType.SET, 'key1', 'value1', 'device1');
        queue.enqueue(op);

        expect(events).toContain('enqueue');
    });
});

describe('WebSocketSync', () => {
    let sync;

    beforeEach(() => {
        localStorage.clear();
        sync = new WebSocketSync('ws://localhost:8080', {
            deviceId: 'test-device',
            isDev: false
        });
    });

    afterEach(() => {
        sync.disconnect();
    });

    describe('Connection management', () => {
        it('should connect to WebSocket server', async () => {
            sync.connect();

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(sync.getConnectionState()).toBe(ConnectionState.CONNECTED);
        });

        it('should send connect message on connection', async () => {
            sync.connect();

            await new Promise(resolve => setTimeout(resolve, 50));

            const sentMessages = sync.ws.sentMessages;
            expect(sentMessages.length).toBeGreaterThan(0);

            const connectMsg = SyncMessage.fromJSON(sentMessages[0]);
            expect(connectMsg.type).toBe(MessageType.CONNECT);
        });

        it('should handle reconnection on disconnect', async () => {
            const reconnectSpy = vi.fn();
            sync.on('reconnecting', reconnectSpy);

            sync.connect();
            await new Promise(resolve => setTimeout(resolve, 50));

            sync.ws.close(1006, 'Connection lost');
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(reconnectSpy).toHaveBeenCalled();
        });

        it('should emit connection state changes', async () => {
            const states = [];
            sync.on('connection_state', (data) => states.push(data.state));

            sync.connect();
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(states).toContain(ConnectionState.CONNECTING);
            expect(states).toContain(ConnectionState.CONNECTED);
        });
    });

    describe('Operation synchronization', () => {
        beforeEach(async () => {
            sync.connect();
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        it('should send operation in realtime mode', () => {
            sync.syncMode = SyncMode.REALTIME;
            sync.sendOperation(OperationType.SET, 'key1', 'value1');

            const opMessages = sync.ws.sentMessages.filter(msg => {
                const parsed = SyncMessage.fromJSON(msg);
                return parsed.type === MessageType.OPERATION;
            });

            expect(opMessages.length).toBeGreaterThan(0);
        });

        it('should batch operations in batched mode', async () => {
            sync.syncMode = SyncMode.BATCHED;
            sync.sendOperation(OperationType.SET, 'key1', 'value1');
            sync.sendOperation(OperationType.SET, 'key2', 'value2');

            sync.flushBatch();

            const batchMessages = sync.ws.sentMessages.filter(msg => {
                const parsed = SyncMessage.fromJSON(msg);
                return parsed.type === MessageType.BATCH_OPERATION;
            });

            expect(batchMessages.length).toBeGreaterThan(0);
        });

        it('should queue operations when offline', () => {
            sync.disconnect();

            sync.sendOperation(OperationType.SET, 'key1', 'value1', 5);

            const stats = sync.getQueueStats();
            expect(stats.total).toBe(1);
        });

        it('should apply received operations', async () => {
            const op = new Operation(OperationType.SET, 'key1', 'remote-value', 'device2');
            const message = new SyncMessage(MessageType.OPERATION, {
                operation: op.toJSON()
            });

            sync.ws.simulateMessage(message);
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(sync.getState().key1).toBe('remote-value');
        });
    });

    describe('Sync requests', () => {
        beforeEach(async () => {
            sync.connect();
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        it('should request full sync', () => {
            sync.requestSync();

            const syncMessages = sync.ws.sentMessages.filter(msg => {
                const parsed = SyncMessage.fromJSON(msg);
                return parsed.type === MessageType.SYNC_REQUEST;
            });

            expect(syncMessages.length).toBeGreaterThan(0);
        });

        it('should handle sync response', async () => {
            const operations = [
                new Operation(OperationType.SET, 'key1', 'value1', 'device2').toJSON(),
                new Operation(OperationType.SET, 'key2', 'value2', 'device2').toJSON()
            ];

            const message = new SyncMessage(MessageType.SYNC_RESPONSE, {
                operations,
                snapshot: null
            });

            const syncedSpy = vi.fn();
            sync.on('synced', syncedSpy);

            sync.ws.simulateMessage(message);
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(syncedSpy).toHaveBeenCalled();
            expect(sync.getState().key1).toBe('value1');
            expect(sync.getState().key2).toBe('value2');
        });

        it('should request and restore snapshot', async () => {
            sync.requestSnapshot();

            const snapshot = {
                deviceId: 'server',
                vectorClock: { server: 10 },
                lwwSet: { addSet: [], removeSet: [] },
                counters: [],
                timestamp: Date.now()
            };

            const message = new SyncMessage(MessageType.SNAPSHOT, { snapshot });

            const restoredSpy = vi.fn();
            sync.on('snapshot_restored', restoredSpy);

            sync.ws.simulateMessage(message);
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(restoredSpy).toHaveBeenCalled();
        });
    });

    describe('State subscription', () => {
        it('should notify subscribers on state change', async () => {
            sync.connect();
            await new Promise(resolve => setTimeout(resolve, 50));

            const callback = vi.fn();
            sync.subscribe('key1', callback);

            sync.sendOperation(OperationType.SET, 'key1', 'value1');

            expect(callback).toHaveBeenCalledWith('value1', 'key1');
        });
    });

    describe('Ping/Pong heartbeat', () => {
        it('should send ping messages', async () => {
            sync.pingInterval = 100;
            sync.connect();
            await new Promise(resolve => setTimeout(resolve, 150));

            const pingMessages = sync.ws.sentMessages.filter(msg => {
                const parsed = SyncMessage.fromJSON(msg);
                return parsed.type === MessageType.PING;
            });

            expect(pingMessages.length).toBeGreaterThan(0);
        });

        it('should handle pong response', async () => {
            sync.connect();
            await new Promise(resolve => setTimeout(resolve, 50));

            const pongSpy = vi.fn();
            sync.on('pong', pongSpy);

            const message = new SyncMessage(MessageType.PONG);
            sync.ws.simulateMessage(message);

            expect(pongSpy).toHaveBeenCalled();
        });
    });
});
