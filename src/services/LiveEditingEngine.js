/**
 * LiveEditingEngine
 * Production Operational Transformation (OT) engine for real-time collaborative text editing
 * Implements OT algorithm to handle concurrent edits with conflict resolution
 */

import { eventBus, Events } from '../core/EventBus.js';

/**
 * Operation types
 */
const OpType = {
    INSERT: 'insert',
    DELETE: 'delete',
    RETAIN: 'retain'
};

/**
 * Single operation in OT
 */
class Operation {
    constructor(type, data, position = 0) {
        this.type = type;
        this.data = data; // text for insert, length for delete/retain
        this.position = position;
        this.timestamp = Date.now();
        this.userId = null;
    }

    /**
     * Clone operation
     */
    clone() {
        const op = new Operation(this.type, this.data, this.position);
        op.timestamp = this.timestamp;
        op.userId = this.userId;
        return op;
    }

    /**
     * Apply operation to text
     */
    apply(text) {
        switch (this.type) {
            case OpType.INSERT:
                return text.slice(0, this.position) + this.data + text.slice(this.position);

            case OpType.DELETE:
                return text.slice(0, this.position) + text.slice(this.position + this.data);

            case OpType.RETAIN:
                return text;

            default:
                return text;
        }
    }

    /**
     * Transform this operation against another operation
     * This is the core of OT - handles concurrent operations
     */
    transform(other, priority = 'left') {
        const op = this.clone();

        // INSERT vs INSERT
        if (this.type === OpType.INSERT && other.type === OpType.INSERT) {
            if (other.position < this.position) {
                op.position += other.data.length;
            } else if (other.position === this.position && priority === 'right') {
                op.position += other.data.length;
            }
        }

        // INSERT vs DELETE
        else if (this.type === OpType.INSERT && other.type === OpType.DELETE) {
            if (other.position < this.position) {
                op.position -= Math.min(other.data, this.position - other.position);
            }
        }

        // DELETE vs INSERT
        else if (this.type === OpType.DELETE && other.type === OpType.INSERT) {
            if (other.position <= this.position) {
                op.position += other.data.length;
            }
        }

        // DELETE vs DELETE
        else if (this.type === OpType.DELETE && other.type === OpType.DELETE) {
            if (other.position < this.position) {
                op.position -= Math.min(other.data, this.position - other.position);
            } else if (other.position < this.position + this.data) {
                // Overlapping deletes
                const overlap = Math.min(
                    this.position + this.data - other.position,
                    other.data
                );
                op.data -= overlap;
            }
        }

        return op;
    }

    /**
     * Serialize for transmission
     */
    toJSON() {
        return {
            type: this.type,
            data: this.data,
            position: this.position,
            timestamp: this.timestamp,
            userId: this.userId
        };
    }

    /**
     * Deserialize from JSON
     */
    static fromJSON(json) {
        const op = new Operation(json.type, json.data, json.position);
        op.timestamp = json.timestamp;
        op.userId = json.userId;
        return op;
    }
}

/**
 * Document state
 */
class DocumentState {
    constructor(documentId, initialContent = '') {
        this.documentId = documentId;
        this.content = initialContent;
        this.version = 0;
        this.history = []; // Operation history
        this.pending = []; // Pending local operations
    }

    /**
     * Apply operation to document
     */
    apply(operation) {
        this.content = operation.apply(this.content);
        this.version++;
        this.history.push(operation);
    }

    /**
     * Get content
     */
    getContent() {
        return this.content;
    }

    /**
     * Get version
     */
    getVersion() {
        return this.version;
    }
}

/**
 * LiveEditingEngine
 */
class LiveEditingEngine {
    constructor() {
        this.documents = new Map(); // documentId -> DocumentState
        this.websocket = null;
        this.userId = null;
        this.isDev = import.meta.env?.DEV ?? false;
        this.operationQueue = []; // Queue for operations
        this.isProcessing = false;
    }

    /**
     * Initialize engine
     */
    async initialize(websocket, userId) {
        this.websocket = websocket;
        this.userId = userId;

        // Setup message listeners
        this.setupMessageListeners();

        if (this.isDev) console.log('[LiveEditingEngine] Initialized', userId);
    }

    /**
     * Open document for editing
     */
    openDocument(documentId, initialContent = '') {
        if (this.documents.has(documentId)) {
            return this.documents.get(documentId);
        }

        const doc = new DocumentState(documentId, initialContent);
        this.documents.set(documentId, doc);

        // Request sync from server
        if (this.websocket) {
            this.websocket.send(JSON.stringify({
                type: 'document_open',
                documentId,
                version: 0
            }));
        }

        if (this.isDev) console.log('[LiveEditingEngine] Document opened', documentId);

        return doc;
    }

    /**
     * Close document
     */
    closeDocument(documentId) {
        this.documents.delete(documentId);

        if (this.websocket) {
            this.websocket.send(JSON.stringify({
                type: 'document_close',
                documentId
            }));
        }

        if (this.isDev) console.log('[LiveEditingEngine] Document closed', documentId);
    }

    /**
     * Insert text at position
     */
    insert(documentId, text, position) {
        const doc = this.documents.get(documentId);
        if (!doc) {
            console.error('[LiveEditingEngine] Document not found', documentId);
            return;
        }

        const operation = new Operation(OpType.INSERT, text, position);
        operation.userId = this.userId;

        // Apply locally
        doc.pending.push(operation);
        doc.apply(operation);

        // Broadcast to server
        this.broadcastOperation(documentId, operation);

        // Emit event
        eventBus.emit(Events.DOCUMENT_UPDATED, {
            documentId,
            content: doc.getContent(),
            operation
        });

        return operation;
    }

    /**
     * Delete text at position
     */
    delete(documentId, position, length) {
        const doc = this.documents.get(documentId);
        if (!doc) {
            console.error('[LiveEditingEngine] Document not found', documentId);
            return;
        }

        const operation = new Operation(OpType.DELETE, length, position);
        operation.userId = this.userId;

        // Apply locally
        doc.pending.push(operation);
        doc.apply(operation);

        // Broadcast to server
        this.broadcastOperation(documentId, operation);

        // Emit event
        eventBus.emit(Events.DOCUMENT_UPDATED, {
            documentId,
            content: doc.getContent(),
            operation
        });

        return operation;
    }

    /**
     * Broadcast operation to server
     */
    broadcastOperation(documentId, operation) {
        if (!this.websocket) return;

        this.websocket.send(JSON.stringify({
            type: 'operation',
            documentId,
            operation: operation.toJSON()
        }));

        if (this.isDev) console.log('[LiveEditingEngine] Operation broadcast', operation);
    }

    /**
     * Receive remote operation
     */
    receiveOperation(documentId, remoteOperation) {
        const doc = this.documents.get(documentId);
        if (!doc) {
            if (this.isDev) console.warn('[LiveEditingEngine] Document not found for remote op', documentId);
            return;
        }

        const op = Operation.fromJSON(remoteOperation);

        // Transform against pending operations
        let transformedOp = op;
        for (const pendingOp of doc.pending) {
            transformedOp = transformedOp.transform(pendingOp, 'right');
        }

        // Apply transformed operation
        doc.apply(transformedOp);

        // Emit event
        eventBus.emit(Events.DOCUMENT_UPDATED, {
            documentId,
            content: doc.getContent(),
            operation: transformedOp,
            remote: true
        });

        if (this.isDev) console.log('[LiveEditingEngine] Remote operation applied', transformedOp);
    }

    /**
     * Acknowledge operation from server
     */
    acknowledgeOperation(documentId, operationId) {
        const doc = this.documents.get(documentId);
        if (!doc) return;

        // Remove from pending (first operation assumed to be acknowledged)
        if (doc.pending.length > 0) {
            doc.pending.shift();
        }

        if (this.isDev) console.log('[LiveEditingEngine] Operation acknowledged', operationId);
    }

    /**
     * Get document content
     */
    getContent(documentId) {
        const doc = this.documents.get(documentId);
        return doc ? doc.getContent() : null;
    }

    /**
     * Get document version
     */
    getVersion(documentId) {
        const doc = this.documents.get(documentId);
        return doc ? doc.getVersion() : 0;
    }

    /**
     * Setup WebSocket message listeners
     */
    setupMessageListeners() {
        if (!this.websocket) return;

        const originalOnMessage = this.websocket.onmessage;

        this.websocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                switch (data.type) {
                    case 'operation':
                        this.receiveOperation(data.documentId, data.operation);
                        break;

                    case 'operation_ack':
                        this.acknowledgeOperation(data.documentId, data.operationId);
                        break;

                    case 'document_sync':
                        this.syncDocument(data.documentId, data.content, data.version);
                        break;

                    default:
                        // Pass to original handler
                        if (originalOnMessage) {
                            originalOnMessage.call(this.websocket, event);
                        }
                }
            } catch (e) {
                if (this.isDev) console.error('[LiveEditingEngine] Message parse error', e);
            }
        };
    }

    /**
     * Sync document from server
     */
    syncDocument(documentId, content, version) {
        let doc = this.documents.get(documentId);

        if (!doc) {
            doc = new DocumentState(documentId, content);
            doc.version = version;
            this.documents.set(documentId, doc);
        } else {
            doc.content = content;
            doc.version = version;
            doc.pending = [];
        }

        eventBus.emit(Events.DOCUMENT_SYNCED, {
            documentId,
            content,
            version
        });

        if (this.isDev) console.log('[LiveEditingEngine] Document synced', documentId, version);
    }

    /**
     * Cleanup
     */
    destroy() {
        this.documents.clear();
        this.operationQueue = [];
        this.websocket = null;

        if (this.isDev) console.log('[LiveEditingEngine] Destroyed');
    }
}

// Singleton
export const liveEditingEngine = new LiveEditingEngine();
export { Operation, OpType };
