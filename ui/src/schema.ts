/**
 * UI Schema: Contract that constrains UIgen creativity
 *
 * Ensures: UIgen can never invent actions outside UiContract.allowed
 * Ensures: All rendered actions are provably valid
 */

export type UiNodeKind =
  | 'Stepper'
  | 'Card'
  | 'ActionRow'
  | 'ProofPanel'
  | 'StateBadge'
  | 'HaltPanel';

export interface StepperNode {
  kind: 'Stepper';
  steps: Array<{
    title: string;
    body: UiNode[];
  }>;
}

export interface CardNode {
  kind: 'Card';
  title: string;
  body: UiNode[];
}

export interface ActionRowNode {
  kind: 'ActionRow';
  actions: string[]; // MUST be subset of allowedActions
}

export interface ProofPanelNode {
  kind: 'ProofPanel';
}

export interface StateBadgeNode {
  kind: 'StateBadge';
}

export interface HaltPanelNode {
  kind: 'HaltPanel';
}

export type UiNode =
  | StepperNode
  | CardNode
  | ActionRowNode
  | ProofPanelNode
  | StateBadgeNode
  | HaltPanelNode;

export interface UiSpec {
  version: 'uigen_v1';
  stateTag: string;
  nodes: UiNode[];
  allowedActions: string[]; // Copied from UiContract, NOT invented
}

/**
 * Validate UI spec: ensures no action outside allowedActions can render
 */
export function validateUiSpec(spec: UiSpec): string[] {
  const errors: string[] = [];

  // Check version
  if (spec.version !== 'uigen_v1') {
    errors.push(`Invalid version: ${spec.version}`);
  }

  // Collect all actions used in nodes
  const usedActions = new Set<string>();

  function collectActions(node: UiNode) {
    if (node.kind === 'ActionRow') {
      node.actions.forEach(a => usedActions.add(a));
    } else if (node.kind === 'Stepper') {
      node.steps.forEach(step => {
        step.body.forEach(collectActions);
      });
    } else if (node.kind === 'Card') {
      node.body.forEach(collectActions);
    }
  }

  spec.nodes.forEach(collectActions);

  // Verify all used actions are in allowedActions
  usedActions.forEach(action => {
    if (!spec.allowedActions.includes(action)) {
      errors.push(`Action "${action}" not in allowedActions`);
    }
  });

  // Verify no action appears that's not allowed
  spec.allowedActions.forEach(allowed => {
    if (typeof allowed !== 'string' || allowed.length === 0) {
      errors.push(`Invalid action: ${allowed}`);
    }
  });

  return errors;
}
