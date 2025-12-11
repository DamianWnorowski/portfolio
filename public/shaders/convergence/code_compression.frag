// public/shaders/convergence/code_compression.frag
uniform float uProgress;
varying vec3 vNormal;

// Easing function
float easeInQuint(float x) {
    return x * x * x * x * x;
}

void main() {
    // 1. Color shifts from chaotic (multi-color) to focused (single color)
    float progress = easeInQuint(uProgress);

    // Initial chaotic color based on position
    vec3 chaoticColor = vec3(0.5 + 0.5 * sin(vNormal.x * 2.0), 0.5 + 0.5 * cos(vNormal.y * 2.0), 0.8);
    
    // Focused final color
    vec3 focusedColor = vec3(0.8, 0.4, 1.0); // Intense purple

    // Interpolate between the two colors
    vec3 finalColor = mix(chaoticColor, focusedColor, progress);
    
    // 2. Fade particles based on distance from center
    float dist = length(gl_PointCoord - vec2(0.5));
    float alpha = 1.0 - smoothstep(0.4, 0.5, dist);

    // 3. Increase alpha intensity over time
    alpha *= (0.4 + progress * 0.6);

    gl_FragColor = vec4(finalColor, alpha);
}
