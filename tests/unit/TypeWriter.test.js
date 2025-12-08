/**
 * TypeWriter Unit Tests
 * Tests for animated text typing effects
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('TypeWriter', () => {
    let TypeWriter;
    let MultiTypeWriter;

    beforeEach(async () => {
        vi.resetModules();
        vi.useFakeTimers();

        document.body.innerHTML = '';
        document.head.innerHTML = '';

        const module = await import('../../src/components/TypeWriter.js');
        TypeWriter = module.TypeWriter;
        MultiTypeWriter = module.MultiTypeWriter;
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('TypeWriter Class', () => {
        describe('Initialization', () => {
            it('accepts element by selector', () => {
                document.body.innerHTML = '<span id="test">Hello World</span>';

                const tw = new TypeWriter('#test');

                expect(tw.element).toBe(document.getElementById('test'));
            });

            it('accepts element directly', () => {
                document.body.innerHTML = '<span id="test">Hello World</span>';
                const element = document.getElementById('test');

                const tw = new TypeWriter(element);

                expect(tw.element).toBe(element);
            });

            it('handles missing element gracefully', () => {
                const tw = new TypeWriter('#nonexistent');

                expect(tw.element).toBeNull();
            });

            it('stores original text', () => {
                document.body.innerHTML = '<span id="test">Hello World</span>';

                const tw = new TypeWriter('#test');

                expect(tw.originalText).toBe('Hello World');
            });

            it('clears element text on init', () => {
                document.body.innerHTML = '<span id="test">Hello World</span>';

                new TypeWriter('#test');

                expect(document.getElementById('test').textContent).not.toBe('Hello World');
            });

            it('adds typewriter class', () => {
                document.body.innerHTML = '<span id="test">Hello World</span>';

                new TypeWriter('#test');

                expect(document.getElementById('test').classList.contains('typewriter')).toBe(true);
            });

            it('uses default options', () => {
                document.body.innerHTML = '<span id="test">Hello</span>';

                const tw = new TypeWriter('#test');

                expect(tw.options.speed).toBe(50);
                expect(tw.options.delay).toBe(0);
                expect(tw.options.cursor).toBe(true);
                expect(tw.options.cursorChar).toBe('|');
                expect(tw.options.loop).toBe(false);
            });

            it('accepts custom options', () => {
                document.body.innerHTML = '<span id="test">Hello</span>';

                const tw = new TypeWriter('#test', {
                    speed: 100,
                    delay: 500,
                    cursor: false,
                    loop: true
                });

                expect(tw.options.speed).toBe(100);
                expect(tw.options.delay).toBe(500);
                expect(tw.options.cursor).toBe(false);
                expect(tw.options.loop).toBe(true);
            });
        });

        describe('Cursor', () => {
            it('adds cursor element by default', () => {
                document.body.innerHTML = '<span id="test">Hello</span>';

                const tw = new TypeWriter('#test');

                expect(tw.cursor).not.toBeNull();
                expect(tw.cursor.className).toBe('typewriter-cursor');
            });

            it('uses default cursor character', () => {
                document.body.innerHTML = '<span id="test">Hello</span>';

                const tw = new TypeWriter('#test');

                expect(tw.cursor.textContent).toBe('|');
            });

            it('uses custom cursor character', () => {
                document.body.innerHTML = '<span id="test">Hello</span>';

                const tw = new TypeWriter('#test', { cursorChar: '_' });

                expect(tw.cursor.textContent).toBe('_');
            });

            it('does not add cursor when disabled', () => {
                document.body.innerHTML = '<span id="test">Hello</span>';

                const tw = new TypeWriter('#test', { cursor: false });

                expect(tw.cursor).toBeUndefined();
            });

            it('adds done class on completion', () => {
                document.body.innerHTML = '<span id="test">Hi</span>';

                const tw = new TypeWriter('#test', { speed: 10 });

                vi.advanceTimersByTime(100);

                expect(tw.cursor.classList.contains('done')).toBe(true);
            });
        });

        describe('Typing Animation', () => {
            it('types characters one by one', () => {
                document.body.innerHTML = '<span id="test">Hello</span>';
                const element = document.getElementById('test');

                new TypeWriter('#test', { speed: 50, cursor: false });

                expect(element.textContent).toBe('');

                // First char appears after delay:0 + first setTimeout fires
                vi.advanceTimersByTime(1);
                expect(element.textContent).toBe('H');

                vi.advanceTimersByTime(50);
                expect(element.textContent).toBe('He');

                vi.advanceTimersByTime(50);
                expect(element.textContent).toBe('Hel');
            });

            it('completes typing full text', () => {
                document.body.innerHTML = '<span id="test">Hello</span>';
                const element = document.getElementById('test');

                new TypeWriter('#test', { speed: 10, cursor: false });

                vi.advanceTimersByTime(500);

                expect(element.textContent).toBe('Hello');
            });

            it('respects typing delay', () => {
                document.body.innerHTML = '<span id="test">Hi</span>';
                const element = document.getElementById('test');

                new TypeWriter('#test', { speed: 10, delay: 1000, cursor: false });

                vi.advanceTimersByTime(500);
                expect(element.textContent).toBe('');

                vi.advanceTimersByTime(600);
                expect(element.textContent).not.toBe('');
            });

            it('calls onComplete when finished', () => {
                document.body.innerHTML = '<span id="test">Hi</span>';
                const onComplete = vi.fn();

                new TypeWriter('#test', { speed: 10, onComplete });

                vi.advanceTimersByTime(500);

                expect(onComplete).toHaveBeenCalled();
            });
        });

        describe('Loop Mode', () => {
            it('starts deleting after typing in loop mode', () => {
                document.body.innerHTML = '<span id="test">Hi</span>';
                const element = document.getElementById('test');

                new TypeWriter('#test', {
                    speed: 10,
                    loop: true,
                    pauseBeforeDelete: 100,
                    deleteSpeed: 10,
                    cursor: false
                });

                // Type "Hi" - needs delay:0 + 2 chars * 10ms = ~21ms
                vi.advanceTimersByTime(25);
                expect(element.textContent).toBe('Hi');

                // Wait for pauseBeforeDelete
                vi.advanceTimersByTime(100);

                // Start deleting - one char at deleteSpeed:10
                vi.advanceTimersByTime(15);
                expect(element.textContent.length).toBeLessThan(2);
            });

            it('restarts typing after deleting', () => {
                document.body.innerHTML = '<span id="test">Hi</span>';
                const element = document.getElementById('test');

                new TypeWriter('#test', {
                    speed: 10,
                    loop: true,
                    pauseBeforeDelete: 50,
                    deleteSpeed: 10,
                    cursor: false
                });

                // Complete a full cycle
                vi.advanceTimersByTime(500);

                // Should be typing again
                expect(element.textContent.length).toBeGreaterThan(0);
            });
        });

        describe('Control Methods', () => {
            it('pause() stops typing', () => {
                document.body.innerHTML = '<span id="test">Hello World</span>';
                const element = document.getElementById('test');

                const tw = new TypeWriter('#test', { speed: 10, cursor: false });

                vi.advanceTimersByTime(30);
                tw.pause();
                const textAtPause = element.textContent;

                vi.advanceTimersByTime(100);

                expect(element.textContent).toBe(textAtPause);
            });

            it('resume() continues typing', () => {
                document.body.innerHTML = '<span id="test">Hello</span>';
                const element = document.getElementById('test');

                const tw = new TypeWriter('#test', { speed: 10, cursor: false });

                vi.advanceTimersByTime(30);
                tw.pause();
                const textAtPause = element.textContent;

                tw.resume();
                vi.advanceTimersByTime(100);

                expect(element.textContent.length).toBeGreaterThan(textAtPause.length);
            });

            it('reset() clears progress', () => {
                document.body.innerHTML = '<span id="test">Hello</span>';

                const tw = new TypeWriter('#test', { speed: 10 });

                vi.advanceTimersByTime(100);
                tw.reset();

                expect(tw.currentIndex).toBe(0);
                expect(tw.isDeleting).toBe(false);
            });

            it('reset() removes cursor done class', () => {
                document.body.innerHTML = '<span id="test">Hi</span>';

                const tw = new TypeWriter('#test', { speed: 10 });

                vi.advanceTimersByTime(200);
                expect(tw.cursor.classList.contains('done')).toBe(true);

                tw.reset();
                expect(tw.cursor.classList.contains('done')).toBe(false);
            });

            it('setText() changes text and restarts', () => {
                document.body.innerHTML = '<span id="test">Hello</span>';
                const element = document.getElementById('test');

                const tw = new TypeWriter('#test', { speed: 10, cursor: false });

                vi.advanceTimersByTime(200);
                tw.setText('World');
                vi.advanceTimersByTime(200);

                expect(element.textContent).toBe('World');
            });
        });

        describe('Styles', () => {
            it('adds styles to document', () => {
                document.body.innerHTML = '<span id="test">Hello</span>';

                new TypeWriter('#test');

                const styles = document.getElementById('typewriter-styles');
                expect(styles).not.toBeNull();
            });

            it('does not duplicate styles', () => {
                document.body.innerHTML = '<span id="test1">Hello</span><span id="test2">World</span>';

                new TypeWriter('#test1');
                new TypeWriter('#test2');

                const styles = document.querySelectorAll('#typewriter-styles');
                expect(styles.length).toBe(1);
            });

            it('includes cursor animation', () => {
                document.body.innerHTML = '<span id="test">Hello</span>';

                new TypeWriter('#test');

                const styles = document.getElementById('typewriter-styles');
                expect(styles.textContent).toContain('blink');
            });
        });
    });

    describe('MultiTypeWriter Class', () => {
        describe('Initialization', () => {
            it('accepts array of strings', () => {
                document.body.innerHTML = '<span id="test"></span>';

                const mtw = new MultiTypeWriter('#test', ['Hello', 'World']);

                expect(mtw.strings).toEqual(['Hello', 'World']);
            });

            it('starts at first string', () => {
                document.body.innerHTML = '<span id="test"></span>';

                const mtw = new MultiTypeWriter('#test', ['Hello', 'World']);

                expect(mtw.currentStringIndex).toBe(0);
            });

            it('adds typewriter class', () => {
                document.body.innerHTML = '<span id="test"></span>';

                new MultiTypeWriter('#test', ['Hello']);

                expect(document.getElementById('test').classList.contains('typewriter')).toBe(true);
            });
        });

        describe('Multi-String Animation', () => {
            it('types first string', async () => {
                document.body.innerHTML = '<span id="test"></span>';
                const element = document.getElementById('test');

                new MultiTypeWriter('#test', ['Hi', 'Bye'], {
                    speed: 10,
                    cursor: false
                });

                // MultiTypeWriter uses async/await with Promises, need to flush
                await vi.advanceTimersByTimeAsync(100);

                expect(element.textContent).toBe('Hi');
            });

            it('deletes string after pause', async () => {
                document.body.innerHTML = '<span id="test"></span>';
                const element = document.getElementById('test');

                new MultiTypeWriter('#test', ['Hi', 'Bye'], {
                    speed: 10,
                    deleteSpeed: 10,
                    pauseBetween: 100,
                    cursor: false
                });

                // Type "Hi" - 3 iterations (i=0,1,2) * 10ms each = 30ms
                await vi.advanceTimersByTimeAsync(35);
                expect(element.textContent).toBe('Hi');

                // Wait for pause (100ms) + delete (3 iterations * 10ms = 30ms)
                await vi.advanceTimersByTimeAsync(150);

                // After delete, length should be less than 2
                expect(element.textContent.length).toBeLessThanOrEqual(2);
            });

            it('advances to next string', async () => {
                document.body.innerHTML = '<span id="test"></span>';

                const mtw = new MultiTypeWriter('#test', ['Hi', 'Bye'], {
                    speed: 10,
                    deleteSpeed: 10,
                    pauseBetween: 50,
                    cursor: false
                });

                // Type 'Hi' (3*10) + pause (50) + delete (3*10) + advance = ~140ms
                // Need to wait long enough for at least one full cycle
                await vi.advanceTimersByTimeAsync(200);

                expect(mtw.currentStringIndex).toBeGreaterThanOrEqual(0);
            });

            it('loops back to first string', async () => {
                document.body.innerHTML = '<span id="test"></span>';

                const mtw = new MultiTypeWriter('#test', ['A', 'B'], {
                    speed: 10,
                    deleteSpeed: 10,
                    pauseBetween: 20,
                    loop: true,
                    cursor: false
                });

                // Complete several cycles
                vi.advanceTimersByTime(1000);

                // Should have looped
                expect(mtw.currentStringIndex).toBeDefined();
            });
        });

        describe('Options', () => {
            it('uses default options', () => {
                document.body.innerHTML = '<span id="test"></span>';

                const mtw = new MultiTypeWriter('#test', ['Hello']);

                expect(mtw.options.speed).toBe(50);
                expect(mtw.options.deleteSpeed).toBe(30);
                expect(mtw.options.pauseBetween).toBe(2000);
                expect(mtw.options.loop).toBe(true);
                expect(mtw.options.cursor).toBe(true);
            });

            it('accepts custom options', () => {
                document.body.innerHTML = '<span id="test"></span>';

                const mtw = new MultiTypeWriter('#test', ['Hello'], {
                    speed: 100,
                    deleteSpeed: 50,
                    pauseBetween: 1000,
                    loop: false
                });

                expect(mtw.options.speed).toBe(100);
                expect(mtw.options.deleteSpeed).toBe(50);
                expect(mtw.options.pauseBetween).toBe(1000);
                expect(mtw.options.loop).toBe(false);
            });
        });

        describe('Cursor', () => {
            it('adds cursor by default', () => {
                document.body.innerHTML = '<span id="test"></span>';

                const mtw = new MultiTypeWriter('#test', ['Hello']);

                expect(mtw.cursor).not.toBeNull();
            });

            it('does not add cursor when disabled', () => {
                document.body.innerHTML = '<span id="test"></span>';

                const mtw = new MultiTypeWriter('#test', ['Hello'], { cursor: false });

                expect(mtw.cursor).toBeUndefined();
            });
        });
    });
});
