/**
 * SyncProtocol - Custom WebSocket synchronization protocol
 * Implements version vector-based causal ordering and operation types
 */

export const MessageType = {
    // Connection lifecycle
    CONNECT: 'CONNECT',
    CONNECT_ACK: 'CONNECT_ACK',
    DISCONNECT: 'DISCONNECT',
    PING: 'PING',
    PONG: 'PONG',

    // Sync operations
    SYNC_REQUEST: 'SYNC_REQUEST',
    SYNC_RESPONSE: 'SYNC_RESPONSE',
    OPERATION: 'OPERATION',
    OPERATION_ACK: 'OPERATION_ACK',
    BATCH_OPERATION: 'BATCH_OPERATION',

    // Conflict resolution
    CONFLICT: 'CONFLICT',
    MERGE: 'MERGE',

    // State management
    SNAPSHOT_REQUEST: 'SNAPSHOT_REQUEST',
    SNAPSHOT: 'SNAPSHOT',

    // Error handling
    ERROR: 'ERROR',
    RETRY: 'RETRY'
};

export const OperationType = {
    INSERT: 'INSERT',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    SET: 'SET',
    INCREMENT: 'INCREMENT',
    DECREMENT: 'DECREMENT'
};

export const ConflictResolutionStrategy = {
    LAST_WRITE_WINS: 'LAST_WRITE_WINS',
    FIRST_WRITE_WINS: 'FIRST_WRITE_WINS',
    MERGE: 'MERGE',
    CUSTOM: 'CUSTOM'
};

/**
 * Message envelope for all protocol communications
 */
export class SyncMessage {
    constructor(type, payload = {}, metadata = {}) {
        this.id = SyncMessage.generateId();
        this.type = type;
        this.payload = payload;
        this.metadata = {
            timestamp: Date.now(),
            version: '1.0.0',
            ...metadata
        };
    }

    static generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    static fromJSON(json) {
        const data = typeof json === 'string' ? JSON.parse(json) : json;
        return new SyncMessage(data.type, data.payload, data.metadata);
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            payload: this.payload,
            metadata: this.metadata
        };
    }

    toString() {
        return JSON.stringify(this.toJSON());
    }
}

/**
 * Operation represents a single sync operation with causality tracking
 */
export class Operation {
    constructor(type, key, value, deviceId, vectorClock = {}) {
        this.id = SyncMessage.generateId();
        this.type = type;
        this.key = key;
        this.value = value;
        this.deviceId = deviceId;
        this.timestamp = Date.now();
        this.vectorClock = { ...vectorClock };
        this.vectorClock[deviceId] = (this.vectorClock[deviceId] || 0) + 1;
    }

    /**
     * Check if this operation happens-before another operation
     */
    happensBefore(other) {
        let hasSmaller = false;
        let hasGreater = false;

        const allDevices = new Set([
            ...Object.keys(this.vectorClock),
            ...Object.keys(other.vectorClock)
        ]);

        for (const device of allDevices) {
            const thisClock = this.vectorClock[device] || 0;
            const otherClock = other.vectorClock[device] || 0;

            if (thisClock < otherClock) hasSmaller = true;
            if (thisClock > otherClock) hasGreater = true;
        }

        return hasSmaller && !hasGreater;
    }

    /**
     * Check if operations are concurrent (conflict)
     */
    isConcurrentWith(other) {
        return !this.happensBefore(other) && !other.happensBefore(this);
    }

    /**
     * Merge vector clocks (take maximum for each device)
     */
    static mergeVectorClocks(...clocks) {
        const merged = {};
        const allDevices = new Set(clocks.flatMap(c => Object.keys(c)));

        for (const device of allDevices) {
            merged[device] = Math.max(...clocks.map(c => c[device] || 0));
        }

        return merged;
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            key: this.key,
            value: this.value,
            deviceId: this.deviceId,
            timestamp: this.timestamp,
            vectorClock: this.vectorClock
        };
    }

    static fromJSON(json) {
        // Create a new operation without incrementing vector clock
        const op = Object.create(Operation.prototype);
        op.id = json.id;
        op.type = json.type;
        op.key = json.key;
        op.value = json.value;
        op.deviceId = json.deviceId;
        op.timestamp = json.timestamp;
        op.vectorClock = { ...json.vectorClock };
        return op;
    }
}

/**
 * Protocol validator for message validation
 */
export class ProtocolValidator {
    static validateMessage(message) {
        if (!message || typeof message !== 'object') {
            return { valid: false, error: 'Message must be an object' };
        }

        if (!message.type || !Object.values(MessageType).includes(message.type)) {
            return { valid: false, error: 'Invalid message type' };
        }

        if (!message.id) {
            return { valid: false, error: 'Message must have an ID' };
        }

        if (!message.metadata || !message.metadata.timestamp) {
            return { valid: false, error: 'Message must have metadata with timestamp' };
        }

        return { valid: true };
    }

    static validateOperation(operation) {
        if (!operation || typeof operation !== 'object') {
            return { valid: false, error: 'Operation must be an object' };
        }

        if (!operation.type || !Object.values(OperationType).includes(operation.type)) {
            return { valid: false, error: 'Invalid operation type' };
        }

        if (!operation.deviceId) {
            return { valid: false, error: 'Operation must have a deviceId' };
        }

        if (!operation.vectorClock || typeof operation.vectorClock !== 'object') {
            return { valid: false, error: 'Operation must have a vector clock' };
        }

        return { valid: true };
    }
}

/**
 * Causal ordering buffer for ensuring operations are applied in correct order
 */
export class CausalOrderBuffer {
    constructor() {
        this.buffer = [];
        this.vectorClock = {};
    }

    /**
     * Add operation to buffer and return operations ready to apply
     */
    addOperation(operation) {
        // Check if operation is causally ready
        if (this.isCausallyReady(operation)) {
            this.vectorClock = Operation.mergeVectorClocks(
                this.vectorClock,
                operation.vectorClock
            );
            return [operation, ...this.checkBuffer()];
        }

        // Buffer the operation
        this.buffer.push(operation);
        return [];
    }

    /**
     * Check if operation is causally ready to apply
     */
    isCausallyReady(operation) {
        for (const [device, clock] of Object.entries(operation.vectorClock)) {
            const expectedClock = device === operation.deviceId
                ? (this.vectorClock[device] || 0) + 1
                : (this.vectorClock[device] || 0);

            if (clock > expectedClock) {
                return false;
            }
        }
        return true;
    }

    /**
     * Check buffer for newly ready operations
     */
    checkBuffer() {
        const ready = [];
        let changed = true;

        while (changed) {
            changed = false;
            for (let i = this.buffer.length - 1; i >= 0; i--) {
                if (this.isCausallyReady(this.buffer[i])) {
                    const op = this.buffer.splice(i, 1)[0];
                    this.vectorClock = Operation.mergeVectorClocks(
                        this.vectorClock,
                        op.vectorClock
                    );
                    ready.push(op);
                    changed = true;
                }
            }
        }

        return ready;
    }

    getBufferSize() {
        return this.buffer.length;
    }

    clear() {
        this.buffer = [];
    }
}
