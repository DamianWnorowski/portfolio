// public/shaders/convergence/topology.vert
uniform float uProgress;
attribute float aNodeSize;

void main() {
    vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;
    
    // Nodes get smaller as the graph becomes more complex (more nodes appear)
    gl_PointSize = aNodeSize * (1.0 - uProgress * 0.5) * ( 20.0 / -modelViewPosition.z );
}
