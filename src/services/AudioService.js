/**
 * Audio Service
 * Sound effects for elite experience
 */

// Base64 encoded micro sounds (no external files needed)
const SOUNDS = {
    // Boot chime - short ascending tone
    boot: 'data:audio/wav;base64,UklGRl9vT19teleWQVZFZm10IAAAA...',

    // Key click - subtle mechanical sound
    key: null, // Will use Web Audio API

    // Notification ping
    ping: null,

    // Hover blip
    hover: null,

    // Success tone
    success: null,

    // Whoosh
    whoosh: null
};

export class AudioService {
    constructor() {
        this.enabled = localStorage.getItem('kaizen-sound') !== 'off';
        this.context = null;
        this.masterGain = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.context.createGain();
            this.masterGain.gain.value = 0.3;
            this.masterGain.connect(this.context.destination);
            this.initialized = true;
        } catch (e) {
            this.enabled = false;
        }
    }

    async play(name) {
        if (!this.enabled || !this.initialized) return;

        // Resume context if suspended (browser autoplay policy)
        if (this.context.state === 'suspended') {
            await this.context.resume();
        }

        switch (name) {
            case 'boot':
                this.playBoot();
                break;
            case 'key':
                this.playKey();
                break;
            case 'ping':
                this.playPing();
                break;
            case 'hover':
                this.playHover();
                break;
            case 'success':
                this.playSuccess();
                break;
            case 'whoosh':
                this.playWhoosh();
                break;
            case 'error':
                this.playError();
                break;
        }
    }

    playBoot() {
        const now = this.context.currentTime;

        // Three ascending tones
        [400, 500, 600].forEach((freq, i) => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(0, now + i * 0.15);
            gain.gain.linearRampToValueAtTime(0.2, now + i * 0.15 + 0.05);
            gain.gain.linearRampToValueAtTime(0, now + i * 0.15 + 0.2);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 0.25);
        });
    }

    playKey() {
        const now = this.context.currentTime;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'square';
        osc.frequency.value = 800 + Math.random() * 200;

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.05);
    }

    playPing() {
        const now = this.context.currentTime;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.3);
    }

    playHover() {
        const now = this.context.currentTime;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'sine';
        osc.frequency.value = 600;

        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.05);
    }

    playSuccess() {
        const now = this.context.currentTime;

        [523, 659, 784].forEach((freq, i) => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(0, now + i * 0.1);
            gain.gain.linearRampToValueAtTime(0.2, now + i * 0.1 + 0.05);
            gain.gain.linearRampToValueAtTime(0, now + i * 0.1 + 0.3);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.35);
        });
    }

    playError() {
        const now = this.context.currentTime;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.2);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.2);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.2);
    }

    playWhoosh() {
        const now = this.context.currentTime;

        // White noise burst with filter sweep
        const bufferSize = this.context.sampleRate * 0.3;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.context.createBufferSource();
        noise.buffer = buffer;

        const filter = this.context.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1000, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + 0.3);
        filter.Q.value = 1;

        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start(now);
        noise.stop(now + 0.3);
    }

    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('kaizen-sound', this.enabled ? 'on' : 'off');
        return this.enabled;
    }

    setVolume(value) {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, value));
        }
    }
}

// Singleton
export const audioService = new AudioService();
