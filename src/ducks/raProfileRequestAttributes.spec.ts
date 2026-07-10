import { describe, expect, test } from 'vitest';
import reducer, { actions, initialState, selectors, slice } from './raProfileRequestAttributes';
import { AttributeSetMergeMode } from 'types/openapi';

describe('raProfileRequestAttributes slice', () => {
    test('updateRaProfileRequestAttributes sets updating and clears succeeded', () => {
        const next = reducer(
            { ...initialState, updateRaProfileSetSucceeded: true },
            actions.updateRaProfileRequestAttributes({
                authorityUuid: 'a',
                raProfileUuid: 'r',
                data: { mergeMode: AttributeSetMergeMode.Merge },
            }),
        );
        expect(next.isUpdatingRaProfileSet).toBe(true);
        expect(next.updateRaProfileSetSucceeded).toBe(false);
    });

    test('updateRaProfileRequestAttributesSuccess stores the set and flags success', () => {
        const set = { mergeMode: AttributeSetMergeMode.ConnectorOnly };
        const next = reducer({ ...initialState, isUpdatingRaProfileSet: true }, actions.updateRaProfileRequestAttributesSuccess({ set }));
        expect(next.isUpdatingRaProfileSet).toBe(false);
        expect(next.updateRaProfileSetSucceeded).toBe(true);
        expect(next.raProfileSet).toBe(set);
    });

    test('updateRaProfileRequestAttributesFailure resets flags', () => {
        const next = reducer(
            { ...initialState, isUpdatingRaProfileSet: true, updateRaProfileSetSucceeded: true },
            actions.updateRaProfileRequestAttributesFailure({ error: 'e' }),
        );
        expect(next.isUpdatingRaProfileSet).toBe(false);
        expect(next.updateRaProfileSetSucceeded).toBe(false);
    });

    test('getPlatformDefaultRequestAttributes toggles fetching and success stores set', () => {
        const fetching = reducer(initialState, actions.getPlatformDefaultRequestAttributes());
        expect(fetching.isFetchingDefaultSet).toBe(true);
        const done = reducer(fetching, actions.getPlatformDefaultRequestAttributesSuccess({ requestAttributes: [] }));
        expect(done.isFetchingDefaultSet).toBe(false);
        expect(done.defaultSet).toEqual({ requestAttributes: [] });
    });

    test('getPlatformDefaultRequestAttributesFailure clears fetching', () => {
        const next = reducer(
            { ...initialState, isFetchingDefaultSet: true },
            actions.getPlatformDefaultRequestAttributesFailure({ error: 'e' }),
        );
        expect(next.isFetchingDefaultSet).toBe(false);
    });

    test('updatePlatformDefaultRequestAttributes lifecycle', () => {
        const updating = reducer(initialState, actions.updatePlatformDefaultRequestAttributes({ data: { requestAttributes: [] } }));
        expect(updating.isUpdatingDefaultSet).toBe(true);
        expect(updating.updateDefaultSetSucceeded).toBe(false);

        const success = reducer(updating, actions.updatePlatformDefaultRequestAttributesSuccess({ requestAttributes: [] }));
        expect(success.isUpdatingDefaultSet).toBe(false);
        expect(success.updateDefaultSetSucceeded).toBe(true);
        expect(success.defaultSet).toEqual({ requestAttributes: [] });

        const failure = reducer(updating, actions.updatePlatformDefaultRequestAttributesFailure({ error: 'e' }));
        expect(failure.isUpdatingDefaultSet).toBe(false);
        expect(failure.updateDefaultSetSucceeded).toBe(false);
    });

    test('selectors read from the slice namespace and fall back to initial state', () => {
        const store = { [slice.name]: { ...initialState, updateRaProfileSetSucceeded: true } };
        expect(selectors.updateRaProfileSetSucceeded(store)).toBe(true);
        expect(selectors.isFetchingDefaultSet({} as never)).toBe(false);
    });
});
