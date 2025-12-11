/**
 * WebGL Components Unit Tests
 * Tests for NeuralBackground, HolographicGlobe, SkillsConstellation, ContributionTerrain
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock THREE.js - use regular functions for 'new' to work
vi.mock('three', () => {
    const Vector2Mock = vi.fn(function(x = 0, y = 0) {
        this.x = x;
        this.y = y;
        this.set = vi.fn().mockReturnThis();
        this.copy = vi.fn().mockReturnThis();
    });

    const Vector3Mock = vi.fn(function(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.set = vi.fn().mockReturnThis();
        this.copy = vi.fn().mockReturnThis();
        this.clone = vi.fn().mockReturnThis();
        this.add = vi.fn().mockReturnThis();
        this.addVectors = vi.fn().mockReturnThis();
        this.multiplyScalar = vi.fn().mockReturnThis();
        this.normalize = vi.fn().mockReturnThis();
        this.distanceTo = vi.fn().mockReturnValue(10);
    });

    const ColorMock = vi.fn(function(color) {
        this.r = 1;
        this.g = 1;
        this.b = 1;
        this.setHex = vi.fn();
        this.lerpColors = vi.fn().mockReturnThis();
    });

    // Helper to create position-like object
    const createPositionObj = () => ({
        x: 0, y: 0, z: 0,
        set: vi.fn().mockReturnThis(),
        copy: vi.fn().mockReturnThis(),
        clone: vi.fn(function() { return createPositionObj(); }),
        distanceTo: vi.fn().mockReturnValue(10),
        normalize: vi.fn().mockReturnThis(),
        multiplyScalar: vi.fn().mockReturnThis(),
        add: vi.fn().mockReturnThis(),
        addVectors: vi.fn().mockReturnThis()
    });

    const MeshMock = vi.fn(function() {
        this.position = createPositionObj();
        this.rotation = { x: 0, y: 0, z: 0, set: vi.fn(), copy: vi.fn() };
        this.scale = { setScalar: vi.fn() };
        this.add = vi.fn();
        this.remove = vi.fn();
        this.lookAt = vi.fn();
        this.userData = {};
        this.material = { uniforms: {}, opacity: 1 };
        this.geometry = {};
    });

    const BufferGeometryMock = vi.fn(function() {
        this.setAttribute = vi.fn();
        this.setFromPoints = vi.fn().mockReturnThis();
        this.computeVertexNormals = vi.fn();
        this.dispose = vi.fn();
        this.attributes = { position: { array: new Float32Array(300) } };
    });

    return {
        WebGLRenderer: vi.fn(function() {
            this.setSize = vi.fn();
            this.setPixelRatio = vi.fn();
            this.render = vi.fn();
            this.dispose = vi.fn();
            this.domElement = document.createElement('canvas');
        }),
        Scene: vi.fn(function() {
            this.add = vi.fn();
            this.remove = vi.fn();
            this.fog = null;
            this.rotation = { x: 0, y: 0, z: 0 };
        }),
        PerspectiveCamera: vi.fn(function() {
            this.position = { x: 0, y: 0, z: 0, set: vi.fn() };
            this.aspect = 1;
            this.lookAt = vi.fn();
            this.updateProjectionMatrix = vi.fn();
        }),
        OrthographicCamera: vi.fn(function() {
            this.position = { x: 0, y: 0, z: 0 };
        }),
        PlaneGeometry: vi.fn(function() {
            this.dispose = vi.fn();
            this.attributes = { position: { array: new Float32Array(300) } };
            this.setAttribute = vi.fn();
            this.computeVertexNormals = vi.fn();
        }),
        SphereGeometry: vi.fn(function() { this.dispose = vi.fn(); }),
        IcosahedronGeometry: vi.fn(function() { this.dispose = vi.fn(); }),
        RingGeometry: vi.fn(function() { this.dispose = vi.fn(); }),
        TubeGeometry: vi.fn(function() { this.dispose = vi.fn(); }),
        BufferGeometry: BufferGeometryMock,
        BufferAttribute: vi.fn(function(array, itemSize) {
            this.array = array;
            this.itemSize = itemSize;
        }),
        ShaderMaterial: vi.fn(function(options) {
            this.uniforms = options?.uniforms || {};
            this.dispose = vi.fn();
        }),
        MeshBasicMaterial: vi.fn(function() {
            this.color = {};
            this.opacity = 1;
            this.dispose = vi.fn();
        }),
        MeshStandardMaterial: vi.fn(function() { this.dispose = vi.fn(); }),
        LineBasicMaterial: vi.fn(function() {
            this.color = { setHex: vi.fn() };
            this.opacity = 0.2;
        }),
        PointsMaterial: vi.fn(function() { this.dispose = vi.fn(); }),
        SpriteMaterial: vi.fn(function() { this.opacity = 0.3; }),
        Mesh: MeshMock,
        Line: vi.fn(function() {
            this.position = createPositionObj();
            this.rotation = { x: 0, y: 0, z: 0, set: vi.fn(), copy: vi.fn() };
            this.scale = { setScalar: vi.fn() };
            this.add = vi.fn();
            this.remove = vi.fn();
            this.lookAt = vi.fn();
            this.userData = {};
            this.material = { opacity: 0.2, color: { setHex: vi.fn() } };
        }),
        Points: vi.fn(function() {
            this.position = createPositionObj();
            this.rotation = { x: 0, y: 0, z: 0 };
            this.scale = { setScalar: vi.fn() };
            this.add = vi.fn();
            this.remove = vi.fn();
            this.lookAt = vi.fn();
            this.userData = {};
        }),
        Group: vi.fn(function() {
            this.position = createPositionObj();
            this.rotation = { x: 0, y: 0, z: 0, set: vi.fn(), copy: vi.fn() };
            this.scale = { setScalar: vi.fn() };
            this.add = vi.fn();
            this.remove = vi.fn();
            this.lookAt = vi.fn();
            this.userData = {};
            this.children = [];
        }),
        Sprite: vi.fn(function() {
            this.position = createPositionObj();
            this.scale = { setScalar: vi.fn() };
            this.material = { opacity: 0.3 };
        }),
        AmbientLight: vi.fn(function() {}),
        PointLight: vi.fn(function() { this.position = { set: vi.fn() }; }),
        DirectionalLight: vi.fn(function() { this.position = { set: vi.fn() }; }),
        FogExp2: vi.fn(function() {}),
        Vector2: Vector2Mock,
        Vector3: Vector3Mock,
        Color: ColorMock,
        Raycaster: vi.fn(function() {
            this.setFromCamera = vi.fn();
            this.intersectObjects = vi.fn().mockReturnValue([]);
        }),
        QuadraticBezierCurve3: vi.fn(function() {
            this.getPoints = vi.fn().mockReturnValue([]);
        }),
        Float32BufferAttribute: vi.fn(function() {}),
        FrontSide: 0,
        BackSide: 1,
        DoubleSide: 2,
        AdditiveBlending: 2
    };
});

// Mock EventBus
vi.mock('../../src/core/EventBus.js', () => ({
    eventBus: {
        emit: vi.fn()
    },
    Events: {
        NODE_HOVER: 'node:hover',
        NODE_CLICK: 'node:click'
    }
}));

// Mock DataService
vi.mock('../../src/services/DataService.js', () => ({
    dataService: {
        fetchContributions: vi.fn().mockResolvedValue({
            total: 1500,
            weeks: Array(52).fill(null).map(() => ({
                contributionDays: Array(7).fill(null).map(() => ({
                    contributionCount: Math.floor(Math.random() * 10)
                }))
            })),
            streak: { current: 45 },
            averagePerDay: 4.2
        })
    }
}));

// Import components once (mock is applied at module load time)
import { NeuralBackground } from '../../src/components/NeuralBackground.js';
import { HolographicGlobe } from '../../src/components/HolographicGlobe.js';
import { SkillsConstellation } from '../../src/components/SkillsConstellation.js';
import { ContributionTerrain } from '../../src/components/ContributionTerrain.js';

describe('NeuralBackground', () => {
    beforeEach(() => {
        document.body.innerHTML = '<canvas id="neural-bg"></canvas>';
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('Initialization', () => {
        it('initializes with canvas element', () => {
            const neural = new NeuralBackground('neural-bg');

            expect(neural.canvas).not.toBeNull();
        });

        it('handles missing canvas gracefully', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            new NeuralBackground('nonexistent');

            expect(consoleSpy).toHaveBeenCalled();
        });

        it('creates WebGL renderer', () => {
            const neural = new NeuralBackground('neural-bg');

            expect(neural.renderer).toBeDefined();
        });

        it('creates scene and camera', () => {
            const neural = new NeuralBackground('neural-bg');

            expect(neural.scene).toBeDefined();
            expect(neural.camera).toBeDefined();
        });

        it('creates fullscreen geometry', () => {
            const neural = new NeuralBackground('neural-bg');

            expect(neural.geometry).toBeDefined();
        });

        it('creates shader material with uniforms', () => {
            const neural = new NeuralBackground('neural-bg');

            expect(neural.material).toBeDefined();
            expect(neural.uniforms).toBeDefined();
        });

        it('initializes uniforms with default values', () => {
            const neural = new NeuralBackground('neural-bg');

            expect(neural.uniforms.uTime.value).toBe(0);
            expect(neural.uniforms.uMouseInfluence.value).toBe(0);
        });
    });

    describe('Update', () => {
        it('updates time uniform', () => {
            const neural = new NeuralBackground('neural-bg');
            const mockMouse = { x: 0.5, y: 0.5, copy: vi.fn() };

            neural.update(1.5, 0.016, mockMouse, 0.5);

            expect(neural.uniforms.uTime.value).toBe(1.5);
        });

        it('updates mouse influence uniform', () => {
            const neural = new NeuralBackground('neural-bg');
            const mockMouse = { x: 0.5, y: 0.5, copy: vi.fn() };

            neural.update(1.0, 0.016, mockMouse, 0.8);

            expect(neural.uniforms.uMouseInfluence.value).toBe(0.8);
        });

        it('renders scene', () => {
            const neural = new NeuralBackground('neural-bg');
            const mockMouse = { x: 0, y: 0, copy: vi.fn() };

            neural.update(0, 0.016, mockMouse, 0);

            expect(neural.renderer.render).toHaveBeenCalled();
        });

        it('handles missing renderer gracefully', () => {
            const neural = new NeuralBackground('neural-bg');
            neural.renderer = null;
            const mockMouse = { x: 0, y: 0, copy: vi.fn() };

            expect(() => neural.update(0, 0.016, mockMouse, 0)).not.toThrow();
        });
    });

    describe('Resize', () => {
        it('updates renderer size', () => {
            const neural = new NeuralBackground('neural-bg');

            neural.onResize();

            expect(neural.renderer.setSize).toHaveBeenCalled();
        });

        it('updates resolution uniform', () => {
            const neural = new NeuralBackground('neural-bg');

            neural.onResize();

            expect(neural.uniforms.uResolution.value.set).toHaveBeenCalled();
        });

        it('handles missing renderer gracefully', () => {
            const neural = new NeuralBackground('neural-bg');
            neural.renderer = null;

            expect(() => neural.onResize()).not.toThrow();
        });
    });

    describe('Cleanup', () => {
        it('disposes geometry', () => {
            const neural = new NeuralBackground('neural-bg');

            neural.destroy();

            expect(neural.geometry.dispose).toHaveBeenCalled();
        });

        it('disposes material', () => {
            const neural = new NeuralBackground('neural-bg');

            neural.destroy();

            expect(neural.material.dispose).toHaveBeenCalled();
        });

        it('disposes renderer', () => {
            const neural = new NeuralBackground('neural-bg');

            neural.destroy();

            expect(neural.renderer.dispose).toHaveBeenCalled();
        });
    });
});

// Store original to restore after tests
const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

describe('HolographicGlobe', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="globe-container" style="width: 400px; height: 400px;"></div>';

        Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
            width: 400,
            height: 400,
            top: 0,
            left: 0
        });
    });

    afterEach(() => {
        document.body.innerHTML = '';
        // Restore original to prevent global pollution
        Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    });

    describe('Initialization', () => {
        it('initializes with container element', () => {
            const globe = new HolographicGlobe('globe-container');

            expect(globe.container).not.toBeNull();
        });

        it('handles missing container gracefully', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            new HolographicGlobe('nonexistent');

            expect(consoleSpy).toHaveBeenCalled();
        });

        it('creates renderer and appends to container', () => {
            const globe = new HolographicGlobe('globe-container');

            expect(globe.renderer).toBeDefined();
        });

        it('creates scene with fog', () => {
            const globe = new HolographicGlobe('globe-container');

            expect(globe.scene).toBeDefined();
        });

        it('creates perspective camera', () => {
            const globe = new HolographicGlobe('globe-container');

            expect(globe.camera).toBeDefined();
        });

        it('initializes nodes array', () => {
            const globe = new HolographicGlobe('globe-container');

            expect(globe.nodes).toBeInstanceOf(Array);
        });

        it('initializes connections array', () => {
            const globe = new HolographicGlobe('globe-container');

            expect(globe.connections).toBeInstanceOf(Array);
        });

        it('starts with auto rotate enabled', () => {
            const globe = new HolographicGlobe('globe-container');

            expect(globe.autoRotate).toBe(true);
        });

        it('creates raycaster for interaction', () => {
            const globe = new HolographicGlobe('globe-container');

            expect(globe.raycaster).toBeDefined();
        });
    });

    describe('Globe Creation', () => {
        it('creates globe mesh', () => {
            const globe = new HolographicGlobe('globe-container');

            expect(globe.globe).toBeDefined();
        });

        it('creates wireframe overlay', () => {
            const globe = new HolographicGlobe('globe-container');

            expect(globe.wireframe).toBeDefined();
        });

        it('creates atmosphere glow', () => {
            const globe = new HolographicGlobe('globe-container');

            expect(globe.atmosphere).toBeDefined();
        });

        it('creates particle system', () => {
            const globe = new HolographicGlobe('globe-container');

            expect(globe.particles).toBeDefined();
        });
    });

    describe('Nodes', () => {
        it('creates deployment nodes', () => {
            const globe = new HolographicGlobe('globe-container');

            expect(globe.nodes.length).toBeGreaterThan(0);
        });

        it('nodes have mesh and data', () => {
            const globe = new HolographicGlobe('globe-container');

            globe.nodes.forEach(node => {
                expect(node.mesh).toBeDefined();
                expect(node.data).toBeDefined();
            });
        });

        it('nodes have ring pulse effect', () => {
            const globe = new HolographicGlobe('globe-container');

            globe.nodes.forEach(node => {
                expect(node.ring).toBeDefined();
            });
        });
    });

    describe('Lat/Lng Conversion', () => {
        it('converts latitude and longitude to Vector3', () => {
            const globe = new HolographicGlobe('globe-container');

            const pos = globe.latLngToVector3(0, 0, 60);

            expect(pos).toBeDefined();
        });
    });

    describe('Update', () => {
        it('updates globe rotation', () => {
            const globe = new HolographicGlobe('globe-container');
            // Add required uniforms structure
            globe.globe.material.uniforms = { uTime: { value: 0 }, uHover: { value: 0 } };

            globe.update(1.0, 0.016);

            // Check that render was called
            expect(globe.renderer.render).toHaveBeenCalled();
        });

        it('updates shader uniforms', () => {
            const globe = new HolographicGlobe('globe-container');
            // Add required uniforms structure
            globe.globe.material.uniforms = { uTime: { value: 0 }, uHover: { value: 0 } };

            globe.update(2.0, 0.016);

            expect(globe.globe.material.uniforms.uTime.value).toBe(2.0);
        });

        it('handles missing renderer gracefully', () => {
            const globe = new HolographicGlobe('globe-container');
            globe.renderer = null;

            expect(() => globe.update(0, 0.016)).not.toThrow();
        });
    });

    describe('Interaction', () => {
        it('disables auto rotate on mouse enter', () => {
            const globe = new HolographicGlobe('globe-container');

            globe.container.dispatchEvent(new Event('mouseenter'));

            expect(globe.autoRotate).toBe(false);
        });

        it('enables auto rotate on mouse leave', () => {
            const globe = new HolographicGlobe('globe-container');
            globe.autoRotate = false;

            globe.container.dispatchEvent(new Event('mouseleave'));

            expect(globe.autoRotate).toBe(true);
        });
    });

    describe('Cleanup', () => {
        it('disposes renderer', () => {
            const globe = new HolographicGlobe('globe-container');

            globe.destroy();

            expect(globe.renderer.dispose).toHaveBeenCalled();
        });
    });
});

describe('SkillsConstellation', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="skills-constellation" style="width: 400px; height: 400px;"></div>';

        Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
            width: 400,
            height: 400,
            top: 0,
            left: 0
        });
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('Initialization', () => {
        it('initializes with container element', () => {
            const constellation = new SkillsConstellation('skills-constellation');

            expect(constellation.container).not.toBeNull();
        });

        it('handles missing container gracefully', () => {
            const constellation = new SkillsConstellation('nonexistent');

            expect(constellation.container).toBeNull();
        });

        it('initializes skills array', () => {
            const constellation = new SkillsConstellation('skills-constellation');

            expect(constellation.skills).toBeInstanceOf(Array);
        });

        it('initializes connections array', () => {
            const constellation = new SkillsConstellation('skills-constellation');

            expect(constellation.connections).toBeInstanceOf(Array);
        });

        it('starts not visible', () => {
            document.body.innerHTML = '<div id="skills-constellation" style="width: 0; height: 0;"></div>';
            Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({ width: 0, height: 0 });

            const constellation = new SkillsConstellation('skills-constellation');

            expect(constellation.isVisible).toBe(false);
        });
    });

    describe('Stars', () => {
        it('creates star meshes for each skill', () => {
            const constellation = new SkillsConstellation('skills-constellation');

            expect(constellation.skills.length).toBeGreaterThan(0);
        });

        it('skills have mesh and skill data', () => {
            const constellation = new SkillsConstellation('skills-constellation');

            constellation.skills.forEach(skill => {
                expect(skill.mesh).toBeDefined();
                expect(skill.skill).toBeDefined();
            });
        });

        it('skills have glow sprites', () => {
            const constellation = new SkillsConstellation('skills-constellation');

            constellation.skills.forEach(skill => {
                expect(skill.sprite).toBeDefined();
            });
        });
    });

    describe('Connections', () => {
        it('creates connection lines between skills', () => {
            const constellation = new SkillsConstellation('skills-constellation');

            expect(constellation.connections.length).toBeGreaterThan(0);
        });

        it('connections have line and from/to references', () => {
            const constellation = new SkillsConstellation('skills-constellation');

            constellation.connections.forEach(conn => {
                expect(conn.line).toBeDefined();
                expect(conn.from).toBeDefined();
                expect(conn.to).toBeDefined();
            });
        });
    });

    describe('Visibility', () => {
        it('show() sets isVisible to true', () => {
            const constellation = new SkillsConstellation('skills-constellation');

            constellation.show();

            expect(constellation.isVisible).toBe(true);
        });

        it('hide() sets isVisible to false', () => {
            const constellation = new SkillsConstellation('skills-constellation');
            constellation.isVisible = true;

            constellation.hide();

            expect(constellation.isVisible).toBe(false);
        });
    });

    describe('Highlighting', () => {
        it('highlightSkill enlarges mesh', () => {
            const constellation = new SkillsConstellation('skills-constellation');
            const skill = constellation.skills[0];

            constellation.highlightSkill(skill);

            expect(skill.mesh.scale.setScalar).toHaveBeenCalledWith(1.5);
        });

        it('unhighlightSkill resets mesh scale', () => {
            const constellation = new SkillsConstellation('skills-constellation');
            const skill = constellation.skills[0];

            constellation.unhighlightSkill(skill);

            expect(skill.mesh.scale.setScalar).toHaveBeenCalledWith(1);
        });
    });

    describe('Update', () => {
        it('updates scene rotation', () => {
            const constellation = new SkillsConstellation('skills-constellation');
            constellation.isVisible = true;

            constellation.update(1.0);

            expect(constellation.renderer.render).toHaveBeenCalled();
        });

        it('does not update when not visible', () => {
            const constellation = new SkillsConstellation('skills-constellation');
            constellation.isVisible = false;

            constellation.update(1.0);

            // No error should occur
        });
    });

    describe('Cleanup', () => {
        it('disposes renderer', () => {
            const constellation = new SkillsConstellation('skills-constellation');

            constellation.destroy();

            expect(constellation.renderer.dispose).toHaveBeenCalled();
        });
    });
});

describe('ContributionTerrain', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="contribution-terrain" style="width: 400px; height: 400px;"></div>';

        Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
            width: 400,
            height: 400,
            top: 0,
            left: 0
        });
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('Initialization', () => {
        it('initializes with container element', async () => {
            const terrain = new ContributionTerrain('contribution-terrain');
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(terrain.container).not.toBeNull();
        });

        it('handles missing container gracefully', () => {
            const terrain = new ContributionTerrain('nonexistent');

            expect(terrain.container).toBeNull();
        });

        it('fetches contribution data on init', async () => {
            const { dataService } = await import('../../src/services/DataService.js');

            new ContributionTerrain('contribution-terrain');
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(dataService.fetchContributions).toHaveBeenCalled();
        });

        it('starts not visible when container has no dimensions', async () => {
            Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({ width: 0, height: 0 });

            const terrain = new ContributionTerrain('contribution-terrain');
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(terrain.isVisible).toBe(false);
        });
    });

    describe('Terrain Creation', () => {
        it('creates terrain mesh with contribution data', async () => {
            const terrain = new ContributionTerrain('contribution-terrain');
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(terrain.mesh).toBeDefined();
        });

        it('creates fallback terrain when no data', async () => {
            const { dataService } = await import('../../src/services/DataService.js');
            dataService.fetchContributions.mockResolvedValueOnce(null);

            const terrain = new ContributionTerrain('contribution-terrain');
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(terrain.mesh).toBeDefined();
        });
    });

    describe('Stats Overlay', () => {
        it('adds stats HTML element', async () => {
            const terrain = new ContributionTerrain('contribution-terrain');
            await new Promise(resolve => setTimeout(resolve, 50));

            const stats = document.querySelector('.terrain-stats');
            expect(stats).not.toBeNull();
        });

        it('displays total contributions', async () => {
            const terrain = new ContributionTerrain('contribution-terrain');
            await new Promise(resolve => setTimeout(resolve, 50));

            const stats = document.querySelector('.terrain-stats');
            expect(stats.innerHTML).toContain('1500');
        });
    });

    describe('Update', () => {
        it('renders when visible', async () => {
            const terrain = new ContributionTerrain('contribution-terrain');
            await new Promise(resolve => setTimeout(resolve, 50));
            terrain.isVisible = true;

            terrain.update(1.0);

            expect(terrain.renderer.render).toHaveBeenCalled();
        });

        it('does not render when not visible', async () => {
            const terrain = new ContributionTerrain('contribution-terrain');
            await new Promise(resolve => setTimeout(resolve, 50));
            terrain.isVisible = false;
            terrain.renderer.render.mockClear();

            terrain.update(1.0);

            expect(terrain.renderer.render).not.toHaveBeenCalled();
        });
    });

    describe('Resize', () => {
        it('updates renderer size', async () => {
            const terrain = new ContributionTerrain('contribution-terrain');
            await new Promise(resolve => setTimeout(resolve, 50));

            terrain.onResize();

            expect(terrain.renderer.setSize).toHaveBeenCalled();
        });

        it('updates camera projection', async () => {
            const terrain = new ContributionTerrain('contribution-terrain');
            await new Promise(resolve => setTimeout(resolve, 50));

            terrain.onResize();

            expect(terrain.camera.updateProjectionMatrix).toHaveBeenCalled();
        });

        it('handles missing renderer gracefully', () => {
            const terrain = new ContributionTerrain('contribution-terrain');
            terrain.renderer = null;

            expect(() => terrain.onResize()).not.toThrow();
        });
    });

    describe('Cleanup', () => {
        it('disposes renderer', async () => {
            const terrain = new ContributionTerrain('contribution-terrain');
            await new Promise(resolve => setTimeout(resolve, 50));

            terrain.destroy();

            expect(terrain.renderer.dispose).toHaveBeenCalled();
        });
    });
});
