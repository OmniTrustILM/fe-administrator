import { describe, expect, test } from 'vitest';

import { runCommonSliceTests } from './__tests__/common-slice-tests';
import reducer, { actions, initialState, selectors } from './credentials';

describe('credentials slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    runCommonSliceTests({
        reducer,
        actions,
        initialState,
        dirtyOverrides: { isCreating: true, checkedRows: ['x'], credentials: [{ uuid: 'c1' } as any] },
        deleteErrorOverrides: { deleteErrorMessage: 'err', bulkDeleteErrorMessages: [{ uuid: 'x' } as any] },
        deleteErrorAssertions: (next) => {
            expect(next.deleteErrorMessage).toBe('');
            expect(next.bulkDeleteErrorMessages).toEqual([]);
        },
    });

    test('listCredentialProviders / success / failure', () => {
        let next = reducer(initialState, actions.listCredentialProviders());
        expect(next.isFetchingCredentialProviders).toBe(true);
        expect(next.credentialProviders).toBeUndefined();

        next = reducer(next, actions.listCredentialProvidersSuccess({ connectors: [{ uuid: 'p1' } as any] }));
        expect(next.isFetchingCredentialProviders).toBe(false);
        expect(next.credentialProviders).toHaveLength(1);

        next = reducer({ ...next, isFetchingCredentialProviders: true }, actions.listCredentialProvidersFailure({ error: 'err' }));
        expect(next.isFetchingCredentialProviders).toBe(false);
    });

    test('getCredentialProviderAttributesDescriptors / success / failure', () => {
        let next = reducer(initialState, actions.getCredentialProviderAttributesDescriptors({ uuid: 'u', kind: 'k' }));
        expect(next.isFetchingCredentialProviderAttributeDescriptors).toBe(true);
        expect(next.credentialProviderAttributeDescriptors).toEqual([]);

        next = reducer(
            next,
            actions.getCredentialProviderAttributesDescriptorsSuccess({
                credentialProviderAttributesDescriptors: [{ uuid: 'ad1' } as any],
            }),
        );
        expect(next.isFetchingCredentialProviderAttributeDescriptors).toBe(false);
        expect(next.credentialProviderAttributeDescriptors).toHaveLength(1);

        next = reducer(
            { ...next, isFetchingCredentialProviderAttributeDescriptors: true },
            actions.getCredentialProviderAttributesDescriptorsFailure({ error: 'err' }),
        );
        expect(next.isFetchingCredentialProviderAttributeDescriptors).toBe(false);
    });

    test('listCredentials / success / failure', () => {
        const stateWithRows = { ...initialState, checkedRows: ['r1'], credentials: [{ uuid: 'c0' } as any] };
        let next = reducer(stateWithRows as any, actions.listCredentials());
        expect(next.isFetchingList).toBe(true);
        expect(next.credentials).toEqual([]);
        expect(next.checkedRows).toEqual([]);

        next = reducer(next, actions.listCredentialsSuccess({ credentialList: [{ uuid: 'c1' } as any] }));
        expect(next.isFetchingList).toBe(false);
        expect(next.credentials).toHaveLength(1);

        next = reducer({ ...next, isFetchingList: true }, actions.listCredentialsFailure({ error: 'err' }));
        expect(next.isFetchingList).toBe(false);
    });

    test('getCredentialDetail / success / failure', () => {
        let next = reducer(initialState, actions.getCredentialDetail({ uuid: 'c1' }));
        expect(next.isFetchingDetail).toBe(true);
        expect(next.credential).toBeUndefined();

        next = reducer(next, actions.getCredentialDetailSuccess({ credential: { uuid: 'c1', name: 'cred' } as any }));
        expect(next.isFetchingDetail).toBe(false);
        expect(next.credential?.uuid).toBe('c1');

        next = reducer({ ...next, isFetchingDetail: true }, actions.getCredentialDetailFailure({ error: 'err' }));
        expect(next.isFetchingDetail).toBe(false);
    });

    test('createCredential / success / failure', () => {
        let next = reducer(initialState, actions.createCredential({ credentialRequest: {} as any }));
        expect(next.isCreating).toBe(true);
        expect(next.createCredentialSucceeded).toBe(false);

        next = reducer(next, actions.createCredentialSuccess({ uuid: 'c1' }));
        expect(next.isCreating).toBe(false);
        expect(next.createCredentialSucceeded).toBe(true);

        next = reducer({ ...next, isCreating: true }, actions.createCredentialFailure({ error: 'err' }));
        expect(next.isCreating).toBe(false);
        expect(next.createCredentialSucceeded).toBe(false);
    });

    test('updateCredential / success updates existing in list and detail / success pushes when not found / failure', () => {
        const state = {
            ...initialState,
            credentials: [{ uuid: 'c1', name: 'old' } as any],
            credential: { uuid: 'c1', name: 'old' } as any,
        };
        let next = reducer(state as any, actions.updateCredential({ uuid: 'c1', credentialRequest: {} as any }));
        expect(next.isUpdating).toBe(true);
        expect(next.updateCredentialSucceeded).toBe(false);

        next = reducer(next, actions.updateCredentialSuccess({ credential: { uuid: 'c1', name: 'updated' } as any }));
        expect(next.isUpdating).toBe(false);
        expect(next.updateCredentialSucceeded).toBe(true);
        expect(next.credentials[0].name).toBe('updated');
        expect(next.credential?.name).toBe('updated');

        const stateNoList = { ...initialState, credentials: [] };
        let next2 = reducer(stateNoList as any, actions.updateCredential({ uuid: 'c2', credentialRequest: {} as any }));
        next2 = reducer(next2, actions.updateCredentialSuccess({ credential: { uuid: 'c2' } as any }));
        expect(next2.credentials).toHaveLength(1);

        const stateOtherDetail = { ...initialState, credentials: [], credential: { uuid: 'c3' } as any };
        let next3 = reducer(stateOtherDetail as any, actions.updateCredential({ uuid: 'c2', credentialRequest: {} as any }));
        next3 = reducer(next3, actions.updateCredentialSuccess({ credential: { uuid: 'c2' } as any }));
        expect(next3.credential?.uuid).toBe('c3');

        next = reducer({ ...next, isUpdating: true }, actions.updateCredentialFailure({ error: 'err' }));
        expect(next.isUpdating).toBe(false);
        expect(next.updateCredentialSucceeded).toBe(false);
    });

    test('deleteCredential / success removes from list / failure sets error', () => {
        const state = { ...initialState, credentials: [{ uuid: 'c1' } as any] };
        let next = reducer(state as any, actions.deleteCredential({ uuid: 'c1' }));
        expect(next.isDeleting).toBe(true);
        expect(next.deleteErrorMessage).toBe('');

        next = reducer(next, actions.deleteCredentialSuccess({ uuid: 'c1' }));
        expect(next.isDeleting).toBe(false);
        expect(next.credentials).toHaveLength(0);

        const stateNoMatch = { ...initialState, credentials: [{ uuid: 'c2' } as any] };
        const next2 = reducer(stateNoMatch as any, actions.deleteCredentialSuccess({ uuid: 'c99' }));
        expect(next2.credentials).toHaveLength(1);

        const stateErr = { ...initialState, isDeleting: true };
        const nextErr = reducer(stateErr as any, actions.deleteCredentialFailure({ error: 'oops' }));
        expect(nextErr.deleteErrorMessage).toBe('oops');
        expect(nextErr.isDeleting).toBe(false);

        const nextErrDefault = reducer(stateErr as any, actions.deleteCredentialFailure({ error: undefined }));
        expect(nextErrDefault.deleteErrorMessage).toBe('Unknown error');
    });

    test('bulkDeleteCredentials / success removes items and clears detail / failure', () => {
        const state = {
            ...initialState,
            credentials: [{ uuid: 'c1' } as any, { uuid: 'c2' } as any],
            credential: { uuid: 'c1' } as any,
        };
        let next = reducer(state as any, actions.bulkDeleteCredentials({ uuids: ['c1', 'c2'] }));
        expect(next.isBulkDeleting).toBe(true);
        expect(next.bulkDeleteErrorMessages).toEqual([]);

        next = reducer(next, actions.bulkDeleteCredentialsSuccess({ uuids: ['c1', 'c2'] }));
        expect(next.isBulkDeleting).toBe(false);
        expect(next.credentials).toHaveLength(0);
        expect(next.credential).toBeUndefined();

        const stateNoMatch = { ...initialState, credentials: [{ uuid: 'c3' } as any], credential: { uuid: 'c3' } as any };
        const next2 = reducer(stateNoMatch as any, actions.bulkDeleteCredentialsSuccess({ uuids: ['c99'] }));
        expect(next2.credentials).toHaveLength(1);
        expect(next2.credential?.uuid).toBe('c3');

        const nextFail = reducer(state as any, actions.bulkDeleteCredentialsFailure({ error: 'err' }));
        expect(nextFail.isBulkDeleting).toBe(false);
    });
});

describe('credentials selectors', () => {
    test('all selectors return correct values from feature state', () => {
        const featureState = {
            ...initialState,
            checkedRows: ['x'],
            deleteErrorMessage: 'derr',
            bulkDeleteErrorMessages: [{ uuid: 'b' } as any],
            credentialProviders: [{ uuid: 'p1' } as any],
            credentialProviderAttributeDescriptors: [{ uuid: 'ad1' } as any],
            credential: { uuid: 'c1' } as any,
            credentials: [{ uuid: 'c1' } as any],
            isFetchingCredentialProviders: true,
            isFetchingCredentialProviderAttributeDescriptors: true,
            isFetchingList: true,
            isFetchingDetail: true,
            isCreating: true,
            createCredentialSucceeded: true,
            isDeleting: true,
            isUpdating: true,
            updateCredentialSucceeded: true,
            isBulkDeleting: true,
        } as any;

        const state = { credentials: featureState } as any;

        expect(selectors.checkedRows(state)).toEqual(['x']);
        expect(selectors.deleteErrorMessage(state)).toBe('derr');
        expect(selectors.bulkDeleteErrorMessages(state)).toHaveLength(1);
        expect(selectors.credentialProviders(state)).toHaveLength(1);
        expect(selectors.credentialProviderAttributeDescriptors(state)).toHaveLength(1);
        expect(selectors.credential(state)?.uuid).toBe('c1');
        expect(selectors.credentials(state)).toHaveLength(1);
        expect(selectors.isFetchingCredentialProviders(state)).toBe(true);
        expect(selectors.isFetchingCredentialProviderAttributeDescriptors(state)).toBe(true);
        expect(selectors.isFetchingList(state)).toBe(true);
        expect(selectors.isFetchingDetail(state)).toBe(true);
        expect(selectors.isCreating(state)).toBe(true);
        expect(selectors.createCredentialSucceeded(state)).toBe(true);
        expect(selectors.isDeleting(state)).toBe(true);
        expect(selectors.isUpdating(state)).toBe(true);
        expect(selectors.updateCredentialSucceeded(state)).toBe(true);
        expect(selectors.isBulkDeleting(state)).toBe(true);
    });
});
