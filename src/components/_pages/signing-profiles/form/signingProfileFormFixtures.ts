// Shared between SigningProfileFormTestWrapper and SigningProfileForm.spec.tsx. These live in
// their own module because Playwright CT rewrites imports from a mounted component's module, so
// a runtime value cannot be co-imported with the wrapper component itself (only types can).

/** Allowed TSA Policy ID preloaded on the edit-mode fixture profile. */
export const EXISTING_POLICY_ID = '1.3.6.1.4.1.4146.2.3';

/** A second valid TSA Policy ID the tests add on top of the loaded one. */
export const ADDED_POLICY_ID = '1.3.6.1.4.1.4146.2.4';
