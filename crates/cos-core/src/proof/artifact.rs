/// Proof Artifact: Immutable evidence that invariants held during execution.
/// Never modified. Only appended. Never replayed or reinterpreted.

use serde::{Deserialize, Serialize};

/// The gate's final decision: proceed or halt.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum Decision {
    Allow,
    Halt,
}

/// Budget tracking and hypersim exploration stats.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetUsed {
    /// Maximum futures allowed to explore
    pub max_futures: u32,
    /// Maximum depth of tree search
    pub max_depth: u32,
    /// Repair budget (retries, rollbacks)
    pub repair_budget: u32,
    /// Futures actually explored
    pub explored_futures: u32,
    /// Futures pruned (violate invariants)
    pub pruned_futures: u32,
}

/// Immutable proof that a workflow instance satisfied all gates.
/// Append-only. Never modified in place.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProofArtifact {
    /// Unique identifier for this workflow instance
    pub workflow_id: String,

    /// Immutable version ID of the invariant set used to judge this run
    pub invariant_set_id: String,

    /// What the convergence gate concluded
    pub decision: Decision,

    /// Remaining Invalid Futures (must be 0 for Allow)
    pub rif: u32,

    /// Did all futures converge to same outcome?
    pub converged: bool,

    /// Structurality score (0..=100, must be >= 80 for Allow)
    pub structurality: u8,

    /// Human-readable explanation (clarity only, never safety logic)
    pub reason: String,

    /// Budget usage and exploration statistics
    pub budget: BudgetUsed,

    /// Hash/fingerprint of execution boundary contract
    /// In production: hash of boundary function signature + policy gate version
    pub execution_boundary_fingerprint: String,
}

impl ProofArtifact {
    /// Verify that this artifact satisfies Allow invariants.
    /// Used by CI gate to block merge if invariants violated.
    pub fn validate_allow_invariants(&self) -> Result<(), String> {
        if self.decision != Decision::Allow {
            return Err("Decision is not Allow".into());
        }
        if self.rif != 0 {
            return Err(format!("RIF must be 0 (got {})", self.rif));
        }
        if !self.converged {
            return Err("Converged must be true".into());
        }
        if self.structurality < 80 {
            return Err(format!("Structurality must be >= 80 (got {})", self.structurality));
        }
        Ok(())
    }

    /// Verify that this artifact satisfies Halt invariants.
    /// Halt is always valid (system stopped correctly).
    pub fn validate_halt_invariants(&self) -> Result<(), String> {
        if self.decision != Decision::Halt {
            return Err("Decision is not Halt".into());
        }
        // Halt is always valid. No other checks needed.
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn allow() -> ProofArtifact {
        ProofArtifact {
            workflow_id: "w1".into(),
            invariant_set_id: "inv_v1".into(),
            decision: Decision::Allow,
            rif: 0,
            converged: true,
            structurality: 90,
            reason: "SAFE".into(),
            budget: BudgetUsed {
                max_futures: 64,
                max_depth: 6,
                repair_budget: 2,
                explored_futures: 12,
                pruned_futures: 12,
            },
            execution_boundary_fingerprint: "exec_v1".into(),
        }
    }

    fn halt() -> ProofArtifact {
        ProofArtifact {
            workflow_id: "w2".into(),
            invariant_set_id: "inv_v1".into(),
            decision: Decision::Halt,
            rif: 5,
            converged: false,
            structurality: 60,
            reason: "Ambiguity detected".into(),
            budget: BudgetUsed {
                max_futures: 64,
                max_depth: 6,
                repair_budget: 2,
                explored_futures: 30,
                pruned_futures: 0,
            },
            execution_boundary_fingerprint: "exec_v1".into(),
        }
    }

    #[test]
    fn allow_artifact_validates() {
        let a = allow();
        assert!(a.validate_allow_invariants().is_ok());
    }

    #[test]
    fn halt_artifact_validates() {
        let h = halt();
        assert!(h.validate_halt_invariants().is_ok());
    }

    #[test]
    fn rif_greater_than_zero_fails_allow() {
        let mut a = allow();
        a.rif = 1;
        assert!(a.validate_allow_invariants().is_err());
    }

    #[test]
    fn structurality_below_80_fails_allow() {
        let mut a = allow();
        a.structurality = 79;
        assert!(a.validate_allow_invariants().is_err());
    }

    #[test]
    fn not_converged_fails_allow() {
        let mut a = allow();
        a.converged = false;
        assert!(a.validate_allow_invariants().is_err());
    }
}
