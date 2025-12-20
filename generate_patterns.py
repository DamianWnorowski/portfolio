#!/usr/bin/env python3
"""
AGENT 3: Create example workflows and patterns documentation
"""
import json
from pathlib import Path
from typing import Dict, List, Any

def generate_examples_md(commands_data: Dict[str, Any]) -> str:
    """Generate EXAMPLES.md with workflow chains"""
    lines = []
    lines.append("# Command Usage Examples\n")
    lines.append("20 example workflows demonstrating command chains and best practices\n")

    # Example 1: Evolution cycle
    lines.append("## Example 1: Complete Evolution Cycle\n")
    lines.append("**Objective:** Run a full system evolution and improvement cycle\n")
    lines.append("```bash")
    lines.append("# Step 1: Analyze current state")
    lines.append("/analyze-custom-files")
    lines.append("")
    lines.append("# Step 2: Check evolution status")
    lines.append("/evolution-status")
    lines.append("")
    lines.append("# Step 3: Fix any encoding issues")
    lines.append("/fix-encoding-errors")
    lines.append("")
    lines.append("# Step 4: Run multi-AI orchestration")
    lines.append("/multi-ai-orchestrate")
    lines.append("")
    lines.append("# Step 5: Review evolution summary")
    lines.append("/evolution-summary")
    lines.append("```\n")

    # Example 2: Testing pipeline
    lines.append("## Example 2: Complete Testing Pipeline\n")
    lines.append("**Objective:** Run all tests and validate system health\n")
    lines.append("```bash")
    lines.append("# Step 1: Health check")
    lines.append("/health-probe")
    lines.append("")
    lines.append("# Step 2: Run smoke tests")
    lines.append("/e2e-smoke")
    lines.append("")
    lines.append("# Step 3: Run full Playwright suite")
    lines.append("/e2e-playwright")
    lines.append("")
    lines.append("# Step 4: Analyze test patterns")
    lines.append("/pattern-analyze")
    lines.append("```\n")

    # Example 3: Security audit
    lines.append("## Example 3: Security Audit Workflow\n")
    lines.append("**Objective:** Complete security review and SBOM generation\n")
    lines.append("```bash")
    lines.append("# Step 1: Security review")
    lines.append("/security-review")
    lines.append("")
    lines.append("# Step 2: Generate SBOM")
    lines.append("/sbom")
    lines.append("")
    lines.append("# Step 3: Attach security agent")
    lines.append("/attach-security")
    lines.append("```\n")

    # Example 4: RAG workflow
    lines.append("## Example 4: RAG Knowledge Base Setup\n")
    lines.append("**Objective:** Build and query RAG knowledge base\n")
    lines.append("```bash")
    lines.append("# Step 1: Prepare RAG corpus")
    lines.append("/rag-prepare")
    lines.append("")
    lines.append("# Step 2: Build indexes")
    lines.append("/rag-build-index")
    lines.append("")
    lines.append("# Step 3: Query knowledge base")
    lines.append("/rag-query --query 'evolution patterns'")
    lines.append("")
    lines.append("# Step 4: Performance analysis")
    lines.append("/perf-rag")
    lines.append("```\n")

    # Example 5: Deployment
    lines.append("## Example 5: Production Deployment\n")
    lines.append("**Objective:** Deploy with full validation\n")
    lines.append("```bash")
    lines.append("# Step 1: Check drift")
    lines.append("/check-drift")
    lines.append("")
    lines.append("# Step 2: Health probe")
    lines.append("/health-probe")
    lines.append("")
    lines.append("# Step 3: Deploy")
    lines.append("/deploy-full")
    lines.append("")
    lines.append("# Step 4: Production dashboard")
    lines.append("/production-dashboard")
    lines.append("```\n")

    # Add 15 more concise examples
    more_examples = [
        ("Project Analysis", ["project-index", "project-overlaps", "junk-scan"], "Analyze project structure and identify issues"),
        ("Auto-Pipeline", ["auto-pipeline"], "Automated CI/CD pipeline execution"),
        ("Innovation Discovery", ["innovation-scan", "experiments-plan"], "Discover and plan new innovations"),
        ("Intent Mapping", ["intent-map"], "Map user intents to workflows"),
        ("Configuration Audit", ["config-diff"], "Review configuration changes"),
        ("Multi-AI Coordination", ["unified-multi-ai", "super-chain"], "Coordinate multiple AI systems"),
        ("Template Execution", ["abyssal", "spawn-template"], "Execute ABYSSAL templates"),
        ("Cognition Analysis", ["nexus-think", "consciousness-report"], "Deep cognitive analysis"),
        ("Tagging Workflow", ["tag", "tag-query", "tag-export"], "Tag and organize research"),
        ("Self-Evolution", ["self-evolve", "self-audit"], "Autonomous self-improvement"),
        ("Swarm Operations", ["swarm", "swarm-optimize"], "Swarm intelligence coordination"),
        ("Deep Research", ["deep-research", "multi-websearch"], "Multi-source research"),
        ("Chaos Testing", ["chaos-evolve", "adversarial"], "Chaos engineering and adversarial testing"),
        ("Recursive Reasoning", ["reverse-reason", "recursive-prompt"], "Advanced reasoning patterns"),
        ("Custom AI Setup", ["custom-ai-setup", "custom-ai"], "Configure custom AI agents"),
    ]

    for idx, (title, cmds, description) in enumerate(more_examples, start=6):
        lines.append(f"## Example {idx}: {title}\n")
        lines.append(f"**Objective:** {description}\n")
        lines.append("```bash")
        for cmd in cmds:
            lines.append(f"/{cmd}")
        lines.append("```\n")

    return '\n'.join(lines)

def generate_patterns_md(commands_data: Dict[str, Any]) -> str:
    """Generate PATTERNS.md with best practices"""
    lines = []
    lines.append("# Command Patterns and Best Practices\n")
    lines.append("Proven patterns for using Claude Automation Core commands\n")

    lines.append("## Pattern Categories\n")

    # Pattern 1: Command chaining
    lines.append("### 1. Sequential Command Chaining\n")
    lines.append("Execute commands in dependency order:\n")
    lines.append("```typescript")
    lines.append("async function sequentialChain(executor: CommandExecutor) {")
    lines.append("  // Always analyze before acting")
    lines.append('  const analysis = await executor("/analyze-custom-files");')
    lines.append("  if (!analysis.success) return analysis;\n")
    lines.append("  // Check status based on analysis")
    lines.append('  const status = await executor("/evolution-status");')
    lines.append("  if (!status.success) return status;\n")
    lines.append("  // Fix issues if found")
    lines.append("  if (status.data.issues > 0) {")
    lines.append('    await executor("/fix-encoding-errors");')
    lines.append("  }\n")
    lines.append("  return { analysis, status };")
    lines.append("}")
    lines.append("```\n")

    # Pattern 2: Error handling
    lines.append("### 2. Error Handling Pattern\n")
    lines.append("Always handle command failures gracefully:\n")
    lines.append("```typescript")
    lines.append("async function robustExecution(")
    lines.append("  executor: CommandExecutor,")
    lines.append("  command: CommandName,")
    lines.append("  retries = 3")
    lines.append("): Promise<CommandResult> {")
    lines.append("  for (let i = 0; i < retries; i++) {")
    lines.append("    try {")
    lines.append("      const result = await executor(command);")
    lines.append("      if (result.success) return result;\n")
    lines.append("      // Log failure and retry")
    lines.append("      console.warn(`Attempt ${i + 1} failed: ${result.error}`);")
    lines.append("    } catch (error) {")
    lines.append("      if (i === retries - 1) throw error;")
    lines.append("    }")
    lines.append("  }\n")
    lines.append("  throw new Error(`Command failed after ${retries} attempts`);")
    lines.append("}")
    lines.append("```\n")

    # Pattern 3: Parallel execution
    lines.append("### 3. Parallel Execution Pattern\n")
    lines.append("Execute independent commands concurrently:\n")
    lines.append("```typescript")
    lines.append("async function parallelExecution(executor: CommandExecutor) {")
    lines.append("  // These commands don't depend on each other")
    lines.append("  const [health, status, config] = await Promise.all([")
    lines.append('    executor("/health-probe"),')
    lines.append('    executor("/evolution-status"),')
    lines.append('    executor("/config-diff"),')
    lines.append("  ]);\n")
    lines.append("  return { health, status, config };")
    lines.append("}")
    lines.append("```\n")

    # Pattern 4: Conditional execution
    lines.append("### 4. Conditional Execution Pattern\n")
    lines.append("Execute commands based on conditions:\n")
    lines.append("```typescript")
    lines.append("async function conditionalWorkflow(executor: CommandExecutor) {")
    lines.append('  const status = await executor("/evolution-status");\n')
    lines.append("  if (status.data.fitness < 0.7) {")
    lines.append("    // Low fitness - run fixes")
    lines.append('    await executor("/fix-encoding-errors");')
    lines.append('    await executor("/e2e-smoke");')
    lines.append("  } else if (status.data.fitness >= 0.9) {")
    lines.append("    // High fitness - innovate")
    lines.append('    await executor("/innovation-scan");')
    lines.append('    await executor("/experiments-plan");')
    lines.append("  } else {")
    lines.append("    // Stable - continue evolution")
    lines.append('    await executor("/auto-evolve");')
    lines.append("  }")
    lines.append("}")
    lines.append("```\n")

    # Pattern 5: Category-based selection
    lines.append("### 5. Category-Based Command Selection\n")
    lines.append("Execute commands by category:\n")
    lines.append("```typescript")
    lines.append("const CATEGORY_WORKFLOWS: Record<string, CommandName[]> = {")
    for category, cmds in sorted(commands_data['taxonomy'].items()):
        sample_cmds = sorted(cmds)[:3]  # First 3 commands
        lines.append(f"  {category}: [")
        for cmd in sample_cmds:
            lines.append(f"    '{cmd}',")
        lines.append("  ],")
    lines.append("};\n")
    lines.append("async function executeCategoryWorkflow(")
    lines.append("  executor: CommandExecutor,")
    lines.append("  category: string")
    lines.append(") {")
    lines.append("  const commands = CATEGORY_WORKFLOWS[category] || [];")
    lines.append("  for (const cmd of commands) {")
    lines.append("    await executor(cmd);")
    lines.append("  }")
    lines.append("}")
    lines.append("```\n")

    # Best practices
    lines.append("## Best Practices\n")
    lines.append("### DO:")
    lines.append("- Always check command results before proceeding")
    lines.append("- Use `/analyze-custom-files` before making changes")
    lines.append("- Chain related commands for workflow automation")
    lines.append("- Use parallel execution for independent commands")
    lines.append("- Handle errors gracefully with retries")
    lines.append("- Log all command executions for debugging\n")

    lines.append("### DON'T:")
    lines.append("- Execute commands without checking dependencies")
    lines.append("- Ignore command failures")
    lines.append("- Run destructive commands without validation")
    lines.append("- Chain commands with circular dependencies")
    lines.append("- Execute too many commands in parallel (max 5)\n")

    lines.append("## Troubleshooting\n")
    lines.append("### Common Issues\n")
    lines.append("1. **Command not found:** Check `/evolution-status` for available commands")
    lines.append("2. **Encoding errors:** Run `/fix-encoding-errors`")
    lines.append("3. **Dependency failures:** Check `/analyze-custom-files` for missing dependencies")
    lines.append("4. **Low fitness:** Run `/auto-evolve` or `/self-evolve`")
    lines.append("5. **Configuration drift:** Use `/check-drift` and `/config-diff`\n")

    return '\n'.join(lines)

def main():
    print("AGENT 3: Generating patterns and examples...")

    # Load parsed commands data from AGENT 1
    data_path = Path(r"C:\Users\Ouroboros\Desktop\portflio-agent1\docs\commands_data.json")

    # Wait for AGENT 1 to complete if needed
    if not data_path.exists():
        print("  [WAIT] Waiting for AGENT 1 to complete...")
        import time
        max_wait = 30
        waited = 0
        while not data_path.exists() and waited < max_wait:
            time.sleep(1)
            waited += 1

        if not data_path.exists():
            print("  [FAIL] AGENT 1 data not available")
            return

    commands_data = json.loads(data_path.read_text(encoding='utf-8'))
    print(f"  [OK] Loaded {len(commands_data['commands'])} commands")

    output_dir = Path(r"C:\Users\Ouroboros\Desktop\portflio-agent3\docs")
    output_dir.mkdir(parents=True, exist_ok=True)

    # Generate EXAMPLES.md
    print("\nGenerating EXAMPLES.md...")
    examples = generate_examples_md(commands_data)
    examples_path = output_dir / "EXAMPLES.md"
    examples_path.write_text(examples, encoding='utf-8')
    print(f"  [OK] Written to {examples_path}")

    # Generate PATTERNS.md
    print("\nGenerating PATTERNS.md...")
    patterns = generate_patterns_md(commands_data)
    patterns_path = output_dir / "PATTERNS.md"
    patterns_path.write_text(patterns, encoding='utf-8')
    print(f"  [OK] Written to {patterns_path}")

    print("\n[COMPLETE] AGENT 3")
    print(f"  - Examples: {examples_path}")
    print(f"  - Patterns: {patterns_path}")

if __name__ == '__main__':
    main()
