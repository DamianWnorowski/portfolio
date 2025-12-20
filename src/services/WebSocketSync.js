/**
 * WebSocketSync - Production-grade WebSocket synchronization service
 * Implements CRDT-based multi-device sync with offline support and conflict resolution
 */

import { SyncMessage, MessageType, Operation, CausalOrderBuffer, ProtocolValidator } from '../utils/SyncProtocol.js';
import { SyncState } from './SyncState.js';
import { OfflineQueue, QueueStatus } from './OfflineQueue.js';

export const ConnectionState = {
    DISCONNECTED: 'DISCONNECTED',
    CONNECTING: 'CONNECTING',
    CONNECTED: 'CONNECTED',
    RECONNECTING: 'RECONNECTING',
    FAILED: 'FAILED'
};

export const SyncMode = {
    REALTIME: 'REALTIME',     // Sync every change immediately
    BATCHED: 'BATCHED',       // Batch changes and sync periodically
    MANUAL: 'MANUAL'          // Only sync when explicitly requested
};

/**
 * WebSocketSync - Client-side WebSocket synchronization manager
 */
export class WebSocketSync {
    constructor(url, options = {}) {
        this.url = url;
        this.deviceId = options.deviceId || this.generateDeviceId();
        this.syncMode = options.syncMode || SyncMode.REALTIME;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
        this.reconnectDelay = options.reconnectDelay || 1000;
        this.maxReconnectDelay = options.maxReconnectDelay || 30000;
        this.pingInterval = options.pingInterval || 30000;
        this.batchInterval = options.batchInterval || 5000;
        this.isDev = options.isDev || false;

        // Core components
        this.ws = null;
        this.state = new SyncState(this.deviceId);
        this.offlineQueue = new OfflineQueue({
            storageKey: `websocket_sync_${this.deviceId}`,
            isDev: this.isDev
        });
        this.causalBuffer = new CausalOrderBuffer();

        // Connection state
        this.connectionState = ConnectionState.DISCONNECTED;
        this.lastPingTime = null;
        this.lastPongTime = null;

        // Timers
        this.pingTimer = null;
        this.reconnectTimer = null;
        this.batchTimer = null;

        // Batching
        this.pendingOperations = [];

        // Event listeners
        this.listeners = new Map();

        // Bind methods
        this.handleOpen = this.handleOpen.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
        this.handleClose = this.handleClose.bind(this);
        this.handleError = this.handleError.bind(this);
    }

    /**
     * Connect to WebSocket server
     */
    connect() {
        if (this.connectionState === ConnectionState.CONNECTED ||
            this.connectionState === ConnectionState.CONNECTING) {
            if (this.isDev) console.warn('[WebSocketSync] Already connected or connecting');
            return;
        }

        try {
            this.setConnectionState(ConnectionState.CONNECTING);

            this.ws = new WebSocket(this.url);
            this.ws.onopen = this.handleOpen;
            this.ws.onmessage = this.handleMessage;
            this.ws.onclose = this.handleClose;
            this.ws.onerror = this.handleError;

            if (this.isDev) console.log(`[WebSocketSync] Connecting to ${this.url}`);
        } catch (error) {
            if (this.isDev) console.error('[WebSocketSync] Connection error:', error);
            this.handleReconnect();
        }
    }

    /**
     * Disconnect from server
     */
    disconnect() {
        this.stopPingPong();
        this.stopBatching();
        this.clearReconnectTimer();

        if (this.ws) {
            this.ws.onopen = null;
            this.ws.onmessage = null;
            this.ws.onclose = null;
            this.ws.onerror = null;

            if (this.ws.readyState === WebSocket.OPEN) {
                const message = new SyncMessage(MessageType.DISCONNECT);
                this.sendMessage(message);
                this.ws.close(1000, 'Client disconnect');
            }

            this.ws = null;
        }

        this.setConnectionState(ConnectionState.DISCONNECTED);
        this.offlineQueue.stopProcessing();

        if (this.isDev) console.log('[WebSocketSync] Disconnected');
    }

    /**
     * Send operation to server (or queue if offline)
     */
    sendOperation(type, key, value, priority = 0) {
        const operation = this.state.createOperation(type, key, value);

        if (this.connectionState === ConnectionState.CONNECTED) {
            if (this.syncMode === SyncMode.REALTIME) {
                this.sendOperationImmediate(operation);
            } else if (this.syncMode === SyncMode.BATCHED) {
                this.pendingOperations.push(operation);
            }
        } else {
            // Queue for offline sync
            this.offlineQueue.enqueue(operation, priority);
        }

        return operation;
    }

    /**
     * Send operation immediately
     */
    sendOperationImmediate(operation) {
        const message = new SyncMessage(MessageType.OPERATION, {
            operation: operation.toJSON()
        });
        this.sendMessage(message);
    }

    /**
     * Request full sync with server
     */
    requestSync() {
        if (this.connectionState !== ConnectionState.CONNECTED) {
            if (this.isDev) console.warn('[WebSocketSync] Cannot sync while disconnected');
            return;
        }

        const message = new SyncMessage(MessageType.SYNC_REQUEST, {
            deviceId: this.deviceId,
            vectorClock: this.state.vectorClock
        });
        this.sendMessage(message);

        if (this.isDev) console.log('[WebSocketSync] Sync requested');
    }

    /**
     * Request state snapshot from server
     */
    requestSnapshot() {
        if (this.connectionState !== ConnectionState.CONNECTED) {
            if (this.isDev) console.warn('[WebSocketSync] Cannot request snapshot while disconnected');
            return;
        }

        const message = new SyncMessage(MessageType.SNAPSHOT_REQUEST, {
            deviceId: this.deviceId
        });
        this.sendMessage(message);

        if (this.isDev) console.log('[WebSocketSync] Snapshot requested');
    }

    /**
     * Get current state as object
     */
    getState() {
        return this.state.toObject();
    }

    /**
     * Subscribe to state changes
     */
    subscribe(key, callback) {
        return this.state.subscribe(key, callback);
    }

    /**
     * Subscribe to connection events
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);

        return () => {
            const listeners = this.listeners.get(event);
            if (listeners) {
                listeners.delete(callback);
            }
        };
    }

    // Event handlers

    handleOpen() {
        if (this.isDev) console.log('[WebSocketSync] Connected');

        this.setConnectionState(ConnectionState.CONNECTED);
        this.reconnectAttempts = 0;

        // Send connect message with device info
        const message = new SyncMessage(MessageType.CONNECT, {
            deviceId: this.deviceId,
            vectorClock: this.state.vectorClock,
            timestamp: Date.now()
        });
        this.sendMessage(message);

        // Start ping/pong
        this.startPingPong();

        // Start batching if enabled
        if (this.syncMode === SyncMode.BATCHED) {
            this.startBatching();
        }

        // Process offline queue
        this.offlineQueue.startProcessing(async (operation) => {
            this.sendOperationImmediate(operation);
        });

        // Request initial sync
        this.requestSync();

        this.emit('connected', { deviceId: this.deviceId });
    }

    handleMessage(event) {
        try {
            const message = SyncMessage.fromJSON(event.data);

            // Validate message
            const validation = ProtocolValidator.validateMessage(message);
            if (!validation.valid) {
                if (this.isDev) console.error('[WebSocketSync] Invalid message:', validation.error);
                return;
            }

            if (this.isDev) {
                console.log(`[WebSocketSync] Received ${message.type}`);
            }

            switch (message.type) {
                case MessageType.CONNECT_ACK:
                    this.handleConnectAck(message);
                    break;

                case MessageType.PONG:
                    this.handlePong(message);
                    break;

                case MessageType.OPERATION:
                    this.handleOperation(message);
                    break;

                case MessageType.BATCH_OPERATION:
                    this.handleBatchOperation(message);
                    break;

                case MessageType.SYNC_RESPONSE:
                    this.handleSyncResponse(message);
                    break;

                case MessageType.SNAPSHOT:
                    this.handleSnapshot(message);
                    break;

                case MessageType.OPERATION_ACK:
                    this.handleOperationAck(message);
                    break;

                case MessageType.CONFLICT:
                    this.handleConflict(message);
                    break;

                case MessageType.ERROR:
                    this.handleServerError(message);
                    break;

                default:
                    if (this.isDev) console.warn('[WebSocketSync] Unknown message type:', message.type);
            }
        } catch (error) {
            if (this.isDev) console.error('[WebSocketSync] Message handling error:', error);
        }
    }

    handleClose(event) {
        if (this.isDev) {
            console.log(`[WebSocketSync] Disconnected: ${event.code} ${event.reason}`);
        }

        this.stopPingPong();
        this.stopBatching();
        this.offlineQueue.stopProcessing();

        this.emit('disconnected', { code: event.code, reason: event.reason });

        // Reconnect if not a clean close
        if (event.code !== 1000) {
            this.handleReconnect();
        } else {
            this.setConnectionState(ConnectionState.DISCONNECTED);
        }
    }

    handleError(error) {
        if (this.isDev) console.error('[WebSocketSync] WebSocket error:', error);
        this.emit('error', { error });
    }

    handleConnectAck(message) {
        if (this.isDev) console.log('[WebSocketSync] Connection acknowledged');
        this.emit('connected_ack', message.payload);
    }

    handlePong(message) {
        this.lastPongTime = Date.now();
        const latency = this.lastPongTime - this.lastPingTime;

        if (this.isDev) console.log(`[WebSocketSync] Pong received (latency: ${latency}ms)`);
        this.emit('pong', { latency });
    }

    handleOperation(message) {
        const operation = Operation.fromJSON(message.payload.operation);

        // Use causal ordering buffer
        const readyOps = this.causalBuffer.addOperation(operation);

        for (const op of readyOps) {
            this.state.applyOperation(op);
        }

        // Send acknowledgment
        const ack = new SyncMessage(MessageType.OPERATION_ACK, {
            operationId: operation.id,
            success: true
        });
        this.sendMessage(ack);
    }

    handleBatchOperation(message) {
        const operations = (message.payload.operations || []).map(op => Operation.fromJSON(op));

        for (const operation of operations) {
            const readyOps = this.causalBuffer.addOperation(operation);
            for (const op of readyOps) {
                this.state.applyOperation(op);
            }
        }
    }

    handleSyncResponse(message) {
        const { operations, snapshot } = message.payload;

        if (snapshot) {
            this.state.restoreSnapshot(snapshot);
        }

        if (operations && operations.length > 0) {
            for (const opData of operations) {
                const operation = Operation.fromJSON(opData);
                const readyOps = this.causalBuffer.addOperation(operation);
                for (const op of readyOps) {
                    this.state.applyOperation(op);
                }
            }
        }

        if (this.isDev) {
            console.log(`[WebSocketSync] Sync completed: ${operations?.length || 0} operations`);
        }

        this.emit('synced', { operationCount: operations?.length || 0 });
    }

    handleSnapshot(message) {
        this.state.restoreSnapshot(message.payload.snapshot);

        if (this.isDev) console.log('[WebSocketSync] Snapshot restored');
        this.emit('snapshot_restored', {});
    }

    handleOperationAck(message) {
        const { operationId, success } = message.payload;

        if (success) {
            this.offlineQueue.dequeue(operationId);
        }
    }

    handleConflict(message) {
        if (this.isDev) console.warn('[WebSocketSync] Conflict detected:', message.payload);
        this.emit('conflict', message.payload);
    }

    handleServerError(message) {
        if (this.isDev) console.error('[WebSocketSync] Server error:', message.payload);
        this.emit('server_error', message.payload);
    }

    // Reconnection logic

    handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            if (this.isDev) console.error('[WebSocketSync] Max reconnection attempts reached');
            this.setConnectionState(ConnectionState.FAILED);
            this.emit('reconnect_failed', { attempts: this.reconnectAttempts });
            return;
        }

        this.setConnectionState(ConnectionState.RECONNECTING);
        this.reconnectAttempts++;

        const delay = Math.min(
            this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
            this.maxReconnectDelay
        );

        if (this.isDev) {
            console.log(`[WebSocketSync] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        }

        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, delay);

        this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });
    }

    // Ping/Pong heartbeat

    startPingPong() {
        this.stopPingPong();
        this.pingTimer = setInterval(() => {
            if (this.connectionState === ConnectionState.CONNECTED) {
                this.lastPingTime = Date.now();
                const message = new SyncMessage(MessageType.PING);
                this.sendMessage(message);
            }
        }, this.pingInterval);
    }

    stopPingPong() {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
    }

    // Batching

    startBatching() {
        this.stopBatching();
        this.batchTimer = setInterval(() => {
            this.flushBatch();
        }, this.batchInterval);
    }

    stopBatching() {
        if (this.batchTimer) {
            clearInterval(this.batchTimer);
            this.batchTimer = null;
        }
    }

    flushBatch() {
        if (this.pendingOperations.length === 0) {
            return;
        }

        const message = new SyncMessage(MessageType.BATCH_OPERATION, {
            operations: this.pendingOperations.map(op => op.toJSON())
        });
        this.sendMessage(message);

        if (this.isDev) {
            console.log(`[WebSocketSync] Flushed batch of ${this.pendingOperations.length} operations`);
        }

        this.pendingOperations = [];
    }

    // Utilities

    sendMessage(message) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            if (this.isDev) console.warn('[WebSocketSync] Cannot send message, not connected');
            return false;
        }

        try {
            this.ws.send(message.toString());
            return true;
        } catch (error) {
            if (this.isDev) console.error('[WebSocketSync] Send error:', error);
            return false;
        }
    }

    setConnectionState(state) {
        if (this.connectionState !== state) {
            this.connectionState = state;
            this.emit('connection_state', { state });
        }
    }

    clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    emit(event, data) {
        const listeners = this.listeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    if (this.isDev) console.error(`[WebSocketSync] Listener error (${event}):`, error);
                }
            });
        }
    }

    generateDeviceId() {
        return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Public getters

    getConnectionState() {
        return this.connectionState;
    }

    isConnected() {
        return this.connectionState === ConnectionState.CONNECTED;
    }

    getQueueStats() {
        return this.offlineQueue.getStats();
    }

    getDeviceId() {
        return this.deviceId;
    }

    getVectorClock() {
        return { ...this.state.vectorClock };
    }
}
