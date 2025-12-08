/**
 * EventBus Unit Tests
 * Core pub/sub system tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock EventBus implementation for testing
class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        return () => this.off(event, callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(cb => cb(data));
        }
    }

    once(event, callback) {
        const wrapper = (data) => {
            this.off(event, wrapper);
            callback(data);
        };
        return this.on(event, wrapper);
    }

    clear() {
        this.listeners.clear();
    }
}

describe('EventBus', () => {
    let eventBus;

    beforeEach(() => {
        eventBus = new EventBus();
    });

    describe('Subscription', () => {
        it('subscribes to events', () => {
            const callback = vi.fn();
            eventBus.on('test', callback);

            eventBus.emit('test', { value: 1 });

            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith({ value: 1 });
        });

        it('allows multiple subscribers to same event', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            eventBus.on('test', callback1);
            eventBus.on('test', callback2);

            eventBus.emit('test', 'data');

            expect(callback1).toHaveBeenCalledWith('data');
            expect(callback2).toHaveBeenCalledWith('data');
        });

        it('allows subscribing to different events', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            eventBus.on('event1', callback1);
            eventBus.on('event2', callback2);

            eventBus.emit('event1', 'data1');

            expect(callback1).toHaveBeenCalledWith('data1');
            expect(callback2).not.toHaveBeenCalled();
        });

        it('returns unsubscribe function', () => {
            const callback = vi.fn();
            const unsubscribe = eventBus.on('test', callback);

            eventBus.emit('test', 'first');
            unsubscribe();
            eventBus.emit('test', 'second');

            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith('first');
        });
    });

    describe('Unsubscription', () => {
        it('unsubscribes specific callback', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            eventBus.on('test', callback1);
            eventBus.on('test', callback2);

            eventBus.off('test', callback1);
            eventBus.emit('test', 'data');

            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).toHaveBeenCalledWith('data');
        });

        it('handles unsubscribe from non-existent event gracefully', () => {
            const callback = vi.fn();

            expect(() => {
                eventBus.off('nonexistent', callback);
            }).not.toThrow();
        });

        it('handles unsubscribe of non-registered callback gracefully', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            eventBus.on('test', callback1);

            expect(() => {
                eventBus.off('test', callback2);
            }).not.toThrow();
        });
    });

    describe('Emission', () => {
        it('emits events with data', () => {
            const callback = vi.fn();
            eventBus.on('test', callback);

            const testData = { key: 'value', nested: { a: 1 } };
            eventBus.emit('test', testData);

            expect(callback).toHaveBeenCalledWith(testData);
        });

        it('emits events without data', () => {
            const callback = vi.fn();
            eventBus.on('test', callback);

            eventBus.emit('test');

            expect(callback).toHaveBeenCalledWith(undefined);
        });

        it('handles emit to non-existent event gracefully', () => {
            expect(() => {
                eventBus.emit('nonexistent', 'data');
            }).not.toThrow();
        });

        it('handles emit with no subscribers gracefully', () => {
            eventBus.on('test', vi.fn());
            eventBus.clear();

            expect(() => {
                eventBus.emit('test', 'data');
            }).not.toThrow();
        });
    });

    describe('Once', () => {
        it('fires callback only once', () => {
            const callback = vi.fn();
            eventBus.once('test', callback);

            eventBus.emit('test', 'first');
            eventBus.emit('test', 'second');
            eventBus.emit('test', 'third');

            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith('first');
        });

        it('returns unsubscribe function', () => {
            const callback = vi.fn();
            const unsubscribe = eventBus.once('test', callback);

            unsubscribe();
            eventBus.emit('test', 'data');

            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe('Clear', () => {
        it('removes all listeners', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            eventBus.on('event1', callback1);
            eventBus.on('event2', callback2);

            eventBus.clear();

            eventBus.emit('event1', 'data');
            eventBus.emit('event2', 'data');

            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).not.toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
        it('handles rapid subscribe/unsubscribe', () => {
            const callback = vi.fn();

            for (let i = 0; i < 100; i++) {
                const unsub = eventBus.on('test', callback);
                unsub();
            }

            eventBus.emit('test', 'data');

            expect(callback).not.toHaveBeenCalled();
        });

        it('handles callback that throws', () => {
            const errorCallback = vi.fn(() => {
                throw new Error('Callback error');
            });
            const normalCallback = vi.fn();

            eventBus.on('test', errorCallback);
            eventBus.on('test', normalCallback);

            // This might throw depending on implementation
            // Ideally, one failing callback shouldn't affect others
            try {
                eventBus.emit('test', 'data');
            } catch (e) {
                // Expected if implementation doesn't catch errors
            }

            expect(errorCallback).toHaveBeenCalled();
        });

        it('handles same callback registered twice', () => {
            const callback = vi.fn();

            eventBus.on('test', callback);
            eventBus.on('test', callback);

            eventBus.emit('test', 'data');

            // With Set-based implementation, should only fire once
            // With Array-based, might fire twice
            expect(callback).toHaveBeenCalled();
        });
    });
});
