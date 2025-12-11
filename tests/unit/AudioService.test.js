/**
 * AudioService Unit Tests
 * Tests for audio playback and Web Audio API integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Web Audio API
const createMockAudioContext = () => {
    const mockGainNode = {
        gain: {
            value: 1,
            setValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn()
        },
        connect: vi.fn()
    };

    const mockOscillator = {
        type: 'sine',
        frequency: {
            value: 440,
            setValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn()
        },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn()
    };

    const mockBufferSource = {
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn()
    };

    const mockFilter = {
        type: 'bandpass',
        frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn()
        },
        Q: { value: 1 },
        connect: vi.fn()
    };

    const mockBuffer = {
        getChannelData: vi.fn().mockReturnValue(new Float32Array(1000))
    };

    return {
        currentTime: 0,
        state: 'running',
        destination: {},
        sampleRate: 44100,
        resume: vi.fn().mockResolvedValue(undefined),
        createGain: vi.fn().mockReturnValue(mockGainNode),
        createOscillator: vi.fn().mockReturnValue(mockOscillator),
        createBufferSource: vi.fn().mockReturnValue(mockBufferSource),
        createBiquadFilter: vi.fn().mockReturnValue(mockFilter),
        createBuffer: vi.fn().mockReturnValue(mockBuffer),
        _gainNode: mockGainNode,
        _oscillator: mockOscillator
    };
};

describe('AudioService', () => {
    let AudioService;
    let audioService;
    let mockContext;

    beforeEach(async () => {
        // Reset modules
        vi.resetModules();

        // Create fresh mock
        mockContext = createMockAudioContext();

        // Mock AudioContext on both window and global - must use regular function for 'new'
        const MockAudioContext = vi.fn(function() { 
            Object.assign(this, mockContext);
            return this;
        });
        global.AudioContext = MockAudioContext;
        window.AudioContext = MockAudioContext;
        global.webkitAudioContext = MockAudioContext;
        window.webkitAudioContext = MockAudioContext;

        // Clear localStorage
        localStorage.clear();

        // Dynamic import to get fresh instance
        const module = await import('../../src/services/AudioService.js');
        AudioService = module.AudioService;
        audioService = new AudioService();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Initialization', () => {
        it('reads sound preference from localStorage', () => {
            localStorage.setItem('kaizen-sound', 'off');
            const service = new AudioService();
            expect(service.enabled).toBe(false);
        });

        it('defaults to enabled when no localStorage preference', () => {
            expect(audioService.enabled).toBe(true);
        });

        it('starts uninitialized', () => {
            expect(audioService.initialized).toBe(false);
            expect(audioService.context).toBeNull();
        });

        it('initializes AudioContext on init()', async () => {
            await audioService.init();

            expect(audioService.initialized).toBe(true);
            expect(audioService.context).toBeDefined();
            expect(audioService.context.createGain).toBeDefined();
        });

        it('creates master gain node with default volume', async () => {
            await audioService.init();

            expect(audioService.masterGain).toBeDefined();
            expect(audioService.masterGain.gain.value).toBe(0.3);
        });

        it('connects master gain to destination', async () => {
            await audioService.init();

            expect(audioService.masterGain.connect).toHaveBeenCalledWith(mockContext.destination);
        });

        it('does not reinitialize if already initialized', async () => {
            await audioService.init();
            await audioService.init();

            expect(AudioContext).toHaveBeenCalledTimes(1);
        });

        it('handles AudioContext creation failure gracefully', async () => {
            global.AudioContext = vi.fn().mockImplementation(() => {
                throw new Error('AudioContext not supported');
            });

            const service = new AudioService();
            await service.init();

            expect(service.enabled).toBe(false);
            expect(service.initialized).toBe(false);
        });
    });

    describe('Sound Playback', () => {
        beforeEach(async () => {
            await audioService.init();
        });

        it('does nothing when disabled', async () => {
            audioService.enabled = false;
            await audioService.play('boot');

            expect(mockContext.createOscillator).not.toHaveBeenCalled();
        });

        it('does nothing when not initialized', async () => {
            audioService.initialized = false;
            await audioService.play('boot');

            // Should not have created new oscillators after init
            const callCount = mockContext.createOscillator.mock.calls.length;
            expect(callCount).toBe(0);
        });

        it('resumes suspended AudioContext', async () => {
            // Set state to suspended on the actual context instance
            audioService.context.state = 'suspended';
            const resumeSpy = vi.spyOn(audioService.context, 'resume');
            
            await audioService.play('boot');

            expect(resumeSpy).toHaveBeenCalled();
        });

        it('plays boot sound with three ascending tones', async () => {
            await audioService.play('boot');

            // Boot creates 3 oscillators
            expect(mockContext.createOscillator).toHaveBeenCalledTimes(3);
            expect(mockContext.createGain).toHaveBeenCalledTimes(4); // 1 master + 3 for boot
        });

        it('plays key sound with square wave', async () => {
            await audioService.play('key');

            const oscillator = mockContext.createOscillator.mock.results[0].value;
            expect(oscillator.type).toBe('square');
        });

        it('plays ping sound with frequency sweep', async () => {
            await audioService.play('ping');

            const oscillator = mockContext.createOscillator.mock.results[0].value;
            expect(oscillator.frequency.setValueAtTime).toHaveBeenCalled();
            expect(oscillator.frequency.exponentialRampToValueAtTime).toHaveBeenCalled();
        });

        it('plays hover sound', async () => {
            await audioService.play('hover');

            expect(mockContext.createOscillator).toHaveBeenCalled();
        });

        it('plays success sound with three ascending tones', async () => {
            await audioService.play('success');

            expect(mockContext.createOscillator).toHaveBeenCalledTimes(3);
        });

        it('plays error sound with sawtooth wave', async () => {
            await audioService.play('error');

            const oscillator = mockContext.createOscillator.mock.results[0].value;
            expect(oscillator.type).toBe('sawtooth');
        });

        it('plays whoosh sound using noise buffer', async () => {
            await audioService.play('whoosh');

            expect(mockContext.createBuffer).toHaveBeenCalled();
            expect(mockContext.createBufferSource).toHaveBeenCalled();
            expect(mockContext.createBiquadFilter).toHaveBeenCalled();
        });

        it('ignores unknown sound names', async () => {
            await audioService.play('unknown');

            expect(mockContext.createOscillator).not.toHaveBeenCalled();
        });
    });

    describe('Toggle', () => {
        it('toggles enabled state', () => {
            expect(audioService.enabled).toBe(true);

            const result = audioService.toggle();

            expect(result).toBe(false);
            expect(audioService.enabled).toBe(false);
        });

        it('persists preference to localStorage', () => {
            audioService.toggle(); // off
            expect(localStorage.getItem('kaizen-sound')).toBe('off');

            audioService.toggle(); // on
            expect(localStorage.getItem('kaizen-sound')).toBe('on');
        });

        it('returns new state', () => {
            expect(audioService.toggle()).toBe(false);
            expect(audioService.toggle()).toBe(true);
        });
    });

    describe('Volume Control', () => {
        beforeEach(async () => {
            await audioService.init();
        });

        it('sets volume within valid range', () => {
            audioService.setVolume(0.5);
            expect(audioService.masterGain.gain.value).toBe(0.5);
        });

        it('clamps volume to minimum 0', () => {
            audioService.setVolume(-0.5);
            expect(audioService.masterGain.gain.value).toBe(0);
        });

        it('clamps volume to maximum 1', () => {
            audioService.setVolume(1.5);
            expect(audioService.masterGain.gain.value).toBe(1);
        });

        it('handles setVolume when not initialized', () => {
            const uninitService = new AudioService();
            expect(() => uninitService.setVolume(0.5)).not.toThrow();
        });
    });

    describe('Browser Compatibility', () => {
        it('uses webkit prefix if standard AudioContext unavailable', async () => {
            vi.resetModules();
            
            // Set standard AudioContext to undefined, keeping webkit as proper constructor
            window.AudioContext = undefined;
            window.webkitAudioContext = vi.fn(function() { 
                Object.assign(this, mockContext);
                return this;
            });
            
            const module = await import('../../src/services/AudioService.js');
            const service = new module.AudioService();
            await service.init();

            expect(window.webkitAudioContext).toHaveBeenCalled();
        });

        it('handles browsers without any AudioContext', async () => {
            vi.resetModules();
            
            // Set both to undefined
            window.AudioContext = undefined;
            window.webkitAudioContext = undefined;

            const module = await import('../../src/services/AudioService.js');
            const service = new module.AudioService();
            await service.init();

            expect(service.enabled).toBe(false);
        });
    });
});

describe('AudioService Singleton', () => {
    it('exports a singleton instance', async () => {
        const { audioService } = await import('../../src/services/AudioService.js');
        expect(audioService).toBeDefined();
        expect(audioService.constructor.name).toBe('AudioService');
    });
});
