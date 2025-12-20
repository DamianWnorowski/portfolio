/**
 * AnnotationSystem
 * Production annotation and commenting system for collaborative documents
 * Supports comments, highlights, marks, and threaded discussions
 */

import { eventBus, Events } from '../core/EventBus.js';

/**
 * Annotation types
 */
const AnnotationType = {
    COMMENT: 'comment',
    HIGHLIGHT: 'highlight',
    MARK: 'mark',
    THREAD: 'thread'
};

/**
 * Annotation class
 */
class Annotation {
    constructor(type, data) {
        this.id = this.generateId();
        this.type = type;
        this.documentId = data.documentId;
        this.userId = data.userId;
        this.position = data.position || { start: 0, end: 0 };
        this.content = data.content || '';
        this.metadata = data.metadata || {};
        this.replies = [];
        this.resolved = false;
        this.createdAt = Date.now();
        this.updatedAt = Date.now();
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Add reply to annotation
     */
    addReply(reply) {
        const replyObj = {
            id: this.generateId(),
            userId: reply.userId,
            content: reply.content,
            createdAt: Date.now()
        };

        this.replies.push(replyObj);
        this.updatedAt = Date.now();

        return replyObj;
    }

    /**
     * Mark as resolved
     */
    resolve() {
        this.resolved = true;
        this.updatedAt = Date.now();
    }

    /**
     * Mark as unresolved
     */
    unresolve() {
        this.resolved = false;
        this.updatedAt = Date.now();
    }

    /**
     * Update content
     */
    updateContent(content) {
        this.content = content;
        this.updatedAt = Date.now();
    }

    /**
     * Serialize
     */
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            documentId: this.documentId,
            userId: this.userId,
            position: this.position,
            content: this.content,
            metadata: this.metadata,
            replies: this.replies,
            resolved: this.resolved,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Deserialize
     */
    static fromJSON(json) {
        const annotation = new Annotation(json.type, {
            documentId: json.documentId,
            userId: json.userId,
            position: json.position,
            content: json.content,
            metadata: json.metadata
        });

        annotation.id = json.id;
        annotation.replies = json.replies || [];
        annotation.resolved = json.resolved || false;
        annotation.createdAt = json.createdAt;
        annotation.updatedAt = json.updatedAt;

        return annotation;
    }
}

/**
 * AnnotationSystem
 */
class AnnotationSystem {
    constructor() {
        this.annotations = new Map(); // annotationId -> Annotation
        this.documentAnnotations = new Map(); // documentId -> Set<annotationId>
        this.websocket = null;
        this.userId = null;
        this.isDev = import.meta.env?.DEV ?? false;
    }

    /**
     * Initialize annotation system
     */
    async initialize(websocket, userId) {
        this.websocket = websocket;
        this.userId = userId;

        // Setup message listeners
        this.setupMessageListeners();

        if (this.isDev) console.log('[AnnotationSystem] Initialized', userId);
    }

    /**
     * Create annotation
     */
    createAnnotation(type, data) {
        const annotation = new Annotation(type, {
            ...data,
            userId: this.userId
        });

        // Store annotation
        this.annotations.set(annotation.id, annotation);

        // Index by document
        if (!this.documentAnnotations.has(data.documentId)) {
            this.documentAnnotations.set(data.documentId, new Set());
        }
        this.documentAnnotations.get(data.documentId).add(annotation.id);

        // Broadcast to server
        this.broadcastAnnotation('create', annotation);

        // Emit event
        eventBus.emit(Events.ANNOTATION_CREATED, annotation.toJSON());

        if (this.isDev) console.log('[AnnotationSystem] Annotation created', annotation);

        return annotation;
    }

    /**
     * Create comment
     */
    createComment(documentId, position, content) {
        return this.createAnnotation(AnnotationType.COMMENT, {
            documentId,
            position,
            content
        });
    }

    /**
     * Create highlight
     */
    createHighlight(documentId, position, color = '#FFEB3B') {
        return this.createAnnotation(AnnotationType.HIGHLIGHT, {
            documentId,
            position,
            metadata: { color }
        });
    }

    /**
     * Create mark
     */
    createMark(documentId, position, label) {
        return this.createAnnotation(AnnotationType.MARK, {
            documentId,
            position,
            content: label
        });
    }

    /**
     * Get annotation by ID
     */
    getAnnotation(annotationId) {
        return this.annotations.get(annotationId);
    }

    /**
     * Get all annotations for document
     */
    getDocumentAnnotations(documentId, filters = {}) {
        const annotationIds = this.documentAnnotations.get(documentId);
        if (!annotationIds) return [];

        let annotations = Array.from(annotationIds)
            .map(id => this.annotations.get(id))
            .filter(Boolean);

        // Apply filters
        if (filters.type) {
            annotations = annotations.filter(a => a.type === filters.type);
        }

        if (filters.resolved !== undefined) {
            annotations = annotations.filter(a => a.resolved === filters.resolved);
        }

        if (filters.userId) {
            annotations = annotations.filter(a => a.userId === filters.userId);
        }

        // Sort by position
        annotations.sort((a, b) => a.position.start - b.position.start);

        return annotations;
    }

    /**
     * Get annotations at position
     */
    getAnnotationsAtPosition(documentId, position) {
        const annotations = this.getDocumentAnnotations(documentId);

        return annotations.filter(annotation => {
            const { start, end } = annotation.position;
            return position >= start && position <= end;
        });
    }

    /**
     * Add reply to annotation
     */
    addReply(annotationId, content) {
        const annotation = this.annotations.get(annotationId);
        if (!annotation) {
            console.error('[AnnotationSystem] Annotation not found', annotationId);
            return null;
        }

        const reply = annotation.addReply({
            userId: this.userId,
            content
        });

        // Broadcast update
        this.broadcastAnnotation('update', annotation);

        // Emit event
        eventBus.emit(Events.ANNOTATION_UPDATED, annotation.toJSON());

        if (this.isDev) console.log('[AnnotationSystem] Reply added', reply);

        return reply;
    }

    /**
     * Update annotation
     */
    updateAnnotation(annotationId, updates) {
        const annotation = this.annotations.get(annotationId);
        if (!annotation) {
            console.error('[AnnotationSystem] Annotation not found', annotationId);
            return null;
        }

        // Only allow owner to update
        if (annotation.userId !== this.userId) {
            console.error('[AnnotationSystem] Not authorized to update', annotationId);
            return null;
        }

        if (updates.content !== undefined) {
            annotation.updateContent(updates.content);
        }

        if (updates.position !== undefined) {
            annotation.position = updates.position;
            annotation.updatedAt = Date.now();
        }

        if (updates.metadata !== undefined) {
            annotation.metadata = { ...annotation.metadata, ...updates.metadata };
            annotation.updatedAt = Date.now();
        }

        // Broadcast update
        this.broadcastAnnotation('update', annotation);

        // Emit event
        eventBus.emit(Events.ANNOTATION_UPDATED, annotation.toJSON());

        if (this.isDev) console.log('[AnnotationSystem] Annotation updated', annotation);

        return annotation;
    }

    /**
     * Resolve annotation
     */
    resolveAnnotation(annotationId) {
        const annotation = this.annotations.get(annotationId);
        if (!annotation) return null;

        annotation.resolve();

        // Broadcast update
        this.broadcastAnnotation('update', annotation);

        // Emit event
        eventBus.emit(Events.ANNOTATION_RESOLVED, annotation.toJSON());

        if (this.isDev) console.log('[AnnotationSystem] Annotation resolved', annotationId);

        return annotation;
    }

    /**
     * Unresolve annotation
     */
    unresolveAnnotation(annotationId) {
        const annotation = this.annotations.get(annotationId);
        if (!annotation) return null;

        annotation.unresolve();

        // Broadcast update
        this.broadcastAnnotation('update', annotation);

        // Emit event
        eventBus.emit(Events.ANNOTATION_UPDATED, annotation.toJSON());

        if (this.isDev) console.log('[AnnotationSystem] Annotation unresolved', annotationId);

        return annotation;
    }

    /**
     * Delete annotation
     */
    deleteAnnotation(annotationId) {
        const annotation = this.annotations.get(annotationId);
        if (!annotation) return false;

        // Only allow owner to delete
        if (annotation.userId !== this.userId) {
            console.error('[AnnotationSystem] Not authorized to delete', annotationId);
            return false;
        }

        // Remove from indexes
        this.annotations.delete(annotationId);

        const docAnnotations = this.documentAnnotations.get(annotation.documentId);
        if (docAnnotations) {
            docAnnotations.delete(annotationId);
        }

        // Broadcast deletion
        this.broadcastAnnotation('delete', annotation);

        // Emit event
        eventBus.emit(Events.ANNOTATION_DELETED, annotation.toJSON());

        if (this.isDev) console.log('[AnnotationSystem] Annotation deleted', annotationId);

        return true;
    }

    /**
     * Broadcast annotation to server
     */
    broadcastAnnotation(action, annotation) {
        if (!this.websocket) return;

        this.websocket.send(JSON.stringify({
            type: 'annotation',
            action,
            annotation: annotation.toJSON()
        }));
    }

    /**
     * Receive remote annotation
     */
    receiveAnnotation(action, annotationData) {
        const annotation = Annotation.fromJSON(annotationData);

        switch (action) {
            case 'create':
                this.annotations.set(annotation.id, annotation);

                if (!this.documentAnnotations.has(annotation.documentId)) {
                    this.documentAnnotations.set(annotation.documentId, new Set());
                }
                this.documentAnnotations.get(annotation.documentId).add(annotation.id);

                eventBus.emit(Events.ANNOTATION_CREATED, annotation.toJSON());
                break;

            case 'update':
                this.annotations.set(annotation.id, annotation);
                eventBus.emit(Events.ANNOTATION_UPDATED, annotation.toJSON());
                break;

            case 'delete':
                this.annotations.delete(annotation.id);

                const docAnnotations = this.documentAnnotations.get(annotation.documentId);
                if (docAnnotations) {
                    docAnnotations.delete(annotation.id);
                }

                eventBus.emit(Events.ANNOTATION_DELETED, annotation.toJSON());
                break;
        }

        if (this.isDev) console.log('[AnnotationSystem] Remote annotation received', action, annotation);
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

                if (data.type === 'annotation') {
                    this.receiveAnnotation(data.action, data.annotation);
                } else if (originalOnMessage) {
                    originalOnMessage.call(this.websocket, event);
                }
            } catch (e) {
                if (this.isDev) console.error('[AnnotationSystem] Message parse error', e);
            }
        };
    }

    /**
     * Get statistics
     */
    getStatistics(documentId) {
        const annotations = this.getDocumentAnnotations(documentId);

        return {
            total: annotations.length,
            comments: annotations.filter(a => a.type === AnnotationType.COMMENT).length,
            highlights: annotations.filter(a => a.type === AnnotationType.HIGHLIGHT).length,
            marks: annotations.filter(a => a.type === AnnotationType.MARK).length,
            resolved: annotations.filter(a => a.resolved).length,
            unresolved: annotations.filter(a => !a.resolved).length
        };
    }

    /**
     * Cleanup
     */
    destroy() {
        this.annotations.clear();
        this.documentAnnotations.clear();
        this.websocket = null;

        if (this.isDev) console.log('[AnnotationSystem] Destroyed');
    }
}

// Singleton
export const annotationSystem = new AnnotationSystem();
export { AnnotationType, Annotation };
