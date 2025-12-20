/**
 * UIGen: Safe component generator
 *
 * Takes: UiContract (what's allowed) + ProofArtifact (why) + optional intent
 * Outputs: UiSpec (safe layout spec that cannot violate contract)
 *
 * This is where ML/LLM can be creative without being dangerous.
 * The validator ensures no action outside contract.allowed can render.
 */

import { UiAction, UiContract, UiStateTag } from './contract';
import { UiSpec, UiNode } from './schema';

export interface ProofArtifact {
  workflow_id: string;
  decision: 'Allow' | 'Halt';
  rif: number;
  converged: boolean;
  structurality: number;
  reason: string;
}

/**
 * Generate a safe UI spec from contract + proof + optional intent
 *
 * Strategy: Create layouts that are appropriate to state, constrained to allowed actions
 * - Draft: form to collect evidence + invariants
 * - Validated: show what was collected, allow planning
 * - Planned: show plan, allow running hypersim or halting
 * - Converged: show proof, allow execution
 * - Executed/Halted: terminal states, no actions
 */
export function generateUiSpec(
  contract: UiContract,
  proof: ProofArtifact,
  intent?: string
): UiSpec {
  const nodes: UiNode[] = [];

  // Always show state badge
  nodes.push({ kind: 'StateBadge' });

  // Add state-specific content
  switch (contract.tag) {
    case UiStateTag.Draft:
      nodes.push({
        kind: 'Card',
        title: 'Start Deletion',
        body: [
          {
            kind: 'ActionRow',
            actions: contract.allowed.filter(
              a => a === UiAction.AttachEvidence || a === UiAction.AttachInvariants
            ),
          },
        ],
      });
      break;

    case UiStateTag.Validated:
      nodes.push({
        kind: 'Card',
        title: 'Ready to Plan',
        body: [{ kind: 'ProofPanel' }, { kind: 'ActionRow', actions: contract.allowed }],
      });
      break;

    case UiStateTag.Planned:
      nodes.push({
        kind: 'Card',
        title: 'Run Convergence Check',
        body: [{ kind: 'ProofPanel' }, { kind: 'ActionRow', actions: contract.allowed }],
      });
      break;

    case UiStateTag.Converged:
      nodes.push({
        kind: 'Card',
        title: 'Ready to Execute',
        body: [
          { kind: 'ProofPanel' },
          {
            kind: 'ActionRow',
            actions: contract.allowed.filter(a => a === UiAction.Execute),
          },
        ],
      });
      break;

    case UiStateTag.Executed:
      nodes.push({
        kind: 'Card',
        title: 'Completed',
        body: [{ kind: 'ProofPanel' }],
      });
      break;

    case UiStateTag.Halted:
      nodes.push({
        kind: 'HaltPanel',
      });
      break;

    default:
      const _exhaustive: never = contract.tag;
      _exhaustive;
  }

  return {
    version: 'uigen_v1',
    stateTag: contract.tag,
    nodes,
    allowedActions: contract.allowed,
  };
}

/**
 * Example: Generate UI with intent text (for ML/LLM)
 *
 * In production, this would call an LLM to generate creative layouts
 * But the output is always validated against contract.allowed
 */
export function generateUiSpecWithIntent(
  contract: UiContract,
  proof: ProofArtifact,
  intent: string
): UiSpec {
  // For now, same as base generator
  // In future: pass intent to LLM, get creative layout, validate it
  return generateUiSpec(contract, proof, intent);
}
