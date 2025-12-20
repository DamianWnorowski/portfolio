/**
 * Command Type System
 * Enforces invariants at compile-time for command execution
 */

// Command identity (prevents execution of wrong command)
export type CommandId = { readonly __brand: 'CommandId'; readonly id: string };

export function CommandId(id: string): CommandId | null {
  if (!id || typeof id !== 'string' || id.length === 0) return null;
  return { __brand: 'CommandId', id } as CommandId;
}

// Command state machine (I1: only safe states are executable)
export type CommandState =
  | { readonly status: 'idle' }
  | { readonly status: 'selected'; readonly index: number }
  | { readonly status: 'executing'; readonly id: CommandId }
  | { readonly status: 'executed'; readonly id: CommandId }
  | { readonly status: 'error'; readonly reason: string };

export const CommandState = {
  idle: (): CommandState => ({ status: 'idle' }),
  selected: (index: number): CommandState => ({
    status: 'selected',
    index: Math.max(0, index),
  }),
  executing: (id: CommandId): CommandState => ({ status: 'executing', id }),
  executed: (id: CommandId): CommandState => ({ status: 'executed', id }),
  error: (reason: string): CommandState => ({ status: 'error', reason }),
};

// Command definition (strict structure)
export type Command = Readonly<{
  id: CommandId;
  label: string;
  category: string;
  icon: string;
  // Action is a pure function that returns void (no side effects here)
  action: () => void;
}>;

// Palette state (I2: UI reflects true state)
export type PaletteState = {
  readonly isOpen: boolean;
  readonly filteredCommands: readonly Command[];
  readonly selectedIndex: number;
  readonly commandState: CommandState;
  readonly searchQuery: string;
};

// Invariants
export const PALETTE_INVARIANTS = {
  I1: 'Only commands with valid CommandId can be executed',
  I2: 'selectedIndex is always within filteredCommands bounds',
  I3: 'isOpen and DOM visibility must be synchronized',
  I4: 'Only one command executes at a time',
  I5: 'Invalid command state prevents render',
};
