/**
 * Neural Network Background
 * Full-screen WebGL shader background with interactive neural network
 */

import * as THREE from 'three';

// Inline shaders for Vite compatibility
const vertexShader = `
precision highp float;

varying vec2 vUv;
varying vec3 vPosition;

void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uMouseInfluence;

varying vec2 vUv;

#define PI 3.14159265359
#define NEURON_COUNT 15
#define CONNECTION_INTENSITY 0.4

const vec3 GOLD = vec3(0.788, 0.639, 0.149);
const vec3 STEEL_BLUE = vec3(0.290, 0.620, 1.0);
const vec3 BG_DARK = vec3(0.039, 0.047, 0.063);
const vec3 BG_MID = vec3(0.059, 0.078, 0.118);

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

vec2 getNeuronPos(int index, float time) {
    float fi = float(index);
    float angle = fi * 2.399963;
    float radius = 0.3 + 0.2 * sin(fi * 0.7 + time * 0.1);
    vec2 base = vec2(
        cos(angle + time * 0.05 * (1.0 + fi * 0.1)),
        sin(angle + time * 0.03 * (1.0 + fi * 0.05))
    ) * radius;
    base.x += sin(time * 0.2 + fi) * 0.05;
    base.y += cos(time * 0.15 + fi * 1.3) * 0.05;
    return base;
}

float neuronGlow(vec2 uv, vec2 center, float time, float index) {
    float dist = length(uv - center);
    float pulse = sin(time * 2.0 + index * 0.5) * 0.3 + 0.7;
    float size = 0.02 * pulse;
    float glow = smoothstep(size, 0.0, dist);
    float halo = smoothstep(size * 4.0, size, dist) * 0.3;
    return glow + halo;
}

float connectionLine(vec2 uv, vec2 a, vec2 b, float time) {
    vec2 pa = uv - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    float dist = length(pa - ba * h);
    float pulse = sin(h * 10.0 - time * 3.0) * 0.5 + 0.5;
    float line = smoothstep(0.003, 0.0, dist) * pulse * 0.5;
    float packet = smoothstep(0.02, 0.0, abs(h - fract(time * 0.5))) * 0.8;
    packet *= smoothstep(0.01, 0.0, dist);
    return line + packet;
}

void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    uv.x *= uResolution.x / uResolution.y;

    vec2 mouse = uMouse * 2.0 - 1.0;
    mouse.x *= uResolution.x / uResolution.y;

    float bgNoise = fbm(uv * 3.0 + uTime * 0.05) * 0.1;
    vec3 color = mix(BG_DARK, BG_MID, length(uv) * 0.5 + bgNoise);

    float grid = 0.0;
    vec2 gridUv = fract(uv * 20.0);
    grid += smoothstep(0.02, 0.0, abs(gridUv.x - 0.5)) * 0.03;
    grid += smoothstep(0.02, 0.0, abs(gridUv.y - 0.5)) * 0.03;
    color += STEEL_BLUE * grid * 0.3;

    float connections = 0.0;
    for (int i = 0; i < NEURON_COUNT; i++) {
        vec2 posA = getNeuronPos(i, uTime);
        for (int j = i + 1; j < NEURON_COUNT; j++) {
            vec2 posB = getNeuronPos(j, uTime);
            float dist = length(posA - posB);
            if (dist < 0.5) {
                float strength = 1.0 - dist / 0.5;
                connections += connectionLine(uv, posA, posB, uTime) * strength * CONNECTION_INTENSITY;
            }
        }
    }
    color += STEEL_BLUE * connections;

    float neurons = 0.0;
    for (int i = 0; i < NEURON_COUNT; i++) {
        vec2 pos = getNeuronPos(i, uTime);
        neurons += neuronGlow(uv, pos, uTime, float(i));
    }
    color += GOLD * neurons;

    float mouseProximity = 1.0 - smoothstep(0.0, 0.4, length(uv - mouse));
    color += GOLD * mouseProximity * uMouseInfluence * 0.2;

    if (uMouseInfluence > 0.1) {
        for (int i = 0; i < 5; i++) {
            float fi = float(i);
            vec2 offset = vec2(cos(fi * 1.256 + uTime), sin(fi * 1.256 + uTime)) * 0.1;
            float glow = neuronGlow(uv, mouse + offset, uTime * 2.0, fi + 20.0);
            color += STEEL_BLUE * glow * uMouseInfluence * 0.5;
        }
    }

    float vignette = 1.0 - length(vUv - 0.5) * 0.8;
    color *= vignette;

    float scanline = sin(vUv.y * uResolution.y * 0.5) * 0.02 + 1.0;
    color *= scanline;

    gl_FragColor = vec4(color, 1.0);
}
`;

export class NeuralBackground {
    constructor(canvasId = 'neural-bg') {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error('Neural background canvas not found');
            return;
        }

        this.init();
    }

    init() {
        // Setup renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: false,
            antialias: false,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Setup scene
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        // Create fullscreen quad
        this.geometry = new THREE.PlaneGeometry(2, 2);

        // Setup uniforms
        this.uniforms = {
            uTime: { value: 0 },
            uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            uMouse: { value: new THREE.Vector2(0.5, 0.5) },
            uMouseInfluence: { value: 0 }
        };

        // Create material
        this.material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader,
            fragmentShader,
            depthTest: false,
            depthWrite: false
        });

        // Create mesh
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.mesh);
    }

    update(elapsed, delta, mouse, mouseInfluence) {
        if (!this.renderer) return;

        this.uniforms.uTime.value = elapsed;
        this.uniforms.uMouse.value.copy(mouse);
        this.uniforms.uMouseInfluence.value = mouseInfluence;

        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        if (!this.renderer) return;

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    }

    destroy() {
        if (this.geometry) this.geometry.dispose();
        if (this.material) this.material.dispose();
        if (this.renderer) this.renderer.dispose();
    }
}
