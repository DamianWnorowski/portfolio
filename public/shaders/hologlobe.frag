// Holographic Globe - Fragment Shader
// Creates a Defense-Tech style holographic earth with scan lines and data overlays
precision highp float;

uniform float uTime;
uniform float uHover;
uniform vec3 uCameraPosition;
uniform sampler2D uEarthTexture;
uniform float uScanLine;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;
varying float vElevation;

#define PI 3.14159265359

// Color palette (Defense-Tech)
const vec3 GOLD = vec3(0.788, 0.639, 0.149);
const vec3 STEEL_BLUE = vec3(0.290, 0.620, 1.0);
const vec3 DARK_BLUE = vec3(0.039, 0.078, 0.157);
const vec3 GRID_COLOR = vec3(0.2, 0.4, 0.6);

// Fresnel effect for edge glow
float fresnel(vec3 viewDir, vec3 normal, float power) {
    return pow(1.0 - max(dot(viewDir, normal), 0.0), power);
}

// Hexagonal grid pattern
float hexGrid(vec2 uv, float scale) {
    uv *= scale;

    vec2 r = vec2(1.0, 1.73205);
    vec2 h = r * 0.5;

    vec2 a = mod(uv, r) - h;
    vec2 b = mod(uv - h, r) - h;

    vec2 gv = length(a) < length(b) ? a : b;

    float d = length(gv);
    float hex = smoothstep(0.4, 0.38, d);

    return hex;
}

// Latitude/longitude grid
float latLongGrid(vec2 uv, float latCount, float longCount) {
    float lat = abs(sin(uv.y * PI * latCount));
    float lon = abs(sin(uv.x * PI * longCount));

    float latLine = smoothstep(0.98, 1.0, lat);
    float lonLine = smoothstep(0.98, 1.0, lon);

    return max(latLine, lonLine);
}

// Scan line effect
float scanLine(vec2 uv, float time, float speed, float count) {
    float scan = fract(uv.y * count - time * speed);
    return smoothstep(0.0, 0.02, scan) * smoothstep(0.1, 0.02, scan);
}

// Data stream effect (vertical lines of "data")
float dataStream(vec2 uv, float time) {
    float stream = 0.0;

    for (int i = 0; i < 8; i++) {
        float fi = float(i);
        float x = fract(fi * 0.127 + 0.1);
        float speed = 0.5 + fi * 0.1;
        float y = fract(time * speed + fi * 0.3);

        vec2 pos = vec2(x, y);
        float d = length(uv - pos);

        stream += smoothstep(0.05, 0.0, d) * 0.5;
    }

    return stream;
}

void main() {
    // View direction for fresnel
    vec3 viewDir = normalize(uCameraPosition - vPosition);

    // Base fresnel glow
    float fres = fresnel(viewDir, vNormal, 2.5);

    // Hexagonal grid overlay
    float hex = hexGrid(vUv, 30.0) * 0.15;

    // Lat/long grid
    float grid = latLongGrid(vUv, 18.0, 36.0) * 0.3;

    // Moving scan line (horizontal sweep)
    float scan = scanLine(vUv, uTime, 0.3, 1.0) * 0.4;

    // Vertical scan line
    float vScan = scanLine(vec2(vUv.y, vUv.x), uTime * 0.7, 0.2, 1.0) * 0.2;

    // Data streams
    float data = dataStream(vUv, uTime * 0.5) * 0.3;

    // Combine base color
    vec3 baseColor = DARK_BLUE;

    // Add grid patterns
    baseColor += GRID_COLOR * hex;
    baseColor += STEEL_BLUE * grid;

    // Add scan effects
    baseColor += GOLD * scan;
    baseColor += STEEL_BLUE * vScan;
    baseColor += GOLD * data;

    // Edge glow (fresnel)
    vec3 edgeGlow = mix(STEEL_BLUE, GOLD, fres) * fres * 1.5;
    baseColor += edgeGlow;

    // Hover effect - intensify colors
    baseColor += GOLD * uHover * 0.3;
    baseColor += edgeGlow * uHover * 0.5;

    // Terrain elevation coloring
    baseColor += GOLD * vElevation * 5.0;

    // Holographic flicker
    float flicker = sin(uTime * 30.0) * 0.02 + 1.0;
    baseColor *= flicker;

    // Scanline overlay (CRT effect)
    float crtLine = sin(vUv.y * 800.0) * 0.03 + 1.0;
    baseColor *= crtLine;

    // Alpha based on fresnel for transparency at edges
    float alpha = 0.7 + fres * 0.3;

    gl_FragColor = vec4(baseColor, alpha);
}
