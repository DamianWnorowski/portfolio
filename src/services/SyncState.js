/**
 * SyncState - CRDT-based state management with conflict-free replication
 * Implements Last-Write-Wins Element Set (LWW-Element-Set) and G-Counter
 */

import { Operation, OperationType, ConflictResolutionStrategy } from '../utils/SyncProtocol.js';

/**
 * LWW-Element-Set CRDT for conflict-free set operations
 */
class LWWElementSet {
    constructor() {
        this.addSet = new Map(); // key -> {timestamp, deviceId, value}
        this.removeSet = new Map(); // key -> {timestamp, deviceId}
    }

    /**
     * Add element with timestamp
     */
    add(key, value, timestamp, deviceId) {
        const existing = this.addSet.get(key);

        if (!existing || timestamp > existing.timestamp ||
            (timestamp === existing.timestamp && deviceId > existing.deviceId)) {
            this.addSet.set(key, { timestamp, deviceId, value });
        }
    }

    /**
     * Remove element with timestamp
     */
    remove(key, timestamp, deviceId) {
        const existing = this.removeSet.get(key);

        if (!existing || timestamp > existing.timestamp ||
            (timestamp === existing.timestamp && deviceId > existing.deviceId)) {
            this.removeSet.set(key, { timestamp, deviceId });
        }
    }

    /**
     * Check if element exists (bias towards add)
     */
    has(key) {
        const added = this.addSet.get(key);
        const removed = this.removeSet.get(key);

        if (!added) return false;
        if (!removed) return true;

        // Element exists if add timestamp > remove timestamp
        // OR timestamps equal and add deviceId > remove deviceId (tie-breaker)
        if (added.timestamp > removed.timestamp) return true;
        if (added.timestamp < removed.timestamp) return false;
        return added.deviceId > removed.deviceId;
    }

    /**
     * Get element value
     */
    get(key) {
        if (!this.has(key)) return undefined;
        return this.addSet.get(key).value;
    }

    /**
     * Get all elements
     */
    getAllElements() {
        const elements = new Map();

        for (const [key, data] of this.addSet) {
            if (this.has(key)) {
                elements.set(key, data.value);
            }
        }

        return elements;
    }

    /**
     * Merge with another LWW-Element-Set
     */
    merge(other) {
        // Merge add sets
        for (const [key, data] of other.addSet) {
            this.add(key, data.value, data.timestamp, data.deviceId);
        }

        // Merge remove sets
        for (const [key, data] of other.removeSet) {
            this.remove(key, data.timestamp, data.deviceId);
        }
    }

    toJSON() {
        return {
            addSet: Array.from(this.addSet.entries()),
            removeSet: Array.from(this.removeSet.entries())
        };
    }

    static fromJSON(json) {
        const set = new LWWElementSet();
        set.addSet = new Map(json.addSet || []);
        set.removeSet = new Map(json.removeSet || []);
        return set;
    }
}

/**
 * G-Counter CRDT for increment-only counters
 */
class GCounter {
    constructor() {
        this.counters = {}; // deviceId -> count
    }

    increment(deviceId, amount = 1) {
        this.counters[deviceId] = (this.counters[deviceId] || 0) + amount;
    }

    getValue() {
        return Object.values(this.counters).reduce((sum, count) => sum + count, 0);
    }

    merge(other) {
        for (const [deviceId, count] of Object.entries(other.counters)) {
            this.counters[deviceId] = Math.max(
                this.counters[deviceId] || 0,
                count
            );
        }
    }

    toJSON() {
        return { counters: this.counters };
    }

    static fromJSON(json) {
        const counter = new GCounter();
        counter.counters = json.counters || {};
        return counter;
    }
}

/**
 * PN-Counter CRDT for increment/decrement counters
 */
class PNCounter {
    constructor() {
        this.positiveCounter = new GCounter();
        this.negativeCounter = new GCounter();
    }

    increment(deviceId, amount = 1) {
        this.positiveCounter.increment(deviceId, amount);
    }

    decrement(deviceId, amount = 1) {
        this.negativeCounter.increment(deviceId, amount);
    }

    getValue() {
        return this.positiveCounter.getValue() - this.negativeCounter.getValue();
    }

    merge(other) {
        this.positiveCounter.merge(other.positiveCounter);
        this.negativeCounter.merge(other.negativeCounter);
    }

    toJSON() {
        return {
            positiveCounter: this.positiveCounter.toJSON(),
            negativeCounter: this.negativeCounter.toJSON()
        };
    }

    static fromJSON(json) {
        const counter = new PNCounter();
        counter.positiveCounter = GCounter.fromJSON(json.positiveCounter || { counters: {} });
        counter.negativeCounter = GCounter.fromJSON(json.negativeCounter || { counters: {} });
        return counter;
    }
}

/**
 * SyncState - Main state manager with CRDT-based replication
 */
export class SyncState {
    constructor(deviceId, strategy = ConflictResolutionStrategy.LAST_WRITE_WINS) {
        this.deviceId = deviceId;
        this.strategy = strategy;
        this.lwwSet = new LWWElementSet();
        this.counters = new Map(); // key -> PNCounter
        this.vectorClock = {};
        this.vectorClock[deviceId] = 0;
        this.operationLog = [];
        this.listeners = new Map();
        this.lastTimestamp = 0;
    }

    /**
     * Apply an operation to the state
     */
    applyOperation(operation) {
        const validationResult = this.validateOperation(operation);
        if (!validationResult.valid) {
            throw new Error(`Invalid operation: ${validationResult.error}`);
        }

        // Update vector clock
        this.vectorClock = Operation.mergeVectorClocks(
            this.vectorClock,
            operation.vectorClock
        );

        // Apply operation based on type
        switch (operation.type) {
            case OperationType.SET:
            case OperationType.UPDATE:
                this.lwwSet.add(
                    operation.key,
                    operation.value,
                    operation.timestamp,
                    operation.deviceId
                );
                break;

            case OperationType.DELETE:
                this.lwwSet.remove(
                    operation.key,
                    operation.timestamp,
                    operation.deviceId
                );
                break;

            case OperationType.INCREMENT:
                this.ensureCounter(operation.key);
                this.counters.get(operation.key).increment(
                    operation.deviceId,
                    operation.value || 1
                );
                break;

            case OperationType.DECREMENT:
                this.ensureCounter(operation.key);
                this.counters.get(operation.key).decrement(
                    operation.deviceId,
                    operation.value || 1
                );
                break;

            default:
                throw new Error(`Unknown operation type: ${operation.type}`);
        }

        // Log operation
        this.operationLog.push(operation);
        this.trimOperationLog();

        // Notify listeners
        this.notifyListeners(operation.key, this.get(operation.key));

        return true;
    }

    /**
     * Create and apply a local operation
     */
    createOperation(type, key, value) {
        // Ensure monotonically increasing timestamps
        const now = Date.now();
        const timestamp = now > this.lastTimestamp ? now : this.lastTimestamp + 1;
        this.lastTimestamp = timestamp;

        const operation = new Operation(
            type,
            key,
            value,
            this.deviceId,
            this.vectorClock
        );
        operation.timestamp = timestamp;

        this.applyOperation(operation);
        return operation;
    }

    /**
     * Get value for key
     */
    get(key) {
        // Check if it's a counter
        if (this.counters.has(key)) {
            return this.counters.get(key).getValue();
        }

        // Check LWW set
        return this.lwwSet.get(key);
    }

    /**
     * Set value for key
     */
    set(key, value) {
        return this.createOperation(OperationType.SET, key, value);
    }

    /**
     * Delete key
     */
    delete(key) {
        return this.createOperation(OperationType.DELETE, key, null);
    }

    /**
     * Increment counter
     */
    increment(key, amount = 1) {
        return this.createOperation(OperationType.INCREMENT, key, amount);
    }

    /**
     * Decrement counter
     */
    decrement(key, amount = 1) {
        return this.createOperation(OperationType.DECREMENT, key, amount);
    }

    /**
     * Check if key exists
     */
    has(key) {
        return this.counters.has(key) || this.lwwSet.has(key);
    }

    /**
     * Get all data as plain object
     */
    toObject() {
        const data = {};

        // Add LWW set elements
        for (const [key, value] of this.lwwSet.getAllElements()) {
            data[key] = value;
        }

        // Add counter values
        for (const [key, counter] of this.counters) {
            data[key] = counter.getValue();
        }

        return data;
    }

    /**
     * Merge state from another device
     */
    merge(otherState) {
        // Merge LWW sets
        this.lwwSet.merge(otherState.lwwSet);

        // Merge counters
        for (const [key, otherCounter] of otherState.counters) {
            this.ensureCounter(key);
            this.counters.get(key).merge(otherCounter);
        }

        // Merge vector clocks
        this.vectorClock = Operation.mergeVectorClocks(
            this.vectorClock,
            otherState.vectorClock
        );

        // Notify all listeners
        this.notifyAllListeners();
    }

    /**
     * Get state snapshot
     */
    getSnapshot() {
        return {
            deviceId: this.deviceId,
            vectorClock: { ...this.vectorClock },
            lwwSet: this.lwwSet.toJSON(),
            counters: Array.from(this.counters.entries()).map(([key, counter]) => [
                key,
                counter.toJSON()
            ]),
            timestamp: Date.now()
        };
    }

    /**
     * Restore from snapshot
     */
    restoreSnapshot(snapshot) {
        this.deviceId = snapshot.deviceId;
        this.vectorClock = snapshot.vectorClock || {};
        this.lwwSet = LWWElementSet.fromJSON(snapshot.lwwSet);
        this.counters = new Map(
            (snapshot.counters || []).map(([key, json]) => [key, PNCounter.fromJSON(json)])
        );
        this.notifyAllListeners();
    }

    /**
     * Get operations since a vector clock
     */
    getOperationsSince(vectorClock) {
        return this.operationLog.filter(op => {
            // Check if operation is newer than the given vector clock
            for (const [device, clock] of Object.entries(op.vectorClock)) {
                if (clock > (vectorClock[device] || 0)) {
                    return true;
                }
            }
            return false;
        });
    }

    /**
     * Subscribe to changes for a key
     */
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);

        // Return unsubscribe function
        return () => {
            const listeners = this.listeners.get(key);
            if (listeners) {
                listeners.delete(callback);
            }
        };
    }

    // Private methods

    ensureCounter(key) {
        if (!this.counters.has(key)) {
            this.counters.set(key, new PNCounter());
        }
    }

    validateOperation(operation) {
        if (!operation || typeof operation !== 'object') {
            return { valid: false, error: 'Operation must be an object' };
        }

        if (!operation.type || !Object.values(OperationType).includes(operation.type)) {
            return { valid: false, error: 'Invalid operation type' };
        }

        return { valid: true };
    }

    trimOperationLog(maxSize = 1000) {
        if (this.operationLog.length > maxSize) {
            this.operationLog = this.operationLog.slice(-maxSize);
        }
    }

    notifyListeners(key, value) {
        const listeners = this.listeners.get(key);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(value, key);
                } catch (error) {
                    console.error('Listener error:', error);
                }
            });
        }

        // Notify wildcard listeners
        const wildcardListeners = this.listeners.get('*');
        if (wildcardListeners) {
            wildcardListeners.forEach(callback => {
                try {
                    callback(value, key);
                } catch (error) {
                    console.error('Wildcard listener error:', error);
                }
            });
        }
    }

    notifyAllListeners() {
        const data = this.toObject();
        for (const key of Object.keys(data)) {
            this.notifyListeners(key, data[key]);
        }
    }
}
