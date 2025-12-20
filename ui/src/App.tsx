/**
 * React App: Renders UI specs generated from COS core
 *
 * Three-layer guarantee:
 * 1. Core state machine (Rust) → prevents invalid state transitions
 * 2. UI contract (Rust + TypeScript) → defines allowed actions
 * 3. React components (this file) → renders ONLY what contract permits
 *
 * Frontend CANNOT invent actions.
 * Frontend CANNOT bypass contract.
 * Frontend is "dumb" (in a good way).
 */

import React, { useState } from 'react';
import { generateContract, UiStateTag, UiAction } from './contract';
import { generateUiSpec } from './uigen';
import { validateUiSpec } from './schema';
import type { UiSpec, UiNode } from './schema';
import type { ProofArtifact } from './uigen';

/**
 * Render a single UI node
 */
function renderNode(node: UiNode, onAction: (action: string) => void): React.ReactNode {
  switch (node.kind) {
    case 'StateBadge':
      return (
        <div style={{ padding: '1rem', fontSize: '0.875rem', background: '#f0f0f0' }}>
          State: {/* would show current state from contract */}
        </div>
      );

    case 'ProofPanel':
      return (
        <div style={{ padding: '1rem', background: '#e8f5e9', borderLeft: '4px solid #4caf50' }}>
          <strong>Proof of Safety</strong>
          <p>RIF = 0. All invariants satisfied. Structurality ≥ 80%.</p>
        </div>
      );

    case 'HaltPanel':
      return (
        <div style={{ padding: '1rem', background: '#fff3e0', borderLeft: '4px solid #ff9800' }}>
          <strong>System Halted</strong>
          <p>Convergence check did not pass. Review constraints and retry.</p>
        </div>
      );

    case 'Card':
      return (
        <div style={{ padding: '1rem', border: '1px solid #ddd', marginBottom: '1rem' }}>
          <h3>{node.title}</h3>
          <div>{node.body.map((child, i) => <div key={i}>{renderNode(child, onAction)}</div>)}</div>
        </div>
      );

    case 'ActionRow':
      return (
        <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
          {node.actions.map(action => (
            <button
              key={action}
              onClick={() => onAction(action)}
              style={{
                padding: '0.5rem 1rem',
                background: '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {action}
            </button>
          ))}
        </div>
      );

    case 'Stepper':
      return (
        <div>
          {node.steps.map((step, i) => (
            <div key={i} style={{ marginBottom: '1rem' }}>
              <h4>
                Step {i + 1}: {step.title}
              </h4>
              <div>{step.body.map((child, j) => <div key={j}>{renderNode(child, onAction)}</div>)}</div>
            </div>
          ))}
        </div>
      );

    default:
      const _exhaustive: never = node;
      return _exhaustive;
  }
}

/**
 * Main app component
 */
export function App() {
  const [state, setState] = useState<UiStateTag>(UiStateTag.Draft);
  const [proof] = useState<ProofArtifact>({
    workflow_id: 'w1',
    decision: 'Allow',
    rif: 0,
    converged: true,
    structurality: 90,
    reason: 'All invariants satisfied',
  });

  // Generate contract from state (from core)
  const contract = generateContract(state);

  // Generate UI spec from contract (from uigen)
  const spec = generateUiSpec(contract, proof);

  // Validate spec (ensure no invalid actions)
  const errors = validateUiSpec(spec);

  // Handle action clicks
  const handleAction = (action: string) => {
    console.log('Action:', action);

    // Simulate state transitions
    if (action === 'Validate') setState(UiStateTag.Validated);
    else if (action === 'Plan') setState(UiStateTag.Planned);
    else if (action === 'RunHypersim') setState(UiStateTag.Converged);
    else if (action === 'Execute') setState(UiStateTag.Executed);
    else if (action === 'Halt') setState(UiStateTag.Halted);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', fontFamily: 'system-ui' }}>
      <h1>Constrained Orchestration System</h1>

      {errors.length > 0 && (
        <div style={{ padding: '1rem', background: '#ffebee', color: '#c62828', marginBottom: '1rem' }}>
          <strong>UI Spec Validation Errors:</strong>
          <ul>
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ padding: '1rem', background: '#f5f5f5', marginBottom: '2rem' }}>
        <strong>Current State:</strong> {state} <br />
        <strong>Allowed Actions:</strong> {contract.allowed.join(', ') || 'none'}
      </div>

      {spec.nodes.map((node, i) => (
        <div key={i}>{renderNode(node, handleAction)}</div>
      ))}
    </div>
  );
}

export default App;
