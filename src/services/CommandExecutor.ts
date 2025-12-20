/**
 * Command Executor
 * Enforces invariants for safe command execution
 *
 * I1: Only valid CommandIds can execute
 * I2: selectedIndex always in bounds
 * I4: Single concurrent execution
 */

import type { Command, CommandId, CommandState, PaletteState } from '../types/commands';
import { CommandState } from '../types/commands';

export class CommandExecutor {
  private commands: readonly Command[] = [];
  private selectedIndex = 0;
  private commandState: CommandState = CommandState.idle();
  private isOpen = false;
  private searchQuery = '';

  private listeners: Set<(state: PaletteState) => void> = new Set();

  // I4: Execution lock (prevents concurrent execution)
  private executionLock = false;

  constructor() {}

  /**
   * I2: Set selected index with bounds checking
   */
  setSelectedIndex(index: number, totalCount: number): void {
    if (totalCount === 0) {
      this.selectedIndex = 0;
      return;
    }
    this.selectedIndex = Math.max(0, Math.min(index, totalCount - 1));
    this.emit();
  }

  /**
   * I2: Move selection forward with wrapping
   */
  selectNext(totalCount: number): void {
    if (totalCount === 0) return;
    this.selectedIndex = (this.selectedIndex + 1) % totalCount;
    this.emit();
  }

  /**
   * I2: Move selection backward with wrapping
   */
  selectPrev(totalCount: number): void {
    if (totalCount === 0) return;
    this.selectedIndex = (this.selectedIndex - 1 + totalCount) % totalCount;
    this.emit();
  }

  /**
   * I1, I4: Execute selected command with locks
   */
  async executeSelected(commands: readonly Command[]): Promise<void> {
    // I2: Bounds check
    if (this.selectedIndex < 0 || this.selectedIndex >= commands.length) {
      this.commandState = CommandState.error('Invalid selection');
      this.emit();
      return;
    }

    // I4: Check execution lock
    if (this.executionLock) {
      this.commandState = CommandState.error('Execution in progress');
      this.emit();
      return;
    }

    const cmd = commands[this.selectedIndex];

    // I1: Verify command has valid ID
    if (!cmd || !cmd.id || !cmd.id.__brand) {
      this.commandState = CommandState.error('Invalid command ID');
      this.emit();
      return;
    }

    this.executionLock = true;
    this.commandState = CommandState.executing(cmd.id);
    this.emit();

    try {
      // Execute the command
      await Promise.resolve(cmd.action());

      // Mark as executed
      this.commandState = CommandState.executed(cmd.id);
      this.emit();

      // Auto-close palette after successful execution
      setTimeout(() => {
        this.close();
      }, 200);
    } catch (error) {
      this.commandState = CommandState.error(
        error instanceof Error ? error.message : 'Unknown error'
      );
      this.emit();
    } finally {
      this.executionLock = false;
    }
  }

  /**
   * I3: Palette open/close with state sync
   */
  open(): void {
    this.isOpen = true;
    this.selectedIndex = 0;
    this.searchQuery = '';
    this.commandState = CommandState.idle();
    this.emit();
  }

  close(): void {
    this.isOpen = false;
    this.commandState = CommandState.idle();
    this.emit();
  }

  /**
   * Filter commands by search query (I2: maintain valid selection)
   */
  setSearchQuery(query: string, commands: readonly Command[]): void {
    this.searchQuery = query;
    const filtered = this.filterCommands(commands, query);

    // I2: Adjust selection if it's now out of bounds
    if (this.selectedIndex >= filtered.length) {
      this.selectedIndex = Math.max(0, filtered.length - 1);
    }

    this.emit();
  }

  private filterCommands(
    commands: readonly Command[],
    query: string
  ): readonly Command[] {
    if (!query.trim()) return commands;

    const q = query.toLowerCase().trim();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q)
    );
  }

  /**
   * Observable state updates
   */
  subscribe(
    listener: (state: PaletteState) => void
  ): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const state: PaletteState = {
      isOpen: this.isOpen,
      filteredCommands: this.commands,
      selectedIndex: this.selectedIndex,
      commandState: this.commandState,
      searchQuery: this.searchQuery,
    };

    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (e) {
        console.error('[CommandExecutor] Listener error:', e);
      }
    });
  }

  /**
   * I5: Cleanup
   */
  destroy(): void {
    this.listeners.clear();
    if (this.listeners.size > 0) {
      throw new Error('[CommandExecutor] Cleanup failed: listeners still registered');
    }
  }

  getState(): PaletteState & { commands: readonly Command[] } {
    return {
      isOpen: this.isOpen,
      filteredCommands: this.commands,
      selectedIndex: this.selectedIndex,
      commandState: this.commandState,
      searchQuery: this.searchQuery,
      commands: this.commands,
    };
  }

  setCommands(commands: readonly Command[]): void {
    this.commands = commands;
    this.selectedIndex = 0;
    this.emit();
  }
}
