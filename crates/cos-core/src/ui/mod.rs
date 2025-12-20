/// UI Contract: Defines what actions the frontend is *allowed* to show.
/// Frontend cannot invent actions. It can only render what the kernel permits.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum UiAction {
    AttachEvidence,
    AttachInvariants,
    Validate,
    Plan,
    RunHypersim,
    Execute,
    Halt,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum UiStateTag {
    Draft,
    Validated,
    Planned,
    Converged,
    Executed,
    Halted,
}

/// UI Contract: what the kernel permits the frontend to show.
/// Derived from core state, not invented by frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UiContract {
    pub tag: UiStateTag,
    pub allowed: Vec<UiAction>,
}

/// Generate UI contract from core state.
/// This function is the single source of truth for what the UI can show.
pub fn contract_for_state(tag: UiStateTag) -> UiContract {
    let allowed = match tag {
        UiStateTag::Draft => vec![UiAction::AttachEvidence, UiAction::AttachInvariants, UiAction::Validate],
        UiStateTag::Validated => vec![UiAction::Plan],
        UiStateTag::Planned => vec![UiAction::RunHypersim, UiAction::Halt],
        UiStateTag::Converged => vec![UiAction::Execute],
        UiStateTag::Executed => vec![],
        UiStateTag::Halted => vec![],
    };

    UiContract { tag, allowed }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn draft_allows_evidence_attachment() {
        let contract = contract_for_state(UiStateTag::Draft);
        assert!(contract.allowed.iter().any(|a| *a == UiAction::AttachEvidence));
    }

    #[test]
    fn executed_allows_nothing() {
        let contract = contract_for_state(UiStateTag::Executed);
        assert!(contract.allowed.is_empty());
    }

    #[test]
    fn execute_only_in_converged() {
        let draft = contract_for_state(UiStateTag::Draft);
        let validated = contract_for_state(UiStateTag::Validated);
        let planned = contract_for_state(UiStateTag::Planned);
        let converged = contract_for_state(UiStateTag::Converged);

        assert!(!draft.allowed.iter().any(|a| *a == UiAction::Execute));
        assert!(!validated.allowed.iter().any(|a| *a == UiAction::Execute));
        assert!(!planned.allowed.iter().any(|a| *a == UiAction::Execute));
        assert!(converged.allowed.iter().any(|a| *a == UiAction::Execute));
    }
}
