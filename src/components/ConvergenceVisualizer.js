// src/components/ConvergenceVisualizer.js

import * as THREE from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { Engine } from '../core/Engine';

// Import all shaders
import codeCompressionVertexShader from '/public/shaders/convergence/code_compression.vert?raw';
import codeCompressionFragmentShader from '/public/shaders/convergence/code_compression.frag?raw';
import singularityEntityVertexShader from '/public/shaders/convergence/singularity_entity.vert?raw';
import singularityEntityFragmentShader from '/public/shaders/convergence/singularity_entity.frag?raw';
import topologyNodesVertexShader from '/public/shaders/convergence/topology_nodes.vert?raw';
import topologyLinesVertexShader from '/public/shaders/convergence/topology_lines.vert?raw';
import topologyFragmentShader from '/public/shaders/convergence/topology.frag?raw';

export class ConvergenceVisualizer {
    constructor() {
        this.engine = new Engine();
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.renderer = this.engine.renderer;
        
        this.composer = null;
        this.timeline = {};
        this.codeCompressionStream = {};
        this.omegaSingularity = {};
        this.topology = {};
        this.overlays = {};

        this.init();
    }

    init() {
        this.scene.fog = new THREE.FogExp2(0x000000, 0.005);
        this.engine.registerComponent(this);

        this.getOverlayElements();
        this.createPostProcessing();
        this.createTimeline();
        this.createCodeCompressionStream();
        this.createOmegaSingularity();
        this.createTopology();

        console.log("Convergence Visualizer Initialized with all visual metaphors.");
    }

    getOverlayElements() {
        this.overlays.checkpoints = [
            document.getElementById('checkpoint-1'),
            document.getElementById('checkpoint-2'),
            document.getElementById('checkpoint-3'),
            document.getElementById('checkpoint-4'),
        ];
        this.overlays.finalInsight = document.getElementById('final-insight');
    }

    createPostProcessing() {
        const renderPass = new RenderPass(this.scene, this.camera);
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        bloomPass.threshold = 0;
        bloomPass.strength = 1.8;
        bloomPass.radius = 0.6;

        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(renderPass);
        this.composer.addPass(bloomPass);
    }
    
    createTimeline() {
        this.timeline.curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, 50),
            new THREE.Vector3(0, 5, -50),
            new THREE.Vector3(20, -10, -150),
            new THREE.Vector3(-10, 10, -250),
            new THREE.Vector3(0, 0, -400)
        ]);
        this.timeline.curve.curveType = 'catmullrom';
	    this.timeline.curve.tension = 0.5;

        const tubeGeometry = new THREE.TubeGeometry(this.timeline.curve, 100, 0.1, 8, false);
        const tubeMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a9eff,
            emissive: 0x4a9eff,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.2
        });
        const tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
        this.scene.add(tubeMesh);
    }

    createCodeCompressionStream() {
        const particleCount = 50000;
        const particles = new Float32Array(particleCount * 3);

        for(let i = 0; i < particleCount; i++) {
            particles[i * 3 + 0] = (Math.random() - 0.5) * 30;
            particles[i * 3 + 1] = (Math.random() - 0.5) * 30;
            particles[i * 3 + 2] = (Math.random()) * -450;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(particles, 3));

        this.codeCompressionStream.material = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0.0 }, uProgress: { value: 0.0 } },
            vertexShader: codeCompressionVertexShader,
            fragmentShader: codeCompressionFragmentShader,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true
        });

        this.codeCompressionStream.points = new THREE.Points(geometry, this.codeCompressionStream.material);
        this.scene.add(this.codeCompressionStream.points);
    }

    createOmegaSingularity() {
        const geometry = new THREE.IcosahedronGeometry(1.5, 5);
        this.omegaSingularity.f_material = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0.0 }, uColor: { value: new THREE.Color(0x00ffff) }, uIntensity: { value: 1.0 } },
            vertexShader: singularityEntityVertexShader,
            fragmentShader: singularityEntityFragmentShader,
            blending: THREE.AdditiveBlending,
            transparent: true,
        });
        this.omegaSingularity.f_mesh = new THREE.Mesh(geometry, this.omegaSingularity.f_material);
        this.scene.add(this.omegaSingularity.f_mesh);

        this.omegaSingularity.omega_material = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0.0 }, uColor: { value: new THREE.Color(0xff00ff) }, uIntensity: { value: 1.0 } },
            vertexShader: singularityEntityVertexShader,
            fragmentShader: singularityEntityFragmentShader,
            blending: THREE.AdditiveBlending,
            transparent: true,
        });
        this.omegaSingularity.omega_mesh = new THREE.Mesh(geometry, this.omegaSingularity.omega_material);
        this.scene.add(this.omegaSingularity.omega_mesh);
    }

    createTopology() {
        const nodeCount = 150;
        const positions = new Float32Array(nodeCount * 3);
        const nodeSizes = new Float32Array(nodeCount);
        this.topology.originalPositions = new Float32Array(nodeCount * 3);
        
        const connections = [];
        const treeConnections = (nodeCount - 1);
        const graphConnections = Math.floor(nodeCount * 1.5);

        for(let i = 0; i < nodeCount; i++) {
            const x = (Math.random() - 0.5) * 50;
            const y = (Math.random() - 0.5) * 50;
            const z = (Math.random() - 0.5) * 400;
            positions[i*3] = x;
            positions[i*3+1] = y;
            positions[i*3+2] = z;
            this.topology.originalPositions[i*3] = x;
            this.topology.originalPositions[i*3+1] = y;
            this.topology.originalPositions[i*3+2] = z;
            nodeSizes[i] = Math.random() * 5 + 2;
        }

        for(let i = 1; i < nodeCount; i++) {
            connections.push(i, Math.floor(Math.random() * i));
        }

        for(let i = 0; i < nodeCount; i++) {
            connections.push(i, Math.floor(Math.random() * nodeCount));
        }

        const lineGeometry = new THREE.BufferGeometry();
        const linePositions = new Float32Array(graphConnections * 2 * 3);
        lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));

        this.topology.connections = connections;
        this.topology.lineGeometry = lineGeometry;

        const nodesGeometry = new THREE.BufferGeometry();
        nodesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        nodesGeometry.setAttribute('aNodeSize', new THREE.BufferAttribute(nodeSizes, 1));
        this.topology.nodesGeometry = nodesGeometry;

        this.topology.nodesMaterial = new THREE.ShaderMaterial({
            uniforms: { uProgress: { value: 0.0 }, uColor: { value: new THREE.Color(0xffa500) }, uOpacity: { value: 0.8 } },
            vertexShader: topologyNodesVertexShader,
            fragmentShader: topologyFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.topology.linesMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.1,
            blending: THREE.AdditiveBlending
        });

        const nodes = new THREE.Points(nodesGeometry, this.topology.nodesMaterial);
        const lines = new THREE.LineSegments(lineGeometry, this.topology.linesMaterial);
        lines.frustumCulled = false;
        
        this.topology.nodes = nodes;
        this.topology.lines = lines;

        this.scene.add(nodes);
        this.scene.add(lines);
    }

    updateOverlays(progress) {
        const checkpointRanges = [
            { el: this.overlays.checkpoints[0], start: 0.20, end: 0.30 },
            { el: this.overlays.checkpoints[1], start: 0.45, end: 0.55 },
            { el: this.overlays.checkpoints[2], start: 0.65, end: 0.75 },
            { el: this.overlays.checkpoints[3], start: 0.85, end: 0.95 },
        ];

        checkpointRanges.forEach(cp => {
            if (progress > cp.start && progress < cp.end) {
                cp.el?.classList.add('visible');
            } else {
                cp.el?.classList.remove('visible');
            }
        });
        
        if (progress > 0.98) {
            this.overlays.finalInsight?.classList.add('visible');
        } else {
            this.overlays.finalInsight?.classList.remove('visible');
        }
    }

    update(time) {
        const loopDuration = 60; // Lengthened for better viewing of checkpoints
        const progress = (time / loopDuration) % 1;
        const easeProgress = 1 - Math.pow(1 - progress, 3);

        this.updateOverlays(progress);

        if (this.timeline.curve) {
            const camPos = this.timeline.curve.getPointAt(easeProgress);
            const camLookAt = this.timeline.curve.getPointAt((easeProgress + 0.01) % 1);
            this.camera.position.copy(camPos);
            this.camera.lookAt(camLookAt);
        }

        if (this.codeCompressionStream.material) {
            this.codeCompressionStream.material.uniforms.uTime.value = time;
            this.codeCompressionStream.material.uniforms.uProgress.value = easeProgress;
        }

        if (this.omegaSingularity.f_mesh) {
            const centerPoint = this.timeline.curve.getPointAt(easeProgress);
            const orbitRadius = 10 * (1 - easeProgress);
            const angle = time * 0.8;
            this.omegaSingularity.f_mesh.position.copy(centerPoint).add(new THREE.Vector3(Math.sin(angle) * orbitRadius, Math.cos(angle) * orbitRadius, 0));
            this.omegaSingularity.omega_mesh.position.copy(centerPoint).add(new THREE.Vector3(Math.sin(angle + Math.PI) * orbitRadius, Math.cos(angle + Math.PI) * orbitRadius, 0));
            
            this.omegaSingularity.f_material.uniforms.uTime.value = time;
            this.omegaSingularity.omega_material.uniforms.uTime.value = time;
            
            let intensity = 1.0;
            if (progress > 0.95) intensity = 1.0 + (progress - 0.95) * 180;
            this.omegaSingularity.f_material.uniforms.uIntensity.value = intensity;
            this.omegaSingularity.omega_material.uniforms.uIntensity.value = intensity;
        }

        if(this.topology.nodes) {
            const positions = this.topology.nodesGeometry.attributes.position.array;
            const op = this.topology.originalPositions;
            const numNodes = positions.length / 3;

            const hypergraphProgress = Math.max(0, (progress - 0.7) / 0.3);
            if (hypergraphProgress > 0) {
                 for(let i=0; i < numNodes; i++) {
                    const clusterPointIndex = i % 4;
                    const targetPoint = this.timeline.curve.getPointAt(0.9 + clusterPointIndex * 0.02);
                    positions[i*3] = op[i*3] * (1-hypergraphProgress) + targetPoint.x * hypergraphProgress;
                    positions[i*3+1] = op[i*3+1] * (1-hypergraphProgress) + targetPoint.y * hypergraphProgress;
                    positions[i*3+2] = op[i*3+2] * (1-hypergraphProgress) + targetPoint.z * hypergraphProgress;
                 }
                this.topology.linesMaterial.opacity = 0.1 + hypergraphProgress * 0.4;
            } else {
                 this.topology.linesMaterial.opacity = 0.1;
            }

            const linePositions = this.topology.lines.geometry.attributes.position.array;
            const treeConns = (numNodes - 1);
            const graphPhaseProgress = Math.max(0, (progress - 0.3) / 0.4);
            const connsToShow = treeConns + Math.floor(graphPhaseProgress * (this.topology.connections.length / 2 - treeConns));
            
            for(let i=0; i<connsToShow; i++) {
                const p1_idx = this.topology.connections[i*2];
                const p2_idx = this.topology.connections[i*2+1];
                linePositions[i*6] = positions[p1_idx * 3];
                linePositions[i*6+1] = positions[p1_idx * 3 + 1];
                linePositions[i*6+2] = positions[p1_idx * 3 + 2];
                linePositions[i*6+3] = positions[p2_idx * 3];
                linePositions[i*6+4] = positions[p2_idx * 3 + 1];
                linePositions[i*6+5] = positions[p2_idx * 3 + 2];
            }

            this.topology.lines.geometry.setDrawRange(0, connsToShow * 2);
            this.topology.nodesGeometry.attributes.position.needsUpdate = true;
            this.topology.lines.geometry.attributes.position.needsUpdate = true;
        }

        if (this.composer) {
            this.composer.render();
        }
    }

    onResize(width, height) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.composer.setSize(width, height);
    }
}
