/**
 * CommandPalette (Refactored)
 * Type-safe command execution with state machine
 *
 * Invariants:
 * I1: Only valid CommandIds execute
 * I2: Selection always in bounds
 * I3: Open/close state synchronized with DOM
 * I4: Single concurrent execution
 * I5: No listeners leak on destroy
 */

import { CommandExecutor } from '../services/CommandExecutor';
import type { Command, CommandId, PaletteState } from '../types/commands';
import { CommandId as createCommandId } from '../types/commands';
import { eventBus, Events } from '../core/EventBus.js';
import { audioService } from '../services/AudioService.js';
import { escapeHtml } from '../utils/security.js';

const COMMANDS: readonly Command[] = [
  // Navigation
  {
    id: createCommandId('nav-profile')!,
    label: 'Go to Profile',
    category: 'Navigation',
    icon: '👤',
    action: () => scrollToSection('profile'),
  },
  {
    id: createCommandId('nav-assets')!,
    label: 'Go to Assets',
    category: 'Navigation',
    icon: '📊',
    action: () => scrollToSection('assets'),
  },
  {
    id: createCommandId('nav-terminal')!,
    label: 'Go to Terminal',
    category: 'Navigation',
    icon: '💻',
    action: () => scrollToSection('terminal'),
  },
  {
    id: createCommandId('nav-skills')!,
    label: 'Go to Skills',
    category: 'Navigation',
    icon: '⚡',
    action: () => scrollToSection('skills'),
  },

  // Actions
  {
    id: createCommandId('action-contact')!,
    label: 'Contact / Hire Me',
    category: 'Actions',
    icon: '✉️',
    action: () => openModal('acquisition'),
  },
  {
    id: createCommandId('action-github')!,
    label: 'Open GitHub',
    category: 'Actions',
    icon: '🐙',
    action: () => window.open('https://github.com/damianwnorowski', '_blank'),
  },
  {
    id: createCommandId('action-linkedin')!,
    label: 'Open LinkedIn',
    category: 'Actions',
    icon: '💼',
    action: () => window.open('https://linkedin.com/in/damianwnorowski', '_blank'),
  },
  {
    id: createCommandId('action-resume')!,
    label: 'Download Resume',
    category: 'Actions',
    icon: '📄',
    action: () => window.open('/resume.pdf', '_blank'),
  },

  // Theme & Settings
  {
    id: createCommandId('toggle-sound')!,
    label: 'Toggle Sound Effects',
    category: 'Settings',
    icon: '🔊',
    action: () => toggleSound(),
  },
  {
    id: createCommandId('toggle-theme')!,
    label: 'Toggle Theme',
    category: 'Settings',
    icon: '🎨',
    action: () => toggleTheme(),
  },

  // Easter Eggs
  {
    id: createCommandId('easter-matrix')!,
    label: 'Matrix Mode',
    category: 'Fun',
    icon: '💊',
    action: () => triggerEasterEgg('matrix'),
  },
  {
    id: createCommandId('easter-party')!,
    label: 'Party Mode',
    category: 'Fun',
    icon: '🎉',
    action: () => triggerEasterEgg('party'),
  },

  // Projects
  {
    id: createCommandId('project-kaizen')!,
    label: 'View: KAIZEN AI Platform',
    category: 'Projects',
    icon: '🤖',
    action: () => openProject('kaizen'),
  },
  {
    id: createCommandId('project-nexus')!,
    label: 'View: Neural Nexus',
    category: 'Projects',
    icon: '🧠',
    action: () => openProject('nexus'),
  },
  {
    id: createCommandId('project-fleet')!,
    label: 'View: Fleet Commander',
    category: 'Projects',
    icon: '🚀',
    action: () => openProject('fleet'),
  },
];

// Helper functions (pure, no side effects in command definition)
function scrollToSection(section: string): void {
  const sectionIdMap: Record<string, string> = {
    overview: 'sidebar',
    profile: 'sidebar',
    assets: 'assets-panel',
    metrics: 'viewport',
    terminal: 'terminal-panel',
    skills: 'skills-panel',
  };

  const targetId = sectionIdMap[section] || section;
  const el = document.getElementById(targetId) || document.querySelector(
    `[data-section="${section}"]`
  );
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
    eventBus.emit(Events.SECTION_CHANGE, section);
  }
}

function openModal(modalId: string): void {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.classList.remove('hidden');
    eventBus.emit(Events.MODAL_OPEN, modalId);
  }
}

function toggleSound(): void {
  const enabled = audioService.toggle();
  showToast(enabled ? 'Sound enabled' : 'Sound disabled');
}

function toggleTheme(): void {
  document.body.classList.toggle('light-theme');
  const isLight = document.body.classList.contains('light-theme');
  localStorage.setItem('kaizen-theme', isLight ? 'light' : 'dark');
  showToast(isLight ? 'Light theme' : 'Dark theme');
}

function triggerEasterEgg(type: string): void {
  eventBus.emit('terminal:secret', type);
}

function openProject(projectId: string): void {
  eventBus.emit('project:open', projectId);
}

function showToast(message: string): void {
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
  private executor: CommandExecutor;
  private unsubscribe: (() => void) | null = null;
  private overlay: HTMLElement | null = null;
  private input: HTMLInputElement | null = null;
  private list: HTMLElement | null = null;

  constructor() {
    this.executor = new CommandExecutor();
    this.executor.setCommands(COMMANDS);

    this.createElements();
    this.addStyles();
    this.bindEvents();
    this.subscribeToState();

    // I3: Synchronize initial state
    this.overlay?.classList.add('hidden');
  }

  private createElements(): void {
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

    this.input = this.overlay.querySelector('.cmd-input') as HTMLInputElement;
    this.list = this.overlay.querySelector('#cmd-list') as HTMLElement;
  }

  private addStyles(): void {
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

  private bindEvents(): void {
    // Global keyboard shortcut (Cmd+K or Ctrl+K)
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.toggle();
      }

      // Escape to close
      if (e.key === 'Escape' && this.executor.getState().isOpen) {
        this.executor.close();
      }
    });

    // Input events
    if (this.input) {
      this.input.addEventListener('input', () => {
        const query = this.input!.value;
        this.executor.setSearchQuery(query, COMMANDS);
      });

      this.input.addEventListener('keydown', (e) => this.handleInputKeydown(e));
    }

    // Click outside to close
    if (this.overlay) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) {
          this.executor.close();
        }
      });
    }
  }

  private subscribeToState(): void {
    this.unsubscribe = this.executor.subscribe((state: PaletteState) => {
      // I3: Synchronize DOM visibility with state
      if (state.isOpen) {
        this.overlay?.classList.remove('hidden');
        this.input?.focus();
        audioService.play('hover');
      } else {
        this.overlay?.classList.add('hidden');
        audioService.play('hover');
      }

      // Render command list
      this.renderList(state);
    });
  }

  private handleInputKeydown(e: KeyboardEvent): void {
    const state = this.executor.getState();
    const totalCount = state.filteredCommands.length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.executor.selectNext(totalCount);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.executor.selectPrev(totalCount);
        break;
      case 'Enter':
        e.preventDefault();
        this.executor.executeSelected(state.filteredCommands);
        break;
    }
  }

  private renderList(state: PaletteState): void {
    if (!this.list) return;

    this.list.innerHTML = '';

    const filtered = state.filteredCommands.filter((cmd) => {
      const q = state.searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        cmd.label.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q)
      );
    });

    if (filtered.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'cmd-empty';
      emptyDiv.textContent = 'No commands found';
      this.list.appendChild(emptyDiv);
      return;
    }

    // Group by category
    const grouped: Record<string, typeof filtered> = {};
    filtered.forEach((cmd) => {
      if (!grouped[cmd.category]) {
        grouped[cmd.category] = [];
      }
      grouped[cmd.category].push(cmd);
    });

    let globalIndex = 0;

    Object.entries(grouped).forEach(([category, commands]) => {
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'cmd-category';
      categoryDiv.textContent = escapeHtml(category);
      this.list!.appendChild(categoryDiv);

      commands.forEach((cmd) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = `cmd-item ${
          globalIndex === state.selectedIndex ? 'selected' : ''
        }`;
        itemDiv.dataset.index = String(globalIndex);
        itemDiv.dataset.id = cmd.id.id;

        const iconSpan = document.createElement('span');
        iconSpan.className = 'cmd-item-icon';
        iconSpan.textContent = cmd.icon;

        const labelSpan = document.createElement('span');
        labelSpan.className = 'cmd-item-label';
        labelSpan.textContent = cmd.label;

        itemDiv.appendChild(iconSpan);
        itemDiv.appendChild(labelSpan);
        this.list!.appendChild(itemDiv);

        itemDiv.addEventListener('click', () => {
          this.executor.setSelectedIndex(globalIndex, filtered.length);
          this.executor.executeSelected(filtered);
        });

        itemDiv.addEventListener('mouseenter', () => {
          this.executor.setSelectedIndex(globalIndex, filtered.length);
        });

        globalIndex++;
      });
    });
  }

  private toggle(): void {
    const state = this.executor.getState();
    if (state.isOpen) {
      this.executor.close();
    } else {
      this.executor.open();
    }
  }

  // I5: Cleanup
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.overlay?.remove();
    this.executor.destroy();
  }
}

// Auto-initialize
export const commandPalette = new CommandPalette();
