# Command Patterns and Best Practices

Proven patterns for using Claude Automation Core commands

## Pattern Categories

### 1. Sequential Command Chaining

Execute commands in dependency order:

```typescript
async function sequentialChain(executor: CommandExecutor) {
  // Always analyze before acting
  const analysis = await executor("/analyze-custom-files");
  if (!analysis.success) return analysis;

  // Check status based on analysis
  const status = await executor("/evolution-status");
  if (!status.success) return status;

  // Fix issues if found
  if (status.data.issues > 0) {
    await executor("/fix-encoding-errors");
  }

  return { analysis, status };
}
```

### 2. Error Handling Pattern

Always handle command failures gracefully:

```typescript
async function robustExecution(
  executor: CommandExecutor,
  command: CommandName,
  retries = 3
): Promise<CommandResult> {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await executor(command);
      if (result.success) return result;

      // Log failure and retry
      console.warn(`Attempt ${i + 1} failed: ${result.error}`);
    } catch (error) {
      if (i === retries - 1) throw error;
    }
  }

  throw new Error(`Command failed after ${retries} attempts`);
}
```

### 3. Parallel Execution Pattern

Execute independent commands concurrently:

```typescript
async function parallelExecution(executor: CommandExecutor) {
  // These commands don't depend on each other
  const [health, status, config] = await Promise.all([
    executor("/health-probe"),
    executor("/evolution-status"),
    executor("/config-diff"),
  ]);

  return { health, status, config };
}
```

### 4. Conditional Execution Pattern

Execute commands based on conditions:

```typescript
async function conditionalWorkflow(executor: CommandExecutor) {
  const status = await executor("/evolution-status");

  if (status.data.fitness < 0.7) {
    // Low fitness - run fixes
    await executor("/fix-encoding-errors");
    await executor("/e2e-smoke");
  } else if (status.data.fitness >= 0.9) {
    // High fitness - innovate
    await executor("/innovation-scan");
    await executor("/experiments-plan");
  } else {
    // Stable - continue evolution
    await executor("/auto-evolve");
  }
}
```

### 5. Category-Based Command Selection

Execute commands by category:

```typescript
const CATEGORY_WORKFLOWS: Record<string, CommandName[]> = {
  cognition: [
    '/agent-arena',
    '/chaos-evolve',
    '/consciousness-report',
  ],
  evolution: [
    '/CHAIN-ALL-COMMANDS',
    '/analyze-custom-files',
    '/auto-chain',
  ],
  knowledge: [
    '/CHAIN-ALL-COMMANDS',
    '/agent-arena',
    '/auto-chain',
  ],
  operations: [
    '/CHAIN-ALL-COMMANDS',
    '/auto-recursive-chain-ai',
    '/check-drift',
  ],
  orchestration: [
    '/CHAIN-ALL-COMMANDS',
    '/abyssal',
    '/agent-arena',
  ],
  security: [
    '/CHAIN-ALL-COMMANDS',
    '/abyssal',
    '/attach-security',
  ],
  templates: [
    '/abyssal',
    '/chaos-evolve',
    '/feeling',
  ],
  testing: [
    '/CHAIN-ALL-COMMANDS',
    '/abyssal',
    '/adversarial',
  ],
  utility: [
    '/fix-encoding-errors',
    '/junk-scan',
  ],
};

async function executeCategoryWorkflow(
  executor: CommandExecutor,
  category: string
) {
  const commands = CATEGORY_WORKFLOWS[category] || [];
  for (const cmd of commands) {
    await executor(cmd);
  }
}
```

## Best Practices

### DO:
- Always check command results before proceeding
- Use `/analyze-custom-files` before making changes
- Chain related commands for workflow automation
- Use parallel execution for independent commands
- Handle errors gracefully with retries
- Log all command executions for debugging

### DON'T:
- Execute commands without checking dependencies
- Ignore command failures
- Run destructive commands without validation
- Chain commands with circular dependencies
- Execute too many commands in parallel (max 5)

## Troubleshooting

### Common Issues

1. **Command not found:** Check `/evolution-status` for available commands
2. **Encoding errors:** Run `/fix-encoding-errors`
3. **Dependency failures:** Check `/analyze-custom-files` for missing dependencies
4. **Low fitness:** Run `/auto-evolve` or `/self-evolve`
5. **Configuration drift:** Use `/check-drift` and `/config-diff`
