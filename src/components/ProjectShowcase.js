/**
 * ProjectShowcase - Renders real project demos inside the portfolio
 * Supports: iframe, terminal, api-playground, architecture, video, code
 */

import { PROJECTS, getAllProjects, getProjectById, CATEGORIES } from '../data/projects.js';

export class ProjectShowcase {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentProject = null;
    this.currentCategory = 'systems';
    this.terminalHistory = [];
    this.init();
  }

  init() {
    if (!this.container) return;
    this.render();
    this.attachEvents();
  }

  render() {
    this.container.innerHTML = `
      <div class="showcase-wrapper">
        <!-- Category Navigation -->
        <nav class="showcase-nav">
          ${Object.entries(CATEGORIES).map(([key, cat]) => `
            <button class="nav-category ${key === this.currentCategory ? 'active' : ''}"
                    data-category="${key}">
              <span class="cat-icon">${this.getIcon(cat.icon)}</span>
              <span class="cat-name">${cat.name}</span>
              <span class="cat-count">${PROJECTS[key]?.length || 0}</span>
            </button>
          `).join('')}
        </nav>

        <!-- Main Content Area -->
        <div class="showcase-content">
          <!-- Project List -->
          <aside class="project-list">
            <div class="list-header">
              <h3>${CATEGORIES[this.currentCategory]?.name || 'Projects'}</h3>
              <span class="list-desc">${CATEGORIES[this.currentCategory]?.description || ''}</span>
            </div>
            <div class="list-items">
              ${this.renderProjectList()}
            </div>
          </aside>

          <!-- Preview Area -->
          <main class="preview-area">
            ${this.currentProject ? this.renderPreview() : this.renderEmptyState()}
          </main>
        </div>

        <!-- Project Details Panel -->
        <aside class="details-panel ${this.currentProject ? 'visible' : ''}">
          ${this.currentProject ? this.renderDetails() : ''}
        </aside>
      </div>
    `;
  }

  renderProjectList() {
    const projects = PROJECTS[this.currentCategory] || [];
    return projects.map(project => `
      <div class="project-item ${this.currentProject?.id === project.id ? 'active' : ''}"
           data-project="${project.id}">
        <div class="item-status status-${project.status}"></div>
        <div class="item-content">
          <h4 class="item-name">${project.name}</h4>
          <p class="item-tagline">${project.tagline}</p>
          <div class="item-tech">
            ${project.tech.slice(0, 3).map(t => `<span class="tech-chip">${t}</span>`).join('')}
          </div>
        </div>
        <div class="item-arrow">→</div>
      </div>
    `).join('');
  }

  renderEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M9 9h6v6H9z"/>
          </svg>
        </div>
        <h3>Select a Project</h3>
        <p>Choose a project from the list to see a live preview</p>
      </div>
    `;
  }

  renderPreview() {
    const p = this.currentProject;
    switch (p.demoType) {
      case 'iframe':
        return this.renderIframePreview(p);
      case 'terminal':
        return this.renderTerminalPreview(p);
      case 'api-playground':
        return this.renderApiPlayground(p);
      case 'architecture':
        return this.renderArchitecture(p);
      case 'video':
        return this.renderVideoPreview(p);
      case 'code':
        return this.renderCodePreview(p);
      case 'visualization':
        return this.renderVisualization(p);
      default:
        return this.renderDefaultPreview(p);
    }
  }

  renderIframePreview(project) {
    // For private repos, show a simulated preview
    return `
      <div class="preview-iframe">
        <div class="iframe-header">
          <div class="browser-dots">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
          </div>
          <div class="browser-url">
            <span class="lock">🔒</span>
            <span class="url">${project.name.toLowerCase().replace(/\s/g, '-')}.local</span>
          </div>
          <div class="browser-actions">
            <button class="action-btn" title="Refresh">↻</button>
            <button class="action-btn" title="Open External">↗</button>
          </div>
        </div>
        <div class="iframe-content">
          ${this.generateSimulatedUI(project)}
        </div>
      </div>
    `;
  }

  renderTerminalPreview(project) {
    return `
      <div class="preview-terminal">
        <div class="terminal-header">
          <div class="term-title">
            <span class="term-icon">▶</span>
            ${project.name} Terminal
          </div>
          <div class="term-actions">
            <button class="term-btn" data-action="clear">Clear</button>
            <button class="term-btn" data-action="reset">Reset</button>
          </div>
        </div>
        <div class="terminal-body" id="showcase-terminal">
          <div class="term-output">
            ${this.generateTerminalOutput(project)}
          </div>
          <div class="term-input-line">
            <span class="term-prompt">${project.id}@local:~$</span>
            <input type="text" class="term-input" id="showcase-term-input"
                   placeholder="Type 'help' for commands..." autocomplete="off">
          </div>
        </div>
      </div>
    `;
  }

  renderApiPlayground(project) {
    return `
      <div class="preview-api">
        <div class="api-header">
          <h3>API Playground</h3>
          <div class="api-status">
            <span class="status-dot ${project.apiEndpoint ? 'online' : 'offline'}"></span>
            <span>${project.apiEndpoint || 'Simulated'}</span>
          </div>
        </div>
        <div class="api-content">
          <div class="api-endpoints">
            <h4>Endpoints</h4>
            ${this.generateApiEndpoints(project)}
          </div>
          <div class="api-response">
            <h4>Response</h4>
            <pre class="response-body">${this.generateApiResponse(project)}</pre>
          </div>
        </div>
      </div>
    `;
  }

  renderArchitecture(project) {
    return `
      <div class="preview-architecture">
        <div class="arch-header">
          <h3>System Architecture</h3>
          <div class="arch-controls">
            <button class="arch-btn active" data-view="overview">Overview</button>
            <button class="arch-btn" data-view="data-flow">Data Flow</button>
            <button class="arch-btn" data-view="components">Components</button>
          </div>
        </div>
        <div class="arch-diagram">
          ${this.generateArchitectureDiagram(project)}
        </div>
      </div>
    `;
  }

  renderVideoPreview(project) {
    return `
      <div class="preview-video">
        <div class="video-placeholder">
          <div class="play-button">▶</div>
          <p>Demo video for ${project.name}</p>
        </div>
      </div>
    `;
  }

  renderCodePreview(project) {
    return `
      <div class="preview-code">
        <div class="code-header">
          <span class="file-name">main.c</span>
          <div class="code-stats">
            <span>${project.tech.join(' • ')}</span>
          </div>
        </div>
        <pre class="code-content"><code>${this.generateCodeSample(project)}</code></pre>
      </div>
    `;
  }

  renderVisualization(project) {
    return `
      <div class="preview-visualization">
        <canvas id="viz-canvas" width="800" height="500"></canvas>
        <div class="viz-controls">
          <button class="viz-btn" data-action="play">▶ Play</button>
          <button class="viz-btn" data-action="pause">⏸ Pause</button>
          <button class="viz-btn" data-action="reset">↺ Reset</button>
        </div>
      </div>
    `;
  }

  renderDefaultPreview(project) {
    return `
      <div class="preview-default">
        <div class="default-header">
          <h2>${project.name}</h2>
          <span class="status-badge status-${project.status}">${project.status.toUpperCase()}</span>
        </div>
        <p class="default-desc">${project.description}</p>
        <div class="default-features">
          ${(project.features || []).map(f => `<div class="feature-item">✓ ${f}</div>`).join('')}
        </div>
      </div>
    `;
  }

  renderDetails() {
    const p = this.currentProject;
    return `
      <div class="details-header">
        <h3>${p.name}</h3>
        <button class="close-details">×</button>
      </div>
      <div class="details-content">
        <div class="detail-section">
          <h4>Status</h4>
          <span class="status-badge status-${p.status}">${p.status.toUpperCase()}</span>
        </div>

        <div class="detail-section">
          <h4>Tech Stack</h4>
          <div class="tech-list">
            ${p.tech.map(t => `<span class="tech-tag">${t}</span>`).join('')}
          </div>
        </div>

        ${p.metrics ? `
          <div class="detail-section">
            <h4>Metrics</h4>
            <div class="metrics-grid">
              ${Object.entries(p.metrics).map(([k, v]) => `
                <div class="metric-item">
                  <span class="metric-value">${v}</span>
                  <span class="metric-label">${k}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${p.features ? `
          <div class="detail-section">
            <h4>Features</h4>
            <ul class="feature-list">
              ${p.features.map(f => `<li>${f}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <div class="detail-section">
          <h4>Links</h4>
          <div class="link-list">
            ${p.github ? `
              <a href="${p.github}" target="_blank" rel="noopener" class="detail-link ${p.private ? 'private' : ''}">
                <span class="link-icon">⚙</span>
                GitHub ${p.private ? '(Private)' : ''}
              </a>
            ` : ''}
            ${p.localPath ? `
              <div class="detail-link local">
                <span class="link-icon">📁</span>
                ${p.localPath}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // GENERATORS - Create simulated content for demos
  // ==========================================================================

  generateSimulatedUI(project) {
    // Generate a simulated UI based on project type
    const templates = {
      'rosemar': this.generateDashboardUI(project),
      'paveos': this.generateFieldOpsUI(project),
      'fieldos': this.generateFieldOpsUI(project),
      'boardos': this.generateDashboardUI(project),
      'agentvault': this.generateMarketplaceUI(project),
      'cogos': this.generateOSUI(project),
      'default': this.generateGenericUI(project)
    };

    return templates[project.id] || templates['default'];
  }

  generateDashboardUI(project) {
    return `
      <div class="sim-dashboard">
        <div class="sim-sidebar">
          <div class="sim-logo">${project.name[0]}</div>
          <div class="sim-nav-item active"></div>
          <div class="sim-nav-item"></div>
          <div class="sim-nav-item"></div>
          <div class="sim-nav-item"></div>
        </div>
        <div class="sim-main">
          <div class="sim-header">
            <div class="sim-title"></div>
            <div class="sim-actions"></div>
          </div>
          <div class="sim-grid">
            <div class="sim-card large"></div>
            <div class="sim-card"></div>
            <div class="sim-card"></div>
            <div class="sim-card wide"></div>
          </div>
        </div>
      </div>
    `;
  }

  generateFieldOpsUI(project) {
    return `
      <div class="sim-field">
        <div class="sim-map"></div>
        <div class="sim-overlay">
          <div class="sim-status-bar">
            <span class="sim-badge green">3 Active</span>
            <span class="sim-badge yellow">2 Pending</span>
          </div>
          <div class="sim-job-list">
            <div class="sim-job"></div>
            <div class="sim-job"></div>
            <div class="sim-job"></div>
          </div>
        </div>
      </div>
    `;
  }

  generateMarketplaceUI(project) {
    return `
      <div class="sim-marketplace">
        <div class="sim-search"></div>
        <div class="sim-filters"></div>
        <div class="sim-agent-grid">
          ${Array(6).fill().map(() => `
            <div class="sim-agent-card">
              <div class="sim-agent-icon"></div>
              <div class="sim-agent-info"></div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  generateOSUI(project) {
    return `
      <div class="sim-os">
        <div class="sim-taskbar">
          <div class="sim-start"></div>
          <div class="sim-apps"></div>
          <div class="sim-tray"></div>
        </div>
        <div class="sim-desktop">
          <div class="sim-window">
            <div class="sim-window-title"></div>
            <div class="sim-window-content"></div>
          </div>
        </div>
      </div>
    `;
  }

  generateGenericUI(project) {
    return `
      <div class="sim-generic">
        <div class="sim-header-bar"></div>
        <div class="sim-content-area">
          <div class="sim-loading">
            <div class="sim-spinner"></div>
            <p>Loading ${project.name}...</p>
          </div>
        </div>
      </div>
    `;
  }

  generateTerminalOutput(project) {
    const outputs = {
      'abyssal-nexus': `
<span class="term-success">[NEXUS]</span> Abyssal Nexus v4.0.0 initialized
<span class="term-info">[HIVE]</span> Bootstrapping 1000 nodes across 5 zones...
<span class="term-info">[ZONE]</span> alpha: 200 nodes ONLINE
<span class="term-info">[ZONE]</span> beta: 200 nodes ONLINE
<span class="term-info">[ZONE]</span> gamma: 200 nodes ONLINE
<span class="term-info">[ZONE]</span> delta: 200 nodes ONLINE
<span class="term-info">[ZONE]</span> omega: 200 nodes ONLINE
<span class="term-success">[MESH]</span> Multi-zone proxy mesh established
<span class="term-success">[HEALTH]</span> System health: 99.99%
<span class="term-dim">Type 'help' for available commands</span>
      `,
      'automation-core': `
<span class="term-success">[CORE]</span> Automation Core initialized
<span class="term-info">[HOOKS]</span> 5 hooks registered
<span class="term-info">[COMMANDS]</span> 86 slash commands loaded
<span class="term-info">[TOOLS]</span> 50+ tools available
<span class="term-success">[READY]</span> Intent router online
<span class="term-dim">Type 'help' or run a slash command</span>
      `,
      'ouroboros-system': `
<span class="term-success">[OUROBOROS]</span> Self-healing system active
<span class="term-info">[FITNESS]</span> Current: 99.99%
<span class="term-info">[AGENTS]</span> Multi-agent coordination READY
<span class="term-success">[HEALING]</span> Auto-recovery enabled
<span class="term-dim">Monitoring for anomalies...</span>
      `,
      'default': `
<span class="term-success">[INIT]</span> ${project.name} initialized
<span class="term-info">[STATUS]</span> System ready
<span class="term-dim">Type 'help' for commands</span>
      `
    };

    return outputs[project.id] || outputs['default'];
  }

  generateApiEndpoints(project) {
    const endpoints = {
      'abyssal-nexus': [
        { method: 'GET', path: '/health', desc: 'System health check' },
        { method: 'GET', path: '/api/hive/status', desc: 'Hive swarm status' },
        { method: 'POST', path: '/api/hive/bootstrap', desc: 'Bootstrap nodes' },
        { method: 'POST', path: '/api/ultrathink/think', desc: 'Execute reasoning' },
        { method: 'POST', path: '/api/mesh/route', desc: 'Get routing decision' }
      ],
      'default': [
        { method: 'GET', path: '/health', desc: 'Health check' },
        { method: 'GET', path: '/api/status', desc: 'System status' }
      ]
    };

    const eps = endpoints[project.id] || endpoints['default'];
    return eps.map(e => `
      <div class="endpoint-item" data-method="${e.method}" data-path="${e.path}">
        <span class="ep-method ${e.method.toLowerCase()}">${e.method}</span>
        <span class="ep-path">${e.path}</span>
        <span class="ep-desc">${e.desc}</span>
      </div>
    `).join('');
  }

  generateApiResponse(project) {
    const responses = {
      'abyssal-nexus': JSON.stringify({
        status: "healthy",
        version: "4.0.0",
        uptime_seconds: 86400,
        hive: { total_nodes: 1000, healthy_nodes: 999, zones: 5 },
        mesh: { strategy: "consistent_hash", circuit_breakers: "closed" },
        deterministic: { seed_locked: true, proofs_generated: 42069 }
      }, null, 2),
      'default': JSON.stringify({
        status: "ok",
        timestamp: new Date().toISOString()
      }, null, 2)
    };

    return responses[project.id] || responses['default'];
  }

  generateArchitectureDiagram(project) {
    return `
      <div class="arch-nodes">
        <div class="arch-node core">
          <span class="node-label">${project.name}</span>
        </div>
        <div class="arch-connections">
          ${(project.features || []).slice(0, 4).map((f, i) => `
            <div class="arch-node feature" style="--delay: ${i * 0.1}s">
              <span class="node-label">${f.split(' ').slice(0, 2).join(' ')}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  generateCodeSample(project) {
    const samples = {
      'memory-allocator': `// Custom memory allocator implementation
void* my_malloc(size_t size) {
    if (size == 0) return NULL;

    // Find a free block of sufficient size
    block_t* block = find_free_block(size);

    if (block == NULL) {
        // Request more memory from OS
        block = request_space(size);
        if (block == NULL) return NULL;
    }

    block->free = 0;
    return block->data;
}`,
      'bash-shell': `// Unix shell implementation
int execute_command(char **args) {
    pid_t pid = fork();

    if (pid == 0) {
        // Child process
        if (execvp(args[0], args) == -1) {
            perror("shell");
        }
        exit(EXIT_FAILURE);
    } else if (pid > 0) {
        // Parent process
        int status;
        waitpid(pid, &status, 0);
    }
    return 1;
}`,
      'default': `// ${project.name}
// Implementation details hidden`
    };

    return samples[project.id] || samples['default'];
  }

  getIcon(name) {
    const icons = {
      server: '⬡',
      brain: '◈',
      briefcase: '▣',
      tool: '⚙',
      layers: '☰'
    };
    return icons[name] || '○';
  }

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  attachEvents() {
    // Category navigation
    this.container.addEventListener('click', (e) => {
      const catBtn = e.target.closest('.nav-category');
      if (catBtn) {
        this.currentCategory = catBtn.dataset.category;
        this.currentProject = null;
        this.render();
        return;
      }

      const projectItem = e.target.closest('.project-item');
      if (projectItem) {
        this.currentProject = getProjectById(projectItem.dataset.project);
        this.render();
        this.initPreview();
        return;
      }

      const closeBtn = e.target.closest('.close-details');
      if (closeBtn) {
        this.currentProject = null;
        this.render();
        return;
      }
    });

    // Terminal input
    this.container.addEventListener('keydown', (e) => {
      if (e.target.id === 'showcase-term-input' && e.key === 'Enter') {
        this.handleTerminalInput(e.target.value);
        e.target.value = '';
      }
    });
  }

  initPreview() {
    if (!this.currentProject) return;

    if (this.currentProject.demoType === 'visualization') {
      this.initVisualization();
    }
  }

  initVisualization() {
    const canvas = document.getElementById('viz-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let frame = 0;

    const draw = () => {
      ctx.fillStyle = 'rgba(10, 15, 25, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw convergence visualization
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const t = frame * 0.01;

      for (let i = 0; i < 50; i++) {
        const angle = (i / 50) * Math.PI * 2 + t;
        const radius = 100 + Math.sin(t * 2 + i * 0.1) * 50;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${180 + i * 3}, 70%, 50%)`;
        ctx.fill();
      }

      frame++;
      requestAnimationFrame(draw);
    };

    draw();
  }

  handleTerminalInput(input) {
    const output = document.querySelector('#showcase-terminal .term-output');
    if (!output) return;

    // Add user input
    output.innerHTML += `\n<span class="term-user">> ${input}</span>\n`;

    // Process command
    const response = this.processCommand(input);
    output.innerHTML += response;

    // Scroll to bottom
    output.scrollTop = output.scrollHeight;
  }

  processCommand(input) {
    const cmd = input.toLowerCase().trim();

    if (cmd === 'help') {
      return `<span class="term-info">Available commands:
  help     - Show this help
  status   - System status
  metrics  - Show metrics
  features - List features
  clear    - Clear terminal</span>`;
    }

    if (cmd === 'status') {
      return `<span class="term-success">[STATUS] ${this.currentProject?.name} is OPERATIONAL</span>`;
    }

    if (cmd === 'metrics' && this.currentProject?.metrics) {
      const m = this.currentProject.metrics;
      return Object.entries(m).map(([k, v]) =>
        `<span class="term-info">${k}: ${v}</span>`
      ).join('\n');
    }

    if (cmd === 'features' && this.currentProject?.features) {
      return this.currentProject.features.map(f =>
        `<span class="term-info">• ${f}</span>`
      ).join('\n');
    }

    if (cmd === 'clear') {
      const output = document.querySelector('#showcase-terminal .term-output');
      if (output) output.innerHTML = this.generateTerminalOutput(this.currentProject);
      return '';
    }

    return `<span class="term-error">Unknown command: ${cmd}</span>`;
  }
}

export function initProjectShowcase(containerId = 'project-showcase') {
  return new ProjectShowcase(containerId);
}
