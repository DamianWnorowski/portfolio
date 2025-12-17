/**
 * EventBus - Global event system for component communication
 */

class EventBus {
    constructor() {
        this.events = new Map();
        this.emitDepth = 0;
        this.maxEmitDepth = 10;
    }

    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    off(event, callback) {
        if (!this.events.has(event)) return;

        const callbacks = this.events.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    emit(event, data) {
        if (!this.events.has(event)) return;

        // Prevent infinite recursion
        if (this.emitDepth >= this.maxEmitDepth) {
            const isDev = import.meta.env?.DEV ?? false;
            if (isDev) console.warn(`EventBus: Max emit depth (${this.maxEmitDepth}) reached for ${event}`);
            return;
        }

        this.emitDepth++;
        const isDev = import.meta.env?.DEV ?? false;

        // Clone callbacks array to prevent issues if callbacks modify the list
        const callbacks = [...this.events.get(event)];
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                if (isDev) console.error(`EventBus error in ${event}:`, error);
            }
        });

        this.emitDepth--;
    }

    once(event, callback) {
        const wrapper = (data) => {
            callback(data);
            this.off(event, wrapper);
        };
        this.on(event, wrapper);
    }
}

// Singleton
export const eventBus = new EventBus();

// Event types
export const Events = {
    // Data events
    STATS_LOADED: 'stats:loaded',
    DEPLOYMENTS_LOADED: 'deployments:loaded',
    LOGS_RECEIVED: 'logs:received',
    METRICS_UPDATE: 'metrics:update',

    // UI events
    SECTION_CHANGE: 'ui:section_change',
    MODAL_OPEN: 'ui:modal_open',
    MODAL_CLOSE: 'ui:modal_close',
    TERMINAL_COMMAND: 'terminal:command',

    // Globe events
    NODE_HOVER: 'globe:node_hover',
    NODE_CLICK: 'globe:node_click',

    // System events
    READY: 'system:ready',
    ERROR: 'system:error'
};
