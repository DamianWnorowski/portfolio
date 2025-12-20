/// This code MUST NOT COMPILE.
/// Proves: execute() does not exist on Draft state.
/// This is the permanent safety guarantee.

use cos_core::domain::deletion::*;

fn main() {
    let cos = DeletionCOS::<Draft>::new(AccountId("a".into()));
    // error[E0599]: no method named `execute` found for struct `DeletionCOS<Draft>`
    let _ = cos.execute();
}
