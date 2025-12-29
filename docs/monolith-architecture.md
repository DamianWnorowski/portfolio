# Monolith Agent OS Architecture

Date: 2025-12-29

## 1) High-Level Overview
The system is a single product with multiple surfaces (web app, CLI bridge, IDE panel) that all route through the same policy gate, agent core, and tool execution fabric. The state machine determines which actions can be expressed at any moment.

## 2) System Diagram (Mermaid)
```mermaid
flowchart LR
  subgraph Surfaces
    UI[Web App UI]
    CLI[CLI Bridge]
    IDE[IDE Panel]
  end

  subgraph Core
    SM[State Machine + Action Gate]
    PE[Policy Engine]
    AG[Agent Core]
    PL[Planner]
    EX[Executor]
    MJ[Multi-Agent Judge]
    TR[Tool Router]
  end

  subgraph Tools
    FS[File Search]
    WS[Web Search]
    CI[Code Interpreter]
    BR[Browser Control]
    MCP[Remote MCP Servers]
  end

  subgraph Data
    WSRC[Workspace]
    POL[Policy Store]
    AUD[Audit Log]
    TEL[Telemetry]
    CACHE[Artifact Cache]
  end

  UI --> SM
  CLI --> SM
  IDE --> SM

  SM --> PE
  SM --> AG
  PE --> TR

  AG --> PL --> EX --> TR
  AG --> MJ

  TR --> FS
  TR --> WS
  TR --> CI
  TR --> BR
  TR --> MCP

  EX --> WSRC
  PE --> POL
  SM --> AUD
  AG --> AUD
  TR --> AUD
  SM --> TEL
  AG --> TEL
  TR --> TEL
  PL --> CACHE
  EX --> CACHE
```

## 3) State Machine (Mermaid)
```mermaid
stateDiagram-v2
  [*] --> Idle
  Idle --> PlanDraft: new request
  PlanDraft --> PlanReview: plan ready
  PlanReview --> Approved: approval granted
  PlanReview --> Halted: plan rejected or ambiguous
  Approved --> Executing
  Executing --> AwaitingApproval: policy gate triggered
  AwaitingApproval --> Executing: approval granted
  Executing --> Halted: missing prereq or failure
  Executing --> Completed: tests pass and summary emitted
  Halted --> Idle: user acknowledges and resets
  Completed --> Idle
```

## 4) Module Responsibilities
- State Machine + Action Gate: renders only valid actions; blocks unsafe actions by construction.
- Policy Engine: evaluates allow/deny/ask rules per tool, scope, and action.
- Planner: produces a structured plan with explicit prerequisites and validation steps.
- Executor: performs edits and commands inside a scoped workspace.
- Multi-Agent Judge: runs parallel variants and selects best output.
- Tool Router: enforces schema validation and routes tool calls.
- Audit Log: immutable ledger of plans, approvals, commands, diffs, and outcomes.

## 5) Data and Storage
- Workspace: source code and files (read/write within scope only).
- Policy Store: org rules, per-repo constraints, allowlists.
- Audit Log: append-only record for compliance.
- Telemetry: performance metrics, error rates, and policy outcomes.
- Artifact Cache: plans, patches, test results, and reports.

## 6) Security Boundaries
- Tool calls cannot bypass Policy Engine.
- Executor runs in a constrained workspace scope.
- Any cross-boundary action requires explicit policy approval.

## 7) Failure and Halt Behavior
- Ambiguity, missing prerequisites, or test failures trigger Halted state.
- Halted state exposes a single safe next action: resolve or exit.
- No partial side effects are applied without explicit state transition.

## 8) Deployment Topology
- Single web UI + local bridge for filesystem access.
- Optional cloud agent workers for long-running tasks.
- Optional MCP connectors for external data sources.
