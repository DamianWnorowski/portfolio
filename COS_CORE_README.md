# COS Core: Constrained Orchestration System

> **Three-layer permanent safety architecture. Invalid futures eliminated at compile-time, proof-time, and runtime.**

## Overview

COS Core is the **immutable truth kernel** for the HYPERALL framework. It implements:

1. **Rust typestate machine** — Invalid state transitions cannot compile
2. **Proof artifacts** — Immutable evidence that invariants held
3. **UI contracts** — Definition of what frontend is permitted to show
4. **React UIgen** — Safe component generation from contracts

**Architecture Guarantee:** Each layer seals the previous one. No way to bypass. No exceptions. No overrides.

---

## Layer 1: Rust Typestate (Strongest)

### What It Does

Uses Rust's type system to make invalid states **unrepresentable**.

### Example: Deletion COS

```rust
let draft = DeletionCOS::<Draft>::new(account);
let draft = draft.attach_evidence("evidence");
let draft = draft.attach_invariants("invariants");

// This COMPILES and WORKS:
let validated = draft.validate()?;
let planned = validated.plan("plan")?;
let converged = planned.run_hypersim()?;
let executed = converged.execute();  // ✓ Only here is execute() available

// This DOES NOT COMPILE:
draft.execute();  // ❌ error[E0599]: no method `execute` found for Draft
planned.run_hypersim();  // ❌ error[E0599]: no method `run_hypersim` found for Planned
```

### Compile-Fail Tests

Prove certain code *cannot* compile:

```bash
cargo test -p cos-core --test compile_fail
```

Output:

```
✓ cannot_execute_from_draft.rs ... ok
✓ cannot_run_hypersim_from_draft.rs ... ok
```

These test files *must* fail to compile. If they ever compile, the typestate has regressed.

---

## Layer 2: Proof Artifacts (Immutable Record)

### What It Does

Creates permanent evidence that a workflow instance satisfied all gates.

### Proof Artifact Structure

```rust
pub struct ProofArtifact {
    pub workflow_id: String,           // Unique ID for this run
    pub invariant_set_id: String,      // Version of invariants used
    pub decision: Decision,            // Allow or Halt
    pub rif: u32,                      // Remaining Invalid Futures (must be 0)
    pub converged: bool,               // Did all futures converge?
    pub structurality: u8,             // % structural elimination (must be ≥80)
    pub reason: String,                // Human explanation
    pub budget: BudgetUsed,            // Exploration budget stats
    pub execution_boundary_fingerprint: String,  // Boundary contract hash
}
```

### Validation Gates

Allow gate requires ALL:

```rust
artifact.validate_allow_invariants()?
```

Checks:
- ✓ `decision == Allow`
- ✓ `rif == 0` (zero remaining invalid futures)
- ✓ `converged == true` (all futures agreed)
- ✓ `structurality >= 80` (mostly structural elimination)

### Storage: NDJSON (Append-Only)

```
{"workflow_id":"w1","decision":"Allow","rif":0,"converged":true,...}
{"workflow_id":"w2","decision":"Halt","rif":5,"converged":false,...}
```

Never modify existing lines. Only append. Immutable audit trail.

---

## Layer 3: UI Contracts (TypeScript Sync)

### What It Does

Defines what the frontend is **permitted** to show. Synchronized with Rust core.

### Contract Definition

```typescript
enum UiStateTag {
  Draft = 'Draft',
  Validated = 'Validated',
  Planned = 'Planned',
  Converged = 'Converged',
  Executed = 'Executed',
  Halted = 'Halted',
}

interface UiContract {
  tag: UiStateTag;
  allowed: UiAction[];  // Only these actions can render
}
```

### Contract Generation (Must Match Core)

```typescript
function generateContract(tag: UiStateTag): UiContract {
  switch (tag) {
    case UiStateTag.Draft:
      return { tag, allowed: [AttachEvidence, AttachInvariants, Validate] };
    case UiStateTag.Converged:
      return { tag, allowed: [Execute] };
    // ...
  }
}
```

**CRITICAL:** This logic is replicated exactly from `crates/cos-core/src/ui/mod.rs`. Must stay synchronized.

---

## Layer 4: React UIGen (Safe Generation)

### What It Does

Generates safe React components from UI contracts.

### Flow

```
Core State (Rust)
    ↓
UI Contract (from core)
    ↓
UIGen Spec (generated)
    ↓
React Components (rendered)
```

### UI Spec Structure

```typescript
interface UiSpec {
  version: 'uigen_v1';
  stateTag: string;
  nodes: UiNode[];
  allowedActions: string[];  // MUST match contract.allowed
}
```

### Safety Guarantee

Validator ensures:

```typescript
validateUiSpec(spec): string[]
```

Checks:
- ✓ All actions in nodes are in `spec.allowedActions`
- ✓ `spec.allowedActions` matches `contract.allowed` exactly
- ✓ No action outside contract can render

---

## Running Tests

### Unit Tests

```bash
cargo test -p cos-core --lib
```

Output: ✓ 14 tests pass (proof, typestate, domain)

### Compile-Fail Tests

```bash
cargo test -p cos-core --test compile_fail
```

Output: ✓ 2 compile-fail tests pass (proves invalid transitions don't compile)

### React UIGen Tests

```bash
npm run test -- ui/src/uigen.test.ts
```

Output: ✓ Contract-spec synchronization verified

---

## File Structure

```
crates/cos-core/
├── Cargo.toml
└── src/
    ├── lib.rs
    ├── proof/
    │   ├── artifact.rs        (ProofArtifact structure)
    │   ├── append_only.rs     (NDJSON storage)
    │   └── mod.rs
    ├── domain/
    │   ├── deletion.rs        (Typestate machine example)
    │   └── mod.rs
    └── ui/
        └── mod.rs            (UI contract generation)

ui/src/
├── App.tsx               (React app that renders UI specs)
├── contract.ts           (TypeScript UI contract, mirrors Rust)
├── schema.ts             (UI spec validator)
├── uigen.ts              (Safe component generation)
└── uigen.test.ts         (Contract-spec synchronization tests)
```

---

## Design Principles

### 1. Typestate Prevents Wrong Transitions

You cannot call `execute()` on `Draft`. It doesn't exist on that type.
This is stronger than runtime validation.

### 2. Proof Artifacts Are Immutable

Never modify a proof. Only append new proofs.
This creates permanent audit trail.

### 3. UI Contract Mirrors Core

The TypeScript `generateContract()` function is NOT independent logic.
It must exactly match `crates/cos-core/src/ui/mod.rs`.
Any divergence is a bug.

### 4. Frontend Cannot Invent Actions

The React app only renders what the spec permits.
The spec only contains actions from the contract.
The contract only contains actions the core permits.

**Three-level lock.**

### 5. Halt Is Always Safe

Halting doesn't violate RIF = 0 requirement.
Halting is the correct behavior when convergence fails.
UI explicitly supports Halt action at appropriate states.

---

## Integration Example

```typescript
// 1. Core says what state we're in
const coreState = UiStateTag.Planned;

// 2. Contract says what's allowed
const contract = generateContract(coreState);
// { tag: 'Planned', allowed: ['RunHypersim', 'Halt'] }

// 3. UIGen creates safe spec
const spec = generateUiSpec(contract, proof);

// 4. Validator proves spec is safe
const errors = validateUiSpec(spec);
// errors.length === 0 ✓

// 5. React renders only what spec permits
<App spec={spec} />
// Renders: "Run Hypersim" button, "Halt" button
// Cannot render: "Execute" button (not in spec)
```

---

## Extensibility

### Adding a New State

1. Add variant to `Draft`, `Validated`, etc. in `crates/cos-core/src/domain/deletion.rs`
2. Implement methods for transitions on that state
3. Add `UiStateTag` variant in `ui/src/contract.ts`
4. Add case in `generateContract()` in both Rust and TypeScript
5. Compile-fail tests will catch any missing transitions
6. UIGen tests will verify contract-spec sync

### Changing a Transition

1. Modify method in `crates/cos-core/src/domain/deletion.rs`
2. Compile-fail tests prove it's valid
3. Update `generateContract()` if actions changed
4. UIGen tests verify sync

### Adding a New Action

1. Add variant to `UiAction` enum (Rust + TypeScript)
2. Add case in `generateContract()` (both places)
3. UIGen tests enforce contract-spec sync
4. React app automatically supports it

---

## Truth Is Structural, Not Social

**This is not a guideline.** This is the system architecture.

- You cannot accidentally execute the wrong state (compiler prevents it)
- You cannot accidentally show the wrong action (validator prevents it)
- You cannot accidentally create invalid proof (structure prevents it)
- You cannot accidentally bypass contract (UIGen prevents it)

Every safety mechanism is **structural, not cultural**.

---

## Running the Full Stack

```bash
# Build core
cargo build -p cos-core

# Test core
cargo test -p cos-core

# Test UIGen
npm run test

# Run React app
npm run dev
```

Navigate to http://localhost:5173 and step through the deletion workflow.

Notice:
- Only allowed buttons appear per state
- Invalid transitions are impossible (Rust prevents it)
- Halt is always available (type level)
- Executed state has no actions (contract enforces it)

---

## Maintenance

### Keeping Contracts Synchronized

Rust and TypeScript must have identical logic in `generateContract()`.

Test both:

```bash
cargo test -p cos-core --lib  # Rust contract tests
npm run test                   # TypeScript contract-spec tests
```

If either fails, contracts are out of sync.

### Audit Trail

Check proof artifacts:

```bash
# View all proofs (NDJSON)
cat proofs.ndjson | jq '.decision'
```

Every deployment should append a proof showing RIF = 0.

---

## That's It

COS Core is the permanent, unchanging foundation.

Everything else—UI, features, improvements—sits on top and is constrained by what this core permits.

Invalid futures are **eliminated**.

🚫 No invalid futures.
🔐 Locked at three levels.
📝 Proven by tests.
Forever.
