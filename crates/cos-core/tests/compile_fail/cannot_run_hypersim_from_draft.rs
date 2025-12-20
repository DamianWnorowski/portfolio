/// This code MUST NOT COMPILE.
/// Proves: run_hypersim() does not exist on Draft state.

use cos_core::domain::deletion::*;

fn main() {
    let cos = DeletionCOS::<Draft>::new(AccountId("a".into()));
    // error[E0599]: no method named `run_hypersim` found for struct `DeletionCOS<Draft>`
    let _ = cos.run_hypersim();
}
