/**
 * PresenceManager
 * Production real-time presence tracking for collaborative sessions
 * Tracks active users, locations, cursor positions, and online status
 */

import { eventBus, Events } from '../core/EventBus.js';

class PresenceManager {
    constructor() {
        this.users = new Map(); // userId -> user data
        this.userLocations = new Map(); // userId -> { documentId, position, selection }
        this.heartbeatInterval = 5000; // 5s heartbeat
        this.heartbeatTimers = new Map();
        this.userTimeout = 15000; // 15s until considered offline
        this.localUserId = null;
        this.websocket = null;
        this.isDev = import.meta.env?.DEV ?? false;

        // User colors for visual differentiation
        this.colorPalette = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
            '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
            '#F8B739', '#52B788', '#E76F51', '#2A9D8F'
        ];
        this.usedColors = new Set();
    }

    /**
     * Initialize presence tracking
     */
    async initialize(websocket, userId) {
        this.websocket = websocket;
        this.localUserId = userId;

        // Register local user
        this.registerUser(userId, {
            id: userId,
            name: this.generateUserName(userId),
            color: this.assignColor(),
            status: 'online',
            joinedAt: Date.now()
        });

        // Start heartbeat
        this.startHeartbeat();

        // Listen for presence updates
        this.setupPresenceListeners();

        if (this.isDev) console.log('[PresenceManager] Initialized', userId);
    }

    /**
     * Register a user in the presence system
     */
    registerUser(userId, userData) {
        const user = {
            ...userData,
            lastSeen: Date.now(),
            isLocal: userId === this.localUserId
        };

        this.users.set(userId, user);

        // Start timeout monitor
        this.monitorUserActivity(userId);

        // Emit event
        eventBus.emit(Events.USER_JOINED, user);

        return user;
    }

    /**
     * Update user location (document, cursor position, selection)
     */
    updateLocation(userId, locationData) {
        const location = {
            documentId: locationData.documentId,
            position: locationData.position || { x: 0, y: 0 },
            selection: locationData.selection || null,
            viewport: locationData.viewport || null,
            timestamp: Date.now()
        };

        this.userLocations.set(userId, location);

        // Update user activity
        this.updateUserActivity(userId);

        // Broadcast to WebSocket
        if (this.websocket && userId === this.localUserId) {
            this.websocket.send(JSON.stringify({
                type: 'presence_update',
                userId,
                location
            }));
        }

        // Emit event
        eventBus.emit(Events.USER_LOCATION_UPDATE, { userId, location });

        return location;
    }

    /**
     * Get location for a user
     */
    getLocation(userId) {
        return this.userLocations.get(userId);
    }

    /**
     * Get all active users in a document
     */
    getActiveUsersInDocument(documentId) {
        const activeUsers = [];

        this.userLocations.forEach((location, userId) => {
            if (location.documentId === documentId) {
                const user = this.users.get(userId);
                if (user && user.status === 'online') {
                    activeUsers.push({
                        ...user,
                        location
                    });
                }
            }
        });

        return activeUsers;
    }

    /**
     * Get all active users
     */
    getAllActiveUsers() {
        return Array.from(this.users.values())
            .filter(user => user.status === 'online');
    }

    /**
     * Get user count
     */
    getUserCount() {
        return this.getAllActiveUsers().length;
    }

    /**
     * Update user status
     */
    updateUserStatus(userId, status) {
        const user = this.users.get(userId);
        if (user) {
            user.status = status;
            user.lastSeen = Date.now();

            eventBus.emit(Events.USER_STATUS_CHANGE, { userId, status });

            // Broadcast
            if (this.websocket && userId === this.localUserId) {
                this.websocket.send(JSON.stringify({
                    type: 'status_update',
                    userId,
                    status
                }));
            }
        }
    }

    /**
     * Remove user from presence
     */
    removeUser(userId) {
        const user = this.users.get(userId);
        if (user) {
            this.users.delete(userId);
            this.userLocations.delete(userId);

            // Clear timers
            const timer = this.heartbeatTimers.get(userId);
            if (timer) {
                clearTimeout(timer);
                this.heartbeatTimers.delete(userId);
            }

            // Release color
            this.usedColors.delete(user.color);

            eventBus.emit(Events.USER_LEFT, user);

            if (this.isDev) console.log('[PresenceManager] User removed', userId);
        }
    }

    /**
     * Update user activity timestamp
     */
    updateUserActivity(userId) {
        const user = this.users.get(userId);
        if (user) {
            user.lastSeen = Date.now();

            // Reset timeout
            this.monitorUserActivity(userId);
        }
    }

    /**
     * Monitor user activity and mark as offline if timeout
     */
    monitorUserActivity(userId) {
        // Clear existing timer
        const existingTimer = this.heartbeatTimers.get(userId);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        // Set new timeout
        const timer = setTimeout(() => {
            const user = this.users.get(userId);
            if (user && user.status === 'online') {
                this.updateUserStatus(userId, 'offline');

                if (this.isDev) console.log('[PresenceManager] User timeout', userId);
            }
        }, this.userTimeout);

        this.heartbeatTimers.set(userId, timer);
    }

    /**
     * Start local heartbeat
     */
    startHeartbeat() {
        this.heartbeatTimer = setInterval(() => {
            if (this.websocket && this.localUserId) {
                this.websocket.send(JSON.stringify({
                    type: 'heartbeat',
                    userId: this.localUserId,
                    timestamp: Date.now()
                }));

                this.updateUserActivity(this.localUserId);
            }
        }, this.heartbeatInterval);
    }

    /**
     * Stop heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    /**
     * Setup presence message listeners
     */
    setupPresenceListeners() {
        if (!this.websocket) return;

        const originalOnMessage = this.websocket.onmessage;

        this.websocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                switch (data.type) {
                    case 'presence_update':
                        if (data.userId !== this.localUserId) {
                            this.updateLocation(data.userId, data.location);
                        }
                        break;

                    case 'status_update':
                        if (data.userId !== this.localUserId) {
                            this.updateUserStatus(data.userId, data.status);
                        }
                        break;

                    case 'user_joined':
                        if (data.userId !== this.localUserId) {
                            this.registerUser(data.userId, data.user);
                        }
                        break;

                    case 'user_left':
                        if (data.userId !== this.localUserId) {
                            this.removeUser(data.userId);
                        }
                        break;

                    case 'heartbeat':
                        if (data.userId !== this.localUserId) {
                            this.updateUserActivity(data.userId);
                        }
                        break;

                    default:
                        // Pass to original handler
                        if (originalOnMessage) {
                            originalOnMessage.call(this.websocket, event);
                        }
                }
            } catch (e) {
                if (this.isDev) console.error('[PresenceManager] Message parse error', e);
            }
        };
    }

    /**
     * Assign color to user
     */
    assignColor() {
        // Find unused color
        for (const color of this.colorPalette) {
            if (!this.usedColors.has(color)) {
                this.usedColors.add(color);
                return color;
            }
        }

        // All colors used, generate random
        const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        this.usedColors.add(randomColor);
        return randomColor;
    }

    /**
     * Generate user name from ID
     */
    generateUserName(userId) {
        const adjectives = ['Swift', 'Bright', 'Bold', 'Clever', 'Eager', 'Graceful', 'Nimble', 'Quick'];
        const nouns = ['Fox', 'Eagle', 'Tiger', 'Falcon', 'Wolf', 'Hawk', 'Lynx', 'Panther'];

        const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const adj = adjectives[hash % adjectives.length];
        const noun = nouns[(hash * 7) % nouns.length];

        return `${adj} ${noun}`;
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stopHeartbeat();

        // Clear all timers
        this.heartbeatTimers.forEach(timer => clearTimeout(timer));
        this.heartbeatTimers.clear();

        // Notify server
        if (this.websocket && this.localUserId) {
            this.websocket.send(JSON.stringify({
                type: 'user_left',
                userId: this.localUserId
            }));
        }

        this.users.clear();
        this.userLocations.clear();
        this.usedColors.clear();
        this.websocket = null;

        if (this.isDev) console.log('[PresenceManager] Destroyed');
    }
}

// Singleton
export const presenceManager = new PresenceManager();
