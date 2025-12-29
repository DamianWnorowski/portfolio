/**
 * REAL PROJECT DATA - Pulled from GitHub and local filesystem
 * Categories: systems, ai, business, tools, foundations
 */

export const PROJECTS = {
  // =============================================================================
  // TIER 1: PRODUCTION DISTRIBUTED SYSTEMS
  // =============================================================================
  systems: [
    {
      id: 'abyssal-nexus',
      name: 'Abyssal Nexus',
      tagline: 'Elite Distributed Orchestration Engine',
      description: 'High-performance distributed system with 1000+ node hive orchestrator, multi-zone proxy mesh, deterministic execution, and self-healing capabilities.',
      tech: ['Rust', 'Tokio', 'Axum', 'Serde'],
      status: 'production',
      github: 'https://github.com/DamianWnorowski/abyssal-nexus',
      private: true,
      metrics: {
        nodes: '1000+',
        zones: 5,
        uptime: '99.99%',
        latency: '<10ms'
      },
      features: [
        'Hive Orchestrator with auto-bootstrapping',
        'Permanent Hivelink state persistence',
        'UltraThink recursive reasoning engine',
        'Multi-zone proxy mesh with circuit breakers',
        'Deterministic seed-locked execution'
      ],
      demoType: 'api-playground',
      localPath: 'C:\\Users\\Ouroboros\\Desktop\\proxKan',
      apiEndpoint: 'http://localhost:9090'
    },
    {
      id: 'ouroboros-system',
      name: 'Ouroboros System',
      tagline: 'Autonomous Self-Healing Multi-Agent AI',
      description: 'Self-evolving AI orchestration framework with dynamic agent coordination, protocol intelligence, security hardening, and real-time monitoring.',
      tech: ['Python', 'TypeScript', 'Playwright'],
      status: 'production',
      github: 'https://github.com/DamianWnorowski/Ouroboros-System',
      private: true,
      metrics: {
        fitness: '99.99%',
        commands: 57,
        agents: 'Multi',
        healing: 'Auto'
      },
      features: [
        'Self-healing error recovery',
        'Dynamic orchestration protocols',
        'RLHF integration',
        'Knowledge graph construction',
        'Incident response automation'
      ],
      demoType: 'terminal',
      localPath: 'C:\\Users\\Ouroboros\\Ouroboros-System'
    },
    {
      id: 'automation-core',
      name: 'Automation Core',
      tagline: 'Central AI Orchestration Hub',
      description: 'Comprehensive automation framework with 86+ slash commands, multi-AI orchestration, custom hooks, and Rust backend implementations.',
      tech: ['Python', 'PowerShell', 'Rust'],
      status: 'production',
      github: 'https://github.com/DamianWnorowski/automation_core',
      private: true,
      metrics: {
        commands: '86+',
        hooks: 5,
        tools: '50+',
        workflows: 16
      },
      features: [
        '86+ slash commands',
        'Multi-AI orchestration (Claude, Codex, GPT-4)',
        'Self-healing hooks',
        'Rust backend integrations',
        'Intent-based routing'
      ],
      demoType: 'terminal',
      localPath: 'C:\\automation_core'
    },
    {
      id: 'nexus-omega',
      name: 'Nexus Omega',
      tagline: 'Self-Improving Recursive Convergence Engine',
      description: 'Mathematical convergence system implementing F(x) = αΦ(x) + (1-α)[βΣᵢgᵢ(x) + (1-β)∫K(x,x\')H(x\')dx\'] + εξ(x)',
      tech: ['Rust', 'Mathematics', 'Optimization'],
      status: 'research',
      github: 'https://github.com/DamianWnorowski/nexus-omega',
      private: true,
      metrics: {
        convergence: 'Recursive',
        dimensions: 'N',
        stability: 'Adaptive'
      },
      features: [
        'Recursive self-improvement',
        'Mathematical convergence proofs',
        'Adaptive stability mechanisms',
        'Multi-dimensional optimization'
      ],
      demoType: 'visualization'
    }
  ],

  // =============================================================================
  // TIER 2: AI & COGNITIVE SYSTEMS
  // =============================================================================
  ai: [
    {
      id: 'consciousness-phi',
      name: 'Consciousness Phi Systems',
      tagline: 'Browser-Native AI Development Agent',
      description: 'Production-grade AI agent with browser automation, LLM integration, code parsing, and security features.',
      tech: ['Rust', 'Python', 'egui', 'WebDriver'],
      status: 'beta',
      github: 'https://github.com/DamianWnorowski/consciousness-phi-systems',
      private: true,
      features: [
        'Phantom Genesis autonomous agent',
        'Swarm Hive coordination',
        'Browser automation (Playwright)',
        'Code parsing and analysis',
        'Security hardening'
      ],
      demoType: 'video',
      localPath: 'C:\\Users\\Ouroboros\\Desktop\\_audit_related\\consciousness-phi-systems'
    },
    {
      id: 'theknowing',
      name: 'TheKnowing',
      tagline: 'Cognitive Nexus & AGI Architecture',
      description: 'Self-modifying cognitive architecture with Meta-Layer (PROMETHEUS-ASCENDANT), meta-reasoning, and recursive thinking patterns.',
      tech: ['Rust', 'Python', 'Tokio'],
      status: 'research',
      github: 'https://github.com/DamianWnorowski/TheKnowing',
      private: true,
      features: [
        'Meta-reasoning layer',
        'Recursive thinking patterns',
        'PROMETHEUS-ASCENDANT architecture',
        'Consciousness modeling'
      ],
      demoType: 'architecture'
    },
    {
      id: 'cogos',
      name: 'CogOS',
      tagline: 'Nexus Cognitive Operating System',
      description: 'Operating system abstraction for cognitive processes and AI agent coordination.',
      tech: ['TypeScript', 'Node.js'],
      status: 'beta',
      github: 'https://github.com/DamianWnorowski/CogOS',
      private: true,
      demoType: 'iframe'
    },
    {
      id: 'autogen-local',
      name: 'Autogen Local',
      tagline: 'Zero-Cost Multi-Agent AI Workflows',
      description: 'Runs 100% locally on GPU with Ollama. Includes crews, code review, research pipelines, CI/CD, BFT consensus, and swarm intelligence.',
      tech: ['Python', 'Ollama', 'LangChain'],
      status: 'production',
      github: 'https://github.com/DamianWnorowski/autogen-local',
      private: true,
      features: [
        'Local GPU execution',
        'Multi-agent crews',
        'Code review pipelines',
        'BFT consensus',
        'Swarm intelligence'
      ],
      demoType: 'terminal'
    },
    {
      id: 'agentvault',
      name: 'AgentVault',
      tagline: 'AI Agent Marketplace',
      description: '10,000 AI agents for $20/month. Built in 48 hours.',
      tech: ['TypeScript', 'Next.js', 'Stripe'],
      status: 'production',
      github: 'https://github.com/DamianWnorowski/agentvault',
      private: true,
      metrics: {
        agents: '10,000',
        price: '$20/mo',
        buildTime: '48hrs'
      },
      demoType: 'iframe'
    },
    {
      id: 'chain-orchestrator',
      name: 'Chain Orchestrator UI',
      tagline: 'Multi/Single Prompt Chain Visualization',
      description: 'Visual interface for orchestrating and visualizing AI prompt chains.',
      tech: ['TypeScript', 'React', 'D3.js'],
      status: 'production',
      github: 'https://github.com/DamianWnorowski/chain-orchestrator-ui',
      private: true,
      demoType: 'iframe'
    },
    {
      id: 'ai-agent-orchestrator',
      name: 'AI Agent Orchestrator',
      tagline: 'Multi-Agent Coordination System',
      description: 'Central orchestration system for coordinating multiple AI agents.',
      tech: ['Python', 'FastAPI'],
      status: 'production',
      github: 'https://github.com/DamianWnorowski/ai-agent-orchestrator',
      private: true,
      demoType: 'api-playground'
    }
  ],

  // =============================================================================
  // TIER 3: BUSINESS & OPERATIONS SOFTWARE
  // =============================================================================
  business: [
    {
      id: 'rosemar',
      name: 'Rosemar Ecosystem',
      tagline: 'Full-Stack Business Operations Platform',
      description: 'Complete business operations suite for construction/paving industry. Includes frontend, backend, site ops, and mobile applications.',
      tech: ['TypeScript', 'React', 'Node.js', 'Python'],
      status: 'production',
      github: 'https://github.com/DamianWnorowski/Rosemar',
      private: true,
      relatedRepos: [
        'Rosemar_SiteOps',
        'RosemarApp',
        'RosemarFront',
        'rosemar-monorepo'
      ],
      features: [
        'Site operations management',
        'Field crew coordination',
        'Equipment tracking',
        'Job costing',
        'Mobile-first design'
      ],
      demoType: 'iframe'
    },
    {
      id: 'paveos',
      name: 'PaveOS',
      tagline: 'Paving Operations Management',
      description: 'Specialized platform for paving operations with real-time field data.',
      tech: ['TypeScript', 'HTML', 'JavaScript'],
      status: 'production',
      github: 'https://github.com/DamianWnorowski/paveos',
      private: true,
      relatedRepos: ['PaveOsAPI'],
      demoType: 'iframe'
    },
    {
      id: 'fieldos',
      name: 'FieldOS',
      tagline: 'Field Operations Platform',
      description: 'Mobile-optimized field operations management system.',
      tech: ['TypeScript', 'React Native'],
      status: 'production',
      github: 'https://github.com/DamianWnorowski/fieldOS',
      private: true,
      demoType: 'iframe'
    },
    {
      id: 'boardos',
      name: 'BoardOS',
      tagline: 'Board Management System',
      description: 'Executive dashboard and board management platform.',
      tech: ['TypeScript', 'React'],
      status: 'production',
      github: 'https://github.com/DamianWnorowski/boardOS',
      private: true,
      demoType: 'iframe'
    },
    {
      id: 'scope-creator',
      name: 'Scope of Works Creator',
      tagline: 'Document Generation Tool',
      description: 'Automated scope of work document generation for construction projects.',
      tech: ['HTML', 'JavaScript'],
      status: 'production',
      github: 'https://github.com/DamianWnorowski/scope-of-works-creator',
      private: true,
      demoType: 'iframe'
    }
  ],

  // =============================================================================
  // TIER 4: DEVELOPER TOOLS & UTILITIES
  // =============================================================================
  tools: [
    {
      id: 'smart-cicd',
      name: 'Smart CI/CD',
      tagline: 'Self-Healing CI/CD Pipeline',
      description: 'AI-powered CI/CD that automatically fixes failing tests and heals itself.',
      tech: ['Node.js', 'TypeScript', 'GitHub Actions'],
      status: 'production',
      metrics: {
        autoFix: 'Yes',
        selfHeal: 'Yes',
        version: '2.0.0'
      },
      features: [
        'Automatic test fixing',
        'Self-healing pipelines',
        'Intelligent error analysis',
        'Auto-retry with fixes'
      ],
      demoType: 'terminal',
      localPath: 'C:\\Users\\Ouroboros\\smart-cicd-prod'
    },
    {
      id: 'hyperthink',
      name: 'Hyperthink',
      tagline: 'Cognitive Enhancement Tool',
      description: 'JavaScript-based cognitive tool for enhanced thinking patterns.',
      tech: ['JavaScript'],
      status: 'beta',
      github: 'https://github.com/DamianWnorowski/hyperthink',
      private: true,
      demoType: 'iframe'
    },
    {
      id: 'metafs',
      name: 'MetaFS',
      tagline: 'Meta Filesystem Abstraction',
      description: 'Filesystem abstraction layer with metadata enhancement.',
      tech: ['TypeScript'],
      status: 'beta',
      github: 'https://github.com/DamianWnorowski/MetaFS',
      private: true,
      demoType: 'terminal'
    },
    {
      id: 'neural-bridge',
      name: 'Neural Bridge Protocol',
      tagline: 'Inter-System Communication Protocol',
      description: 'Protocol for neural network and system communication.',
      tech: ['TypeScript'],
      status: 'research',
      github: 'https://github.com/DamianWnorowski/NEURAL_BRIDGE_PROTOCOL',
      private: true,
      demoType: 'architecture'
    },
    {
      id: 'bolt-diy',
      name: 'Bolt.diy',
      tagline: 'AI Agent Platform',
      description: 'Full-featured AI agent platform with API key management, security, and Electron desktop support.',
      tech: ['JavaScript', 'Vite', 'Remix', 'Electron'],
      status: 'production',
      features: [
        'API key management',
        'Security features',
        'Electron desktop app',
        'Cloudflare Workers deployment'
      ],
      demoType: 'iframe',
      localPath: 'C:\\Users\\Ouroboros\\bolt.diy'
    }
  ],

  // =============================================================================
  // TIER 5: FOUNDATIONS (2017-2020)
  // =============================================================================
  foundations: [
    {
      id: 'memory-allocator',
      name: 'Memory Allocator',
      tagline: 'Custom Memory Management',
      description: 'Low-level memory allocator implementation in C.',
      tech: ['C'],
      status: 'complete',
      github: 'https://github.com/DamianWnorowski/Memory_Allocator',
      private: false,
      year: 2017,
      demoType: 'code'
    },
    {
      id: 'bash-shell',
      name: 'Bash Shell',
      tagline: 'Custom Shell Implementation',
      description: 'Unix shell implementation with pipes, redirects, and job control.',
      tech: ['C'],
      status: 'complete',
      github: 'https://github.com/DamianWnorowski/Bash_Shell',
      private: false,
      year: 2017,
      demoType: 'terminal'
    },
    {
      id: 'spell-checker',
      name: 'Spell Checker',
      tagline: 'Dictionary-Based Spell Checking',
      description: 'Efficient spell checker using hash tables and edit distance.',
      tech: ['C'],
      status: 'complete',
      github: 'https://github.com/DamianWnorowski/Spell_Checker',
      private: false,
      year: 2017,
      demoType: 'terminal'
    },
    {
      id: 'minesweeper',
      name: 'Minesweeper',
      tagline: 'Classic Game Implementation',
      description: 'Full minesweeper game with recursive reveal and flag system.',
      tech: ['C'],
      status: 'complete',
      github: 'https://github.com/DamianWnorowski/Minesweeper',
      private: false,
      year: 2017,
      demoType: 'iframe'
    },
    {
      id: 'peconic-bay',
      name: 'Peconic Bay Builder',
      tagline: 'Modular Construction Tool',
      description: 'Early modular construction management application.',
      tech: ['JavaScript'],
      status: 'complete',
      github: 'https://github.com/DamianWnorowski/Peconic_Bay_Builder',
      private: false,
      year: 2019,
      demoType: 'iframe'
    }
  ]
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getAllProjects() {
  return [
    ...PROJECTS.systems,
    ...PROJECTS.ai,
    ...PROJECTS.business,
    ...PROJECTS.tools,
    ...PROJECTS.foundations
  ];
}

export function getProjectById(id) {
  return getAllProjects().find(p => p.id === id);
}

export function getProjectsByCategory(category) {
  return PROJECTS[category] || [];
}

export function getProjectStats() {
  const all = getAllProjects();
  return {
    total: all.length,
    production: all.filter(p => p.status === 'production').length,
    beta: all.filter(p => p.status === 'beta').length,
    research: all.filter(p => p.status === 'research').length,
    languages: [...new Set(all.flatMap(p => p.tech))],
    categories: Object.keys(PROJECTS)
  };
}

export const CATEGORIES = {
  systems: {
    name: 'Distributed Systems',
    description: 'Production-grade distributed infrastructure',
    icon: 'server'
  },
  ai: {
    name: 'AI & Cognitive',
    description: 'Intelligent agents and cognitive architectures',
    icon: 'brain'
  },
  business: {
    name: 'Business Operations',
    description: 'Real-world operational software',
    icon: 'briefcase'
  },
  tools: {
    name: 'Developer Tools',
    description: 'Utilities and development infrastructure',
    icon: 'tool'
  },
  foundations: {
    name: 'Foundations',
    description: 'Core CS implementations (2017-2020)',
    icon: 'layers'
  }
};
