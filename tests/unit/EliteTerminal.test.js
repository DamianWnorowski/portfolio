/**
 * EliteTerminal Unit Tests
 * Tests for interactive terminal component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('EliteTerminal', () => {
    let EliteTerminal;
    let terminal;

    beforeEach(async () => {
        vi.resetModules();
        vi.useFakeTimers();

        document.body.innerHTML = '';
        document.head.innerHTML = '';

        const module = await import('../../src/components/EliteTerminal.js');
        EliteTerminal = module.EliteTerminal;
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('Initialization', () => {
        it('creates container if not found', () => {
            document.body.innerHTML = '<div class="grid"></div>';

            terminal = new EliteTerminal('terminal');

            expect(document.getElementById('terminal')).not.toBeNull();
        });

        it('uses existing container if found', () => {
            document.body.innerHTML = '<section id="terminal"></section>';

            terminal = new EliteTerminal('terminal');

            expect(terminal.container).toBe(document.getElementById('terminal'));
        });

        it('initializes command history', () => {
            document.body.innerHTML = '<section id="terminal"></section>';

            terminal = new EliteTerminal('terminal');

            expect(terminal.commandHistory).toEqual([]);
        });

        it('sets history index to -1', () => {
            document.body.innerHTML = '<section id="terminal"></section>';

            terminal = new EliteTerminal('terminal');

            expect(terminal.historyIndex).toBe(-1);
        });
    });

    describe('Rendering', () => {
        beforeEach(() => {
            document.body.innerHTML = '<section id="terminal"></section>';
            terminal = new EliteTerminal('terminal');
        });

        it('renders panel header', () => {
            const header = terminal.container.querySelector('.panel-header');
            expect(header).not.toBeNull();
        });

        it('renders window controls', () => {
            const controls = terminal.container.querySelectorAll('.window-btn');
            expect(controls.length).toBe(3);
        });

        it('renders terminal output area', () => {
            const output = terminal.container.querySelector('#terminal-output');
            expect(output).not.toBeNull();
        });

        it('renders input field', () => {
            const input = terminal.container.querySelector('#terminal-input');
            expect(input).not.toBeNull();
        });

        it('renders prompt indicator', () => {
            const prompt = terminal.container.querySelector('.prompt');
            expect(prompt.textContent).toContain('>');
        });
    });

    describe('Command Execution', () => {
        beforeEach(() => {
            document.body.innerHTML = '<section id="terminal"></section>';
            terminal = new EliteTerminal('terminal');
        });

        it('executes help command', () => {
            terminal.executeCommand('help');

            const output = terminal.container.querySelector('#terminal-output');
            expect(output.innerHTML).toContain('Available commands');
        });

        it('executes clear command', () => {
            terminal.executeCommand('help');
            terminal.executeCommand('clear');

            const output = terminal.container.querySelector('#terminal-output');
            expect(output.innerHTML).toBe('');
        });

        it('executes status command', () => {
            terminal.executeCommand('status');

            const output = terminal.container.querySelector('#terminal-output');
            expect(output.innerHTML).toContain('SYSTEM STATUS');
        });

        it('executes skills command', () => {
            terminal.executeCommand('skills');

            const output = terminal.container.querySelector('#terminal-output');
            expect(output.innerHTML).toContain('SKILL');
        });

        it('executes projects command', () => {
            terminal.executeCommand('projects');

            const output = terminal.container.querySelector('#terminal-output');
            expect(output.innerHTML).toContain('PROJECT');
        });

        it('executes contact command', () => {
            terminal.executeCommand('contact');

            const output = terminal.container.querySelector('#terminal-output');
            expect(output.innerHTML.toLowerCase()).toContain('contact');
        });

        it('handles unknown command', () => {
            terminal.executeCommand('unknowncommand');

            const output = terminal.container.querySelector('#terminal-output');
            expect(output.innerHTML).toContain('not recognized');
        });

        it('is case insensitive', () => {
            terminal.executeCommand('HELP');

            const output = terminal.container.querySelector('#terminal-output');
            expect(output.innerHTML).toContain('Available commands');
        });

        it('trims whitespace from commands', () => {
            terminal.executeCommand('  help  ');

            const output = terminal.container.querySelector('#terminal-output');
            expect(output.innerHTML).toContain('Available commands');
        });
    });

    describe('Command History', () => {
        beforeEach(() => {
            document.body.innerHTML = '<section id="terminal"></section>';
            terminal = new EliteTerminal('terminal');
        });

        it('adds command to history', () => {
            terminal.executeCommand('help');

            expect(terminal.commandHistory).toContain('help');
        });

        it('does not add empty commands', () => {
            terminal.executeCommand('');

            expect(terminal.commandHistory.length).toBe(0);
        });

        it('navigates history with up arrow', () => {
            const input = terminal.container.querySelector('#terminal-input');

            terminal.executeCommand('help');
            terminal.executeCommand('status');

            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));

            expect(input.value).toBe('status');
        });

        it('navigates history with down arrow', () => {
            const input = terminal.container.querySelector('#terminal-input');

            terminal.executeCommand('help');
            terminal.executeCommand('status');

            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));

            expect(input.value).toBe('status');
        });

        it('clears input on down at end of history', () => {
            const input = terminal.container.querySelector('#terminal-input');

            terminal.executeCommand('help');

            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));

            expect(input.value).toBe('');
        });
    });

    describe('Input Handling', () => {
        beforeEach(() => {
            document.body.innerHTML = '<section id="terminal"></section>';
            terminal = new EliteTerminal('terminal');
        });

        it('executes command on Enter key', () => {
            const input = terminal.container.querySelector('#terminal-input');
            input.value = 'help';

            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

            const output = terminal.container.querySelector('#terminal-output');
            expect(output.innerHTML).toContain('Available commands');
        });

        it('clears input after execution', () => {
            const input = terminal.container.querySelector('#terminal-input');
            input.value = 'help';

            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

            expect(input.value).toBe('');
        });

        it('shows command echo in output', () => {
            const input = terminal.container.querySelector('#terminal-input');
            input.value = 'help';

            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

            const output = terminal.container.querySelector('#terminal-output');
            expect(output.innerHTML).toContain('help');
        });
    });

    describe('Output Formatting', () => {
        beforeEach(() => {
            document.body.innerHTML = '<section id="terminal"></section>';
            terminal = new EliteTerminal('terminal');
        });

        it('formats success output in green', () => {
            terminal.print('Success message', 'success');

            const output = terminal.container.querySelector('#terminal-output');
            expect(output.innerHTML).toContain('success');
        });

        it('formats error output in red', () => {
            terminal.print('Error message', 'error');

            const output = terminal.container.querySelector('#terminal-output');
            expect(output.innerHTML).toContain('error');
        });

        it('formats info output in blue', () => {
            terminal.print('Info message', 'info');

            const output = terminal.container.querySelector('#terminal-output');
            expect(output.innerHTML).toContain('info');
        });

        it('auto-scrolls output to bottom', () => {
            const output = terminal.container.querySelector('#terminal-output');
            const scrollSpy = vi.spyOn(output, 'scrollTop', 'set');

            for (let i = 0; i < 20; i++) {
                terminal.print(`Line ${i}`);
            }

            expect(scrollSpy).toHaveBeenCalled();
        });
    });

    describe('Deploy Command', () => {
        beforeEach(() => {
            document.body.innerHTML = '<section id="terminal"></section>';
            terminal = new EliteTerminal('terminal');
        });

        it('shows deployment sequence', () => {
            terminal.executeCommand('deploy');

            vi.advanceTimersByTime(5000);

            const output = terminal.container.querySelector('#terminal-output');
            expect(output.innerHTML.toLowerCase()).toContain('deploy');
        });
    });

    describe('Styles', () => {
        it('adds styles to document', () => {
            document.body.innerHTML = '<section id="terminal"></section>';
            terminal = new EliteTerminal('terminal');

            const styles = document.getElementById('terminal-styles');
            expect(styles).not.toBeNull();
        });

        it('does not duplicate styles', () => {
            document.body.innerHTML = '<section id="terminal"></section>';
            new EliteTerminal('terminal');
            new EliteTerminal('terminal-2');

            const styles = document.querySelectorAll('#terminal-styles');
            expect(styles.length).toBe(1);
        });
    });

    describe('ASCII Art', () => {
        beforeEach(() => {
            document.body.innerHTML = '<section id="terminal"></section>';
            terminal = new EliteTerminal('terminal');
        });

        it('ascii command shows art', () => {
            terminal.executeCommand('ascii');

            const output = terminal.container.querySelector('#terminal-output');
            // Should contain some form of ASCII art or text banner
            expect(output.innerHTML.length).toBeGreaterThan(50);
        });
    });

    describe('Whoami Command', () => {
        beforeEach(() => {
            document.body.innerHTML = '<section id="terminal"></section>';
            terminal = new EliteTerminal('terminal');
        });

        it('shows user info', () => {
            terminal.executeCommand('whoami');

            const output = terminal.container.querySelector('#terminal-output');
            expect(output.innerHTML).toContain('Damian');
        });
    });

    describe('Cleanup', () => {
        it('removes event listeners on destroy', () => {
            document.body.innerHTML = '<section id="terminal"></section>';
            terminal = new EliteTerminal('terminal');

            const input = terminal.container.querySelector('#terminal-input');
            const removeEventSpy = vi.spyOn(input, 'removeEventListener');

            terminal.destroy();

            expect(removeEventSpy).toHaveBeenCalled();
        });
    });
});
