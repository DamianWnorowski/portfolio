/**
 * Elite Terminal
 * Interactive command terminal with real-time log streaming
 */

import { eventBus, Events } from '../core/EventBus.js';

// Log message templates (used when real data isn't available)
const LOG_TEMPLATES = [
    { type: 'system', msg: 'System health check: ALL SYSTEMS OPERATIONAL' },
    { type: 'deploy', msg: 'Deploying container to us-east-1... SUCCESS' },
    { type: 'api', msg: 'API request processed: GET /api/stats [200] 12ms' },
    { type: 'system', msg: 'Memory utilization: 42% | CPU: 18%' },
    { type: 'deploy', msg: 'Rolling update complete: kaizen-api v2.4.1' },
    { type: 'api', msg: 'WebSocket connection established: client_847' },
    { type: 'system', msg: 'SSL certificate renewal: 89 days remaining' },
    { type: 'deploy', msg: 'Docker image built: kaizen/core:latest [2.1GB]' },
    { type: 'api', msg: 'Rate limit check: 847/10000 requests used' },
    { type: 'system', msg: 'Database connection pool: 12/50 active' },
    { type: 'deploy', msg: 'CDN cache invalidated: 847 objects' },
    { type: 'api', msg: 'Authentication: JWT validated for user_2847' },
    { type: 'system', msg: 'Backup completed: 2.4GB compressed' },
    { type: 'deploy', msg: 'Lambda function updated: process-webhook' },
    { type: 'api', msg: 'GraphQL query resolved: getDeployments [45ms]' },
    { type: 'system', msg: 'Revenue pipeline: +$12,450 processed today' },
    { type: 'deploy', msg: 'Scaling event: +2 instances (load: 78%)' },
    { type: 'api', msg: 'Cache hit ratio: 94.7% (Redis)' },
    { type: 'system', msg: 'Error rate: 0.02% (last 24h)' },
    { type: 'deploy', msg: 'Blue/green deployment: switching traffic...' }
];

// Terminal commands
const COMMANDS = {
    help: {
        desc: 'Show available commands',
        exec: () => [
            'Available commands:',
            '  help     - Show this help message',
            '  status   - Show system status',
            '  deploy   - Show deployment info',
            '  skills   - List technical skills',
            '  contact  - Show contact information',
            '  clear    - Clear terminal',
            '  github   - Open GitHub profile',
            '  hire     - Initiate acquisition process'
        ]
    },
    status: {
        desc: 'Show system status',
        exec: () => [
            'SYSTEM STATUS REPORT',
            '─'.repeat(40),
            'Uptime:        99.97% (362 days)',
            'API Latency:   12ms (p99)',
            'Error Rate:    0.02%',
            'Active Users:  1,247',
            'Deployments:   847 (last 30 days)',
            '─'.repeat(40),
            'All systems operational.'
        ]
    },
    deploy: {
        desc: 'Show deployment info',
        exec: () => [
            'ACTIVE DEPLOYMENTS',
            '─'.repeat(40),
            'us-east-1:  kaizen-api     [HEALTHY]',
            'us-west-2:  kaizen-worker  [HEALTHY]',
            'eu-west-1:  kaizen-cdn     [HEALTHY]',
            'ap-tokyo-1: kaizen-edge    [HEALTHY]',
            '─'.repeat(40),
            'Last deploy: 2 hours ago'
        ]
    },
    skills: {
        desc: 'List technical skills',
        exec: () => [
            'TECHNICAL COMPETENCIES',
            '─'.repeat(40),
            'Languages:  Python, TypeScript, Rust, Go',
            'Frontend:   React, Next.js, Three.js, WebGL',
            'Backend:    FastAPI, Node.js, PostgreSQL',
            'Cloud:      AWS, Vercel, Cloudflare',
            'AI/ML:      LangChain, OpenAI, PyTorch',
            'DevOps:     Docker, K8s, Terraform',
            '─'.repeat(40)
        ]
    },
    contact: {
        desc: 'Show contact information',
        exec: () => [
            'CONTACT INFORMATION',
            '─'.repeat(40),
            'Email:    damian@kaizen.dev',
            'GitHub:   github.com/damianwnorowski',
            'LinkedIn: linkedin.com/in/damianwnorowski',
            'Location: Ridge, NY',
            '─'.repeat(40),
            'Response time: < 2 hours'
        ]
    },
    clear: {
        desc: 'Clear terminal',
        exec: () => null // Special handling
    },
    github: {
        desc: 'Open GitHub profile',
        exec: () => {
            window.open('https://github.com/damianwnorowski', '_blank');
            return ['Opening GitHub profile...'];
        }
    },
    hire: {
        desc: 'Initiate acquisition',
        exec: () => {
            eventBus.emit(Events.MODAL_OPEN, 'acquisition');
            return ['Initiating acquisition protocol...'];
        }
    }
};

export class EliteTerminal {
    constructor() {
        this.output = document.getElementById('terminal-output');
        this.input = document.getElementById('term-input');
        this.filterButtons = document.querySelectorAll('.term-btn');

        this.maxLines = 50;
        this.currentFilter = 'system';
        this.commandHistory = [];
        this.historyIndex = -1;
        this.isStreaming = false;

        this.init();
    }

    init() {
        // Input handling
        this.input.addEventListener('keydown', (e) => this.handleKeydown(e));

        // Filter buttons
        this.filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
            });
        });

        // Start simulated log stream
        this.startLogStream();

        // Listen for real logs
        eventBus.on(Events.LOGS_RECEIVED, (logs) => this.handleRealLogs(logs));

        // Boot sequence
        this.bootSequence();
    }

    bootSequence() {
        const bootMessages = [
            { delay: 500, msg: 'Initializing neural interface...', type: 'boot' },
            { delay: 1000, msg: 'Loading competency matrix...', type: 'boot' },
            { delay: 1500, msg: 'Connecting to global deployment network...', type: 'boot' },
            { delay: 2000, msg: 'All systems nominal. Type "help" for commands.', type: 'success' }
        ];

        bootMessages.forEach(({ delay, msg, type }) => {
            setTimeout(() => this.addLine(msg, type), delay);
        });
    }

    handleKeydown(e) {
        if (e.key === 'Enter') {
            const cmd = this.input.value.trim().toLowerCase();
            if (cmd) {
                this.executeCommand(cmd);
                this.commandHistory.unshift(cmd);
                this.historyIndex = -1;
            }
            this.input.value = '';
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (this.historyIndex < this.commandHistory.length - 1) {
                this.historyIndex++;
                this.input.value = this.commandHistory[this.historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.input.value = this.commandHistory[this.historyIndex];
            } else {
                this.historyIndex = -1;
                this.input.value = '';
            }
        }
    }

    executeCommand(cmd) {
        // Echo command
        this.addLine(`$ ${cmd}`, 'command');

        const command = COMMANDS[cmd];
        if (command) {
            if (cmd === 'clear') {
                this.clear();
            } else {
                const output = command.exec();
                if (output) {
                    output.forEach(line => this.addLine(line, 'output'));
                }
            }
        } else {
            this.addLine(`Command not found: ${cmd}. Type "help" for available commands.`, 'error');
        }

        eventBus.emit(Events.TERMINAL_COMMAND, cmd);
    }

    addLine(text, type = 'system') {
        const line = document.createElement('div');
        line.className = `term-line ${type}`;

        const prefix = this.getPrefix(type);
        line.innerHTML = `
            <span class="term-time">${this.getTimestamp()}</span>
            <span class="term-prefix">${prefix}</span>
            <span class="term-msg">${this.highlightText(text)}</span>
        `;

        // Fade in effect
        line.style.opacity = '0';
        this.output.appendChild(line);
        requestAnimationFrame(() => line.style.opacity = '1');

        // Prune old lines
        while (this.output.children.length > this.maxLines) {
            this.output.firstChild.remove();
        }

        // Auto scroll
        this.output.scrollTop = this.output.scrollHeight;
    }

    getPrefix(type) {
        const prefixes = {
            system: '[SYS]',
            deploy: '[DEPLOY]',
            api: '[API]',
            boot: '[BOOT]',
            success: '[OK]',
            error: '[ERR]',
            command: '[CMD]',
            output: '[>]'
        };
        return prefixes[type] || '[LOG]';
    }

    getTimestamp() {
        const now = new Date();
        return now.toTimeString().split(' ')[0];
    }

    highlightText(text) {
        return text
            .replace(/SUCCESS|OPERATIONAL|HEALTHY|OK/g, '<span class="hl-success">$&</span>')
            .replace(/ERROR|FAIL|CRITICAL/g, '<span class="hl-error">$&</span>')
            .replace(/\d+ms|\d+%|\$[\d,]+/g, '<span class="hl-metric">$&</span>')
            .replace(/v[\d.]+/g, '<span class="hl-version">$&</span>')
            .replace(/\[[\w-]+\]/g, '<span class="hl-tag">$&</span>');
    }

    startLogStream() {
        this.isStreaming = true;
        this.streamNextLog();
    }

    streamNextLog() {
        if (!this.isStreaming) return;

        const delay = 2000 + Math.random() * 3000; // 2-5 seconds

        setTimeout(() => {
            const log = LOG_TEMPLATES[Math.floor(Math.random() * LOG_TEMPLATES.length)];

            // Only show if matches current filter or filter is 'all'
            if (this.currentFilter === 'all' || this.currentFilter === log.type) {
                this.addLine(log.msg, log.type);
            }

            this.streamNextLog();
        }, delay);
    }

    handleRealLogs(logs) {
        logs.forEach(log => {
            this.addLine(log.msg, log.type);
        });
    }

    clear() {
        while (this.output.firstChild) {
            this.output.firstChild.remove();
        }
        this.addLine('Terminal cleared.', 'system');
    }

    stopStream() {
        this.isStreaming = false;
    }
}
