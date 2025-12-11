// public/shaders/convergence/topology.frag
uniform vec3 uColor;
uniform float uOpacity;

void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    float alpha = 1.0 - smoothstep(0.45, 0.5, dist);
    gl_FragColor = vec4(uColor, alpha * uOpacity);
}
