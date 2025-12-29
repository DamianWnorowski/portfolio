/**
 * Skills Constellation
 * 3D interactive visualization of technical skills as a star constellation
 */

import {
    WebGLRenderer, Scene, PerspectiveCamera, IcosahedronGeometry, MeshBasicMaterial,
    Mesh, SpriteMaterial, Sprite, BufferGeometry, LineBasicMaterial, Line,
    Raycaster, Vector2, Color, AdditiveBlending
} from 'three';

const SKILLS = [
    { name: 'Python', level: 98, category: 'backend', x: -40, y: 20, z: 0 },
    { name: 'FastAPI', level: 95, category: 'backend', x: -30, y: 10, z: 10 },
    { name: 'React', level: 95, category: 'frontend', x: 40, y: 15, z: 5 },
    { name: 'TypeScript', level: 92, category: 'frontend', x: 35, y: 25, z: -5 },
    { name: 'Three.js', level: 92, category: 'frontend', x: 45, y: 5, z: 15 },
    { name: 'Node.js', level: 90, category: 'backend', x: -25, y: -10, z: -10 },
    { name: 'AWS', level: 88, category: 'cloud', x: 0, y: 30, z: 20 },
    { name: 'Docker', level: 88, category: 'devops', x: 10, y: -20, z: 10 },
    { name: 'PostgreSQL', level: 85, category: 'backend', x: -35, y: -5, z: 20 },
    { name: 'Redis', level: 85, category: 'backend', x: -20, y: 0, z: -15 },
    { name: 'WebGL', level: 90, category: 'frontend', x: 50, y: -10, z: 0 },
    { name: 'LangChain', level: 88, category: 'ai', x: -10, y: 25, z: -20 },
    { name: 'OpenAI', level: 90, category: 'ai', x: -5, y: 35, z: -10 },
    { name: 'Kubernetes', level: 82, category: 'devops', x: 20, y: -25, z: -15 },
    { name: 'Terraform', level: 80, category: 'devops', x: 25, y: -15, z: 20 }
];

const CONNECTIONS = [
    ['Python', 'FastAPI'], ['Python', 'LangChain'], ['Python', 'OpenAI'],
    ['React', 'TypeScript'], ['React', 'Three.js'],
    ['TypeScript', 'Node.js'], ['Node.js', 'PostgreSQL'], ['Node.js', 'Redis'],
    ['AWS', 'Docker'], ['Docker', 'Kubernetes'], ['Kubernetes', 'Terraform'],
    ['Three.js', 'WebGL'], ['FastAPI', 'PostgreSQL'], ['FastAPI', 'Redis'],
    ['LangChain', 'OpenAI']
];

const CATEGORY_COLORS = {
    backend: new Color(0x4a9eff),   // Steel blue
    frontend: new Color(0xc9a227),  // Gold
    cloud: new Color(0x22c55e),     // Green
    devops: new Color(0xa855f7),    // Purple
    ai: new Color(0xf43f5e)         // Red/Pink
};

// Pre-build skill lookup map for O(1) access
const SKILL_MAP = new Map(SKILLS.map(s => [s.name, s]));

export class SkillsConstellation {
    constructor(containerId = 'skills-constellation') {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.skills = [];
        this.connections = [];
        this.labels = [];
        this.hoveredSkill = null;
        this.isVisible = false;

        this.init();
    }

    init() {
        const rect = this.container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            // Container is hidden, wait for visibility
            return;
        }

        this.setup(rect);
    }

    setup(rect) {
        // Renderer
        this.renderer = new WebGLRenderer({
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(rect.width, rect.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        // Scene
        this.scene = new Scene();

        // Camera
        this.camera = new PerspectiveCamera(50, rect.width / rect.height, 0.1, 500);
        this.camera.position.z = 100;

        // Create constellation
        this.createStars();
        this.createConnections();

        // Interaction
        this.raycaster = new Raycaster();
        this.pointer = new Vector2();

        this.container.addEventListener('mousemove', (e) => {
            const rect = this.container.getBoundingClientRect();
            this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        });

        this.isVisible = true;
    }

    createStars() {
        // Build skill mesh map for O(1) connection lookup
        this.skillMeshMap = new Map();

        SKILLS.forEach(skill => {
            // Star geometry (icosahedron for sparkle effect)
            const size = (skill.level / 100) * 3 + 1;
            const geometry = new IcosahedronGeometry(size, 1);

            const color = CATEGORY_COLORS[skill.category];
            const material = new MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.9
            });

            const mesh = new Mesh(geometry, material);
            mesh.position.set(skill.x, skill.y, skill.z);
            mesh.userData = skill;

            // Glow sprite
            const spriteMaterial = new SpriteMaterial({
                color: color,
                transparent: true,
                opacity: 0.3,
                blending: AdditiveBlending
            });
            const sprite = new Sprite(spriteMaterial);
            sprite.scale.setScalar(size * 4);
            mesh.add(sprite);

            this.skills.push({ mesh, skill, baseSize: size, sprite });
            this.skillMeshMap.set(skill.name, this.skills[this.skills.length - 1]);
            this.scene.add(mesh);
        });
    }

    createConnections() {
        CONNECTIONS.forEach(([from, to]) => {
            // O(1) lookup instead of O(n) find
            const fromSkill = this.skillMeshMap.get(from);
            const toSkill = this.skillMeshMap.get(to);

            if (!fromSkill || !toSkill) return;

            const points = [
                fromSkill.mesh.position.clone(),
                toSkill.mesh.position.clone()
            ];

            const geometry = new BufferGeometry().setFromPoints(points);
            const material = new LineBasicMaterial({
                color: 0x4a9eff,
                transparent: true,
                opacity: 0.2
            });

            const line = new Line(geometry, material);
            this.connections.push({ line, from: fromSkill, to: toSkill });
            this.scene.add(line);
        });
    }

    show() {
        if (!this.renderer) {
            const rect = this.container.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                this.setup(rect);
            }
        }
        this.isVisible = true;
        this.container.classList.remove('hidden');
    }

    hide() {
        this.isVisible = false;
        this.container.classList.add('hidden');
    }

    checkHover() {
        if (!this.renderer) return;

        this.raycaster.setFromCamera(this.pointer, this.camera);

        const meshes = this.skills.map(s => s.mesh);
        const intersects = this.raycaster.intersectObjects(meshes);

        if (intersects.length > 0) {
            const skill = this.skills.find(s => s.mesh === intersects[0].object);
            if (skill !== this.hoveredSkill) {
                this.hoveredSkill = skill;
                this.highlightSkill(skill);
            }
        } else {
            if (this.hoveredSkill) {
                this.unhighlightSkill(this.hoveredSkill);
                this.hoveredSkill = null;
            }
        }
    }

    highlightSkill(skill) {
        // Enlarge skill
        skill.mesh.scale.setScalar(1.5);
        skill.sprite.material.opacity = 0.6;

        // Highlight connected lines
        this.connections.forEach(conn => {
            if (conn.from === skill || conn.to === skill) {
                conn.line.material.opacity = 0.6;
                conn.line.material.color.setHex(0xc9a227);
            }
        });
    }

    unhighlightSkill(skill) {
        skill.mesh.scale.setScalar(1);
        skill.sprite.material.opacity = 0.3;

        this.connections.forEach(conn => {
            conn.line.material.opacity = 0.2;
            conn.line.material.color.setHex(0x4a9eff);
        });
    }

    update(elapsed) {
        if (!this.isVisible || !this.renderer) return;

        // Gentle rotation
        this.scene.rotation.y = Math.sin(elapsed * 0.2) * 0.2;
        this.scene.rotation.x = Math.cos(elapsed * 0.15) * 0.1;

        // Twinkle effect
        this.skills.forEach((skill, i) => {
            const twinkle = Math.sin(elapsed * 3 + i) * 0.2 + 0.8;
            skill.mesh.material.opacity = 0.9 * twinkle;

            // Subtle pulsing
            const pulse = 1 + Math.sin(elapsed * 2 + i * 0.5) * 0.05;
            if (skill !== this.hoveredSkill) {
                skill.mesh.scale.setScalar(pulse);
            }
        });

        // Check hover
        this.checkHover();

        // Render
        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        if (!this.renderer) return;

        const rect = this.container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

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
