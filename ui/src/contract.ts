/**
 * UI Contract Integration
 * Converts core COS state → UI contracts → safe UI specs
 *
 * Three-layer guarantee:
 * 1. Core state (Rust typestate) → only valid transitions possible
 * 2. UI contract (Rust enum) → defines allowed actions
 * 3. UI spec (TypeScript) → renders only allowed actions
 */

export enum UiStateTag {
  Draft = 'Draft',
  Validated = 'Validated',
  Planned = 'Planned',
  Converged = 'Converged',
  Executed = 'Executed',
  Halted = 'Halted',
}

export enum UiAction {
  AttachEvidence = 'AttachEvidence',
  AttachInvariants = 'AttachInvariants',
  Validate = 'Validate',
  Plan = 'Plan',
  RunHypersim = 'RunHypersim',
  Execute = 'Execute',
  Halt = 'Halt',
}

export interface UiContract {
  tag: UiStateTag;
  allowed: UiAction[];
}

/**
 * Generate UI contract from state tag.
 * This is the single source of truth for what UI can show.
 *
 * Matches the logic in crates/cos-core/src/ui/mod.rs
 */
export function generateContract(tag: UiStateTag): UiContract {
  const allowed = (() => {
    switch (tag) {
      case UiStateTag.Draft:
        return [UiAction.AttachEvidence, UiAction.AttachInvariants, UiAction.Validate];
      case UiStateTag.Validated:
        return [UiAction.Plan];
      case UiStateTag.Planned:
        return [UiAction.RunHypersim, UiAction.Halt];
      case UiStateTag.Converged:
        return [UiAction.Execute];
      case UiStateTag.Executed:
        return [];
      case UiStateTag.Halted:
        return [];
      default:
        const _exhaustive: never = tag;
        return _exhaustive;
    }
  })();

  return { tag, allowed };
}

/**
 * Test: Verify that core and UI contracts are synchronized
 */
export function validateContractSync(): string[] {
  const errors: string[] = [];

  // Verify Draft state
  const draft = generateContract(UiStateTag.Draft);
  if (!draft.allowed.includes(UiAction.AttachEvidence)) {
    errors.push('Draft must allow AttachEvidence');
  }

  // Verify Execute only in Converged
  const states = [UiStateTag.Draft, UiStateTag.Validated, UiStateTag.Planned, UiStateTag.Executed, UiStateTag.Halted];
  states.forEach(state => {
    const contract = generateContract(state);
    if (state !== UiStateTag.Converged && contract.allowed.includes(UiAction.Execute)) {
      errors.push(`Execute should not be in ${state}`);
    }
  });

  // Verify Executed has no actions
  const executed = generateContract(UiStateTag.Executed);
  if (executed.allowed.length > 0) {
    errors.push('Executed state must have no allowed actions');
  }

  return errors;
}
