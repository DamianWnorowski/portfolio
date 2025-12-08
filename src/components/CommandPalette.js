/**
 * Command Palette (Cmd+K / Ctrl+K)
 * Spotlight-style quick navigation and actions
 */

import { eventBus, Events } from '../core/EventBus.js';
import { audioService } from '../services/AudioService.js';

const COMMANDS = [
    // Navigation
    { id: 'nav-profile', label: 'Go to Profile', category: 'Navigation', icon: '👤', action: () => scrollToSection('profile') },
    { id: 'nav-assets', label: 'Go to Assets', category: 'Navigation', icon: '📊', action: () => scrollToSection('assets') },
    { id: 'nav-terminal', label: 'Go to Terminal', category: 'Navigation', icon: '💻', action: () => scrollToSection('terminal') },
    { id: 'nav-skills', label: 'Go to Skills', category: 'Navigation', icon: '⚡', action: () => scrollToSection('skills') },

    // Actions
    { id: 'action-contact', label: 'Contact / Hire Me', category: 'Actions', icon: '✉️', action: () => openModal('acquisition') },
    { id: 'action-github', label: 'Open GitHub', category: 'Actions', icon: '🐙', action: () => window.open('https://github.com/damianwnorowski', '_blank') },
    { id: 'action-linkedin', label: 'Open LinkedIn', category: 'Actions', icon: '💼', action: () => window.open('https://linkedin.com/in/damianwnorowski', '_blank') },
    { id: 'action-resume', label: 'Download Resume', category: 'Actions', icon: '📄', action: () => window.open('/resume.pdf', '_blank') },

    // Theme & Settings
    { id: 'toggle-sound', label: 'Toggle Sound Effects', category: 'Settings', icon: '🔊', action: () => toggleSound() },
    { id: 'toggle-theme', label: 'Toggle Theme', category: 'Settings', icon: '🎨', action: () => toggleTheme() },

    // Easter Eggs
    { id: 'easter-matrix', label: 'Matrix Mode', category: 'Fun', icon: '💊', action: () => triggerEasterEgg('matrix') },
    { id: 'easter-party', label: 'Party Mode', category: 'Fun', icon: '🎉', action: () => triggerEasterEgg('party') },

    // Projects
    { id: 'project-kaizen', label: 'View: KAIZEN AI Platform', category: 'Projects', icon: '🤖', action: () => openProject('kaizen') },
    { id: 'project-nexus', label: 'View: Neural Nexus', category: 'Projects', icon: '🧠', action: () => openProject('nexus') },
    { id: 'project-fleet', label: 'View: Fleet Commander', category: 'Projects', icon: '🚀', action: () => openProject('fleet') },
];

// Helper functions
function scrollToSection(section) {
    const el = document.querySelector(`[data-section="${section}"]`) ||
               document.getElementById(section);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        eventBus.emit(Events.SECTION_CHANGE, section);
    }
}

function openModal(modalId) {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        eventBus.emit(Events.MODAL_OPEN, modalId);
    }
}

function toggleSound() {
    const enabled = audioService.toggle();
    showToast(enabled ? 'Sound enabled' : 'Sound disabled');
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('kaizen-theme', isLight ? 'light' : 'dark');
    showToast(isLight ? 'Light theme' : 'Dark theme');
}

function triggerEasterEgg(type) {
    eventBus.emit('terminal:secret', type);
}

function openProject(projectId) {
    eventBus.emit('project:open', projectId);
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'cmd-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(201, 162, 39, 0.9);
        color: #0a0c10;
        padding: 10px 20px;
        border-radius: 4px;
        font-size: 0.85rem;
        font-weight: 600;
        z-index: 10001;
        animation: toast-pop 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toast-pop 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

export class CommandPalette {
    constructor() {
        this.isOpen = false;
        this.selectedIndex = 0;
        this.filteredCommands = [...COMMANDS];
        this.overlay = null;
        this.input = null;
        this.list = null;

        this.init();
    }

    init() {
        this.createElements();
        this.addStyles();
        this.bindEvents();
    }

    createElements() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.id = 'command-palette';
        this.overlay.className = 'cmd-overlay hidden';
        this.overlay.innerHTML = `
            <div class="cmd-modal">
                <div class="cmd-header">
                    <svg class="cmd-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="M21 21l-4.35-4.35"/>
                    </svg>
                    <input type="text" class="cmd-input" placeholder="Type a command or search..." autocomplete="off" spellcheck="false">
                    <kbd class="cmd-kbd">ESC</kbd>
                </div>
                <div class="cmd-list" id="cmd-list"></div>
                <div class="cmd-footer">
                    <span><kbd>↑↓</kbd> Navigate</span>
                    <span><kbd>↵</kbd> Select</span>
                    <span><kbd>ESC</kbd> Close</span>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);

        this.input = this.overlay.querySelector('.cmd-input');
        this.list = this.overlay.querySelector('#cmd-list');
    }

    addStyles() {
        if (document.getElementById('cmd-palette-styles')) return;

        const style = document.createElement('style');
        style.id = 'cmd-palette-styles';
        style.textContent = `
            .cmd-overlay {
                position: fixed;
                inset: 0;
                background: rgba(10, 12, 16, 0.8);
                backdrop-filter: blur(8px);
                z-index: 10000;
                display: flex;
                align-items: flex-start;
                justify-content: center;
                padding-top: 15vh;
                opacity: 1;
                transition: opacity 0.2s;
            }

            .cmd-overlay.hidden {
                opacity: 0;
                pointer-events: none;
            }

            .cmd-modal {
                width: 600px;
                max-width: 90vw;
                background: rgba(20, 25, 35, 0.95);
                border: 1px solid rgba(201, 162, 39, 0.3);
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
                transform: translateY(0);
                transition: transform 0.2s;
            }

            .cmd-overlay.hidden .cmd-modal {
                transform: translateY(-20px);
            }

            .cmd-header {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 16px;
                border-bottom: 1px solid rgba(201, 162, 39, 0.2);
            }

            .cmd-icon {
                color: #c9a227;
                flex-shrink: 0;
            }

            .cmd-input {
                flex: 1;
                background: transparent;
                border: none;
                outline: none;
                font-size: 1rem;
                color: var(--text-primary, #f8fafc);
                font-family: inherit;
            }

            .cmd-input::placeholder {
                color: var(--text-muted, #64748b);
            }

            .cmd-kbd {
                background: rgba(201, 162, 39, 0.2);
                color: #c9a227;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 0.7rem;
                font-family: inherit;
            }

            .cmd-list {
                max-height: 400px;
                overflow-y: auto;
            }

            .cmd-category {
                padding: 8px 16px;
                font-size: 0.7rem;
                font-weight: 600;
                color: var(--text-muted, #64748b);
                text-transform: uppercase;
                letter-spacing: 0.1em;
                background: rgba(0, 0, 0, 0.2);
            }

            .cmd-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                cursor: pointer;
                transition: all 0.15s;
            }

            .cmd-item:hover,
            .cmd-item.selected {
                background: rgba(201, 162, 39, 0.1);
            }

            .cmd-item.selected {
                border-left: 2px solid #c9a227;
            }

            .cmd-item-icon {
                font-size: 1.2rem;
                width: 28px;
                text-align: center;
            }

            .cmd-item-label {
                flex: 1;
                font-size: 0.9rem;
                color: var(--text-secondary, #cbd5e1);
            }

            .cmd-item.selected .cmd-item-label {
                color: var(--text-primary, #f8fafc);
            }

            .cmd-footer {
                display: flex;
                gap: 20px;
                padding: 12px 16px;
                border-top: 1px solid rgba(201, 162, 39, 0.2);
                font-size: 0.75rem;
                color: var(--text-muted, #64748b);
            }

            .cmd-footer kbd {
                background: rgba(255, 255, 255, 0.1);
                padding: 2px 6px;
                border-radius: 3px;
                margin-right: 4px;
            }

            .cmd-empty {
                padding: 40px;
                text-align: center;
                color: var(--text-muted, #64748b);
            }

            @keyframes toast-pop {
                from { transform: translateX(-50%) translateY(20px); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    bindEvents() {
        // Global keyboard shortcut
        document.addEventListener('keydown', (e) => {
            // Cmd+K or Ctrl+K
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                this.toggle();
            }

            // Escape to close
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Input events
        this.input.addEventListener('input', () => this.filter());
        this.input.addEventListener('keydown', (e) => this.handleInputKeydown(e));

        // Click outside to close
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });
    }

    handleInputKeydown(e) {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectNext();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.selectPrev();
                break;
            case 'Enter':
                e.preventDefault();
                this.executeSelected();
                break;
        }
    }

    filter() {
        const query = this.input.value.toLowerCase().trim();

        if (!query) {
            this.filteredCommands = [...COMMANDS];
        } else {
            this.filteredCommands = COMMANDS.filter(cmd =>
                cmd.label.toLowerCase().includes(query) ||
                cmd.category.toLowerCase().includes(query)
            );
        }

        this.selectedIndex = 0;
        this.renderList();
    }

    renderList() {
        if (this.filteredCommands.length === 0) {
            this.list.innerHTML = '<div class="cmd-empty">No commands found</div>';
            return;
        }

        // Group by category
        const grouped = {};
        this.filteredCommands.forEach(cmd => {
            if (!grouped[cmd.category]) {
                grouped[cmd.category] = [];
            }
            grouped[cmd.category].push(cmd);
        });

        let html = '';
        let globalIndex = 0;

        Object.entries(grouped).forEach(([category, commands]) => {
            html += `<div class="cmd-category">${category}</div>`;
            commands.forEach(cmd => {
                html += `
                    <div class="cmd-item ${globalIndex === this.selectedIndex ? 'selected' : ''}"
                         data-index="${globalIndex}"
                         data-id="${cmd.id}">
                        <span class="cmd-item-icon">${cmd.icon}</span>
                        <span class="cmd-item-label">${cmd.label}</span>
                    </div>
                `;
                globalIndex++;
            });
        });

        this.list.innerHTML = html;

        // Add click handlers
        this.list.querySelectorAll('.cmd-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectedIndex = parseInt(item.dataset.index);
                this.executeSelected();
            });

            item.addEventListener('mouseenter', () => {
                this.selectedIndex = parseInt(item.dataset.index);
                this.updateSelection();
            });
        });
    }

    selectNext() {
        this.selectedIndex = (this.selectedIndex + 1) % this.filteredCommands.length;
        this.updateSelection();
    }

    selectPrev() {
        this.selectedIndex = (this.selectedIndex - 1 + this.filteredCommands.length) % this.filteredCommands.length;
        this.updateSelection();
    }

    updateSelection() {
        this.list.querySelectorAll('.cmd-item').forEach((item, i) => {
            item.classList.toggle('selected', i === this.selectedIndex);
        });

        // Scroll into view
        const selected = this.list.querySelector('.cmd-item.selected');
        if (selected) {
            selected.scrollIntoView({ block: 'nearest' });
        }
    }

    executeSelected() {
        const cmd = this.filteredCommands[this.selectedIndex];
        if (cmd) {
            audioService.play('key');
            this.close();
            cmd.action();
        }
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isOpen = true;
        this.overlay.classList.remove('hidden');
        this.input.value = '';
        this.filter();
        this.input.focus();
        audioService.play('hover');
    }

    close() {
        this.isOpen = false;
        this.overlay.classList.add('hidden');
        audioService.play('hover');
    }

    destroy() {
        this.overlay?.remove();
    }
}

// Auto-initialize
export const commandPalette = new CommandPalette();
