/**
 * Claude Automation Core - Usage Examples
 * Demonstrates how to use the command type definitions
 */

import type {
  CommandExecutor,
  CommandResult,
  CommandName,
  CommandMetadata,
} from "./commands.d.ts";

// Example 1: Basic command execution
async function executeCommand(
  executor: CommandExecutor,
  command: CommandName
): Promise<CommandResult> {
  return await executor(command);
}

// Example 2: Command with parameters
async function analyzeCustomFiles(executor: CommandExecutor) {
  return await executor("/analyze-custom-files", {
    "output-format": "json"
  });
}

// Example 3: Chained commands
async function evolutionCycle(executor: CommandExecutor) {
  const analyze = await executor("/analyze-custom-files");
  const status = await executor("/evolution-status");
  const orchestrate = await executor("/multi-ai-orchestrate");
  return { analyze, status, orchestrate };
}

// Example 4: Type-safe command dispatcher
class CommandDispatcher {
  constructor(private executor: CommandExecutor) {}

  async dispatch(command: CommandName, params?: Record<string, any>) {
    console.log(`Executing: ${command}`);
    const result = await this.executor(command, params);
    if (!result.success) {
      throw new Error(`Command failed: ${result.error}`);
    }
    return result.data;
  }
}
