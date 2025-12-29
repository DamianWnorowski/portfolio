/**
 * Holographic Globe
 * Interactive 3D Earth with deployment nodes and data connections
 */

import {
    WebGLRenderer, Scene, PerspectiveCamera, AmbientLight, PointLight,
    SphereGeometry, ShaderMaterial, Mesh, MeshBasicMaterial, RingGeometry,
    BufferGeometry, BufferAttribute, PointsMaterial, Points, TubeGeometry,
    Group, Raycaster, Vector2, Vector3, Color, FogExp2, QuadraticBezierCurve3,
    FrontSide, BackSide, DoubleSide, AdditiveBlending
} from 'three';
import { eventBus, Events } from '../core/EventBus.js';

// Deployment node locations (lat, lng to 3D conversion)
const DEPLOYMENT_NODES = [
    { id: 'us-east', name: 'US East (Virginia)', lat: 37.4316, lng: -78.6569, status: 'live', ping: 12 },
    { id: 'us-west', name: 'US West (Oregon)', lat: 45.5231, lng: -122.6765, status: 'live', ping: 45 },
    { id: 'eu-west', name: 'EU West (Ireland)', lat: 53.3498, lng: -6.2603, status: 'live', ping: 89 },
    { id: 'eu-central', name: 'EU Central (Frankfurt)', lat: 50.1109, lng: 8.6821, status: 'live', ping: 95 },
    { id: 'ap-tokyo', name: 'Asia Pacific (Tokyo)', lat: 35.6762, lng: 139.6503, status: 'live', ping: 145 },
    { id: 'ap-sydney', name: 'Asia Pacific (Sydney)', lat: -33.8688, lng: 151.2093, status: 'beta', ping: 180 }
];

// Colors
const GOLD = new Color(0xc9a227);
const STEEL_BLUE = new Color(0x4a9eff);
const SUCCESS_GREEN = new Color(0x22c55e);
const DARK_BLUE = new Color(0x0a1428);

export class HolographicGlobe {
    constructor(containerId = 'globe-container') {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            return;
        }

        this.nodes = [];
        this.connections = [];
        this.hoveredNode = null;
        this.targetRotation = { x: 0, y: 0 };
        this.currentRotation = { x: 0, y: 0 };
        this.autoRotate = true;
        this.raycaster = new Raycaster();
        this.pointer = new Vector2();
        this.raycasterFrame = 0; // Throttle raycaster

        this.init();
        this.createGlobe();
        this.createNodes();
        this.createConnections();
        this.setupInteraction();
    }

    init() {
        const rect = this.container.getBoundingClientRect();

        // Renderer
        this.renderer = new WebGLRenderer({
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(rect.width, rect.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        // Scene
        this.scene = new Scene();
        this.scene.fog = new FogExp2(0x0a0c10, 0.002);

        // Camera
        this.camera = new PerspectiveCamera(45, rect.width / rect.height, 0.1, 1000);
        this.camera.position.z = 200;
        this.camera.position.y = 30;

        // Ambient light
        const ambient = new AmbientLight(0x404040, 0.5);
        this.scene.add(ambient);

        // Point light
        const pointLight = new PointLight(0xc9a227, 1, 400);
        pointLight.position.set(100, 100, 100);
        this.scene.add(pointLight);
    }

    createGlobe() {
        // Main globe geometry
        const geometry = new SphereGeometry(60, 64, 64);

        // Holographic material
        const material = new ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uHover: { value: 0 }
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec2 vUv;
                varying vec3 vPosition;

                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vUv = uv;
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform float uHover;

                varying vec3 vNormal;
                varying vec2 vUv;
                varying vec3 vPosition;

                #define PI 3.14159265359

                const vec3 GOLD = vec3(0.788, 0.639, 0.149);
                const vec3 STEEL_BLUE = vec3(0.290, 0.620, 1.0);
                const vec3 DARK_BLUE = vec3(0.039, 0.078, 0.157);

                float fresnel(vec3 viewDir, vec3 normal, float power) {
                    return pow(1.0 - max(dot(viewDir, normal), 0.0), power);
                }

                float hexGrid(vec2 uv, float scale) {
                    uv *= scale;
                    vec2 r = vec2(1.0, 1.73205);
                    vec2 h = r * 0.5;
                    vec2 a = mod(uv, r) - h;
                    vec2 b = mod(uv - h, r) - h;
                    vec2 gv = length(a) < length(b) ? a : b;
                    return smoothstep(0.4, 0.38, length(gv));
                }

                float latLongGrid(vec2 uv, float latCount, float longCount) {
                    float lat = abs(sin(uv.y * PI * latCount));
                    float lon = abs(sin(uv.x * PI * longCount));
                    return max(smoothstep(0.97, 1.0, lat), smoothstep(0.97, 1.0, lon));
                }

                void main() {
                    vec3 viewDir = normalize(cameraPosition - vPosition);
                    float fres = fresnel(viewDir, vNormal, 2.5);

                    float hex = hexGrid(vUv, 30.0) * 0.15;
                    float grid = latLongGrid(vUv, 18.0, 36.0) * 0.3;

                    // Scan line
                    float scan = fract(vUv.y - uTime * 0.1);
                    scan = smoothstep(0.0, 0.02, scan) * smoothstep(0.1, 0.02, scan) * 0.4;

                    vec3 color = DARK_BLUE;
                    color += STEEL_BLUE * hex;
                    color += STEEL_BLUE * grid * 0.5;
                    color += GOLD * scan;

                    // Edge glow
                    vec3 edgeGlow = mix(STEEL_BLUE, GOLD, fres) * fres * 1.5;
                    color += edgeGlow;

                    // Hover effect
                    color += GOLD * uHover * 0.3;

                    // Holographic flicker
                    float flicker = sin(uTime * 30.0) * 0.02 + 1.0;
                    color *= flicker;

                    float alpha = 0.6 + fres * 0.4;
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            side: FrontSide,
            depthWrite: false
        });

        this.globe = new Mesh(geometry, material);
        this.scene.add(this.globe);

        // Wireframe overlay
        const wireGeo = new SphereGeometry(60.5, 32, 32);
        const wireMat = new MeshBasicMaterial({
            color: STEEL_BLUE,
            wireframe: true,
            transparent: true,
            opacity: 0.1
        });
        this.wireframe = new Mesh(wireGeo, wireMat);
        this.scene.add(this.wireframe);

        // Atmosphere glow
        const glowGeo = new SphereGeometry(65, 32, 32);
        const glowMat = new ShaderMaterial({
            uniforms: {
                uColor: { value: STEEL_BLUE }
            },
            vertexShader: `
                varying vec3 vNormal;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 uColor;
                varying vec3 vNormal;
                void main() {
                    float intensity = pow(0.7 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
                    gl_FragColor = vec4(uColor, intensity * 0.3);
                }
            `,
            transparent: true,
            side: BackSide,
            blending: AdditiveBlending
        });
        this.atmosphere = new Mesh(glowGeo, glowMat);
        this.scene.add(this.atmosphere);

        // Particles
        const particlesGeo = new BufferGeometry();
        const particleCount = 300;
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            const radius = 70 + Math.random() * 30;

            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);
        }

        particlesGeo.setAttribute('position', new BufferAttribute(positions, 3));

        const particlesMat = new PointsMaterial({
            color: GOLD,
            size: 1.5,
            transparent: true,
            opacity: 0.6,
            blending: AdditiveBlending
        });

        this.particles = new Points(particlesGeo, particlesMat);
        this.scene.add(this.particles);
    }

    createNodes() {
        const nodeGroup = new Group();

        DEPLOYMENT_NODES.forEach(node => {
            const pos = this.latLngToVector3(node.lat, node.lng, 61);

            // Node sphere
            const geo = new SphereGeometry(2, 16, 16);
            const mat = new MeshBasicMaterial({
                color: node.status === 'live' ? SUCCESS_GREEN : GOLD,
                transparent: true,
                opacity: 0.9
            });
            const mesh = new Mesh(geo, mat);
            mesh.position.copy(pos);
            mesh.userData = node;

            // Pulse ring
            const ringGeo = new RingGeometry(2.5, 3, 32);
            const ringMat = new MeshBasicMaterial({
                color: node.status === 'live' ? SUCCESS_GREEN : GOLD,
                transparent: true,
                opacity: 0.5,
                side: DoubleSide
            });
            const ring = new Mesh(ringGeo, ringMat);
            ring.position.copy(pos);
            ring.lookAt(new Vector3(0, 0, 0));

            // Store references
            this.nodes.push({
                mesh,
                ring,
                data: node,
                baseScale: 1
            });

            nodeGroup.add(mesh);
            nodeGroup.add(ring);
        });

        this.nodeGroup = nodeGroup;
        this.scene.add(nodeGroup);
    }

    createConnections() {
        // Create arced connections between nodes
        const connectionPairs = [
            [0, 1], // US East to US West
            [0, 2], // US East to EU West
            [2, 3], // EU West to EU Central
            [3, 4], // EU Central to Tokyo
            [4, 5], // Tokyo to Sydney
            [1, 4]  // US West to Tokyo
        ];

        connectionPairs.forEach(([from, to]) => {
            const fromNode = this.nodes[from];
            const toNode = this.nodes[to];

            const curve = this.createArcCurve(
                fromNode.mesh.position,
                toNode.mesh.position
            );

            const geometry = new TubeGeometry(curve, 64, 0.3, 8, false);
            const material = new ShaderMaterial({
                uniforms: {
                    uTime: { value: 0 },
                    uColor: { value: STEEL_BLUE }
                },
                vertexShader: `
                    varying float vProgress;
                    void main() {
                        vProgress = uv.x;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform float uTime;
                    uniform vec3 uColor;
                    varying float vProgress;

                    void main() {
                        float pulse = sin(vProgress * 20.0 - uTime * 5.0) * 0.5 + 0.5;
                        float packet = smoothstep(0.48, 0.5, fract(vProgress - uTime * 0.3));
                        packet *= smoothstep(0.52, 0.5, fract(vProgress - uTime * 0.3));

                        vec3 color = uColor * (0.3 + pulse * 0.3 + packet * 2.0);
                        float alpha = 0.4 + pulse * 0.3 + packet;

                        gl_FragColor = vec4(color, alpha);
                    }
                `,
                transparent: true,
                blending: AdditiveBlending
            });

            const mesh = new Mesh(geometry, material);
            this.connections.push({ mesh, material });
            this.scene.add(mesh);
        });
    }

    createArcCurve(start, end) {
        const midPoint = new Vector3()
            .addVectors(start, end)
            .multiplyScalar(0.5);

        // Lift the midpoint above the surface
        const distance = start.distanceTo(end);
        midPoint.normalize().multiplyScalar(60 + distance * 0.3);

        return new QuadraticBezierCurve3(start, midPoint, end);
    }

    latLngToVector3(lat, lng, radius) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lng + 180) * (Math.PI / 180);

        return new Vector3(
            -radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.cos(phi),
            radius * Math.sin(phi) * Math.sin(theta)
        );
    }

    setupInteraction() {
        this.container.addEventListener('mousemove', (e) => {
            const rect = this.container.getBoundingClientRect();
            this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            // Orbit control
            if (!this.autoRotate) {
                this.targetRotation.y = this.pointer.x * 0.5;
                this.targetRotation.x = this.pointer.y * 0.3;
            }
        });

        this.container.addEventListener('mouseenter', () => {
            this.autoRotate = false;
        });

        this.container.addEventListener('mouseleave', () => {
            this.autoRotate = true;
            this.targetRotation.x = 0;
            this.targetRotation.y = 0;
        });

        this.container.addEventListener('click', () => {
            if (this.hoveredNode) {
                eventBus.emit(Events.NODE_CLICK, this.hoveredNode.data);
            }
        });
    }

    checkNodeHover() {
        this.raycaster.setFromCamera(this.pointer, this.camera);

        const nodeMeshes = this.nodes.map(n => n.mesh);
        const intersects = this.raycaster.intersectObjects(nodeMeshes);

        if (intersects.length > 0) {
            const node = this.nodes.find(n => n.mesh === intersects[0].object);
            if (node !== this.hoveredNode) {
                this.hoveredNode = node;
                eventBus.emit(Events.NODE_HOVER, node.data);
                document.body.style.cursor = 'pointer';
            }
        } else {
            if (this.hoveredNode) {
                this.hoveredNode = null;
                eventBus.emit(Events.NODE_HOVER, null);
                document.body.style.cursor = 'default';
            }
        }
    }

    update(elapsed, delta) {
        if (!this.renderer) return;

        // Auto rotation
        if (this.autoRotate) {
            this.targetRotation.y = elapsed * 0.1;
        }

        // Smooth rotation
        this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.05;
        this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.05;

        // Apply rotation
        this.globe.rotation.x = this.currentRotation.x;
        this.globe.rotation.y = this.currentRotation.y;
        this.wireframe.rotation.copy(this.globe.rotation);
        this.nodeGroup.rotation.copy(this.globe.rotation);

        // Update globe shader
        this.globe.material.uniforms.uTime.value = elapsed;
        this.globe.material.uniforms.uHover.value = this.hoveredNode ? 1 : 0;

        // Rotate particles
        this.particles.rotation.y = elapsed * 0.05;
        this.particles.rotation.x = Math.sin(elapsed * 0.1) * 0.1;

        // Animate node rings
        this.nodes.forEach((node, i) => {
            const scale = 1 + Math.sin(elapsed * 2 + i) * 0.2;
            node.ring.scale.setScalar(scale);
            node.ring.material.opacity = 0.3 + Math.sin(elapsed * 3 + i) * 0.2;

            // Highlight hovered node
            if (node === this.hoveredNode) {
                node.mesh.scale.setScalar(1.5);
            } else {
                node.mesh.scale.setScalar(1);
            }
        });

        // Update connections
        this.connections.forEach(conn => {
            conn.material.uniforms.uTime.value = elapsed;
        });

        // Check hover (throttled to every 3 frames)
        this.raycasterFrame++;
        if (this.raycasterFrame % 3 === 0) {
            this.checkNodeHover();
        }

        // Render
        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        if (!this.renderer) return;

        const rect = this.container.getBoundingClientRect();
        this.renderer.setSize(rect.width, rect.height);
        this.camera.aspect = rect.width / rect.height;
        this.camera.updateProjectionMatrix();
    }

    destroy() {
        if (this.renderer) {
            this.renderer.dispose();
            this.container.removeChild(this.renderer.domElement);
        }
    }
}
