import { describe, expect, test } from 'vitest';

import reducer, { actions, initialState, selectors } from './authorities';

describe('authorities slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('resetState restores initialState', () => {
        const dirty = { ...initialState, isCreating: true, checkedRows: ['x'], authorities: [{ uuid: 'a' } as any] };
        expect(reducer(dirty as any, actions.resetState())).toEqual(initialState);
    });

    test('setCheckedRows updates checkedRows', () => {
        const next = reducer(initialState, actions.setCheckedRows({ checkedRows: ['a', 'b'] }));
        expect(next.checkedRows).toEqual(['a', 'b']);
    });

    test('clearDeleteErrorMessages clears error fields', () => {
        const state = { ...initialState, deleteErrorMessage: 'err', bulkDeleteErrorMessages: [{ uuid: 'x' } as any] };
        const next = reducer(state as any, actions.clearDeleteErrorMessages());
        expect(next.deleteErrorMessage).toBe('');
        expect(next.bulkDeleteErrorMessages).toEqual([]);
    });

    test('clearAuthorityProviderAttributeDescriptors clears descriptors', () => {
        const state = { ...initialState, authorityProviderAttributeDescriptors: [{ uuid: 'x' } as any] };
        const next = reducer(state as any, actions.clearAuthorityProviderAttributeDescriptors());
        expect(next.authorityProviderAttributeDescriptors).toEqual([]);
    });

    test('clearRAProfilesAttributesDescriptors clears ra descriptors', () => {
        const state = { ...initialState, raProfileAttributeDescriptors: [{ uuid: 'x' } as any] };
        const next = reducer(state as any, actions.clearRAProfilesAttributesDescriptors());
        expect(next.raProfileAttributeDescriptors).toEqual([]);
    });

    test('listAuthorityProviders / success / failure', () => {
        let next = reducer(initialState, actions.listAuthorityProviders());
        expect(next.isFetchingAuthorityProviders).toBe(true);
        expect(next.authorityProviders).toBeUndefined();

        next = reducer(next, actions.listAuthorityProvidersSuccess({ connectors: [{ uuid: 'p1' } as any] }));
        expect(next.isFetchingAuthorityProviders).toBe(false);
        expect(next.authorityProviders).toHaveLength(1);

        next = reducer({ ...next, isFetchingAuthorityProviders: true }, actions.listAuthorityProvidersFailure({ error: 'err' }));
        expect(next.isFetchingAuthorityProviders).toBe(false);
    });

    test('getAuthorityProviderAttributesDescriptors / success / failure', () => {
        let next = reducer(
            initialState,
            actions.getAuthorityProviderAttributesDescriptors({ uuid: 'u', kind: 'k', functionGroup: 'CA_CONNECTOR' as any }),
        );
        expect(next.isFetchingAuthorityProviderAttributeDescriptors).toBe(true);
        expect(next.authorityProviderAttributeDescriptors).toEqual([]);

        next = reducer(next, actions.getAuthorityProviderAttributesDescriptorsSuccess({ attributeDescriptor: [{ uuid: 'ad1' } as any] }));
        expect(next.isFetchingAuthorityProviderAttributeDescriptors).toBe(false);
        expect(next.authorityProviderAttributeDescriptors).toHaveLength(1);

        next = reducer(
            { ...next, isFetchingAuthorityProviderAttributeDescriptors: true },
            actions.getAuthorityProviderAttributeDescriptorsFailure({ error: 'err' }),
        );
        expect(next.isFetchingAuthorityProviderAttributeDescriptors).toBe(false);
    });

    test('getRAProfilesAttributesDescriptors / success / failure', () => {
        let next = reducer(initialState, actions.getRAProfilesAttributesDescriptors({ authorityUuid: 'au1' }));
        expect(next.isFetchingRAProfilesAttributesDescriptors).toBe(true);

        next = reducer(
            next,
            actions.getRAProfilesAttributesDescriptorsSuccess({
                authorityUuid: 'au1',
                attributesDescriptors: [{ uuid: 'rp1' } as any],
            }),
        );
        expect(next.isFetchingRAProfilesAttributesDescriptors).toBe(false);
        expect(next.raProfileAttributeDescriptors).toHaveLength(1);

        next = reducer(
            { ...next, isFetchingRAProfilesAttributesDescriptors: true },
            actions.getRAProfilesAttributesDescriptorsFailure({ error: 'err' }),
        );
        expect(next.isFetchingRAProfilesAttributesDescriptors).toBe(false);
    });

    test('listAuthorities / success / failure', () => {
        let next = reducer(initialState, actions.listAuthorities());
        expect(next.isFetchingList).toBe(true);
        expect(next.authorities).toEqual([]);

        next = reducer(next, actions.listAuthoritiesSuccess({ authorityList: [{ uuid: 'a1' } as any] }));
        expect(next.isFetchingList).toBe(false);
        expect(next.authorities).toHaveLength(1);

        next = reducer({ ...next, isFetchingList: true }, actions.listAuthoritiesFailure({ error: 'err' }));
        expect(next.isFetchingList).toBe(false);
    });

    test('getAuthorityDetail / success (existing) / success (new) / failure', () => {
        const state = { ...initialState, authorities: [{ uuid: 'a1', name: 'old' } as any] };
        let next = reducer(state as any, actions.getAuthorityDetail({ uuid: 'a1' }));
        expect(next.isFetchingDetail).toBe(true);
        expect(next.authority).toBeUndefined();

        next = reducer(next, actions.getAuthorityDetailSuccess({ authority: { uuid: 'a1', name: 'new' } as any }));
        expect(next.isFetchingDetail).toBe(false);
        expect(next.authority?.uuid).toBe('a1');
        expect(next.authorities[0].name).toBe('new');

        const stateNoExisting = { ...initialState, authorities: [] };
        let next2 = reducer(stateNoExisting as any, actions.getAuthorityDetail({ uuid: 'a2' }));
        next2 = reducer(next2, actions.getAuthorityDetailSuccess({ authority: { uuid: 'a2', name: 'brand-new' } as any }));
        expect(next2.authorities).toHaveLength(1);
        expect(next2.authorities[0].uuid).toBe('a2');

        next = reducer({ ...next, isFetchingDetail: true }, actions.getAuthorityDetailFailure({ error: 'err' }));
        expect(next.isFetchingDetail).toBe(false);
    });

    test('createAuthority / success / failure', () => {
        let next = reducer(initialState, actions.createAuthority({} as any));
        expect(next.isCreating).toBe(true);
        expect(next.createAuthoritySucceeded).toBe(false);

        next = reducer(next, actions.createAuthoritySuccess({ uuid: 'a1' }));
        expect(next.isCreating).toBe(false);
        expect(next.createAuthoritySucceeded).toBe(true);

        next = reducer({ ...next, isCreating: true }, actions.createAuthorityFailure({ error: 'err' }));
        expect(next.isCreating).toBe(false);
        expect(next.createAuthoritySucceeded).toBe(false);
    });

    test('updateAuthority / success updates list and detail / success pushes when not found / failure', () => {
        const state = {
            ...initialState,
            authorities: [{ uuid: 'a1', name: 'old' } as any],
            authority: { uuid: 'a1', name: 'old' } as any,
        };
        let next = reducer(state as any, actions.updateAuthority({ uuid: 'a1', updateAuthority: {} as any }));
        expect(next.isUpdating).toBe(true);
        expect(next.updateAuthoritySucceeded).toBe(false);

        next = reducer(next, actions.updateAuthoritySuccess({ authority: { uuid: 'a1', name: 'updated' } as any }));
        expect(next.isUpdating).toBe(false);
        expect(next.updateAuthoritySucceeded).toBe(true);
        expect(next.authorities[0].name).toBe('updated');
        expect(next.authority?.name).toBe('updated');

        const stateNoList = { ...initialState, authorities: [] };
        let next2 = reducer(stateNoList as any, actions.updateAuthority({ uuid: 'a2', updateAuthority: {} as any }));
        next2 = reducer(next2, actions.updateAuthoritySuccess({ authority: { uuid: 'a2' } as any }));
        expect(next2.authorities).toHaveLength(1);

        next = reducer({ ...next, isUpdating: true }, actions.updateAuthorityFailure({ error: 'err' }));
        expect(next.isUpdating).toBe(false);
        expect(next.updateAuthoritySucceeded).toBe(false);
    });

    test('deleteAuthority / success removes from list and clears detail / failure sets error', () => {
        const state = {
            ...initialState,
            authorities: [{ uuid: 'a1' } as any],
            authority: { uuid: 'a1' } as any,
        };
        let next = reducer(state as any, actions.deleteAuthority({ uuid: 'a1' }));
        expect(next.isDeleting).toBe(true);
        expect(next.deleteErrorMessage).toBe('');

        next = reducer(next, actions.deleteAuthoritySuccess({ uuid: 'a1' }));
        expect(next.isDeleting).toBe(false);
        expect(next.authorities).toHaveLength(0);
        expect(next.authority).toBeUndefined();

        const stateWithOther = { ...initialState, authorities: [{ uuid: 'a2' } as any], authority: { uuid: 'a2' } as any };
        const next3 = reducer(stateWithOther as any, actions.deleteAuthoritySuccess({ uuid: 'a99' }));
        expect(next3.authorities).toHaveLength(1);
        expect(next3.authority?.uuid).toBe('a2');

        const stateErr = { ...initialState, isDeleting: true };
        const nextErr = reducer(stateErr as any, actions.deleteAuthorityFailure({ error: 'oops' }));
        expect(nextErr.deleteErrorMessage).toBe('oops');
        expect(nextErr.isDeleting).toBe(false);

        const nextErrDefault = reducer(stateErr as any, actions.deleteAuthorityFailure({ error: undefined }));
        expect(nextErrDefault.deleteErrorMessage).toBe('Unknown error');
    });

    test('bulkDeleteAuthority / success removes items / success with errors sets messages / failure', () => {
        const state = {
            ...initialState,
            authorities: [{ uuid: 'a1' } as any, { uuid: 'a2' } as any],
            authority: { uuid: 'a1' } as any,
        };
        let next = reducer(state as any, actions.bulkDeleteAuthority({ uuids: ['a1', 'a2'] }));
        expect(next.isBulkDeleting).toBe(true);
        expect(next.bulkDeleteErrorMessages).toEqual([]);

        next = reducer(next, actions.bulkDeleteAuthoritySuccess({ uuids: ['a1', 'a2'], errors: [] }));
        expect(next.isBulkDeleting).toBe(false);
        expect(next.authorities).toHaveLength(0);
        expect(next.authority).toBeUndefined();

        const stateErrors = { ...initialState, authorities: [{ uuid: 'a1' } as any] };
        let nextErr = reducer(stateErrors as any, actions.bulkDeleteAuthority({ uuids: ['a1'] }));
        nextErr = reducer(
            nextErr,
            actions.bulkDeleteAuthoritySuccess({ uuids: ['a1'], errors: [{ uuid: 'a1', name: 'err', message: 'x', exception: 'x' }] }),
        );
        expect(nextErr.bulkDeleteErrorMessages).toHaveLength(1);
        expect(nextErr.authorities).toHaveLength(1);

        const nextFail = reducer(state as any, actions.bulkDeleteAuthorityFailure({ error: 'err' }));
        expect(nextFail.isBulkDeleting).toBe(false);
    });

    test('bulkForceDeleteAuthority / success removes items / failure', () => {
        const state = {
            ...initialState,
            authorities: [{ uuid: 'a1' } as any, { uuid: 'a2' } as any],
            authority: { uuid: 'a1' } as any,
        };
        let next = reducer(state as any, actions.bulkForceDeleteAuthority({ uuids: ['a1'] }));
        expect(next.isBulkForceDeleting).toBe(true);

        next = reducer(next, actions.bulkForceDeleteAuthoritySuccess({ uuids: ['a1'] }));
        expect(next.isBulkForceDeleting).toBe(false);
        expect(next.authorities).toHaveLength(1);
        expect(next.authority).toBeUndefined();

        const stateNoMatch = { ...initialState, authorities: [{ uuid: 'a2' } as any], authority: { uuid: 'a2' } as any };
        const next2 = reducer(stateNoMatch as any, actions.bulkForceDeleteAuthoritySuccess({ uuids: ['a99'] }));
        expect(next2.authorities).toHaveLength(1);
        expect(next2.authority?.uuid).toBe('a2');

        const nextFail = reducer(state as any, actions.bulkForceDeleteAuthorityFailure({ error: 'err' }));
        expect(nextFail.isBulkForceDeleting).toBe(false);
    });
});

describe('authorities selectors', () => {
    test('all selectors return correct values from feature state', () => {
        const featureState = {
            ...initialState,
            checkedRows: ['x'],
            deleteErrorMessage: 'derr',
            bulkDeleteErrorMessages: [{ uuid: 'b' } as any],
            authorityProviders: [{ uuid: 'p1' } as any],
            authorityProviderAttributeDescriptors: [{ uuid: 'ad1' } as any],
            authority: { uuid: 'a1' } as any,
            authorities: [{ uuid: 'a1' } as any],
            raProfileAttributeDescriptors: [{ uuid: 'rp1' } as any],
            isFetchingAuthorityProviders: true,
            isFetchingAuthorityProviderAttributeDescriptors: true,
            isFetchingRAProfilesAttributesDescriptors: true,
            isFetchingList: true,
            isFetchingDetail: true,
            isCreating: true,
            createAuthoritySucceeded: true,
            isUpdating: true,
            updateAuthoritySucceeded: true,
            isDeleting: true,
            isBulkDeleting: true,
            isBulkForceDeleting: true,
        } as any;

        const state = { authorities: featureState } as any;

        expect(selectors.checkedRows(state)).toEqual(['x']);
        expect(selectors.deleteErrorMessage(state)).toBe('derr');
        expect(selectors.bulkDeleteErrorMessages(state)).toHaveLength(1);
        expect(selectors.authorityProviders(state)).toHaveLength(1);
        expect(selectors.authorityProviderAttributeDescriptors(state)).toHaveLength(1);
        expect(selectors.authority(state)?.uuid).toBe('a1');
        expect(selectors.authorities(state)).toHaveLength(1);
        expect(selectors.raProfileAttributeDescriptors(state)).toHaveLength(1);
        expect(selectors.isFetchingAuthorityProviders(state)).toBe(true);
        expect(selectors.isFetchingAuthorityProviderAttributeDescriptors(state)).toBe(true);
        expect(selectors.isFetchingRAProfilesAttributesDescriptors(state)).toBe(true);
        expect(selectors.isFetchingList(state)).toBe(true);
        expect(selectors.isFetchingDetail(state)).toBe(true);
        expect(selectors.isCreating(state)).toBe(true);
        expect(selectors.createAuthoritySucceeded(state)).toBe(true);
        expect(selectors.isUpdating(state)).toBe(true);
        expect(selectors.updateAuthoritySucceeded(state)).toBe(true);
        expect(selectors.isDeleting(state)).toBe(true);
        expect(selectors.isBulkDeleting(state)).toBe(true);
        expect(selectors.isBulkForceDeleting(state)).toBe(true);
    });
});
