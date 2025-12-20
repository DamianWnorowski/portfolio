/**
 * OfflineQueue - Persistent offline operation queue with automatic retry
 * Implements exponential backoff and operation batching
 */

import { SyncMessage, MessageType } from '../utils/SyncProtocol.js';

export const QueueStatus = {
    READY: 'READY',
    PROCESSING: 'PROCESSING',
    PAUSED: 'PAUSED',
    DRAINING: 'DRAINING'
};

export const OperationStatus = {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED'
};

/**
 * QueuedOperation represents a single operation in the queue
 */
class QueuedOperation {
    constructor(operation, priority = 0) {
        this.id = operation.id;
        this.operation = operation;
        this.status = OperationStatus.PENDING;
        this.priority = priority;
        this.attempts = 0;
        this.maxAttempts = 5;
        this.createdAt = Date.now();
        this.lastAttemptAt = null;
        this.error = null;
    }

    canRetry() {
        return this.status === OperationStatus.FAILED &&
               this.attempts < this.maxAttempts;
    }

    markAttempt() {
        this.attempts++;
        this.lastAttemptAt = Date.now();
        this.status = OperationStatus.PROCESSING;
    }

    markCompleted() {
        this.status = OperationStatus.COMPLETED;
    }

    markFailed(error) {
        this.status = OperationStatus.FAILED;
        this.error = error;
    }

    toJSON() {
        return {
            id: this.id,
            operation: this.operation.toJSON(),
            status: this.status,
            priority: this.priority,
            attempts: this.attempts,
            maxAttempts: this.maxAttempts,
            createdAt: this.createdAt,
            lastAttemptAt: this.lastAttemptAt,
            error: this.error
        };
    }

    static fromJSON(json) {
        const queuedOp = new QueuedOperation(json.operation, json.priority);
        queuedOp.id = json.id;
        queuedOp.status = json.status;
        queuedOp.attempts = json.attempts;
        queuedOp.maxAttempts = json.maxAttempts;
        queuedOp.createdAt = json.createdAt;
        queuedOp.lastAttemptAt = json.lastAttemptAt;
        queuedOp.error = json.error;
        return queuedOp;
    }
}

/**
 * OfflineQueue - Manages queued operations with persistence and retry
 */
export class OfflineQueue {
    constructor(options = {}) {
        this.queue = [];
        this.status = QueueStatus.READY;
        this.storageKey = options.storageKey || 'offline_queue';
        this.maxQueueSize = options.maxQueueSize || 1000;
        this.batchSize = options.batchSize || 10;
        this.retryDelay = options.retryDelay || 1000;
        this.maxRetryDelay = options.maxRetryDelay || 30000;
        this.processingInterval = null;
        this.listeners = new Set();
        this.isDev = options.isDev || false;

        // Load persisted queue
        this.loadFromStorage();
    }

    /**
     * Add operation to queue
     */
    enqueue(operation, priority = 0) {
        if (this.queue.length >= this.maxQueueSize) {
            this.evictOldest();
        }

        const queuedOp = new QueuedOperation(operation, priority);
        this.queue.push(queuedOp);
        this.sortByPriority();
        this.persistToStorage();
        this.notifyListeners('enqueue', queuedOp);

        if (this.isDev) {
            console.log(`[OfflineQueue] Enqueued operation ${queuedOp.id}, queue size: ${this.queue.length}`);
        }

        return queuedOp.id;
    }

    /**
     * Remove operation from queue
     */
    dequeue(operationId) {
        const index = this.queue.findIndex(op => op.id === operationId);
        if (index !== -1) {
            const [queuedOp] = this.queue.splice(index, 1);
            this.persistToStorage();
            this.notifyListeners('dequeue', queuedOp);
            return queuedOp;
        }
        return null;
    }

    /**
     * Get next pending operation
     */
    getNext() {
        return this.queue.find(op =>
            op.status === OperationStatus.PENDING ||
            (op.status === OperationStatus.FAILED && op.canRetry())
        );
    }

    /**
     * Get batch of pending operations
     */
    getBatch(size = this.batchSize) {
        const batch = [];
        for (const op of this.queue) {
            if (batch.length >= size) break;
            if (op.status === OperationStatus.PENDING ||
                (op.status === OperationStatus.FAILED && op.canRetry())) {
                batch.push(op);
            }
        }
        return batch;
    }

    /**
     * Process queue with handler function
     */
    async startProcessing(handler) {
        if (this.status === QueueStatus.PROCESSING) {
            if (this.isDev) console.warn('[OfflineQueue] Already processing');
            return;
        }

        this.status = QueueStatus.PROCESSING;
        this.notifyListeners('status', QueueStatus.PROCESSING);

        const process = async () => {
            if (this.status !== QueueStatus.PROCESSING) {
                return;
            }

            const batch = this.getBatch();
            if (batch.length === 0) {
                return;
            }

            if (this.isDev) {
                console.log(`[OfflineQueue] Processing batch of ${batch.length} operations`);
            }

            for (const queuedOp of batch) {
                await this.processOperation(queuedOp, handler);
            }
        };

        // Start processing loop
        this.processingInterval = setInterval(process, 1000);
        await process(); // Process immediately
    }

    /**
     * Stop processing queue
     */
    stopProcessing() {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }

        this.status = QueueStatus.PAUSED;
        this.notifyListeners('status', QueueStatus.PAUSED);

        if (this.isDev) console.log('[OfflineQueue] Processing stopped');
    }

    /**
     * Drain queue (process all and stop)
     */
    async drain(handler) {
        this.status = QueueStatus.DRAINING;
        this.notifyListeners('status', QueueStatus.DRAINING);

        while (this.getNext()) {
            const batch = this.getBatch();
            for (const queuedOp of batch) {
                await this.processOperation(queuedOp, handler);
            }
        }

        this.status = QueueStatus.READY;
        this.notifyListeners('status', QueueStatus.READY);
    }

    /**
     * Process single operation with retry logic
     */
    async processOperation(queuedOp, handler) {
        queuedOp.markAttempt();
        this.notifyListeners('processing', queuedOp);

        try {
            await handler(queuedOp.operation);
            queuedOp.markCompleted();
            this.dequeue(queuedOp.id);
            this.notifyListeners('completed', queuedOp);

            if (this.isDev) {
                console.log(`[OfflineQueue] Completed operation ${queuedOp.id}`);
            }
        } catch (error) {
            queuedOp.markFailed(error.message);
            this.persistToStorage();
            this.notifyListeners('failed', queuedOp);

            if (this.isDev) {
                console.error(`[OfflineQueue] Failed operation ${queuedOp.id} (attempt ${queuedOp.attempts}/${queuedOp.maxAttempts}):`, error);
            }

            // Schedule retry with exponential backoff
            if (queuedOp.canRetry()) {
                const delay = this.calculateRetryDelay(queuedOp.attempts);
                await this.sleep(delay);
            } else {
                this.notifyListeners('exhausted', queuedOp);
            }
        }
    }

    /**
     * Calculate exponential backoff delay
     */
    calculateRetryDelay(attempts) {
        const delay = this.retryDelay * Math.pow(2, attempts - 1);
        return Math.min(delay, this.maxRetryDelay);
    }

    /**
     * Clear all operations
     */
    clear() {
        this.queue = [];
        this.persistToStorage();
        this.notifyListeners('clear', null);

        if (this.isDev) console.log('[OfflineQueue] Queue cleared');
    }

    /**
     * Get queue statistics
     */
    getStats() {
        const stats = {
            total: this.queue.length,
            pending: 0,
            processing: 0,
            completed: 0,
            failed: 0,
            cancelled: 0
        };

        for (const op of this.queue) {
            switch (op.status) {
                case OperationStatus.PENDING:
                    stats.pending++;
                    break;
                case OperationStatus.PROCESSING:
                    stats.processing++;
                    break;
                case OperationStatus.COMPLETED:
                    stats.completed++;
                    break;
                case OperationStatus.FAILED:
                    stats.failed++;
                    break;
                case OperationStatus.CANCELLED:
                    stats.cancelled++;
                    break;
            }
        }

        return stats;
    }

    /**
     * Subscribe to queue events
     */
    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    // Persistence methods

    /**
     * Save queue to storage
     */
    persistToStorage() {
        try {
            const data = {
                queue: this.queue.map(op => op.toJSON()),
                timestamp: Date.now()
            };
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            if (this.isDev) {
                console.error('[OfflineQueue] Failed to persist to storage:', error);
            }
        }
    }

    /**
     * Load queue from storage
     */
    loadFromStorage() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                const parsed = JSON.parse(data);
                this.queue = (parsed.queue || []).map(json => QueuedOperation.fromJSON(json));

                // Reset processing status on load
                for (const op of this.queue) {
                    if (op.status === OperationStatus.PROCESSING) {
                        op.status = OperationStatus.PENDING;
                    }
                }

                if (this.isDev) {
                    console.log(`[OfflineQueue] Loaded ${this.queue.length} operations from storage`);
                }
            }
        } catch (error) {
            if (this.isDev) {
                console.error('[OfflineQueue] Failed to load from storage:', error);
            }
        }
    }

    /**
     * Clear storage
     */
    clearStorage() {
        try {
            localStorage.removeItem(this.storageKey);
        } catch (error) {
            if (this.isDev) {
                console.error('[OfflineQueue] Failed to clear storage:', error);
            }
        }
    }

    // Private methods

    sortByPriority() {
        this.queue.sort((a, b) => {
            // Higher priority first
            if (b.priority !== a.priority) {
                return b.priority - a.priority;
            }
            // Then by creation time
            return a.createdAt - b.createdAt;
        });
    }

    evictOldest() {
        // Remove oldest completed or failed operation
        const toEvict = this.queue.findIndex(op =>
            op.status === OperationStatus.COMPLETED ||
            (op.status === OperationStatus.FAILED && !op.canRetry())
        );

        if (toEvict !== -1) {
            this.queue.splice(toEvict, 1);
        } else {
            // If no completed/failed, remove oldest pending
            this.queue.shift();
        }

        if (this.isDev) console.warn('[OfflineQueue] Evicted oldest operation (queue full)');
    }

    notifyListeners(event, data) {
        this.listeners.forEach(callback => {
            try {
                callback({ event, data, timestamp: Date.now() });
            } catch (error) {
                if (this.isDev) {
                    console.error('[OfflineQueue] Listener error:', error);
                }
            }
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
