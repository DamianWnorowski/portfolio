## PR: Elimination of Invalid Futures

> **Rule:** All PRs modifying critical features must include a HYPERLIST artifact proving RIF = 0.

### What is this PR changing?

- [ ] Navigation / UI state
- [ ] Data fetching / real-time updates
- [ ] Command execution / actions
- [ ] Authentication / security
- [ ] State management
- [ ] Other: _______________

### Irreversible Boundary

Describe the point-of-no-return in this change:
(e.g., "Display of user metrics", "Execution of command", "Deletion of data")

```
[describe here]
```

### Future Enumeration

List all plausible invalid futures (what can go wrong?):

- [ ] F1: _______________
- [ ] F2: _______________
- [ ] F3: _______________
- [ ] F4: _______________
- [ ] F5: _______________

### Hyperlist Artifact

If this PR introduces new critical functionality, you must provide a HYPERLIST:

**File:** `HYPERLIST_[FeatureName].md`

The hyperlist must contain:

- [ ] Irreversibility gate (entry condition)
- [ ] Future enumeration (F1..N)
- [ ] Invariant ledger (I1..N)
- [ ] Elimination trace (mechanism for each F)
- [ ] Structurality check (≥80%)
- [ ] RIF = 0 confirmation

**Not sure if you need a hyperlist?**
Ask:
> Does this PR have an irreversible boundary (data change, state mutation, user action)?

If YES → you need a HYPERLIST.

### Structural Elimination (Type-First)

Describe how invalid futures are eliminated:

- [ ] **TYPE_SYSTEM** — Branded types, sealed enums, impossible states
- [ ] **STATE_MACHINE** — Valid transition constraints
- [ ] **COMPILE_GATE** — Assertions, proof requirements before action
- [ ] **UI_CONSTRAINT** — Invalid actions not clickable/expressible
- [ ] RUNTIME_GATE (last resort) — Bounded, deterministic checks

**Avoid:**
- [ ] Runtime warnings as safety mechanism
- [ ] "Best practice" documentation
- [ ] Human responsibility for invariants
- [ ] "If" statements checking truth

### Testing

- [ ] Tests assert **impossibility** of eliminated futures
- [ ] Tests verify state machine transitions
- [ ] Tests confirm type invariants

Example:

```typescript
// ✗ Bad: Just checking the happy path
test('command executes', () => {
  executor.executeSelected(commands);
  expect(executed).toBe(true);
});

// ✓ Good: Asserting the invalid future is impossible
test('cannot execute out-of-bounds command', () => {
  executor.setSelectedIndex(999, 5); // bounds exceeded
  executor.executeSelected(commands);
  expect(executionLock).toBe(true); // execution prevented
});
```

### Checklist

- [ ] HYPERLIST artifact included (if applicable)
- [ ] RIF verified = 0
- [ ] Structurality ≥ 80%
- [ ] All invariants structurally enforced
- [ ] No runtime-only safety checks
- [ ] TypeScript compiles without error
- [ ] Tests verify impossibility, not just possibility
- [ ] CI gate passes

### Notes

(Additional context for reviewers)

---

> **Remember:** If correctness depends on understanding, the system is not finished.
> If safety requires trust, it is lying.
> If truth depends on behavior, it is not engineered.
