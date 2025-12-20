/**
 * Integration tests for real-time collaboration features
 * Tests PresenceManager, LiveEditingEngine, AnnotationSystem, and UI components
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock EventBus
const eventHandlers = new Map();
global.eventBus = {
    emit: (event, data) => {
        const handlers = eventHandlers.get(event) || [];
        handlers.forEach(handler => handler(data));
    },
    on: (event, handler) => {
        if (!eventHandlers.has(event)) {
            eventHandlers.set(event, []);
        }
        eventHandlers.get(event).push(handler);
    },
    off: (event) => {
        eventHandlers.delete(event);
    }
};

global.Events = {
    USER_JOINED: 'user_joined',
    USER_LEFT: 'user_left',
    USER_STATUS_CHANGE: 'user_status_change',
    USER_LOCATION_UPDATE: 'user_location_update',
    DOCUMENT_UPDATED: 'document_updated',
    DOCUMENT_SYNCED: 'document_synced',
    ANNOTATION_CREATED: 'annotation_created',
    ANNOTATION_UPDATED: 'annotation_updated',
    ANNOTATION_DELETED: 'annotation_deleted',
    ANNOTATION_RESOLVED: 'annotation_resolved'
};

// Mock environment
global.import = { meta: { env: { DEV: false } } };

// Mock WebSocket
class MockWebSocket {
    constructor(url) {
        this.url = url;
        this.readyState = 1; // OPEN
        this.onopen = null;
        this.onmessage = null;
        this.onclose = null;
        this.onerror = null;
        this.sentMessages = [];
    }

    send(data) {
        this.sentMessages.push(JSON.parse(data));
    }

    close() {
        this.readyState = 3; // CLOSED
        if (this.onclose) this.onclose();
    }

    simulateMessage(message) {
        if (this.onmessage) {
            this.onmessage({ data: JSON.stringify(message) });
        }
    }
}

global.WebSocket = MockWebSocket;

// Import services (with mocked dependencies)
const { presenceManager } = await import('../../src/services/PresenceManager.js');
const { liveEditingEngine, Operation, OpType } = await import('../../src/services/LiveEditingEngine.js');
const { annotationSystem, AnnotationType } = await import('../../src/services/AnnotationSystem.js');

describe('PresenceManager Integration Tests', () => {
    let websocket;
    let userId;

    beforeEach(async () => {
        eventHandlers.clear();
        websocket = new MockWebSocket('ws://localhost:8080');
        userId = 'user-' + Math.random().toString(36).substr(2, 9);
        await presenceManager.initialize(websocket, userId);
    });

    afterEach(() => {
        presenceManager.destroy();
    });

    describe('User registration and tracking', () => {
        it('should register local user on initialization', () => {
            const users = presenceManager.getAllActiveUsers();
            expect(users.length).toBe(1);
            expect(users[0].id).toBe(userId);
            expect(users[0].status).toBe('online');
        });

        it('should assign unique colors to users', () => {
            const user = presenceManager.users.get(userId);
            expect(user.color).toMatch(/^#[0-9A-F]{6}$/i);
        });

        it('should generate readable user names', () => {
            const user = presenceManager.users.get(userId);
            expect(user.name).toMatch(/^\w+ \w+$/);
        });

        it('should emit USER_JOINED event when user registers', () => {
            const handler = vi.fn();
            global.eventBus.on(global.Events.USER_JOINED, handler);

            const newUserId = 'user-test-123';
            presenceManager.registerUser(newUserId, {
                id: newUserId,
                name: 'Test User',
                color: '#FF0000',
                status: 'online'
            });

            expect(handler).toHaveBeenCalled();
            expect(handler.mock.calls[0][0].id).toBe(newUserId);
        });
    });

    describe('Location tracking', () => {
        it('should update user location', () => {
            const location = {
                documentId: 'doc-123',
                position: { x: 100, y: 200 },
                selection: { start: 0, end: 10 }
            };

            presenceManager.updateLocation(userId, location);

            const storedLocation = presenceManager.getLocation(userId);
            expect(storedLocation.documentId).toBe('doc-123');
            expect(storedLocation.position).toEqual({ x: 100, y: 200 });
        });

        it('should broadcast location updates via WebSocket', () => {
            const location = {
                documentId: 'doc-123',
                position: { x: 100, y: 200 }
            };

            presenceManager.updateLocation(userId, location);

            const sentMessages = websocket.sentMessages.filter(m => m.type === 'presence_update');
            expect(sentMessages.length).toBeGreaterThan(0);
            expect(sentMessages[0].userId).toBe(userId);
        });

        it('should emit USER_LOCATION_UPDATE event', () => {
            const handler = vi.fn();
            global.eventBus.on(global.Events.USER_LOCATION_UPDATE, handler);

            const location = {
                documentId: 'doc-123',
                position: { x: 100, y: 200 }
            };

            presenceManager.updateLocation(userId, location);

            expect(handler).toHaveBeenCalled();
            expect(handler.mock.calls[0][0].userId).toBe(userId);
        });

        it('should get active users in specific document', () => {
            const userId2 = 'user-456';
            presenceManager.registerUser(userId2, {
                id: userId2,
                name: 'User 2',
                color: '#00FF00',
                status: 'online'
            });

            presenceManager.updateLocation(userId, {
                documentId: 'doc-123',
                position: { x: 100, y: 200 }
            });

            presenceManager.updateLocation(userId2, {
                documentId: 'doc-456',
                position: { x: 150, y: 250 }
            });

            const usersInDoc123 = presenceManager.getActiveUsersInDocument('doc-123');
            expect(usersInDoc123.length).toBe(1);
            expect(usersInDoc123[0].id).toBe(userId);
        });
    });

    describe('Heartbeat and activity monitoring', () => {
        it('should send heartbeat messages', () => {
            presenceManager.startHeartbeat();

            // Fast-forward time
            vi.useFakeTimers();
            vi.advanceTimersByTime(6000);

            const heartbeats = websocket.sentMessages.filter(m => m.type === 'heartbeat');
            expect(heartbeats.length).toBeGreaterThan(0);

            vi.useRealTimers();
        });

        it('should mark user as offline after timeout', async () => {
            const userId2 = 'user-timeout';
            presenceManager.registerUser(userId2, {
                id: userId2,
                name: 'Timeout User',
                color: '#0000FF',
                status: 'online'
            });

            vi.useFakeTimers();
            vi.advanceTimersByTime(16000); // Beyond timeout

            const user = presenceManager.users.get(userId2);
            expect(user.status).toBe('offline');

            vi.useRealTimers();
        });

        it('should update user activity timestamp', () => {
            const beforeTime = Date.now();
            presenceManager.updateUserActivity(userId);
            const user = presenceManager.users.get(userId);

            expect(user.lastSeen).toBeGreaterThanOrEqual(beforeTime);
        });
    });

    describe('Remote user synchronization', () => {
        it('should handle remote presence updates', () => {
            websocket.simulateMessage({
                type: 'presence_update',
                userId: 'remote-user',
                location: {
                    documentId: 'doc-123',
                    position: { x: 300, y: 400 }
                }
            });

            const location = presenceManager.getLocation('remote-user');
            expect(location).toBeTruthy();
            expect(location.documentId).toBe('doc-123');
        });

        it('should handle user_left messages', () => {
            const remoteUserId = 'remote-user-123';
            presenceManager.registerUser(remoteUserId, {
                id: remoteUserId,
                name: 'Remote User',
                color: '#FF00FF',
                status: 'online'
            });

            websocket.simulateMessage({
                type: 'user_left',
                userId: remoteUserId
            });

            expect(presenceManager.users.has(remoteUserId)).toBe(false);
        });
    });
});

describe('LiveEditingEngine Integration Tests', () => {
    let websocket;
    let userId;

    beforeEach(async () => {
        eventHandlers.clear();
        websocket = new MockWebSocket('ws://localhost:8080');
        userId = 'user-' + Math.random().toString(36).substr(2, 9);
        await liveEditingEngine.initialize(websocket, userId);
    });

    afterEach(() => {
        liveEditingEngine.destroy();
    });

    describe('Document management', () => {
        it('should open document with initial content', () => {
            const doc = liveEditingEngine.openDocument('doc-123', 'Hello World');

            expect(doc).toBeTruthy();
            expect(doc.getContent()).toBe('Hello World');
            expect(doc.getVersion()).toBe(0);
        });

        it('should send document_open message on open', () => {
            liveEditingEngine.openDocument('doc-123');

            const messages = websocket.sentMessages.filter(m => m.type === 'document_open');
            expect(messages.length).toBe(1);
            expect(messages[0].documentId).toBe('doc-123');
        });

        it('should close document and notify server', () => {
            liveEditingEngine.openDocument('doc-123');
            liveEditingEngine.closeDocument('doc-123');

            const messages = websocket.sentMessages.filter(m => m.type === 'document_close');
            expect(messages.length).toBe(1);
        });
    });

    describe('Operational Transformation', () => {
        it('should insert text at position', () => {
            liveEditingEngine.openDocument('doc-123', 'Hello World');
            liveEditingEngine.insert('doc-123', ' Beautiful', 5);

            const content = liveEditingEngine.getContent('doc-123');
            expect(content).toBe('Hello Beautiful World');
        });

        it('should delete text at position', () => {
            liveEditingEngine.openDocument('doc-123', 'Hello World');
            liveEditingEngine.delete('doc-123', 6, 5); // Delete "World"

            const content = liveEditingEngine.getContent('doc-123');
            expect(content).toBe('Hello ');
        });

        it('should broadcast operations to server', () => {
            liveEditingEngine.openDocument('doc-123', 'Test');
            liveEditingEngine.insert('doc-123', ' Document', 4);

            const opMessages = websocket.sentMessages.filter(m => m.type === 'operation');
            expect(opMessages.length).toBe(1);
            expect(opMessages[0].operation.type).toBe(OpType.INSERT);
        });

        it('should emit DOCUMENT_UPDATED event on local edit', () => {
            const handler = vi.fn();
            global.eventBus.on(global.Events.DOCUMENT_UPDATED, handler);

            liveEditingEngine.openDocument('doc-123', 'Test');
            liveEditingEngine.insert('doc-123', ' Text', 4);

            expect(handler).toHaveBeenCalled();
            expect(handler.mock.calls[0][0].documentId).toBe('doc-123');
        });
    });

    describe('Concurrent operation handling', () => {
        it('should transform INSERT vs INSERT operations', () => {
            const op1 = new Operation(OpType.INSERT, 'A', 0);
            const op2 = new Operation(OpType.INSERT, 'B', 0);

            const transformed = op1.transform(op2, 'left');

            expect(transformed.position).toBe(0); // Left priority, stays at 0
        });

        it('should transform INSERT vs DELETE operations', () => {
            const insertOp = new Operation(OpType.INSERT, 'New', 5);
            const deleteOp = new Operation(OpType.DELETE, 3, 2);

            const transformed = insertOp.transform(deleteOp, 'left');

            expect(transformed.position).toBe(2); // Adjusted for deletion before
        });

        it('should handle remote operations with transformation', () => {
            liveEditingEngine.openDocument('doc-123', 'Hello World');

            // Local pending operation
            liveEditingEngine.insert('doc-123', ' My', 5);

            // Remote operation arrives
            websocket.simulateMessage({
                type: 'operation',
                documentId: 'doc-123',
                operation: {
                    type: OpType.INSERT,
                    data: ' Beautiful',
                    position: 5,
                    timestamp: Date.now(),
                    userId: 'remote-user'
                }
            });

            const content = liveEditingEngine.getContent('doc-123');
            expect(content.includes('Beautiful')).toBe(true);
        });
    });

    describe('Document synchronization', () => {
        it('should sync document from server', () => {
            liveEditingEngine.openDocument('doc-123', '');

            websocket.simulateMessage({
                type: 'document_sync',
                documentId: 'doc-123',
                content: 'Synced Content',
                version: 5
            });

            expect(liveEditingEngine.getContent('doc-123')).toBe('Synced Content');
            expect(liveEditingEngine.getVersion('doc-123')).toBe(5);
        });

        it('should emit DOCUMENT_SYNCED event', () => {
            const handler = vi.fn();
            global.eventBus.on(global.Events.DOCUMENT_SYNCED, handler);

            liveEditingEngine.openDocument('doc-123');

            websocket.simulateMessage({
                type: 'document_sync',
                documentId: 'doc-123',
                content: 'Synced',
                version: 1
            });

            expect(handler).toHaveBeenCalled();
        });
    });
});

describe('AnnotationSystem Integration Tests', () => {
    let websocket;
    let userId;

    beforeEach(async () => {
        eventHandlers.clear();
        websocket = new MockWebSocket('ws://localhost:8080');
        userId = 'user-' + Math.random().toString(36).substr(2, 9);
        await annotationSystem.initialize(websocket, userId);
    });

    afterEach(() => {
        annotationSystem.destroy();
    });

    describe('Annotation creation', () => {
        it('should create comment annotation', () => {
            const annotation = annotationSystem.createComment(
                'doc-123',
                { start: 10, end: 20 },
                'This is a comment'
            );

            expect(annotation.type).toBe(AnnotationType.COMMENT);
            expect(annotation.content).toBe('This is a comment');
            expect(annotation.userId).toBe(userId);
        });

        it('should create highlight annotation', () => {
            const annotation = annotationSystem.createHighlight(
                'doc-123',
                { start: 5, end: 15 },
                '#FFEB3B'
            );

            expect(annotation.type).toBe(AnnotationType.HIGHLIGHT);
            expect(annotation.metadata.color).toBe('#FFEB3B');
        });

        it('should create mark annotation', () => {
            const annotation = annotationSystem.createMark(
                'doc-123',
                { start: 0, end: 5 },
                'TODO'
            );

            expect(annotation.type).toBe(AnnotationType.MARK);
            expect(annotation.content).toBe('TODO');
        });

        it('should broadcast annotation creation', () => {
            annotationSystem.createComment('doc-123', { start: 0, end: 10 }, 'Test');

            const messages = websocket.sentMessages.filter(m => m.type === 'annotation');
            expect(messages.length).toBe(1);
            expect(messages[0].action).toBe('create');
        });

        it('should emit ANNOTATION_CREATED event', () => {
            const handler = vi.fn();
            global.eventBus.on(global.Events.ANNOTATION_CREATED, handler);

            annotationSystem.createComment('doc-123', { start: 0, end: 10 }, 'Test');

            expect(handler).toHaveBeenCalled();
        });
    });

    describe('Annotation retrieval', () => {
        it('should get all annotations for document', () => {
            annotationSystem.createComment('doc-123', { start: 0, end: 10 }, 'Comment 1');
            annotationSystem.createComment('doc-123', { start: 20, end: 30 }, 'Comment 2');
            annotationSystem.createComment('doc-456', { start: 0, end: 10 }, 'Comment 3');

            const annotations = annotationSystem.getDocumentAnnotations('doc-123');
            expect(annotations.length).toBe(2);
        });

        it('should filter annotations by type', () => {
            annotationSystem.createComment('doc-123', { start: 0, end: 10 }, 'Comment');
            annotationSystem.createHighlight('doc-123', { start: 20, end: 30 });

            const comments = annotationSystem.getDocumentAnnotations('doc-123', {
                type: AnnotationType.COMMENT
            });

            expect(comments.length).toBe(1);
            expect(comments[0].type).toBe(AnnotationType.COMMENT);
        });

        it('should get annotations at specific position', () => {
            annotationSystem.createComment('doc-123', { start: 5, end: 15 }, 'Overlaps');
            annotationSystem.createComment('doc-123', { start: 20, end: 30 }, 'No overlap');

            const annotations = annotationSystem.getAnnotationsAtPosition('doc-123', 10);
            expect(annotations.length).toBe(1);
            expect(annotations[0].content).toBe('Overlaps');
        });
    });

    describe('Annotation updates', () => {
        it('should add reply to annotation', () => {
            const annotation = annotationSystem.createComment('doc-123', { start: 0, end: 10 }, 'Original');
            annotationSystem.addReply(annotation.id, 'Reply text');

            const updated = annotationSystem.getAnnotation(annotation.id);
            expect(updated.replies.length).toBe(1);
            expect(updated.replies[0].content).toBe('Reply text');
        });

        it('should update annotation content', () => {
            const annotation = annotationSystem.createComment('doc-123', { start: 0, end: 10 }, 'Original');
            annotationSystem.updateAnnotation(annotation.id, { content: 'Updated' });

            const updated = annotationSystem.getAnnotation(annotation.id);
            expect(updated.content).toBe('Updated');
        });

        it('should resolve annotation', () => {
            const annotation = annotationSystem.createComment('doc-123', { start: 0, end: 10 }, 'Issue');
            annotationSystem.resolveAnnotation(annotation.id);

            const updated = annotationSystem.getAnnotation(annotation.id);
            expect(updated.resolved).toBe(true);
        });

        it('should emit ANNOTATION_RESOLVED event', () => {
            const handler = vi.fn();
            global.eventBus.on(global.Events.ANNOTATION_RESOLVED, handler);

            const annotation = annotationSystem.createComment('doc-123', { start: 0, end: 10 }, 'Test');
            annotationSystem.resolveAnnotation(annotation.id);

            expect(handler).toHaveBeenCalled();
        });
    });

    describe('Annotation deletion', () => {
        it('should delete annotation', () => {
            const annotation = annotationSystem.createComment('doc-123', { start: 0, end: 10 }, 'Delete me');
            const deleted = annotationSystem.deleteAnnotation(annotation.id);

            expect(deleted).toBe(true);
            expect(annotationSystem.getAnnotation(annotation.id)).toBeUndefined();
        });

        it('should broadcast deletion', () => {
            const annotation = annotationSystem.createComment('doc-123', { start: 0, end: 10 }, 'Test');
            annotationSystem.deleteAnnotation(annotation.id);

            const deleteMessages = websocket.sentMessages.filter(
                m => m.type === 'annotation' && m.action === 'delete'
            );

            expect(deleteMessages.length).toBe(1);
        });

        it('should emit ANNOTATION_DELETED event', () => {
            const handler = vi.fn();
            global.eventBus.on(global.Events.ANNOTATION_DELETED, handler);

            const annotation = annotationSystem.createComment('doc-123', { start: 0, end: 10 }, 'Test');
            annotationSystem.deleteAnnotation(annotation.id);

            expect(handler).toHaveBeenCalled();
        });
    });

    describe('Statistics', () => {
        it('should get annotation statistics', () => {
            annotationSystem.createComment('doc-123', { start: 0, end: 10 }, 'Comment 1');
            annotationSystem.createComment('doc-123', { start: 20, end: 30 }, 'Comment 2');
            annotationSystem.createHighlight('doc-123', { start: 40, end: 50 });

            const stats = annotationSystem.getStatistics('doc-123');

            expect(stats.total).toBe(3);
            expect(stats.comments).toBe(2);
            expect(stats.highlights).toBe(1);
            expect(stats.unresolved).toBe(3);
        });
    });
});

describe('End-to-End Collaboration Flow', () => {
    let ws1, ws2;
    let user1Id, user2Id;

    beforeEach(async () => {
        eventHandlers.clear();

        // Setup two users
        ws1 = new MockWebSocket('ws://localhost:8080');
        ws2 = new MockWebSocket('ws://localhost:8080');

        user1Id = 'user-1';
        user2Id = 'user-2';

        await presenceManager.initialize(ws1, user1Id);
        await liveEditingEngine.initialize(ws1, user1Id);
        await annotationSystem.initialize(ws1, user1Id);
    });

    afterEach(() => {
        presenceManager.destroy();
        liveEditingEngine.destroy();
        annotationSystem.destroy();
    });

    it('should handle complete collaborative editing session', () => {
        // User 1 opens document
        const doc = liveEditingEngine.openDocument('doc-collab', 'Initial content');

        // User 1 makes edit
        liveEditingEngine.insert('doc-collab', ' - edited by user 1', 15);

        // User 1 creates annotation
        const annotation = annotationSystem.createComment(
            'doc-collab',
            { start: 0, end: 7 },
            'Review this section'
        );

        // Verify state
        expect(liveEditingEngine.getContent('doc-collab')).toContain('edited by user 1');
        expect(annotationSystem.getDocumentAnnotations('doc-collab').length).toBe(1);

        // User 1 updates location
        presenceManager.updateLocation(user1Id, {
            documentId: 'doc-collab',
            position: { x: 100, y: 200 }
        });

        const activeUsers = presenceManager.getActiveUsersInDocument('doc-collab');
        expect(activeUsers.length).toBe(1);
    });
});
