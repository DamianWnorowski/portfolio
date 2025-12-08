/**
 * TypeWriter Effect
 * Animated text typing for bio and other text elements
 */

export class TypeWriter {
    constructor(element, options = {}) {
        this.element = typeof element === 'string'
            ? document.querySelector(element)
            : element;

        if (!this.element) return;

        this.options = {
            speed: options.speed || 50,
            delay: options.delay || 0,
            cursor: options.cursor !== false,
            cursorChar: options.cursorChar || '|',
            loop: options.loop || false,
            deleteSpeed: options.deleteSpeed || 30,
            pauseBeforeDelete: options.pauseBeforeDelete || 2000,
            onComplete: options.onComplete || null
        };

        this.originalText = this.element.textContent;
        this.currentIndex = 0;
        this.isDeleting = false;
        this.isPaused = false;

        this.init();
    }

    init() {
        // Store original text and clear element
        this.element.textContent = '';
        this.element.classList.add('typewriter');

        // Add cursor
        if (this.options.cursor) {
            this.cursor = document.createElement('span');
            this.cursor.className = 'typewriter-cursor';
            this.cursor.textContent = this.options.cursorChar;
            this.element.appendChild(this.cursor);
        }

        // Add styles
        this.addStyles();

        // Start typing after delay
        setTimeout(() => this.type(), this.options.delay);
    }

    addStyles() {
        if (document.getElementById('typewriter-styles')) return;

        const style = document.createElement('style');
        style.id = 'typewriter-styles';
        style.textContent = `
            .typewriter {
                display: inline;
            }

            .typewriter-cursor {
                display: inline-block;
                color: var(--accent-gold, #c9a227);
                animation: blink 0.8s infinite;
                margin-left: 2px;
            }

            @keyframes blink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0; }
            }

            .typewriter-cursor.done {
                animation: none;
                opacity: 0;
            }
        `;
        document.head.appendChild(style);
    }

    type() {
        if (this.isPaused) return;

        const text = this.originalText;

        if (!this.isDeleting) {
            // Typing
            if (this.currentIndex < text.length) {
                this.element.textContent = text.substring(0, this.currentIndex + 1);
                if (this.cursor) {
                    this.element.appendChild(this.cursor);
                }
                this.currentIndex++;
                setTimeout(() => this.type(), this.options.speed);
            } else {
                // Finished typing
                if (this.options.loop) {
                    setTimeout(() => {
                        this.isDeleting = true;
                        this.type();
                    }, this.options.pauseBeforeDelete);
                } else {
                    if (this.cursor) {
                        this.cursor.classList.add('done');
                    }
                    if (this.options.onComplete) {
                        this.options.onComplete();
                    }
                }
            }
        } else {
            // Deleting
            if (this.currentIndex > 0) {
                this.element.textContent = text.substring(0, this.currentIndex - 1);
                if (this.cursor) {
                    this.element.appendChild(this.cursor);
                }
                this.currentIndex--;
                setTimeout(() => this.type(), this.options.deleteSpeed);
            } else {
                this.isDeleting = false;
                setTimeout(() => this.type(), this.options.speed);
            }
        }
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
        this.type();
    }

    reset() {
        this.currentIndex = 0;
        this.isDeleting = false;
        this.isPaused = false;
        this.element.textContent = '';
        if (this.cursor) {
            this.element.appendChild(this.cursor);
            this.cursor.classList.remove('done');
        }
    }

    setText(newText) {
        this.originalText = newText;
        this.reset();
        this.type();
    }
}

/**
 * Multi-line TypeWriter for multiple strings
 */
export class MultiTypeWriter {
    constructor(element, strings, options = {}) {
        this.element = typeof element === 'string'
            ? document.querySelector(element)
            : element;

        this.strings = strings;
        this.currentStringIndex = 0;

        this.options = {
            speed: options.speed || 50,
            deleteSpeed: options.deleteSpeed || 30,
            pauseBetween: options.pauseBetween || 2000,
            loop: options.loop !== false,
            cursor: options.cursor !== false
        };

        this.init();
    }

    init() {
        this.element.textContent = '';
        this.element.classList.add('typewriter');

        if (this.options.cursor) {
            this.cursor = document.createElement('span');
            this.cursor.className = 'typewriter-cursor';
            this.cursor.textContent = '|';
            this.element.appendChild(this.cursor);
        }

        this.typeString();
    }

    async typeString() {
        const str = this.strings[this.currentStringIndex];

        // Type
        for (let i = 0; i <= str.length; i++) {
            this.element.textContent = str.substring(0, i);
            if (this.cursor) this.element.appendChild(this.cursor);
            await this.delay(this.options.speed);
        }

        // Pause
        await this.delay(this.options.pauseBetween);

        // Delete
        for (let i = str.length; i >= 0; i--) {
            this.element.textContent = str.substring(0, i);
            if (this.cursor) this.element.appendChild(this.cursor);
            await this.delay(this.options.deleteSpeed);
        }

        // Next string
        this.currentStringIndex = (this.currentStringIndex + 1) % this.strings.length;

        if (this.options.loop || this.currentStringIndex !== 0) {
            this.typeString();
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
