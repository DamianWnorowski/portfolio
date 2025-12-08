/**
 * EliteTerminal Unit Tests
 * Tests for interactive terminal component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Helper to create the required DOM structure for EliteTerminal
function createTerminalDOM() {
    return `
        <section id="terminal">
            <div id="terminal-output"></div>
            <input type="text" id="term-input" />
            <button class="term-btn active" data-filter="system">System</button>
            <button class="term-btn" data-filter="deploy">Deploy</button>
            <button class="term-btn" data-filter="api">API</button>
        </section>
    `;
}

describe('EliteTerminal', () => {
    let EliteTerminal;
    let terminal;

    beforeEach(async () => {
        vi.resetModules();
        vi.useFakeTimers();

        document.body.innerHTML = '';
        document.head.innerHTML = '';

        // Mock requestAnimationFrame
        global.requestAnimationFrame = vi.fn(cb => setTimeout(cb, 16));

        const module = await import('../../src/components/EliteTerminal.js');
        EliteTerminal = module.EliteTerminal;
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('Initialization', () => {
        it('finds output element', () => {
            document.body.innerHTML = createTerminalDOM();

            terminal = new EliteTerminal();

            expect(terminal.output).toBe(document.getElementById('terminal-output'));
        });

        it('finds input element', () => {
            document.body.innerHTML = createTerminalDOM();

            terminal = new EliteTerminal();

            expect(terminal.input).toBe(document.getElementById('term-input'));
        });

        it('initializes command history', () => {
            document.body.innerHTML = createTerminalDOM();

            terminal = new EliteTerminal();

            expect(terminal.commandHistory).toEqual([]);
        });

        it('sets history index to -1', () => {
            document.body.innerHTML = createTerminalDOM();

            terminal = new EliteTerminal();

            expect(terminal.historyIndex).toBe(-1);
        });

        it('sets default filter to system', () => {
            document.body.innerHTML = createTerminalDOM();

            terminal = new EliteTerminal();

            expect(terminal.currentFilter).toBe('system');
        });

        it('sets maxLines to 50', () => {
            document.body.innerHTML = createTerminalDOM();

            terminal = new EliteTerminal();

            expect(terminal.maxLines).toBe(50);
        });
    });

    describe('Command Execution', () => {
        beforeEach(() => {
            document.body.innerHTML = createTerminalDOM();
            terminal = new EliteTerminal();
        });

        it('executes help command', () => {
            terminal.executeCommand('help');

            expect(terminal.output.innerHTML).toContain('Available commands');
        });

        it('executes clear command', () => {
            terminal.executeCommand('help');
            terminal.executeCommand('clear');

            // Clear removes all content but adds "Terminal cleared." message
            expect(terminal.output.innerHTML).toContain('Terminal cleared');
            expect(terminal.output.innerHTML).not.toContain('Available commands');
        });

        it('executes status command', () => {
            terminal.executeCommand('status');

            expect(terminal.output.innerHTML).toContain('SYSTEM STATUS');
        });

        it('executes skills command', () => {
            terminal.executeCommand('skills');

            expect(terminal.output.innerHTML).toContain('TECHNICAL');
        });

        it('executes contact command', () => {
            terminal.executeCommand('contact');

            expect(terminal.output.innerHTML).toContain('CONTACT');
        });

        it('handles unknown command', () => {
            terminal.executeCommand('unknowncommand');

            expect(terminal.output.innerHTML).toContain('Command not found');
        });

        it('echoes command in output', () => {
            terminal.executeCommand('help');

            expect(terminal.output.innerHTML).toContain('$ help');
        });
    });

    describe('Command History', () => {
        beforeEach(() => {
            document.body.innerHTML = createTerminalDOM();
            terminal = new EliteTerminal();
        });

        it('adds command to history', () => {
            terminal.input.value = 'help';
            terminal.handleKeydown({ key: 'Enter', preventDefault: vi.fn() });

            expect(terminal.commandHistory).toContain('help');
        });

        it('does not add empty commands', () => {
            terminal.input.value = '';
            terminal.handleKeydown({ key: 'Enter', preventDefault: vi.fn() });

            expect(terminal.commandHistory.length).toBe(0);
        });

        it('navigates history with up arrow', () => {
            terminal.input.value = 'help';
            terminal.handleKeydown({ key: 'Enter', preventDefault: vi.fn() });
            terminal.input.value = 'status';
            terminal.handleKeydown({ key: 'Enter', preventDefault: vi.fn() });

            terminal.handleKeydown({ key: 'ArrowUp', preventDefault: vi.fn() });

            expect(terminal.input.value).toBe('status');
        });

        it('navigates history with down arrow', () => {
            terminal.input.value = 'help';
            terminal.handleKeydown({ key: 'Enter', preventDefault: vi.fn() });
            terminal.input.value = 'status';
            terminal.handleKeydown({ key: 'Enter', preventDefault: vi.fn() });

            terminal.handleKeydown({ key: 'ArrowUp', preventDefault: vi.fn() });
            terminal.handleKeydown({ key: 'ArrowUp', preventDefault: vi.fn() });
            terminal.handleKeydown({ key: 'ArrowDown', preventDefault: vi.fn() });

            expect(terminal.input.value).toBe('status');
        });

        it('clears input on down at end of history', () => {
            terminal.input.value = 'help';
            terminal.handleKeydown({ key: 'Enter', preventDefault: vi.fn() });

            terminal.handleKeydown({ key: 'ArrowUp', preventDefault: vi.fn() });
            terminal.handleKeydown({ key: 'ArrowDown', preventDefault: vi.fn() });

            expect(terminal.input.value).toBe('');
        });
    });

    describe('Input Handling', () => {
        beforeEach(() => {
            document.body.innerHTML = createTerminalDOM();
            terminal = new EliteTerminal();
        });

        it('executes command on Enter key', () => {
            terminal.input.value = 'help';
            terminal.handleKeydown({ key: 'Enter', preventDefault: vi.fn() });

            expect(terminal.output.innerHTML).toContain('Available commands');
        });

        it('clears input after execution', () => {
            terminal.input.value = 'help';
            terminal.handleKeydown({ key: 'Enter', preventDefault: vi.fn() });

            expect(terminal.input.value).toBe('');
        });

        it('trims whitespace from commands', () => {
            terminal.input.value = '  help  ';
            terminal.handleKeydown({ key: 'Enter', preventDefault: vi.fn() });

            expect(terminal.output.innerHTML).toContain('Available commands');
        });
    });

    describe('Output Formatting', () => {
        beforeEach(() => {
            document.body.innerHTML = createTerminalDOM();
            terminal = new EliteTerminal();
        });

        it('adds term-line class to output', () => {
            terminal.addLine('Test message', 'system');

            const line = terminal.output.querySelector('.term-line');
            expect(line).not.toBeNull();
        });

        it('adds type class to lines', () => {
            terminal.addLine('Test message', 'error');

            const line = terminal.output.querySelector('.term-line.error');
            expect(line).not.toBeNull();
        });

        it('includes timestamp', () => {
            terminal.addLine('Test message');

            const time = terminal.output.querySelector('.term-time');
            expect(time).not.toBeNull();
        });

        it('includes prefix', () => {
            terminal.addLine('Test message', 'system');

            const prefix = terminal.output.querySelector('.term-prefix');
            expect(prefix.textContent).toContain('[SYS]');
        });

        it('includes message content', () => {
            terminal.addLine('Test message');

            const msg = terminal.output.querySelector('.term-msg');
            expect(msg.textContent).toContain('Test message');
        });
    });

    describe('Text Highlighting', () => {
        beforeEach(() => {
            document.body.innerHTML = createTerminalDOM();
            terminal = new EliteTerminal();
        });

        it('highlights SUCCESS text', () => {
            terminal.addLine('Operation SUCCESS');

            expect(terminal.output.innerHTML).toContain('hl-success');
        });

        it('highlights ERROR text', () => {
            terminal.addLine('Operation ERROR');

            expect(terminal.output.innerHTML).toContain('hl-error');
        });

        it('highlights metrics', () => {
            terminal.addLine('Response time: 50ms');

            expect(terminal.output.innerHTML).toContain('hl-metric');
        });
    });

    describe('Line Management', () => {
        beforeEach(() => {
            document.body.innerHTML = createTerminalDOM();
            terminal = new EliteTerminal();
        });

        it('limits output to maxLines', () => {
            for (let i = 0; i < 60; i++) {
                terminal.addLine(`Line ${i}`);
            }

            expect(terminal.output.children.length).toBeLessThanOrEqual(50);
        });

        it('removes oldest lines when limit exceeded', () => {
            terminal.addLine('First line');
            for (let i = 0; i < 55; i++) {
                terminal.addLine(`Line ${i}`);
            }

            expect(terminal.output.innerHTML).not.toContain('First line');
        });
    });

    describe('Filter Buttons', () => {
        beforeEach(() => {
            document.body.innerHTML = createTerminalDOM();
            terminal = new EliteTerminal();
        });

        it('changes filter on button click', () => {
            const deployBtn = document.querySelector('[data-filter="deploy"]');
            deployBtn.click();

            expect(terminal.currentFilter).toBe('deploy');
        });

        it('updates active class on button click', () => {
            const deployBtn = document.querySelector('[data-filter="deploy"]');
            deployBtn.click();

            expect(deployBtn.classList.contains('active')).toBe(true);
        });

        it('removes active class from other buttons', () => {
            const systemBtn = document.querySelector('[data-filter="system"]');
            const deployBtn = document.querySelector('[data-filter="deploy"]');

            deployBtn.click();

            expect(systemBtn.classList.contains('active')).toBe(false);
        });
    });

    describe('Prefix Mapping', () => {
        beforeEach(() => {
            document.body.innerHTML = createTerminalDOM();
            terminal = new EliteTerminal();
        });

        it('returns correct prefix for system', () => {
            expect(terminal.getPrefix('system')).toBe('[SYS]');
        });

        it('returns correct prefix for deploy', () => {
            expect(terminal.getPrefix('deploy')).toBe('[DEPLOY]');
        });

        it('returns correct prefix for api', () => {
            expect(terminal.getPrefix('api')).toBe('[API]');
        });

        it('returns correct prefix for error', () => {
            expect(terminal.getPrefix('error')).toBe('[ERR]');
        });

        it('returns default prefix for unknown type', () => {
            expect(terminal.getPrefix('unknown')).toBe('[LOG]');
        });
    });

    describe('Timestamp', () => {
        beforeEach(() => {
            document.body.innerHTML = createTerminalDOM();
            terminal = new EliteTerminal();
        });

        it('returns timestamp in HH:MM:SS format', () => {
            const timestamp = terminal.getTimestamp();

            expect(timestamp).toMatch(/^\d{2}:\d{2}:\d{2}$/);
        });
    });
});
