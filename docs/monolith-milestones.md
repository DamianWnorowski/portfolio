# Monolith Agent OS Milestones

Date: 2025-12-29

## Phase 0 - Definition (1-2 weeks)
Checklist
- PRD approved and safety invariants locked
- State machine spec written
- Non-coder truth test mapped to UI behaviors
- MVP cutline finalized

Exit criteria
- Paper prototype passes Button Test and Confusion Test

## Phase 1 - MVP Safety Shell (4-6 weeks)
Checklist
- UI shell with explicit state label and action gating
- Policy engine (allow/deny/ask) wired to all tool calls
- Planner -> Executor loop with file edits in scope
- Audit log with plan, approvals, and diffs
- Minimal tool set: file search + command runner

Exit criteria
- Non-coder tests 1-4 pass in lab
- No unsafe action can be expressed

## Phase 2 - Agentic Power (6-8 weeks)
Checklist
- Multi-agent orchestration + judging
- Plan visualization (Mermaid or equivalent)
- Test runner loop with halt on failure
- Basic browser testing with reflection

Exit criteria
- Non-coder tests 1-6 pass
- All changes require successful tests before completion

## Phase 3 - Integrations + Governance (8-12 weeks)
Checklist
- Remote MCP connectors + external integrations
- Admin controls and org policy management
- Slack integration + SDK hooks
- Observability dashboard (policy outcomes, failures)

Exit criteria
- Non-coder test 7 passes
- Red-team misuse attempts blocked by policy

## MVP Cutline (minimum shippable)
- State machine gating
- Policy engine with allow/deny/ask
- Planner and executor for file edits
- Audit log
- Minimal tool set
- Non-coder tests 1-4 pass

## Metrics to Track Each Phase
- Non-coder test pass rate
- Task success without human correction
- Time to verified change
- Policy block rate
