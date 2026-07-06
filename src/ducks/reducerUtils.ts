import type { Draft } from 'immer';

/**
 * Resets an RTK slice's Immer draft back to its `initialState`.
 *
 * Mirrors the previously duplicated `resetState` reducer body: any runtime keys
 * that are not part of `initialState` are cleared to `undefined`, then every
 * value from `initialState` is restored onto the draft.
 */
export function resetSliceState<S extends object>(state: Draft<S>, initialState: S): void {
    for (const key of Object.keys(state)) {
        if (!Object.hasOwn(initialState, key)) {
            (state as Record<string, unknown>)[key] = undefined;
        }
    }
    Object.assign(state, initialState);
}
