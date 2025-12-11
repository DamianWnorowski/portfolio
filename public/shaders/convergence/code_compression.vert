// public/shaders/convergence/code_compression.vert
uniform float uTime;
uniform float uProgress;

// Easing function for smooth transitions
float easeOutQuint(float x) {
    return 1.0 - pow(1.0 - x, 5.0);
}

void main() {
    vec3 p = position;

    // 1. Make the stream narrower over time (uProgress from 0 to 1)
    float widthFactor = 1.0 - uProgress * 0.9; // Narrows to 10% of original width
    p.xy *= widthFactor;

    // 2. Add turbulence that decreases over time
    float turbulence = (1.0 - easeOutQuint(uProgress)) * 2.0;
    p.x += sin(p.z * 0.5 + uTime * 0.5) * turbulence;
    p.y += cos(p.z * 0.4 + uTime * 0.5) * turbulence;
    
    // 3. Make particles move faster along the z-axis
    p.z += uTime * 2.0;
    p.z = mod(p.z, 200.0); // Loop the particles for an infinite stream

    vec4 modelViewPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;

    // 4. Make particles smaller over time and closer to camera
    float size = 10.0 * (1.0 - uProgress * 0.8);
    gl_PointSize = size * (1.0 / -modelViewPosition.z);
}
