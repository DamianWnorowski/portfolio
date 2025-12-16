/**
 * Project Modal
 * Full case study modal for project details
 */

import { eventBus, Events } from '../core/EventBus.js';

const PROJECT_DATA = {
    'kaizen-os': {
        title: 'Kaizen OS',
        status: 'LIVE',
        tagline: 'Industrial Fleet Management Platform',
        description: `
            Enterprise-grade fleet management system processing real-time telemetry
            from 50+ industrial vehicles. Built to handle mission-critical operations
            with 99.99% uptime requirements.
        `,
        challenge: `
            Client needed to track and manage a fleet of industrial vehicles across
            multiple sites, with real-time GPS, fuel monitoring, maintenance scheduling,
            and driver behavior analysis.
        `,
        solution: `
            Built a distributed system using FastAPI microservices, Redis for real-time
            data streaming, and PostgreSQL for persistent storage. Implemented WebSocket
            connections for live vehicle tracking and predictive maintenance algorithms.
        `,
        metrics: [
            { label: 'Requests/Day', value: '1.2M' },
            { label: 'P99 Latency', value: '12ms' },
            { label: 'Uptime', value: '99.99%' },
            { label: 'Vehicles Tracked', value: '50+' }
        ],
        tech: ['Python', 'FastAPI', 'Redis', 'PostgreSQL', 'WebSocket', 'Docker', 'AWS'],
        links: {
            github: 'https://github.com/damianwnorowski/kaizen-os',
            live: 'https://kaizen-os.demo'
        },
        images: []
    },
    'hive-agent': {
        title: 'Hive Agent',
        status: 'BETA',
        tagline: 'Autonomous Coding Agent',
        description: `
            AI-powered coding assistant capable of understanding codebases,
            generating code, fixing bugs, and deploying to production autonomously.
        `,
        challenge: `
            Development teams spend 40% of time on repetitive coding tasks.
            Needed an agent that could handle routine development work while
            maintaining code quality standards.
        `,
        solution: `
            Built using LangChain with GPT-4 for code understanding and generation.
            Implemented AST parsing for syntax validation, automated testing integration,
            and CI/CD pipeline hooks for safe deployments to AWS Lambda.
        `,
        metrics: [
            { label: 'Accuracy', value: '94%' },
            { label: 'Speed Improvement', value: '3.2x' },
            { label: 'Languages', value: '12' },
            { label: 'Deployments', value: '847' }
        ],
        tech: ['Python', 'LangChain', 'GPT-4', 'AWS Lambda', 'GitHub Actions'],
        links: {
            github: 'https://github.com/damianwnorowski/hive-agent'
        },
        images: []
    },
    'sentient-core': {
        title: 'Sentient Core',
        status: 'R&D',
        tagline: 'WebGL Physics Engine',
        description: `
            High-performance WebGL/GLSL physics engine for simulating fluid dynamics
            and particle systems in real-time, targeting next-generation UI experiences.
        `,
        challenge: `
            Create a web-based physics simulation capable of rendering 1M+ particles
            at 60fps for use in interactive data visualizations and creative applications.
        `,
        solution: `
            Custom GLSL shaders with GPU-accelerated particle physics. Implemented
            spatial hashing for collision detection, Verlet integration for stability,
            and WebGPU fallback for modern browsers.
        `,
        metrics: [
            { label: 'FPS', value: '60' },
            { label: 'Particles', value: '1M+' },
            { label: 'GPU Memory', value: '256MB' },
            { label: 'Load Time', value: '<1s' }
        ],
        tech: ['Three.js', 'WebGL', 'GLSL', 'WebGPU', 'TypeScript'],
        links: {
            github: 'https://github.com/damianwnorowski/sentient-core',
            demo: 'https://sentient-core.demo'
        },
        images: []
    },
    'titan-search': {
        title: 'Titan Search',
        status: 'PROD',
        tagline: 'Vector Semantic Search Engine',
        description: `
            Enterprise search solution using OpenAI embeddings and vector databases
            for semantic document retrieval in legal and compliance contexts.
        `,
        challenge: `
            Law firm needed to search through 50K+ legal documents with natural language
            queries, finding relevant precedents and clauses based on meaning, not just keywords.
        `,
        solution: `
            Built a RAG (Retrieval Augmented Generation) pipeline with document chunking,
            OpenAI embeddings, and Pinecone vector storage. Added hybrid search combining
            semantic and keyword matching for best results.
        `,
        metrics: [
            { label: 'Documents', value: '50K+' },
            { label: 'Relevance', value: '98%' },
            { label: 'Query Time', value: '<100ms' },
            { label: 'Users', value: '200+' }
        ],
        tech: ['Next.js', 'OpenAI', 'Pinecone', 'PostgreSQL', 'Vercel'],
        links: {
            github: 'https://github.com/damianwnorowski/titan-search'
        },
        images: []
    }
};

export class ProjectModal {
    constructor() {
        this.currentProject = null;
        this.create();
        this.bindEvents();
    }

    create() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'project-modal-overlay hidden';
        this.overlay.innerHTML = `
            <div class="project-modal">
                <button class="modal-close" id="project-modal-close">&times;</button>
                <div class="modal-content" id="project-modal-content">
                    <!-- Dynamic content -->
                </div>
            </div>
        `;
        document.body.appendChild(this.overlay);
        this.addStyles();
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .project-modal-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.9);
                backdrop-filter: blur(10px);
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 40px;
                opacity: 1;
                transition: opacity 0.3s ease;
            }

            .project-modal-overlay.hidden {
                opacity: 0;
                pointer-events: none;
            }

            .project-modal {
                background: var(--bg-panel, rgba(12, 18, 30, 0.95));
                border: 1px solid var(--border-primary, rgba(255,255,255,0.1));
                border-radius: 8px;
                max-width: 900px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                position: relative;
            }

            .project-modal .modal-close {
                position: absolute;
                top: 20px;
                right: 20px;
                width: 40px;
                height: 40px;
                background: transparent;
                border: 1px solid var(--border-primary);
                color: var(--text-muted);
                font-size: 24px;
                cursor: pointer;
                border-radius: 4px;
                transition: all 0.2s;
                z-index: 10;
            }

            .project-modal .modal-close:hover {
                background: var(--accent-gold);
                color: var(--bg-primary);
                border-color: var(--accent-gold);
            }

            .modal-content {
                padding: 40px;
            }

            .project-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 1px solid var(--border-primary);
            }

            .project-title {
                font-size: 2rem;
                font-weight: 600;
                margin-bottom: 5px;
            }

            .project-tagline {
                color: var(--text-muted);
                font-size: 1rem;
            }

            .project-status {
                font-family: var(--font-mono);
                font-size: 0.75rem;
                padding: 6px 12px;
                border-radius: 4px;
                font-weight: 500;
            }

            .project-status.live { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
            .project-status.beta { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
            .project-status.rd { background: rgba(74, 158, 255, 0.2); color: #4a9eff; }
            .project-status.prod { background: rgba(34, 197, 94, 0.2); color: #22c55e; }

            .project-section {
                margin-bottom: 30px;
            }

            .section-title {
                font-family: var(--font-mono);
                font-size: 0.7rem;
                color: var(--accent-gold);
                letter-spacing: 1px;
                margin-bottom: 10px;
                text-transform: uppercase;
            }

            .section-content {
                color: var(--text-secondary);
                line-height: 1.7;
            }

            .project-metrics {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 20px;
                margin-bottom: 30px;
            }

            .metric-card {
                background: var(--bg-secondary);
                padding: 20px;
                border-radius: 6px;
                text-align: center;
            }

            .metric-value {
                font-size: 1.5rem;
                font-weight: 600;
                color: var(--accent-gold);
                font-family: var(--font-mono);
            }

            .metric-label {
                font-size: 0.75rem;
                color: var(--text-muted);
                margin-top: 5px;
            }

            .project-tech {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            .tech-badge {
                padding: 6px 12px;
                background: var(--bg-secondary);
                border: 1px solid var(--border-primary);
                border-radius: 4px;
                font-family: var(--font-mono);
                font-size: 0.75rem;
                color: var(--text-secondary);
            }

            .project-links {
                display: flex;
                gap: 15px;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid var(--border-primary);
            }

            .project-link {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px 20px;
                background: transparent;
                border: 1px solid var(--accent-blue);
                color: var(--accent-blue);
                border-radius: 4px;
                font-family: var(--font-mono);
                font-size: 0.8rem;
                text-decoration: none;
                transition: all 0.2s;
            }

            .project-link:hover {
                background: var(--accent-blue);
                color: var(--bg-primary);
            }

            .project-link.primary {
                background: var(--accent-gold);
                border-color: var(--accent-gold);
                color: var(--bg-primary);
            }

            .project-link.primary:hover {
                background: transparent;
                color: var(--accent-gold);
            }

            @media (max-width: 768px) {
                .project-modal-overlay {
                    padding: 20px;
                }

                .project-metrics {
                    grid-template-columns: repeat(2, 1fr);
                }

                .project-header {
                    flex-direction: column;
                    gap: 15px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    bindEvents() {
        // Close button
        this.overlay.querySelector('#project-modal-close').addEventListener('click', () => {
            this.close();
        });

        // Click outside
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        // ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.overlay.classList.contains('hidden')) {
                this.close();
            }
        });

        // Listen for project clicks
        document.querySelectorAll('.asset-card').forEach(card => {
            card.addEventListener('click', () => {
                const title = card.querySelector('.asset-title').textContent;
                const projectId = title.toLowerCase().replace(/\s+/g, '-');
                this.open(projectId);
            });
        });
    }

    open(projectId) {
        const project = PROJECT_DATA[projectId];
        if (!project) {
            return;
        }

        this.currentProject = project;
        this.render(project);
        this.overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        eventBus.emit(Events.MODAL_OPEN, 'project');
    }

    close() {
        this.overlay.classList.add('hidden');
        document.body.style.overflow = '';
        eventBus.emit(Events.MODAL_CLOSE);
    }

    render(project) {
        const statusClass = project.status.toLowerCase().replace('&', '');
        const content = this.overlay.querySelector('#project-modal-content');

        content.innerHTML = `
            <div class="project-header">
                <div>
                    <h2 class="project-title">${project.title}</h2>
                    <p class="project-tagline">${project.tagline}</p>
                </div>
                <span class="project-status ${statusClass}">${project.status}</span>
            </div>

            <div class="project-metrics">
                ${project.metrics.map(m => `
                    <div class="metric-card">
                        <div class="metric-value">${m.value}</div>
                        <div class="metric-label">${m.label}</div>
                    </div>
                `).join('')}
            </div>

            <div class="project-section">
                <h3 class="section-title">Overview</h3>
                <p class="section-content">${project.description.trim()}</p>
            </div>

            <div class="project-section">
                <h3 class="section-title">Challenge</h3>
                <p class="section-content">${project.challenge.trim()}</p>
            </div>

            <div class="project-section">
                <h3 class="section-title">Solution</h3>
                <p class="section-content">${project.solution.trim()}</p>
            </div>

            <div class="project-section">
                <h3 class="section-title">Tech Stack</h3>
                <div class="project-tech">
                    ${project.tech.map(t => `<span class="tech-badge">${t}</span>`).join('')}
                </div>
            </div>

            <div class="project-links">
                ${project.links.github ? `
                    <a href="${project.links.github}" target="_blank" rel="noopener" class="project-link">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                        </svg>
                        View Source
                    </a>
                ` : ''}
                ${project.links.live || project.links.demo ? `
                    <a href="${project.links.live || project.links.demo}" target="_blank" rel="noopener" class="project-link primary">
                        Live Demo →
                    </a>
                ` : ''}
            </div>
        `;
    }
}
