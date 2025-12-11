import { vi } from 'vitest';

// =====================================================
// TEST HELPER FUNCTIONS
// =====================================================

/**
 * Creates a container element in the DOM
 */
export function createContainer(id) {
    let container = document.getElementById(id);
    if (!container) {
        container = document.createElement('div');
        container.id = id;
        document.body.appendChild(container);
    }
    return container;
}

/**
 * Mock fetch for successful responses
 */
export function mockFetch(response = {}) {
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(response),
        text: () => Promise.resolve(JSON.stringify(response))
    });
    return global.fetch;
}

/**
 * Mock fetch for error responses
 */
export function mockFetchError(message = 'Network error', status = 500) {
    global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status,
        json: () => Promise.resolve({ error: message }),
        text: () => Promise.resolve(message)
    });
    return global.fetch;
}

/**
 * Wait utility for async tests
 */
export function wait(ms = 0) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Trigger a keyboard event on an element or document
 */
export function triggerKeydown(target, key, options = {}) {
    const element = target || document;
    const event = new KeyboardEvent('keydown', {
        key,
        code: options.code || key,
        bubbles: true,
        cancelable: true,
        ...options
    });
    element.dispatchEvent(event);
    return event;
}

/**
 * Trigger a click event on an element
 */
export function triggerClick(element) {
    if (!element) return;
    const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true
    });
    element.dispatchEvent(event);
    return event;
}

// =====================================================
// CANVAS MOCKING
// =====================================================

// Mock HTMLCanvasElement.getContext for jsdom
const mockContext2D = {
    fillStyle: '',
    strokeStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    globalAlpha: 1,
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn()
    })),
    createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn()
    })),
    getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(4)
    })),
    putImageData: vi.fn(),
    canvas: { width: 800, height: 600 }
};

// Store original getContext
const originalGetContext = HTMLCanvasElement.prototype.getContext;

// Override getContext for canvas elements
HTMLCanvasElement.prototype.getContext = function(contextType) {
    if (contextType === '2d') {
        return { ...mockContext2D, canvas: this };
    }
    // For WebGL contexts, return null (jsdom doesn't support them)
    if (contextType === 'webgl' || contextType === 'webgl2' || contextType === 'experimental-webgl') {
        return null;
    }
    // Fall back to original for other context types
    return originalGetContext?.call(this, contextType) || null;
};

// Mock 'three' module
vi.mock('three', () => {
    const mockClock = vi.fn(function() {
        this.getDelta = vi.fn(() => 0.016);
        this.getElapsedTime = vi.fn(() => 1.0);
    });

    const mockVector2 = vi.fn(function(x = 0, y = 0) {
        this.x = x;
        this.y = y;
        this.set = function(newX, newY) {
            this.x = newX;
            this.y = newY;
            return this;
        };
    });

    const mockVector3 = vi.fn(function(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.set = function(newX, newY, newZ) { this.x = newX; this.y = newY; this.z = newZ; return this; };
        this.copy = vi.fn().mockReturnThis();
        this.add = vi.fn().mockReturnThis();
        this.sub = vi.fn().mockReturnThis();
        this.multiplyScalar = vi.fn().mockReturnThis();
        this.normalize = vi.fn().mockReturnThis();
        this.length = vi.fn(() => 1);
        this.clone = vi.fn(() => new mockVector3(this.x, this.y, this.z));
    });

    const mockColor = vi.fn(function(color) {
        this.r = 1;
        this.g = 1;
        this.b = 1;
        this.setHex = vi.fn().mockReturnThis();
        this.set = vi.fn().mockReturnThis();
        this.clone = vi.fn(() => new mockColor());
        this.lerp = vi.fn().mockReturnThis();
    });

    const mockScene = vi.fn(function() {
        this.add = vi.fn();
        this.remove = vi.fn();
        this.children = [];
    });

    const mockPerspectiveCamera = vi.fn(function() {
        this.position = new mockVector3();
        this.lookAt = vi.fn();
        this.updateProjectionMatrix = vi.fn();
        this.aspect = 1;
    });

    const mockWebGLRenderer = vi.fn(function() {
        this.setSize = vi.fn();
        this.setPixelRatio = vi.fn();
        this.render = vi.fn();
        this.dispose = vi.fn();
        this.domElement = document.createElement('canvas');
    });

    const mockMesh = vi.fn(function() {
        this.position = new mockVector3();
        this.rotation = new mockVector3();
        this.scale = new mockVector3(1, 1, 1);
    });

    return {
        Clock: mockClock,
        Vector2: mockVector2,
        Vector3: mockVector3,
        Color: mockColor,
        Scene: mockScene,
        PerspectiveCamera: mockPerspectiveCamera,
        WebGLRenderer: mockWebGLRenderer,
        Mesh: mockMesh,
        BoxGeometry: vi.fn(),
        SphereGeometry: vi.fn(),
        PlaneGeometry: vi.fn(),
        MeshBasicMaterial: vi.fn(),
        MeshStandardMaterial: vi.fn(),
        ShaderMaterial: vi.fn(),
        AmbientLight: vi.fn(),
        PointLight: vi.fn(),
        Group: vi.fn(function() { this.add = vi.fn(); this.children = []; }),
        BufferGeometry: vi.fn(),
        BufferAttribute: vi.fn(),
        Float32BufferAttribute: vi.fn(),
        Points: vi.fn(function() { this.position = new mockVector3(); }),
        PointsMaterial: vi.fn(),
        LineBasicMaterial: vi.fn(),
        Line: vi.fn(),
        Object3D: vi.fn(function() { this.add = vi.fn(); }),
        Raycaster: vi.fn(function() { this.setFromCamera = vi.fn(); this.intersectObjects = vi.fn(() => []); }),
        TextureLoader: vi.fn(function() { this.load = vi.fn(); }),
        DoubleSide: 2,
        AdditiveBlending: 2,
        NormalBlending: 1,
    };
});

// Mock global browser APIs not present in JSDOM
if (typeof window !== 'undefined') {
    // Ensure requestAnimationFrame is a spy that does not auto-execute callbacks
    // Use vi.fn() which has mockClear, mockReset, etc.
    window.requestAnimationFrame = vi.fn((cb) => {
        // Schedule callback to be executed by fake timers
        return setTimeout(() => cb(performance.now()), 0);
    });

    window.cancelAnimationFrame = vi.fn((id) => {
        clearTimeout(id);
    });

    // Mock for matchMedia
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(), // deprecated
            removeListener: vi.fn(), // deprecated
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });

    // Mock for AudioContext
    Object.defineProperty(window, 'AudioContext', {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
            createGain: vi.fn(() => ({
                connect: vi.fn(),
                gain: { value: 0 },
            })),
            createOscillator: vi.fn(() => ({
                connect: vi.fn(),
                start: vi.fn(),
                stop: vi.fn(),
                frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
            })),
            createBufferSource: vi.fn(() => ({
                connect: vi.fn(),
                start: vi.fn(),
            })),
            createBuffer: vi.fn(),
            createBiquadFilter: vi.fn(() => ({
                connect: vi.fn(),
            })),
            resume: vi.fn(),
            destination: {},
        })),
    });
}