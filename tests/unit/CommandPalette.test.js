/**
 * CommandPalette Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { triggerKeydown, triggerClick, wait } from '../setup.js';

// Simplified CommandPalette for testing
const COMMANDS = [
    { id: 'nav-profile', label: 'Go to Profile', category: 'Navigation', action: vi.fn() },
    { id: 'nav-assets', label: 'Go to Assets', category: 'Navigation', action: vi.fn() },
    { id: 'action-contact', label: 'Contact / Hire Me', category: 'Actions', action: vi.fn() },
    { id: 'action-github', label: 'Open GitHub', category: 'Actions', action: vi.fn() },
    { id: 'toggle-theme', label: 'Toggle Theme', category: 'Settings', action: vi.fn() }
];

class CommandPalette {
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
        this.bindEvents();
    }

    createElements() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'command-palette';
        this.overlay.className = 'cmd-overlay hidden';
        this.overlay.innerHTML = `
            <div class="cmd-modal" role="dialog" aria-modal="true" aria-label="Command palette">
                <div class="cmd-header">
                    <input type="text" class="cmd-input" placeholder="Type a command..."
                           aria-label="Search commands" autocomplete="off">
                </div>
                <div class="cmd-list" role="listbox" id="cmd-list"></div>
            </div>
        `;
        document.body.appendChild(this.overlay);

        this.input = this.overlay.querySelector('.cmd-input');
        this.list = this.overlay.querySelector('#cmd-list');
    }

    bindEvents() {
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                this.toggle();
            }
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        this.input.addEventListener('input', () => this.filter());
        this.input.addEventListener('keydown', (e) => this.handleInputKeydown(e));

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

        this.list.innerHTML = this.filteredCommands.map((cmd, i) => `
            <div class="cmd-item ${i === this.selectedIndex ? 'selected' : ''}"
                 data-index="${i}"
                 role="option"
                 aria-selected="${i === this.selectedIndex}">
                <span class="cmd-item-label">${cmd.label}</span>
            </div>
        `).join('');

        this.list.querySelectorAll('.cmd-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectedIndex = parseInt(item.dataset.index);
                this.executeSelected();
            });
        });
    }

    selectNext() {
        if (this.filteredCommands.length === 0) return;
        this.selectedIndex = (this.selectedIndex + 1) % this.filteredCommands.length;
        this.updateSelection();
    }

    selectPrev() {
        if (this.filteredCommands.length === 0) return;
        this.selectedIndex = (this.selectedIndex - 1 + this.filteredCommands.length) % this.filteredCommands.length;
        this.updateSelection();
    }

    updateSelection() {
        this.list.querySelectorAll('.cmd-item').forEach((item, i) => {
            const isSelected = i === this.selectedIndex;
            item.classList.toggle('selected', isSelected);
            item.setAttribute('aria-selected', isSelected);
        });
    }

    executeSelected() {
        const cmd = this.filteredCommands[this.selectedIndex];
        if (cmd) {
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
    }

    close() {
        this.isOpen = false;
        this.overlay.classList.add('hidden');
    }

    destroy() {
        this.overlay?.remove();
    }
}

describe('CommandPalette', () => {
    let palette;

    beforeEach(() => {
        // Reset command mocks
        COMMANDS.forEach(cmd => cmd.action.mockClear());
        palette = new CommandPalette();
    });

    afterEach(() => {
        palette?.destroy();
        palette = null;
    });

    describe('Initialization', () => {
        it('renders without crashing', () => {
            expect(palette.overlay).not.toBeNull();
            expect(document.getElementById('command-palette')).not.toBeNull();
        });

        it('starts in closed state', () => {
            expect(palette.isOpen).toBe(false);
            expect(palette.overlay.classList.contains('hidden')).toBe(true);
        });

        it('renders search input', () => {
            expect(palette.input).not.toBeNull();
            expect(palette.input.type).toBe('text');
        });

        it('renders command list container', () => {
            expect(palette.list).not.toBeNull();
        });

        it('has proper ARIA attributes', () => {
            const modal = palette.overlay.querySelector('.cmd-modal');
            expect(modal.getAttribute('role')).toBe('dialog');
            expect(modal.getAttribute('aria-modal')).toBe('true');

            const list = palette.list;
            expect(list.getAttribute('role')).toBe('listbox');

            const input = palette.input;
            expect(input.getAttribute('aria-label')).toBe('Search commands');
        });
    });

    describe('Opening', () => {
        it('opens on Cmd+K', () => {
            const event = new KeyboardEvent('keydown', {
                key: 'k',
                metaKey: true,
                bubbles: true
            });
            document.dispatchEvent(event);

            expect(palette.isOpen).toBe(true);
            expect(palette.overlay.classList.contains('hidden')).toBe(false);
        });

        it('opens on Ctrl+K', () => {
            const event = new KeyboardEvent('keydown', {
                key: 'k',
                ctrlKey: true,
                bubbles: true
            });
            document.dispatchEvent(event);

            expect(palette.isOpen).toBe(true);
        });

        it('focuses input when opened', () => {
            palette.open();

            expect(document.activeElement).toBe(palette.input);
        });

        it('clears previous search on open', () => {
            palette.open();
            palette.input.value = 'test';
            palette.close();
            palette.open();

            expect(palette.input.value).toBe('');
        });

        it('renders all commands on open', () => {
            palette.open();

            const items = palette.list.querySelectorAll('.cmd-item');
            expect(items.length).toBe(COMMANDS.length);
        });

        it('selects first item by default', () => {
            palette.open();

            expect(palette.selectedIndex).toBe(0);
            const firstItem = palette.list.querySelector('.cmd-item');
            expect(firstItem.classList.contains('selected')).toBe(true);
        });
    });

    describe('Closing', () => {
        it('closes on Escape', () => {
            palette.open();

            const event = new KeyboardEvent('keydown', {
                key: 'Escape',
                bubbles: true
            });
            document.dispatchEvent(event);

            expect(palette.isOpen).toBe(false);
            expect(palette.overlay.classList.contains('hidden')).toBe(true);
        });

        it('closes on overlay click', () => {
            palette.open();

            triggerClick(palette.overlay);

            expect(palette.isOpen).toBe(false);
        });

        it('does not close on modal click', () => {
            palette.open();

            const modal = palette.overlay.querySelector('.cmd-modal');
            triggerClick(modal);

            expect(palette.isOpen).toBe(true);
        });

        it('does not respond to Escape when closed', () => {
            expect(palette.isOpen).toBe(false);

            const event = new KeyboardEvent('keydown', {
                key: 'Escape',
                bubbles: true
            });
            document.dispatchEvent(event);

            expect(palette.isOpen).toBe(false); // Still closed, no error
        });
    });

    describe('Filtering', () => {
        beforeEach(() => {
            palette.open();
        });

        it('filters commands by label', () => {
            palette.input.value = 'profile';
            palette.filter();

            expect(palette.filteredCommands.length).toBe(1);
            expect(palette.filteredCommands[0].id).toBe('nav-profile');
        });

        it('filters commands by category', () => {
            palette.input.value = 'navigation';
            palette.filter();

            expect(palette.filteredCommands.length).toBe(2);
        });

        it('is case insensitive', () => {
            palette.input.value = 'GITHUB';
            palette.filter();

            expect(palette.filteredCommands.length).toBe(1);
            expect(palette.filteredCommands[0].id).toBe('action-github');
        });

        it('shows all commands when query is empty', () => {
            palette.input.value = 'test';
            palette.filter();
            palette.input.value = '';
            palette.filter();

            expect(palette.filteredCommands.length).toBe(COMMANDS.length);
        });

        it('shows empty state when no matches', () => {
            palette.input.value = 'xyznonexistent';
            palette.filter();

            expect(palette.filteredCommands.length).toBe(0);
            expect(palette.list.querySelector('.cmd-empty')).not.toBeNull();
        });

        it('resets selection to first item after filter', () => {
            palette.selectedIndex = 3;
            palette.input.value = 'github';
            palette.filter();

            expect(palette.selectedIndex).toBe(0);
        });

        it('updates DOM with filtered results', () => {
            palette.input.value = 'actions';
            palette.filter();

            const items = palette.list.querySelectorAll('.cmd-item');
            expect(items.length).toBe(2);
        });
    });

    describe('Navigation', () => {
        beforeEach(() => {
            palette.open();
        });

        it('moves selection down with ArrowDown', () => {
            expect(palette.selectedIndex).toBe(0);

            const event = new KeyboardEvent('keydown', {
                key: 'ArrowDown',
                bubbles: true
            });
            palette.input.dispatchEvent(event);

            expect(palette.selectedIndex).toBe(1);
        });

        it('moves selection up with ArrowUp', () => {
            palette.selectedIndex = 2;
            palette.updateSelection();

            const event = new KeyboardEvent('keydown', {
                key: 'ArrowUp',
                bubbles: true
            });
            palette.input.dispatchEvent(event);

            expect(palette.selectedIndex).toBe(1);
        });

        it('wraps around at bottom', () => {
            palette.selectedIndex = COMMANDS.length - 1;

            const event = new KeyboardEvent('keydown', {
                key: 'ArrowDown',
                bubbles: true
            });
            palette.input.dispatchEvent(event);

            expect(palette.selectedIndex).toBe(0);
        });

        it('wraps around at top', () => {
            palette.selectedIndex = 0;

            const event = new KeyboardEvent('keydown', {
                key: 'ArrowUp',
                bubbles: true
            });
            palette.input.dispatchEvent(event);

            expect(palette.selectedIndex).toBe(COMMANDS.length - 1);
        });

        it('updates ARIA selected state', () => {
            const event = new KeyboardEvent('keydown', {
                key: 'ArrowDown',
                bubbles: true
            });
            palette.input.dispatchEvent(event);

            const items = palette.list.querySelectorAll('.cmd-item');
            expect(items[0].getAttribute('aria-selected')).toBe('false');
            expect(items[1].getAttribute('aria-selected')).toBe('true');
        });

        it('handles navigation with empty results', () => {
            palette.input.value = 'nonexistent';
            palette.filter();

            expect(() => {
                palette.selectNext();
                palette.selectPrev();
            }).not.toThrow();
        });
    });

    describe('Execution', () => {
        beforeEach(() => {
            palette.open();
        });

        it('executes command on Enter', () => {
            const event = new KeyboardEvent('keydown', {
                key: 'Enter',
                bubbles: true
            });
            palette.input.dispatchEvent(event);

            expect(COMMANDS[0].action).toHaveBeenCalledTimes(1);
        });

        it('executes correct command when selection changes', () => {
            palette.selectedIndex = 2;

            const event = new KeyboardEvent('keydown', {
                key: 'Enter',
                bubbles: true
            });
            palette.input.dispatchEvent(event);

            expect(COMMANDS[2].action).toHaveBeenCalledTimes(1);
        });

        it('closes after execution', () => {
            const event = new KeyboardEvent('keydown', {
                key: 'Enter',
                bubbles: true
            });
            palette.input.dispatchEvent(event);

            expect(palette.isOpen).toBe(false);
        });

        it('executes on item click', () => {
            const items = palette.list.querySelectorAll('.cmd-item');
            triggerClick(items[3]);

            expect(COMMANDS[3].action).toHaveBeenCalledTimes(1);
        });

        it('handles execution with empty filtered list', () => {
            palette.input.value = 'nonexistent';
            palette.filter();

            expect(() => {
                palette.executeSelected();
            }).not.toThrow();

            // No command should have been called
            COMMANDS.forEach(cmd => {
                expect(cmd.action).not.toHaveBeenCalled();
            });
        });
    });

    describe('Toggle', () => {
        it('toggles from closed to open', () => {
            expect(palette.isOpen).toBe(false);

            palette.toggle();

            expect(palette.isOpen).toBe(true);
        });

        it('toggles from open to closed', () => {
            palette.open();
            expect(palette.isOpen).toBe(true);

            palette.toggle();

            expect(palette.isOpen).toBe(false);
        });

        it('toggles with Cmd+K repeatedly', () => {
            const event = new KeyboardEvent('keydown', {
                key: 'k',
                metaKey: true,
                bubbles: true
            });

            document.dispatchEvent(event);
            expect(palette.isOpen).toBe(true);

            document.dispatchEvent(event);
            expect(palette.isOpen).toBe(false);

            document.dispatchEvent(event);
            expect(palette.isOpen).toBe(true);
        });
    });

    describe('Cleanup', () => {
        it('removes from DOM on destroy', () => {
            expect(document.getElementById('command-palette')).not.toBeNull();

            palette.destroy();

            expect(document.getElementById('command-palette')).toBeNull();
        });

        it('handles multiple destroy calls', () => {
            expect(() => {
                palette.destroy();
                palette.destroy();
            }).not.toThrow();
        });
    });
});
