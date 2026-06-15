import { describe, expect, test } from 'vitest';

import reducer, { actions, initialState } from './tsp-profile-basic-credentials';

const CREDENTIAL = { uuid: 'cred-1', username: 'alice', mappedUser: { uuid: 'user-1', name: 'Alice' } } as any;

describe('tspProfileBasicCredentials slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('resetState restores initial values', () => {
        const dirty = {
            ...initialState,
            credentials: [CREDENTIAL],
            isFetchingList: true,
            tempKey: 'gone',
        } as any;

        const next = reducer(dirty, actions.resetState());

        expect(next).toEqual(initialState);
        expect((next as any).tempKey).toBeUndefined();
    });

    test('listBasicCredentials clears list and sets isFetchingList', () => {
        const state = { ...initialState, credentials: [CREDENTIAL] };
        const next = reducer(state, actions.listBasicCredentials({ tspProfileUuid: 'tsp-1' }));
        expect(next.isFetchingList).toBe(true);
        expect(next.credentials).toEqual([]);
    });

    test('listBasicCredentialsSuccess stores the list', () => {
        const next = reducer({ ...initialState, isFetchingList: true }, actions.listBasicCredentialsSuccess({ credentials: [CREDENTIAL] }));
        expect(next.isFetchingList).toBe(false);
        expect(next.credentials).toEqual([CREDENTIAL]);
    });

    test('listBasicCredentialsFailure clears isFetchingList', () => {
        const next = reducer({ ...initialState, isFetchingList: true }, actions.listBasicCredentialsFailure({ error: 'err' }));
        expect(next.isFetchingList).toBe(false);
    });

    test('createBasicCredential sets isCreating and clears save status', () => {
        const state = { ...initialState, saveSucceeded: true, saveErrorMessage: 'old' };
        const next = reducer(
            state,
            actions.createBasicCredential({ tspProfileUuid: 'tsp-1', request: { username: 'a', mappedUserUuid: 'u' } }),
        );
        expect(next.isCreating).toBe(true);
        expect(next.saveSucceeded).toBe(false);
        expect(next.saveErrorMessage).toBe('');
    });

    test('createBasicCredentialSuccess appends and flags success', () => {
        const next = reducer({ ...initialState, isCreating: true }, actions.createBasicCredentialSuccess({ credential: CREDENTIAL }));
        expect(next.isCreating).toBe(false);
        expect(next.saveSucceeded).toBe(true);
        expect(next.credentials).toEqual([CREDENTIAL]);
    });

    test('createBasicCredentialFailure stores save error', () => {
        const next = reducer({ ...initialState, isCreating: true }, actions.createBasicCredentialFailure({ error: 'duplicate username' }));
        expect(next.isCreating).toBe(false);
        expect(next.saveSucceeded).toBe(false);
        expect(next.saveErrorMessage).toBe('duplicate username');
    });

    test('updateBasicCredentialSuccess replaces the matching row', () => {
        const updated = { ...CREDENTIAL, username: 'alice2' };
        const state = { ...initialState, credentials: [CREDENTIAL], isUpdating: true };
        const next = reducer(state, actions.updateBasicCredentialSuccess({ credential: updated }));
        expect(next.isUpdating).toBe(false);
        expect(next.saveSucceeded).toBe(true);
        expect(next.credentials).toEqual([updated]);
    });

    test('updateBasicCredentialFailure stores save error', () => {
        const next = reducer({ ...initialState, isUpdating: true }, actions.updateBasicCredentialFailure({ error: 'err' }));
        expect(next.isUpdating).toBe(false);
        expect(next.saveErrorMessage).toBe('err');
    });

    test('deleteBasicCredentialSuccess removes the row', () => {
        const state = { ...initialState, credentials: [CREDENTIAL], isDeleting: true };
        const next = reducer(state, actions.deleteBasicCredentialSuccess({ uuid: 'cred-1' }));
        expect(next.isDeleting).toBe(false);
        expect(next.credentials).toEqual([]);
    });

    test('deleteBasicCredentialFailure stores delete error', () => {
        const next = reducer({ ...initialState, isDeleting: true }, actions.deleteBasicCredentialFailure({ error: 'in use' }));
        expect(next.isDeleting).toBe(false);
        expect(next.deleteErrorMessage).toBe('in use');
    });

    test('clearSaveStatus and clearDeleteErrorMessage reset their fields', () => {
        const state = { ...initialState, saveSucceeded: true, saveErrorMessage: 'e1', deleteErrorMessage: 'e2' };
        const afterSave = reducer(state, actions.clearSaveStatus());
        expect(afterSave.saveSucceeded).toBe(false);
        expect(afterSave.saveErrorMessage).toBe('');
        const afterDelete = reducer(state, actions.clearDeleteErrorMessage());
        expect(afterDelete.deleteErrorMessage).toBe('');
    });
});
