/// Append-only NDJSON storage for proof artifacts.
/// Never modify entries in place. Only append.
/// Used for permanent audit trail.

use super::artifact::ProofArtifact;
use serde_json::Value;

/// NDJSON handler: newline-delimited JSON.
/// Each line is a complete, independent ProofArtifact.
pub struct Ndjson;

impl Ndjson {
    /// Serialize a single proof artifact to NDJSON line.
    pub fn serialize_entry(a: &ProofArtifact) -> Result<String, String> {
        serde_json::to_string(a).map_err(|e| format!("serialize: {e}"))
    }

    /// Deserialize a single NDJSON line to proof artifact.
    pub fn deserialize_entry(line: &str) -> Result<ProofArtifact, String> {
        serde_json::from_str::<ProofArtifact>(line)
            .map_err(|e| format!("deserialize: {e}"))
    }

    /// Validate that a line is valid JSON (before appending).
    pub fn is_valid_json(line: &str) -> bool {
        serde_json::from_str::<Value>(line).is_ok()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::proof::artifact::{BudgetUsed, Decision};

    fn sample() -> ProofArtifact {
        ProofArtifact {
            workflow_id: "w1".into(),
            invariant_set_id: "inv_v1".into(),
            decision: Decision::Allow,
            rif: 0,
            converged: true,
            structurality: 90,
            reason: "All invariants satisfied".into(),
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

    #[test]
    fn serialize_produces_valid_json() {
        let a = sample();
        let line = Ndjson::serialize_entry(&a).unwrap();
        assert!(Ndjson::is_valid_json(&line));
    }

    #[test]
    fn roundtrip_preserves_data() {
        let a = sample();
        let line = Ndjson::serialize_entry(&a).unwrap();
        let b = Ndjson::deserialize_entry(&line).unwrap();

        assert_eq!(a.workflow_id, b.workflow_id);
        assert_eq!(a.invariant_set_id, b.invariant_set_id);
        assert_eq!(a.decision, b.decision);
        assert_eq!(a.rif, b.rif);
        assert_eq!(a.converged, b.converged);
        assert_eq!(a.structurality, b.structurality);
    }

    #[test]
    fn invalid_json_rejected() {
        let line = "not json";
        assert!(!Ndjson::is_valid_json(line));
    }
}
