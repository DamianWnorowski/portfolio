// Connection Lines - Fragment Shader
precision highp float;

uniform float uTime;
uniform vec3 uColor;

varying float vLineProgress;
varying float vAlpha;

void main() {
    // Animated pulse along the line
    float pulse = sin(vLineProgress * 20.0 - uTime * 5.0) * 0.5 + 0.5;

    // Data packet effect
    float packet = smoothstep(0.48, 0.5, fract(vLineProgress - uTime * 0.3));
    packet *= smoothstep(0.52, 0.5, fract(vLineProgress - uTime * 0.3));
    packet *= 2.0;

    // Combine
    vec3 color = uColor * (0.5 + pulse * 0.3 + packet);

    // Glow effect
    color += uColor * packet * 0.5;

    gl_FragColor = vec4(color, vAlpha * (0.6 + pulse * 0.4));
}
