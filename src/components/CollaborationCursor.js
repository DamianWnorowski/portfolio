/**
 * CollaborationCursor
 * Production React component for rendering live collaboration cursors
 * Shows remote user cursors with names and positions
 */

import { eventBus, Events } from '../core/EventBus.js';

class CollaborationCursor {
    constructor() {
        this.cursors = new Map(); // userId -> cursor element
        this.container = null;
        this.presenceManager = null;
        this.isDev = import.meta.env?.DEV ?? false;
    }

    /**
     * Initialize cursor rendering
     */
    initialize(container, presenceManager) {
        this.container = container;
        this.presenceManager = presenceManager;

        // Create cursor container
        this.cursorContainer = document.createElement('div');
        this.cursorContainer.className = 'collaboration-cursors';
        this.cursorContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
        `;
        this.container.appendChild(this.cursorContainer);

        // Listen for presence updates
        this.setupEventListeners();

        if (this.isDev) console.log('[CollaborationCursor] Initialized');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // User location update
        eventBus.on(Events.USER_LOCATION_UPDATE, ({ userId, location }) => {
            this.updateCursor(userId, location);
        });

        // User joined
        eventBus.on(Events.USER_JOINED, (user) => {
            if (!user.isLocal) {
                this.createCursor(user);
            }
        });

        // User left
        eventBus.on(Events.USER_LEFT, (user) => {
            this.removeCursor(user.id);
        });

        // User status change
        eventBus.on(Events.USER_STATUS_CHANGE, ({ userId, status }) => {
            if (status === 'offline') {
                this.hideCursor(userId);
            } else {
                this.showCursor(userId);
            }
        });
    }

    /**
     * Create cursor element for user
     */
    createCursor(user) {
        if (this.cursors.has(user.id)) return;

        const cursorEl = document.createElement('div');
        cursorEl.className = 'collaboration-cursor';
        cursorEl.dataset.userId = user.id;
        cursorEl.style.cssText = `
            position: absolute;
            pointer-events: none;
            transition: transform 0.15s ease-out, opacity 0.2s;
            opacity: 0;
            z-index: 10000;
        `;

        // Cursor SVG
        const cursorSvg = this.createCursorSvg(user.color);
        cursorEl.appendChild(cursorSvg);

        // User label
        const label = document.createElement('div');
        label.className = 'cursor-label';
        label.textContent = user.name;
        label.style.cssText = `
            position: absolute;
            top: 20px;
            left: 10px;
            background: ${user.color};
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        `;
        cursorEl.appendChild(label);

        // Selection highlight (initially hidden)
        const selection = document.createElement('div');
        selection.className = 'cursor-selection';
        selection.style.cssText = `
            position: absolute;
            background: ${user.color}33;
            border: 1px solid ${user.color};
            border-radius: 2px;
            opacity: 0;
            transition: opacity 0.2s;
        `;
        cursorEl.appendChild(selection);

        this.cursorContainer.appendChild(cursorEl);
        this.cursors.set(user.id, {
            element: cursorEl,
            label,
            selection,
            color: user.color
        });

        if (this.isDev) console.log('[CollaborationCursor] Cursor created', user.id);
    }

    /**
     * Create cursor SVG
     */
    createCursorSvg(color) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '24');
        svg.setAttribute('height', '24');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.style.cssText = 'filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));';

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M5.5 3.5L20.5 11.5L12 14L9.5 20.5L5.5 3.5Z');
        path.setAttribute('fill', color);
        path.setAttribute('stroke', 'white');
        path.setAttribute('stroke-width', '1.5');

        svg.appendChild(path);
        return svg;
    }

    /**
     * Update cursor position
     */
    updateCursor(userId, location) {
        const cursor = this.cursors.get(userId);
        if (!cursor) return;

        const { position, selection } = location;

        // Update cursor position
        if (position) {
            cursor.element.style.transform = `translate(${position.x}px, ${position.y}px)`;
            cursor.element.style.opacity = '1';
        }

        // Update selection highlight
        if (selection && selection.start && selection.end) {
            this.updateSelection(cursor, selection);
        } else {
            cursor.selection.style.opacity = '0';
        }
    }

    /**
     * Update selection highlight
     */
    updateSelection(cursor, selection) {
        const { start, end } = selection;

        // Calculate selection dimensions
        const width = end.x - start.x;
        const height = end.y - start.y;

        if (width > 0 && height > 0) {
            cursor.selection.style.cssText = `
                position: absolute;
                left: ${start.x}px;
                top: ${start.y}px;
                width: ${width}px;
                height: ${height}px;
                background: ${cursor.color}33;
                border: 1px solid ${cursor.color};
                border-radius: 2px;
                opacity: 0.6;
                transition: opacity 0.2s;
            `;
        }
    }

    /**
     * Hide cursor
     */
    hideCursor(userId) {
        const cursor = this.cursors.get(userId);
        if (cursor) {
            cursor.element.style.opacity = '0';
        }
    }

    /**
     * Show cursor
     */
    showCursor(userId) {
        const cursor = this.cursors.get(userId);
        if (cursor) {
            cursor.element.style.opacity = '1';
        }
    }

    /**
     * Remove cursor
     */
    removeCursor(userId) {
        const cursor = this.cursors.get(userId);
        if (cursor) {
            cursor.element.remove();
            this.cursors.delete(userId);

            if (this.isDev) console.log('[CollaborationCursor] Cursor removed', userId);
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        this.cursors.forEach((cursor) => {
            cursor.element.remove();
        });

        this.cursors.clear();

        if (this.cursorContainer) {
            this.cursorContainer.remove();
            this.cursorContainer = null;
        }

        eventBus.off(Events.USER_LOCATION_UPDATE);
        eventBus.off(Events.USER_JOINED);
        eventBus.off(Events.USER_LEFT);
        eventBus.off(Events.USER_STATUS_CHANGE);

        if (this.isDev) console.log('[CollaborationCursor] Destroyed');
    }
}

// Export as singleton
export const collaborationCursor = new CollaborationCursor();

// Also export class for testing
export { CollaborationCursor };
