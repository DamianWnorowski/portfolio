/**
 * Test Setup - KAIZEN Elite Portfolio
 * Configures testing environment for Vitest
 */

import { vi, afterEach } from 'vitest';

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
}));

// Mock localStorage
const localStorageMock = {
    store: {},
    getItem: vi.fn((key) => localStorageMock.store[key] || null),
    setItem: vi.fn((key, value) => { localStorageMock.store[key] = value; }),
    removeItem: vi.fn((key) => { delete localStorageMock.store[key]; }),
    clear: vi.fn(() => { localStorageMock.store = {}; })
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
    }))
});

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = vi.fn((id) => clearTimeout(id));

// Mock Web Audio API
class MockAudioContext {
    constructor() {
        this.destination = {};
        this.currentTime = 0;
        this.sampleRate = 44100;
        this.state = 'running';
    }
    createOscillator() {
        return {
            type: 'sine',
            frequency: { value: 440, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
            connect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn()
        };
    }
    createGain() {
        return {
            gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
            connect: vi.fn()
        };
    }
    createBiquadFilter() {
        return {
            type: 'lowpass',
            frequency: { value: 1000, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
            Q: { value: 1 },
            connect: vi.fn()
        };
    }
    createBuffer() {
        return { getChannelData: vi.fn(() => new Float32Array(1024)) };
    }
    createBufferSource() {
        return { buffer: null, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
    }
    resume() { return Promise.resolve(); }
}
global.AudioContext = MockAudioContext;
global.webkitAudioContext = MockAudioContext;

// Mock WebGL context
const mockWebGLContext = {
    getParameter: vi.fn(() => 4096),
    getExtension: vi.fn(() => null),
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    useProgram: vi.fn(),
    getUniformLocation: vi.fn(() => ({})),
    getAttribLocation: vi.fn(() => 0),
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
    uniform3f: vi.fn(),
    uniform4f: vi.fn(),
    uniformMatrix4fv: vi.fn(),
    viewport: vi.fn(),
    clear: vi.fn(),
    clearColor: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    blendFunc: vi.fn(),
    drawArrays: vi.fn(),
    drawElements: vi.fn(),
    canvas: { width: 800, height: 600 },
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    ARRAY_BUFFER: 34962,
    STATIC_DRAW: 35044,
    FLOAT: 5126,
    TRIANGLES: 4,
    COLOR_BUFFER_BIT: 16384,
    DEPTH_BUFFER_BIT: 256,
    BLEND: 3042,
    MAX_TEXTURE_SIZE: 3379,
    VENDOR: 7936,
    RENDERER: 7937
};

// Mock 2D context
const mock2DContext = {
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    fillText: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    drawImage: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    measureText: vi.fn(() => ({ width: 100 })),
    canvas: { width: 800, height: 600 }
};

// Override HTMLCanvasElement.prototype.getContext
const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function(type, ...args) {
    if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
        return mockWebGLContext;
    }
    if (type === '2d') {
        return mock2DContext;
    }
    // Fall back to original for other types
    try {
        return originalGetContext.call(this, type, ...args);
    } catch {
        return null;
    }
};

// Mock fetch
global.fetch = vi.fn().mockImplementation((url) => {
    return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('')
    });
});

// Mock EventSource for SSE
global.EventSource = vi.fn().mockImplementation((url) => ({
    url,
    readyState: 1,
    CONNECTING: 0,
    OPEN: 1,
    CLOSED: 2,
    onopen: null,
    onmessage: null,
    onerror: null,
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
}));
global.EventSource.OPEN = 1;

// Mock PerformanceObserver
global.PerformanceObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    disconnect: vi.fn()
}));

// Clean up after each test
afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    localStorageMock.store = {};
});

// Export utilities
export const mockFetch = (response) => {
    global.fetch.mockImplementationOnce(() =>
        Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(response),
            text: () => Promise.resolve(JSON.stringify(response))
        })
    );
};

export const mockFetchError = (status = 500, message = 'Server Error') => {
    global.fetch.mockImplementationOnce(() =>
        Promise.resolve({
            ok: false,
            status,
            json: () => Promise.resolve({ error: message }),
            text: () => Promise.resolve(message)
        })
    );
};

export const createContainer = (id) => {
    const container = document.createElement('div');
    container.id = id;
    document.body.appendChild(container);
    return container;
};

export const triggerKeydown = (key, options = {}) => {
    const event = new KeyboardEvent('keydown', {
        key,
        code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
        bubbles: true,
        cancelable: true,
        ...options
    });
    document.dispatchEvent(event);
    return event;
};

export const triggerClick = (element) => {
    const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true
    });
    element.dispatchEvent(event);
    return event;
};

export const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const waitFor = async (condition, timeout = 1000, interval = 50) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        if (condition()) return true;
        await wait(interval);
    }
    throw new Error('waitFor timeout');
};
