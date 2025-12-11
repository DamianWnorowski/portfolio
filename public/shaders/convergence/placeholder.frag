// public/shaders/convergence/placeholder.frag
varying vec3 vNormal;

void main() {
    float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
    gl_FragColor = vec4(0.5, 0.2, 1.0, 1.0) * intensity;
}
