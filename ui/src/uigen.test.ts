/**
 * Tests: Verify UIgen cannot generate invalid actions
 */

import { describe, it, expect } from 'vitest';
import { generateContract, UiStateTag, UiAction } from './contract';
import { generateUiSpec } from './uigen';
import { validateUiSpec } from './schema';
import type { ProofArtifact } from './uigen';

const mockProof: ProofArtifact = {
  workflow_id: 'w1',
  decision: 'Allow',
  rif: 0,
  converged: true,
  structurality: 90,
  reason: 'Test',
};

describe('UIGen Safety', () => {
  it('Draft state allows evidence attachment', () => {
    const contract = generateContract(UiStateTag.Draft);
    expect(contract.allowed).toContain(UiAction.AttachEvidence);
  });

  it('Executed state allows no actions', () => {
    const contract = generateContract(UiStateTag.Executed);
    expect(contract.allowed).toHaveLength(0);
  });

  it('Execute action only available in Converged', () => {
    const states = [UiStateTag.Draft, UiStateTag.Validated, UiStateTag.Planned, UiStateTag.Executed];
    states.forEach(state => {
      const contract = generateContract(state);
      expect(contract.allowed).not.toContain(UiAction.Execute);
    });

    const converged = generateContract(UiStateTag.Converged);
    expect(converged.allowed).toContain(UiAction.Execute);
  });

  it('Generated spec is always valid', () => {
    const states = Object.values(UiStateTag).filter(s => typeof s === 'string');

    states.forEach(state => {
      const contract = generateContract(state as UiStateTag);
      const spec = generateUiSpec(contract, mockProof);
      const errors = validateUiSpec(spec);
      expect(errors).toHaveLength(0);
    });
  });

  it('UI spec cannot contain actions outside contract', () => {
    const draft = generateContract(UiStateTag.Draft);
    const spec = generateUiSpec(draft, mockProof);

    // Spec should only use Execute if it's in allowed
    const hasExecute = JSON.stringify(spec).includes(UiAction.Execute);
    if (hasExecute) {
      expect(draft.allowed).toContain(UiAction.Execute);
    }
  });

  it('All actions in spec are in contract', () => {
    const contract = generateContract(UiStateTag.Planned);
    const spec = generateUiSpec(contract, mockProof);

    // Collect all actions from spec
    const usedActions = new Set<string>();

    function collectActions(node: any): void {
      if (node.kind === 'ActionRow') {
        node.actions.forEach((a: string) => usedActions.add(a));
      } else if (node.kind === 'Stepper') {
        node.steps.forEach((step: any) => step.body.forEach(collectActions));
      } else if (node.kind === 'Card') {
        node.body.forEach(collectActions);
      }
    }

    spec.nodes.forEach(collectActions);

    // All used actions must be in contract.allowed
    usedActions.forEach(action => {
      expect(contract.allowed).toContain(action);
    });
  });
});

describe('Contract Synchronization', () => {
  it('Draft → Validate → Planned → RunHypersim → Converged → Execute → Executed', () => {
    let contract = generateContract(UiStateTag.Draft);
    expect(contract.allowed).toContain(UiAction.Validate);

    contract = generateContract(UiStateTag.Validated);
    expect(contract.allowed).toContain(UiAction.Plan);

    contract = generateContract(UiStateTag.Planned);
    expect(contract.allowed).toContain(UiAction.RunHypersim);

    contract = generateContract(UiStateTag.Converged);
    expect(contract.allowed).toContain(UiAction.Execute);

    contract = generateContract(UiStateTag.Executed);
    expect(contract.allowed).toHaveLength(0);
  });

  it('Halt is always available from Planned', () => {
    const contract = generateContract(UiStateTag.Planned);
    expect(contract.allowed).toContain(UiAction.Halt);
  });
});
