/**
 * Contribution Terrain
 * 3D visualization of GitHub contribution data as terrain elevation
 */

import * as THREE from 'three';
import { dataService } from '../services/DataService.js';

export class ContributionTerrain {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.contributions = null;
        this.mesh = null;
        this.isVisible = false;

        this.init();
    }

    async init() {
        // Fetch contribution data
        this.contributions = await dataService.fetchContributions();

        const rect = this.container.getBoundingClientRect();
        if (rect.width === 0) return;

        this.setup(rect);
        this.createTerrain();
    }

    setup(rect) {
        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(rect.width, rect.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        // Scene
        this.scene = new THREE.Scene();

        // Camera
        this.camera = new THREE.PerspectiveCamera(60, rect.width / rect.height, 0.1, 500);
        this.camera.position.set(0, 50, 80);
        this.camera.lookAt(0, 0, 0);

        // Lights
        const ambient = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambient);

        const directional = new THREE.DirectionalLight(0xffffff, 0.8);
        directional.position.set(50, 50, 50);
        this.scene.add(directional);

        this.isVisible = true;
    }

    createTerrain() {
        if (!this.contributions || !this.contributions.weeks) {
            this.createFallbackTerrain();
            return;
        }

        const weeks = this.contributions.weeks;
        const cols = weeks.length; // ~52
        const rows = 7; // Days per week

        // Create plane geometry
        const geometry = new THREE.PlaneGeometry(100, 20, cols - 1, rows - 1);
        const positions = geometry.attributes.position.array;
        const colors = new Float32Array(positions.length);

        // Color palette
        const colorLow = new THREE.Color(0x0a1428);    // Dark blue
        const colorMid = new THREE.Color(0x4a9eff);   // Steel blue
        const colorHigh = new THREE.Color(0xc9a227);  // Gold

        let maxContrib = 0;
        weeks.forEach(week => {
            week.contributionDays.forEach(day => {
                maxContrib = Math.max(maxContrib, day.contributionCount);
            });
        });

        // Modify vertex heights based on contributions
        for (let w = 0; w < cols && w < weeks.length; w++) {
            const week = weeks[w];
            for (let d = 0; d < rows && d < week.contributionDays.length; d++) {
                const count = week.contributionDays[d].contributionCount;
                const normalizedHeight = maxContrib > 0 ? count / maxContrib : 0;

                // Vertex index
                const idx = (d * cols + w) * 3;

                // Set Z (height)
                positions[idx + 2] = normalizedHeight * 15;

                // Set color based on height
                const color = new THREE.Color();
                if (normalizedHeight < 0.3) {
                    color.lerpColors(colorLow, colorMid, normalizedHeight / 0.3);
                } else {
                    color.lerpColors(colorMid, colorHigh, (normalizedHeight - 0.3) / 0.7);
                }

                colors[idx] = color.r;
                colors[idx + 1] = color.g;
                colors[idx + 2] = color.b;
            }
        }

        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.computeVertexNormals();

        // Material
        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
            flatShading: true,
            metalness: 0.3,
            roughness: 0.7
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.rotation.x = -Math.PI / 2.5;
        this.scene.add(this.mesh);

        // Add grid lines
        this.addGridLines(cols, rows);

        // Add labels
        this.addStats();
    }

    createFallbackTerrain() {
        // Generate random terrain if no data
        const geometry = new THREE.PlaneGeometry(100, 20, 52, 7);
        const positions = geometry.attributes.position.array;

        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 2] = Math.random() * 10;
        }

        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            color: 0x4a9eff,
            side: THREE.DoubleSide,
            flatShading: true,
            wireframe: true
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.rotation.x = -Math.PI / 2.5;
        this.scene.add(this.mesh);
    }

    addGridLines(cols, rows) {
        const material = new THREE.LineBasicMaterial({
            color: 0x4a9eff,
            transparent: true,
            opacity: 0.2
        });

        // Week lines
        for (let i = 0; i <= cols; i += 4) {
            const x = (i / cols - 0.5) * 100;
            const points = [
                new THREE.Vector3(x, -10, 0),
                new THREE.Vector3(x, 10, 0)
            ];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, material);
            line.rotation.x = -Math.PI / 2.5;
            this.scene.add(line);
        }
    }

    addStats() {
        // Create HTML overlay for stats
        const statsDiv = document.createElement('div');
        statsDiv.className = 'terrain-stats';
        statsDiv.innerHTML = `
            <div class="terrain-stat">
                <span class="stat-value">${this.contributions?.total || '--'}</span>
                <span class="stat-label">Total Contributions</span>
            </div>
            <div class="terrain-stat">
                <span class="stat-value">${this.contributions?.streak?.current || '--'}</span>
                <span class="stat-label">Current Streak</span>
            </div>
            <div class="terrain-stat">
                <span class="stat-value">${this.contributions?.averagePerDay || '--'}</span>
                <span class="stat-label">Daily Average</span>
            </div>
        `;
        this.container.appendChild(statsDiv);
    }

    update(elapsed) {
        if (!this.isVisible || !this.renderer) return;

        // Gentle rotation
        if (this.mesh) {
            this.mesh.rotation.z = Math.sin(elapsed * 0.2) * 0.05;
        }

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
        }
    }
}
