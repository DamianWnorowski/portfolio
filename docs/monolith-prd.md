# Monolith Agent OS PRD

Date: 2025-12-29
Owner: Product + Engineering
Status: Draft

## 1) Summary
Build a single, end-to-end engineering cockpit that fuses terminal power, IDE comfort, agentic autonomy, and non-coder-safe UX gates. The system must eliminate invalid futures by design: only valid actions are visible; unsafe actions are impossible to express; ambiguity halts execution.

## 2) Problem Statement
Existing tools split across chat, IDE, CLI, and cloud agents. Users can still click unsafe actions, skip steps, or proceed in ambiguity. This creates invalid futures and trust-based execution. We need a monolithic app that encodes rules as hard gates so correctness does not depend on user knowledge or discipline.

## 3) Goals
- Non-coder safety: no unsafe clicks, no step skipping, no irreversible actions without explicit policy.
- Single surface: one UI that unifies planning, execution, testing, and review.
- Agentic capability: plan -> execute -> validate -> summarize with minimal human intervention.
- Policy-first execution: all tool use gated by explicit, auditable rules.
- Fast feedback: short cycle from intent to verified change.

## 4) Non-Goals
- Replace existing IDEs or terminals entirely.
- Support every third-party integration on day one.
- Full offline operation (initially).

## 5) Target Users
- Non-coder operators who must not be able to do unsafe actions.
- Developers who want fast, agentic refactors with tool control.
- Admins who need governance, auditability, and policy control.

## 6) Core User Stories
- As a non-coder, I can only see actions that are safe to perform in the current state.
- As a developer, I can request a change and the agent plans, edits, tests, and reports.
- As an admin, I can enforce org policies, require approvals, and review audit trails.

## 7) Functional Requirements
### 7.1 UI and State Model
- State machine that reveals only valid actions.
- Explicit state label and next-action guidance at all times.
- A visible halt state with a clear reason and a single, safe next step.

### 7.2 Agent Core
- Planner that produces a step-by-step plan with explicit preconditions.
- Executor that can read/write files and run commands within scope.
- Multi-agent mode with a judge that selects the best candidate output.

### 7.3 Tool Fabric
- Built-in tools: file search, web search, code interpreter, browser control.
- Remote MCP servers for external tools and data.
- Strict schema validation for tool calls.

### 7.4 Validation
- Test runner integration (narrow -> broad) with halt on failure.
- Browser-based UI tests with reflection loop for fixes.
- Structured summary of changes and tests run.

### 7.5 Governance
- Policy engine with allow/deny/ask rules per tool and per scope.
- Audit log of every action, decision, and approval.
- Admin analytics and policy management.

## 8) Safety and UX Invariants
- Only valid actions visible.
- No step skipping.
- No irreversible actions without explicit policy.
- Clear state label and next action at all times.
- On ambiguity or missing prerequisites, system halts with reason and next step.

## 9) Acceptance Criteria (Non-Coder Truth Test)
- Button Test: cannot click unsafe, unknown, or irreversible actions.
- Confusion Test: state is obvious; next action is obvious; no interpretation required.
- Impatience Test: skipping or retry spam is refused with a reason.
- Halt Test: system stops cleanly on ambiguity; no side effects.
- Malice Test: wrong intent cannot be expressed.
- Explanation Test: reasons cite rules, not authority.
- Ignorance Proof: correctness does not require user understanding or trust.

## 10) Non-Functional Requirements
- Security: strict tool permissions; least privilege by default.
- Reliability: crash-safe action ledger; retry is explicit and logged.
- Observability: structured logs, traces, and metrics.
- Performance: plan in <5s for typical tasks; edits in <30s.

## 11) Metrics
- Non-coder test pass rate: 100% in lab.
- Task success rate without human correction.
- Time from request to verified change.
- % of actions blocked by policy (should reflect safety maturity).

## 12) Risks
- Over-restrictive gating slows expert workflows.
- Integration sprawl raises maintenance burden.
- Multi-agent orchestration may increase cost/latency.

## 13) Open Questions
- Default policy set for new orgs.
- How to surface safe partial progress without implying completion.
- Minimum viable tool set for launch.
