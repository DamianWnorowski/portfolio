/**
 * PresenceAwareness
 * Production React component for active user indicators and presence UI
 * Shows who's currently active, their status, and activity indicators
 */

import { eventBus, Events } from '../core/EventBus.js';

class PresenceAwareness {
    constructor() {
        this.container = null;
        this.presenceManager = null;
        this.userElements = new Map(); // userId -> element
        this.isDev = import.meta.env?.DEV ?? false;
    }

    /**
     * Initialize presence awareness UI
     */
    initialize(container, presenceManager) {
        this.container = container;
        this.presenceManager = presenceManager;

        // Create presence panel
        this.createPresencePanel();

        // Setup event listeners
        this.setupEventListeners();

        // Initial render
        this.render();

        if (this.isDev) console.log('[PresenceAwareness] Initialized');
    }

    /**
     * Create presence panel UI
     */
    createPresencePanel() {
        this.panel = document.createElement('div');
        this.panel.className = 'presence-awareness-panel';
        this.panel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(20, 20, 30, 0.95);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 16px;
            min-width: 250px;
            max-width: 350px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            z-index: 9998;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            color: white;
        `;

        // Header
        const header = document.createElement('div');
        header.className = 'presence-header';
        header.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        `;

        const title = document.createElement('h3');
        title.textContent = 'Active Users';
        title.style.cssText = `
            margin: 0;
            font-size: 14px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.9);
        `;

        this.userCount = document.createElement('span');
        this.userCount.className = 'user-count';
        this.userCount.style.cssText = `
            background: rgba(76, 175, 80, 0.2);
            color: #4CAF50;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        `;

        header.appendChild(title);
        header.appendChild(this.userCount);

        // User list
        this.userList = document.createElement('div');
        this.userList.className = 'user-list';
        this.userList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-height: 400px;
            overflow-y: auto;
        `;

        this.panel.appendChild(header);
        this.panel.appendChild(this.userList);
        this.container.appendChild(this.panel);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // User joined
        eventBus.on(Events.USER_JOINED, (user) => {
            this.addUser(user);
            this.updateUserCount();
        });

        // User left
        eventBus.on(Events.USER_LEFT, (user) => {
            this.removeUser(user.id);
            this.updateUserCount();
        });

        // User status change
        eventBus.on(Events.USER_STATUS_CHANGE, ({ userId, status }) => {
            this.updateUserStatus(userId, status);
            this.updateUserCount();
        });

        // User location update
        eventBus.on(Events.USER_LOCATION_UPDATE, ({ userId, location }) => {
            this.updateUserActivity(userId, location);
        });
    }

    /**
     * Render all active users
     */
    render() {
        const users = this.presenceManager.getAllActiveUsers();

        users.forEach(user => {
            this.addUser(user);
        });

        this.updateUserCount();
    }

    /**
     * Add user to UI
     */
    addUser(user) {
        if (this.userElements.has(user.id)) return;

        const userEl = document.createElement('div');
        userEl.className = 'presence-user';
        userEl.dataset.userId = user.id;
        userEl.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            transition: all 0.2s;
            cursor: pointer;
        `;

        // Hover effect
        userEl.onmouseenter = () => {
            userEl.style.background = 'rgba(255, 255, 255, 0.1)';
        };
        userEl.onmouseleave = () => {
            userEl.style.background = 'rgba(255, 255, 255, 0.05)';
        };

        // Avatar
        const avatar = document.createElement('div');
        avatar.className = 'user-avatar';
        avatar.style.cssText = `
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: ${user.color};
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 14px;
            color: white;
            position: relative;
            flex-shrink: 0;
        `;
        avatar.textContent = user.name.charAt(0);

        // Status indicator
        const statusDot = document.createElement('div');
        statusDot.className = 'status-indicator';
        statusDot.style.cssText = `
            position: absolute;
            bottom: -2px;
            right: -2px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: ${user.status === 'online' ? '#4CAF50' : '#757575'};
            border: 2px solid rgba(20, 20, 30, 0.95);
            transition: background 0.3s;
        `;
        avatar.appendChild(statusDot);

        // User info
        const info = document.createElement('div');
        info.className = 'user-info';
        info.style.cssText = `
            flex: 1;
            min-width: 0;
        `;

        const name = document.createElement('div');
        name.className = 'user-name';
        name.textContent = user.name + (user.isLocal ? ' (You)' : '');
        name.style.cssText = `
            font-size: 14px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.9);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        `;

        const activity = document.createElement('div');
        activity.className = 'user-activity';
        activity.textContent = 'Active';
        activity.style.cssText = `
            font-size: 12px;
            color: rgba(255, 255, 255, 0.5);
            margin-top: 2px;
        `;

        info.appendChild(name);
        info.appendChild(activity);

        // Activity pulse
        const pulse = document.createElement('div');
        pulse.className = 'activity-pulse';
        pulse.style.cssText = `
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: ${user.color};
            opacity: 0;
            transition: opacity 0.3s;
            flex-shrink: 0;
        `;

        userEl.appendChild(avatar);
        userEl.appendChild(info);
        userEl.appendChild(pulse);

        this.userList.appendChild(userEl);
        this.userElements.set(user.id, {
            element: userEl,
            avatar,
            statusDot,
            activity,
            pulse
        });

        if (this.isDev) console.log('[PresenceAwareness] User added', user.id);
    }

    /**
     * Remove user from UI
     */
    removeUser(userId) {
        const userEl = this.userElements.get(userId);
        if (userEl) {
            userEl.element.style.opacity = '0';
            setTimeout(() => {
                userEl.element.remove();
                this.userElements.delete(userId);
            }, 200);

            if (this.isDev) console.log('[PresenceAwareness] User removed', userId);
        }
    }

    /**
     * Update user status
     */
    updateUserStatus(userId, status) {
        const userEl = this.userElements.get(userId);
        if (userEl) {
            userEl.statusDot.style.background = status === 'online' ? '#4CAF50' : '#757575';
            userEl.activity.textContent = status === 'online' ? 'Active' : 'Away';

            if (this.isDev) console.log('[PresenceAwareness] User status updated', userId, status);
        }
    }

    /**
     * Update user activity (show pulse)
     */
    updateUserActivity(userId, location) {
        const userEl = this.userElements.get(userId);
        if (userEl) {
            // Show pulse
            userEl.pulse.style.opacity = '1';

            // Update activity text
            if (location.documentId) {
                userEl.activity.textContent = `Editing: ${location.documentId.slice(0, 20)}...`;
            }

            // Hide pulse after delay
            setTimeout(() => {
                userEl.pulse.style.opacity = '0';
            }, 500);
        }
    }

    /**
     * Update user count
     */
    updateUserCount() {
        const count = this.presenceManager.getUserCount();
        this.userCount.textContent = `${count} ${count === 1 ? 'user' : 'users'}`;
    }

    /**
     * Toggle panel visibility
     */
    toggle() {
        this.panel.style.display = this.panel.style.display === 'none' ? 'block' : 'none';
    }

    /**
     * Show panel
     */
    show() {
        this.panel.style.display = 'block';
    }

    /**
     * Hide panel
     */
    hide() {
        this.panel.style.display = 'none';
    }

    /**
     * Cleanup
     */
    destroy() {
        this.userElements.forEach((userEl) => {
            userEl.element.remove();
        });

        this.userElements.clear();

        if (this.panel) {
            this.panel.remove();
            this.panel = null;
        }

        eventBus.off(Events.USER_JOINED);
        eventBus.off(Events.USER_LEFT);
        eventBus.off(Events.USER_STATUS_CHANGE);
        eventBus.off(Events.USER_LOCATION_UPDATE);

        if (this.isDev) console.log('[PresenceAwareness] Destroyed');
    }
}

// Export as singleton
export const presenceAwareness = new PresenceAwareness();

// Also export class for testing
export { PresenceAwareness };
