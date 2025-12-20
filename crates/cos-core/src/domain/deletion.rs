/// Deletion COS: Constrained Orchestration System for safe data deletion.
///
/// Typestate machine that makes invalid state transitions impossible at compile time.
/// You cannot call `execute()` until state is `Executed`.
/// You cannot call `converge()` until state is `Planned`.
///
/// This is the permanent "physics" of safe deletion.

use std::marker::PhantomData;

/// Type-level state markers (zero-cost).
/// Used only to prevent invalid transitions at compile time.

pub struct Draft;
pub struct Validated;
pub struct Planned;
pub struct Converged;
pub struct Executed;

#[derive(Debug)]
pub struct Halted;

/// Account ID (newtype to prevent mixing with other IDs).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AccountId(pub String);

/// Deletion COS parameterized by state.
/// Different states have different available methods.
#[derive(Debug, Clone)]
pub struct DeletionCOS<S> {
    pub account: AccountId,
    pub evidence: Option<String>,
    pub invariants: Option<String>,
    pub plan: Option<String>,
    pub report: Option<ConvergenceReport>,
    pub exec: Option<ExecutionResult>,
    pub halt: Option<HaltReason>,
    pub _s: PhantomData<S>,
}

/// Convergence report: proof that all futures converged.
#[derive(Debug, Clone)]
pub struct ConvergenceReport {
    pub rif: u32,
    pub converged: bool,
    pub reason: String,
    pub structurality: u8,
}

/// Execution result.
#[derive(Debug, Clone)]
pub struct ExecutionResult {
    pub success: bool,
    pub message: String,
}

/// Halt reason.
#[derive(Debug, Clone)]
pub struct HaltReason {
    pub code: String,
    pub message: String,
}

// ============================================================================
// Draft State: Nothing validated yet
// ============================================================================

impl DeletionCOS<Draft> {
    pub fn new(account: AccountId) -> Self {
        DeletionCOS {
            account,
            evidence: None,
            invariants: None,
            plan: None,
            report: None,
            exec: None,
            halt: None,
            _s: PhantomData,
        }
    }

    /// Attach evidence to deletion request.
    pub fn attach_evidence(mut self, evidence: String) -> Self {
        self.evidence = Some(evidence);
        self
    }

    /// Attach invariants.
    pub fn attach_invariants(mut self, invariants: String) -> Self {
        self.invariants = Some(invariants);
        self
    }

    /// Validate and move to Validated state.
    /// Note: In real implementation, this would check evidence + invariants.
    pub fn validate(self) -> Result<DeletionCOS<Validated>, String> {
        if self.evidence.is_none() {
            return Err("Evidence required".into());
        }
        if self.invariants.is_none() {
            return Err("Invariants required".into());
        }

        Ok(DeletionCOS {
            account: self.account,
            evidence: self.evidence,
            invariants: self.invariants,
            plan: None,
            report: None,
            exec: None,
            halt: None,
            _s: PhantomData,
        })
    }

    /// Halt from Draft state (always allowed).
    pub fn halt(self, reason: HaltReason) -> DeletionCOS<Halted> {
        DeletionCOS {
            account: self.account,
            evidence: self.evidence,
            invariants: self.invariants,
            plan: self.plan,
            report: None,
            exec: None,
            halt: Some(reason),
            _s: PhantomData,
        }
    }
}

// ============================================================================
// Validated State: Evidence and invariants are solid
// ============================================================================

impl DeletionCOS<Validated> {
    /// Plan the deletion.
    pub fn plan(self, plan: String) -> DeletionCOS<Planned> {
        DeletionCOS {
            account: self.account,
            evidence: self.evidence,
            invariants: self.invariants,
            plan: Some(plan),
            report: None,
            exec: None,
            halt: None,
            _s: PhantomData,
        }
    }
}

// ============================================================================
// Planned State: We have a plan. Ready to run hypersim.
// ============================================================================

impl DeletionCOS<Planned> {
    /// Run hypersimulation (convergence check).
    /// Returns either Converged or Halted.
    pub fn run_hypersim(self) -> Result<DeletionCOS<Converged>, DeletionCOS<Halted>> {
        // Simulated: in real implementation, run actual convergence check.
        let report = ConvergenceReport {
            rif: 0,
            converged: true,
            reason: "All futures converged".into(),
            structurality: 90,
        };

        Ok(DeletionCOS {
            account: self.account,
            evidence: self.evidence,
            invariants: self.invariants,
            plan: self.plan,
            report: Some(report),
            exec: None,
            halt: None,
            _s: PhantomData,
        })
    }

    /// Halt immediately (if user chooses to stop).
    pub fn halt(self, reason: HaltReason) -> DeletionCOS<Halted> {
        DeletionCOS {
            account: self.account,
            evidence: self.evidence,
            invariants: self.invariants,
            plan: self.plan,
            report: None,
            exec: None,
            halt: Some(reason),
            _s: PhantomData,
        }
    }
}

// ============================================================================
// Converged State: Hypersim passed. Ready to execute.
// ============================================================================

impl DeletionCOS<Converged> {
    /// Execute the deletion.
    pub fn execute(self) -> DeletionCOS<Executed> {
        let result = ExecutionResult {
            success: true,
            message: "Deletion executed".into(),
        };

        DeletionCOS {
            account: self.account,
            evidence: self.evidence,
            invariants: self.invariants,
            plan: self.plan,
            report: self.report,
            exec: Some(result),
            halt: None,
            _s: PhantomData,
        }
    }
}

// ============================================================================
// Executed State: Terminal. Nothing more to do.
// ============================================================================

impl DeletionCOS<Executed> {
    /// Terminal state. No more transitions.
    pub fn account(&self) -> &AccountId {
        &self.account
    }
}

// ============================================================================
// Halted State: Terminal. Deletion was stopped.
// ============================================================================

impl DeletionCOS<Halted> {
    /// Terminal state. Why we halted.
    pub fn reason(&self) -> Option<&HaltReason> {
        self.halt.as_ref()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn typestate_enforces_sequence() {
        let draft = DeletionCOS::new(AccountId("a".into()));
        let draft = draft.attach_evidence("ev".into());
        let draft = draft.attach_invariants("inv".into());

        let validated = draft.validate().unwrap();
        let planned = validated.plan("plan".into());
        let converged = planned.run_hypersim().unwrap();
        let executed = converged.execute();

        assert_eq!(executed.account(), &AccountId("a".into()));
    }

    #[test]
    fn draft_requires_evidence_to_validate() {
        let draft = DeletionCOS::new(AccountId("a".into()));
        let result = draft.validate();
        assert!(result.is_err());
    }

    #[test]
    fn halt_is_always_available() {
        let draft = DeletionCOS::new(AccountId("a".into()));
        let reason = HaltReason {
            code: "USER_CANCEL".into(),
            message: "User cancelled".into(),
        };
        let halted = draft.halt(reason);
        assert!(halted.reason().is_some());
    }
}
