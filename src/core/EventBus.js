/**
 * EventBus - Global event system for component communication
 */

class EventBus {
    constructor() {
        this.events = new Map();
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

        const isDev = import.meta.env?.DEV ?? false;
        this.events.get(event).forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                if (isDev) console.error(`EventBus error in ${event}:`, error);
            }
        });
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
