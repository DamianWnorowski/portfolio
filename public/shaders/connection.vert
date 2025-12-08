// Connection Lines - Vertex Shader
// For animated data connections between deployment nodes
precision highp float;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
uniform float uProgress;

attribute vec3 position;
attribute float aLineProgress;

varying float vLineProgress;
varying float vAlpha;

void main() {
    vLineProgress = aLineProgress;

    // Animate visibility along the line
    float visible = step(aLineProgress, uProgress);
    vAlpha = visible * (1.0 - aLineProgress * 0.5);

    // Add subtle wave motion
    vec3 pos = position;
    pos.y += sin(aLineProgress * 6.28 + uTime * 2.0) * 0.02 * (1.0 - aLineProgress);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
