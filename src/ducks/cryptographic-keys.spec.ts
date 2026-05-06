import { describe, expect, test } from 'vitest';

import { KeyState } from 'types/openapi';

import reducer, { actions, initialState, selectors } from './cryptographic-keys';

describe('cryptographic-keys slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('resetState restores initialState', () => {
        const dirtyState = { ...initialState, isCreating: true, isFetchingKeyPairs: true } as any;
        const next = reducer(dirtyState, actions.resetState());
        expect(next).toEqual(initialState);
    });

    test('clearDeleteErrorMessages clears error fields', () => {
        const dirtyState = { ...initialState, deleteErrorMessage: 'some error', bulkDeleteErrorMessages: [{ uuid: 'x' }] } as any;
        const next = reducer(dirtyState, actions.clearDeleteErrorMessages());
        expect(next.deleteErrorMessage).toBe('');
        expect(next.bulkDeleteErrorMessages).toEqual([]);
    });

    test('clearKeyAttributeDescriptors clears attribute descriptors', () => {
        const dirtyState = { ...initialState, keyAttributeDescriptors: [{ uuid: 'attr-1' }] } as any;
        const next = reducer(dirtyState, actions.clearKeyAttributeDescriptors());
        expect(next.keyAttributeDescriptors).toEqual([]);
    });

    test('clearCryptographicKey sets cryptographicKey to undefined', () => {
        const dirtyState = { ...initialState, cryptographicKey: { uuid: 'key-1' } } as any;
        const next = reducer(dirtyState, actions.clearCryptographicKey());
        expect(next.cryptographicKey).toBeUndefined();
    });

    test('listCryptographicKeys / success', () => {
        let next = reducer(initialState, actions.listCryptographicKeys({} as any));
        expect(next.cryptographicKeys).toEqual([]);

        next = reducer(
            { ...next, cryptographicKeys: [{ uuid: 'k-1' }] as any },
            actions.listCryptographicKeysSuccess([{ uuid: 'k-2' }] as any),
        );
        expect(next.cryptographicKeys).toHaveLength(1);
        expect(next.cryptographicKeys[0].uuid).toBe('k-2');
    });

    test('listCryptographicKeyPairs normal store / success / failure', () => {
        let next = reducer(initialState, actions.listCryptographicKeyPairs({}));
        expect(next.isFetchingKeyPairs).toBe(true);
        expect(next.cryptographicKeyPairs).toEqual([]);

        next = reducer(next, actions.listCryptographicKeyPairSuccess({ cryptographicKeys: [{ uuid: 'kp-1' }] as any }));
        expect(next.cryptographicKeyPairs).toHaveLength(1);
        expect(next.isFetchingKeyPairs).toBe(false);

        next = reducer({ ...next, isFetchingKeyPairs: true }, actions.listCryptographicKeyPairFailure({ error: 'err' }));
        expect(next.isFetchingKeyPairs).toBe(false);
    });

    test('listCryptographicKeyPairs alt store / success', () => {
        let next = reducer(initialState, actions.listCryptographicKeyPairs({ store: 'alt' }));
        expect(next.isFetchingKeyPairs).toBe(true);
        expect(next.altCryptographicKeyPairs).toEqual([]);

        next = reducer(next, actions.listCryptographicKeyPairSuccess({ cryptographicKeys: [{ uuid: 'alt-1' }] as any, store: 'alt' }));
        expect(next.altCryptographicKeyPairs).toHaveLength(1);
        expect(next.cryptographicKeyPairs).toEqual([]);
        expect(next.isFetchingKeyPairs).toBe(false);
    });

    test('getCryptographicKeyDetail / success / failure', () => {
        let next = reducer(initialState, actions.getCryptographicKeyDetail({ uuid: 'key-1' }));
        expect(next.isFetchingDetail).toBe(true);
        expect(next.cryptographicKey).toBeUndefined();

        next = reducer(next, actions.getCryptographicKeyDetailSuccess({ cryptographicKey: { uuid: 'key-1' } as any }));
        expect(next.isFetchingDetail).toBe(false);
        expect(next.cryptographicKey).toEqual({ uuid: 'key-1' });

        next = reducer({ ...next, isFetchingDetail: true }, actions.getCryptographicKeyDetailFailure({ error: 'err' }));
        expect(next.isFetchingDetail).toBe(false);
        expect(next.isSyncing).toBe(false);
    });

    test('syncKeys / success / failure', () => {
        let next = reducer(initialState, actions.syncKeys({ tokenInstanceUuid: 'ti-1' }));
        expect(next.isSyncing).toBe(true);

        next = reducer(next, actions.syncKeysSuccess());
        expect(next.isSyncing).toBe(false);

        next = reducer({ ...next, isSyncing: true }, actions.syncKeysFailure({ error: 'err' }));
        expect(next.isSyncing).toBe(false);
    });

    test('createCryptographicKey / success / failure', () => {
        let next = reducer(initialState, actions.createCryptographicKey({} as any));
        expect(next.isCreating).toBe(true);
        expect(next.createCryptographicKeySucceeded).toBe(false);

        next = reducer(next, actions.createCryptographicKeySuccess({ uuid: 'key-1', tokenInstanceUuid: 'ti-1' }));
        expect(next.isCreating).toBe(false);
        expect(next.createCryptographicKeySucceeded).toBe(true);

        next = reducer({ ...next, isCreating: true }, actions.createCryptographicKeyFailure({ error: 'err' }));
        expect(next.isCreating).toBe(false);
        expect(next.createCryptographicKeySucceeded).toBe(false);
    });

    test('createCryptographicKeyFromGlobalModal sets isCreating', () => {
        const next = reducer(initialState, actions.createCryptographicKeyFromGlobalModal({} as any));
        expect(next.isCreating).toBe(true);
        expect(next.createCryptographicKeySucceeded).toBe(false);
    });

    test('listAttributeDescriptors / success / failure', () => {
        let next = reducer(initialState, actions.listAttributeDescriptors({} as any));
        expect(next.isFetchingAttributes).toBe(true);

        next = reducer(next, actions.listAttributeDescriptorsSuccess({ uuid: 'u', attributeDescriptors: [{ uuid: 'attr-1' }] as any }));
        expect(next.isFetchingAttributes).toBe(false);
        expect(next.keyAttributeDescriptors).toHaveLength(1);

        next = reducer({ ...next, isFetchingAttributes: true }, actions.listAttributeDescriptorsFailure({ error: 'err' }));
        expect(next.isFetchingAttributes).toBe(false);
    });

    test('updateCryptographicKey / success / failure', () => {
        let next = reducer(initialState, actions.updateCryptographicKey({} as any));
        expect(next.isUpdating).toBe(true);
        expect(next.updateCryptographicKeySucceeded).toBe(false);

        next = reducer(next, actions.updateCryptographicKeySuccess({ cryptographicKey: { uuid: 'key-1' } as any }));
        expect(next.isUpdating).toBe(false);
        expect(next.updateCryptographicKeySucceeded).toBe(true);
        expect(next.cryptographicKey).toEqual({ uuid: 'key-1' });

        next = reducer({ ...next, isUpdating: true }, actions.updateCryptographicKeyFailure({ error: 'err' }));
        expect(next.isUpdating).toBe(false);
        expect(next.updateCryptographicKeySucceeded).toBe(false);
    });

    test('updateCryptographicKeyItem / success / failure', () => {
        const stateWithKey = {
            ...initialState,
            cryptographicKey: {
                uuid: 'key-1',
                items: [{ uuid: 'item-1', enabled: false, usage: [] }],
            },
        } as any;

        let next = reducer(stateWithKey, actions.updateCryptographicKeyItem({} as any));
        expect(next.isUpdatingKeyItem).toBe(true);

        next = reducer(
            next,
            actions.updateCryptographicKeyItemSuccess({ cryptographicKeyItem: { uuid: 'item-1', enabled: true, usage: [] } as any }),
        );
        expect(next.isUpdatingKeyItem).toBe(false);
        expect(next.cryptographicKey?.items[0].enabled).toBe(true);

        next = reducer({ ...next, isUpdatingKeyItem: true }, actions.updateCryptographicKeyItemFailure({ error: 'err' }));
        expect(next.isUpdatingKeyItem).toBe(false);
    });

    test('enableCryptographicKey / success with specific items / failure', () => {
        const stateWithKey = {
            ...initialState,
            cryptographicKey: {
                uuid: 'key-1',
                items: [
                    { uuid: 'item-1', enabled: false },
                    { uuid: 'item-2', enabled: false },
                ],
            },
        } as any;

        let next = reducer(stateWithKey, actions.enableCryptographicKey({ uuid: 'key-1', keyItemUuid: ['item-1'] }));
        expect(next.isEnabling).toBe(true);

        next = reducer(next, actions.enableCryptographicKeySuccess({ uuid: 'key-1', keyItemUuid: ['item-1'] }));
        expect(next.isEnabling).toBe(false);
        expect(next.cryptographicKey?.items[0].enabled).toBe(true);
        expect(next.cryptographicKey?.items[1].enabled).toBe(false);

        const failState = { ...stateWithKey, isEnabling: true };
        next = reducer(failState, actions.enableCryptographicKeyFailure({ requestUuids: [], failedUuids: ['item-2'] }));
        expect(next.isEnabling).toBe(false);
        expect(next.cryptographicKey?.items[0].enabled).toBe(true);
        expect(next.cryptographicKey?.items[1].enabled).toBe(false);
    });

    test('enableCryptographicKey success enables all items when keyItemUuid is empty', () => {
        const stateWithKey = {
            ...initialState,
            cryptographicKey: {
                uuid: 'key-1',
                items: [
                    { uuid: 'item-1', enabled: false },
                    { uuid: 'item-2', enabled: false },
                ],
            },
        } as any;

        const next = reducer(stateWithKey, actions.enableCryptographicKeySuccess({ uuid: 'key-1', keyItemUuid: [] }));
        expect(next.cryptographicKey?.items[0].enabled).toBe(true);
        expect(next.cryptographicKey?.items[1].enabled).toBe(true);
    });

    test('disableCryptographicKey / success with specific items / failure', () => {
        const stateWithKey = {
            ...initialState,
            cryptographicKey: {
                uuid: 'key-1',
                items: [
                    { uuid: 'item-1', enabled: true },
                    { uuid: 'item-2', enabled: true },
                ],
            },
        } as any;

        let next = reducer(stateWithKey, actions.disableCryptographicKey({ uuid: 'key-1', keyItemUuid: ['item-1'] }));
        expect(next.isDisabling).toBe(true);

        next = reducer(next, actions.disableCryptographicKeySuccess({ uuid: 'key-1', keyItemUuid: ['item-1'] }));
        expect(next.isDisabling).toBe(false);
        expect(next.cryptographicKey?.items[0].enabled).toBe(false);
        expect(next.cryptographicKey?.items[1].enabled).toBe(true);

        const failState = { ...stateWithKey, isDisabling: true };
        next = reducer(failState, actions.disableCryptographicKeyFailure({ requestUuids: [], failedUuids: ['item-1'] }));
        expect(next.isDisabling).toBe(false);
        expect(next.cryptographicKey?.items[0].enabled).toBe(true);
        expect(next.cryptographicKey?.items[1].enabled).toBe(false);
    });

    test('disableCryptographicKey success disables all items when keyItemUuid is empty', () => {
        const stateWithKey = {
            ...initialState,
            cryptographicKey: {
                uuid: 'key-1',
                items: [
                    { uuid: 'item-1', enabled: true },
                    { uuid: 'item-2', enabled: true },
                ],
            },
        } as any;

        const next = reducer(stateWithKey, actions.disableCryptographicKeySuccess({ uuid: 'key-1', keyItemUuid: [] }));
        expect(next.cryptographicKey?.items[0].enabled).toBe(false);
        expect(next.cryptographicKey?.items[1].enabled).toBe(false);
    });

    test('deleteCryptographicKey / success removes from list / failure', () => {
        const stateWithKeys = {
            ...initialState,
            cryptographicKeys: [{ uuid: 'key-1' }, { uuid: 'key-2' }],
            cryptographicKey: { uuid: 'key-1', items: [{ uuid: 'item-a' }, { uuid: 'item-b' }] },
        } as any;

        let next = reducer(stateWithKeys, actions.deleteCryptographicKey({ uuid: 'key-1', keyItemUuid: [] }));
        expect(next.isDeleting).toBe(true);

        next = reducer(next, actions.deleteCryptographicKeySuccess({ uuid: 'key-1', keyItemUuid: [] }));
        expect(next.isDeleting).toBe(false);
        expect(next.cryptographicKeys).toHaveLength(1);
        expect(next.cryptographicKeys[0].uuid).toBe('key-2');
        expect(next.cryptographicKey).toBeUndefined();

        next = reducer({ ...stateWithKeys, isDeleting: true }, actions.deleteCryptographicKeyFailure({ error: 'err' }));
        expect(next.isDeleting).toBe(false);
    });

    test('deleteCryptographicKey success removes only specific key items', () => {
        const stateWithKey = {
            ...initialState,
            cryptographicKeys: [{ uuid: 'key-1' }],
            cryptographicKey: { uuid: 'key-1', items: [{ uuid: 'item-a' }, { uuid: 'item-b' }] },
        } as any;

        const next = reducer(stateWithKey, actions.deleteCryptographicKeySuccess({ uuid: 'key-1', keyItemUuid: ['item-a'] }));
        expect(next.cryptographicKey?.items).toHaveLength(1);
        expect(next.cryptographicKey?.items[0].uuid).toBe('item-b');
        expect(next.cryptographicKeys).toHaveLength(1);
    });

    test('compromiseCryptographicKey / success / failure', () => {
        const stateWithKey = {
            ...initialState,
            cryptographicKey: {
                uuid: 'key-1',
                items: [
                    { uuid: 'item-1', state: KeyState.Active },
                    { uuid: 'item-2', state: KeyState.Active },
                ],
            },
        } as any;

        let next = reducer(stateWithKey, actions.compromiseCryptographicKey({ uuid: 'key-1', request: { uuids: ['item-1'] } as any }));
        expect(next.isCompromising).toBe(true);

        next = reducer(next, actions.compromiseCryptographicKeySuccess({ uuid: 'key-1', request: { uuids: ['item-1'] } as any }));
        expect(next.isCompromising).toBe(false);
        expect(next.cryptographicKey?.items[0].state).toBe(KeyState.Compromised);
        expect(next.cryptographicKey?.items[1].state).toBe(KeyState.Active);

        const failState = { ...stateWithKey, isCompromising: true };
        next = reducer(failState, actions.compromiseCryptographicKeyFailure({ requestUuids: [], failedUuids: ['item-2'] }));
        expect(next.isCompromising).toBe(false);
        expect(next.cryptographicKey?.items[0].state).toBe(KeyState.Compromised);
        expect(next.cryptographicKey?.items[1].state).toBe(KeyState.Active);
    });

    test('compromiseCryptographicKey success compromises all items when uuids absent', () => {
        const stateWithKey = {
            ...initialState,
            cryptographicKey: {
                uuid: 'key-1',
                items: [
                    { uuid: 'item-1', state: KeyState.Active },
                    { uuid: 'item-2', state: KeyState.Active },
                ],
            },
        } as any;

        const next = reducer(stateWithKey, actions.compromiseCryptographicKeySuccess({ uuid: 'key-1', request: {} as any }));
        expect(next.cryptographicKey?.items[0].state).toBe(KeyState.Compromised);
        expect(next.cryptographicKey?.items[1].state).toBe(KeyState.Compromised);
    });

    test('destroyCryptographicKey / success with specific items / failure', () => {
        const stateWithKey = {
            ...initialState,
            cryptographicKey: {
                uuid: 'key-1',
                items: [
                    { uuid: 'item-1', state: KeyState.Active },
                    { uuid: 'item-2', state: KeyState.Compromised },
                ],
            },
        } as any;

        let next = reducer(stateWithKey, actions.destroyCryptographicKey({ uuid: 'key-1', keyItemUuid: ['item-1', 'item-2'] }));
        expect(next.isDestroying).toBe(true);

        next = reducer(next, actions.destroyCryptographicKeySuccess({ uuid: 'key-1', keyItemUuid: ['item-1', 'item-2'] }));
        expect(next.isDestroying).toBe(false);
        expect(next.cryptographicKey?.items[0].state).toBe(KeyState.Destroyed);
        expect(next.cryptographicKey?.items[1].state).toBe(KeyState.DestroyedCompromised);

        const failState = { ...stateWithKey, isDestroying: true };
        next = reducer(failState, actions.destroyCryptographicKeyFailure({ requestUuids: [], failedUuids: ['item-2'] }));
        expect(next.isDestroying).toBe(false);
        expect(next.cryptographicKey?.items[0].state).toBe(KeyState.Destroyed);
        expect(next.cryptographicKey?.items[1].state).toBe(KeyState.Compromised);
    });

    test('destroyCryptographicKey success destroys all items when keyItemUuid is empty', () => {
        const stateWithKey = {
            ...initialState,
            cryptographicKey: {
                uuid: 'key-1',
                items: [
                    { uuid: 'item-1', state: KeyState.Active },
                    { uuid: 'item-2', state: KeyState.Compromised },
                ],
            },
        } as any;

        const next = reducer(stateWithKey, actions.destroyCryptographicKeySuccess({ uuid: 'key-1', keyItemUuid: [] }));
        expect(next.cryptographicKey?.items[0].state).toBe(KeyState.Destroyed);
        expect(next.cryptographicKey?.items[1].state).toBe(KeyState.DestroyedCompromised);
    });

    test('bulkDeleteCryptographicKeys / success removes from list / failure', () => {
        const stateWithKeys = {
            ...initialState,
            cryptographicKeys: [{ uuid: 'key-1' }, { uuid: 'key-2' }],
            cryptographicKey: { uuid: 'key-1' },
        } as any;

        let next = reducer(stateWithKeys, actions.bulkDeleteCryptographicKeys({ uuids: ['key-1'] }));
        expect(next.isBulkDeleting).toBe(true);
        expect(next.bulkDeleteErrorMessages).toEqual([]);

        next = reducer(next, actions.bulkDeleteCryptographicKeysSuccess({ uuids: ['key-1'] }));
        expect(next.isBulkDeleting).toBe(false);
        expect(next.cryptographicKeys).toHaveLength(1);
        expect(next.cryptographicKeys[0].uuid).toBe('key-2');
        expect(next.cryptographicKey).toBeUndefined();

        next = reducer({ ...stateWithKeys, isBulkDeleting: true }, actions.bulkDeleteCryptographicKeysFailure({ error: 'err' }));
        expect(next.isBulkDeleting).toBe(false);
    });

    test('bulkDeleteCryptographicKeyItems / success removes matching items / failure', () => {
        const stateWithKeys = {
            ...initialState,
            cryptographicKeys: [{ uuid: 'key-1' }, { uuid: 'key-2' }],
        } as any;

        let next = reducer(stateWithKeys, actions.bulkDeleteCryptographicKeyItems({ uuids: ['key-1'] }));
        expect(next.isBulkDeleting).toBe(true);

        next = reducer(next, actions.bulkDeleteCryptographicKeyItemsSuccess({ uuids: ['key-1'] }));
        expect(next.isBulkDeleting).toBe(false);
        expect(next.cryptographicKeys).toHaveLength(1);
        expect(next.cryptographicKeys[0].uuid).toBe('key-2');

        next = reducer({ ...stateWithKeys, isBulkDeleting: true }, actions.bulkDeleteCryptographicKeyItemsFailure({ error: 'err' }));
        expect(next.isBulkDeleting).toBe(false);
    });

    test('bulkEnableCryptographicKeys / success / failure', () => {
        let next = reducer(initialState, actions.bulkEnableCryptographicKeys({ uuids: ['key-1'] }));
        expect(next.isBulkEnabling).toBe(true);

        next = reducer(next, actions.bulkEnableCryptographicKeysSuccess({ uuids: ['key-1'] }));
        expect(next.isBulkEnabling).toBe(false);

        next = reducer({ ...next, isBulkEnabling: true }, actions.bulkEnableCryptographicKeysFailure({ error: 'err' }));
        expect(next.isBulkEnabling).toBe(false);
    });

    test('bulkEnableCryptographicKeyItems / success enables matched items / failure enables non-failed items', () => {
        const stateWithKeys = {
            ...initialState,
            cryptographicKeys: [
                { uuid: 'key-1', enabled: false },
                { uuid: 'key-2', enabled: false },
            ],
        } as any;

        let next = reducer(stateWithKeys, actions.bulkEnableCryptographicKeyItems({ uuids: ['key-1', 'key-2'] }));
        expect(next.isBulkEnabling).toBe(true);

        next = reducer(next, actions.bulkEnableCryptographicKeyItemsSuccess({ uuids: ['key-1'] }));
        expect(next.isBulkEnabling).toBe(false);
        expect(next.cryptographicKeys[0].enabled).toBe(true);
        expect(next.cryptographicKeys[1].enabled).toBe(false);

        const failState = {
            ...initialState,
            cryptographicKeys: [
                { uuid: 'key-1', enabled: false },
                { uuid: 'key-2', enabled: false },
            ],
        } as any;
        next = reducer(
            failState,
            actions.bulkEnableCryptographicKeyItemsFailure({ requestUuids: ['key-1', 'key-2'], failedUuids: ['key-2'] }),
        );
        expect(next.isBulkEnabling).toBe(false);
        expect(next.cryptographicKeys[0].enabled).toBe(true);
        expect(next.cryptographicKeys[1].enabled).toBe(false);
    });

    test('bulkDisableCryptographicKeys / success / failure', () => {
        let next = reducer(initialState, actions.bulkDisableCryptographicKeys({ uuids: ['key-1'] }));
        expect(next.isBulkDisabling).toBe(true);

        next = reducer(next, actions.bulkDisableCryptographicKeysSuccess({ uuids: ['key-1'] }));
        expect(next.isBulkDisabling).toBe(false);

        next = reducer({ ...next, isBulkDisabling: true }, actions.bulkDisableCryptographicKeysFailure({ error: 'err' }));
        expect(next.isBulkDisabling).toBe(false);
    });

    test('bulkDisableCryptographicKeyItems / success disables matched items / failure disables non-failed items', () => {
        const stateWithKeys = {
            ...initialState,
            cryptographicKeys: [
                { uuid: 'key-1', enabled: true },
                { uuid: 'key-2', enabled: true },
            ],
        } as any;

        let next = reducer(stateWithKeys, actions.bulkDisableCryptographicKeyItems({ uuids: ['key-1', 'key-2'] }));
        expect(next.isBulkDisabling).toBe(true);

        next = reducer(next, actions.bulkDisableCryptographicKeyItemsSuccess({ uuids: ['key-1'] }));
        expect(next.isBulkDisabling).toBe(false);
        expect(next.cryptographicKeys[0].enabled).toBe(false);
        expect(next.cryptographicKeys[1].enabled).toBe(true);

        const failState = {
            ...initialState,
            cryptographicKeys: [
                { uuid: 'key-1', enabled: true },
                { uuid: 'key-2', enabled: true },
            ],
        } as any;
        next = reducer(
            failState,
            actions.bulkDisableCryptographicKeyItemsFailure({ requestUuids: ['key-1', 'key-2'], failedUuids: ['key-2'] }),
        );
        expect(next.isBulkDisabling).toBe(false);
        expect(next.cryptographicKeys[0].enabled).toBe(false);
        expect(next.cryptographicKeys[1].enabled).toBe(true);
    });

    test('updateKeyUsage / success with specific items / failure', () => {
        const stateWithKey = {
            ...initialState,
            cryptographicKey: {
                uuid: 'key-1',
                items: [
                    { uuid: 'item-1', usage: [] },
                    { uuid: 'item-2', usage: [] },
                ],
            },
        } as any;

        let next = reducer(stateWithKey, actions.updateKeyUsage({ uuid: 'key-1', usage: {} as any }));
        expect(next.isUpdatingKeyUsage).toBe(true);

        next = reducer(next, actions.updateKeyUsageSuccess({ uuid: 'key-1', keyItemsUuid: ['item-1'], usage: ['Sign'] as any }));
        expect(next.isUpdatingKeyUsage).toBe(false);
        expect(next.cryptographicKey?.items[0].usage).toEqual(['Sign']);
        expect(next.cryptographicKey?.items[1].usage).toEqual([]);

        next = reducer({ ...stateWithKey, isUpdatingKeyUsage: true }, actions.updateKeyUsageFailure({ error: 'err' }));
        expect(next.isUpdatingKeyUsage).toBe(false);
    });

    test('updateKeyUsage success updates all items when keyItemsUuid is empty', () => {
        const stateWithKey = {
            ...initialState,
            cryptographicKey: {
                uuid: 'key-1',
                items: [
                    { uuid: 'item-1', usage: [] },
                    { uuid: 'item-2', usage: [] },
                ],
            },
        } as any;

        const next = reducer(stateWithKey, actions.updateKeyUsageSuccess({ uuid: 'key-1', keyItemsUuid: [], usage: ['Sign'] as any }));
        expect(next.cryptographicKey?.items[0].usage).toEqual(['Sign']);
        expect(next.cryptographicKey?.items[1].usage).toEqual(['Sign']);
    });

    test('bulkUpdateKeyUsage / success / failure', () => {
        let next = reducer(initialState, actions.bulkUpdateKeyUsage({ usage: {} as any }));
        expect(next.isBulkUpdatingKeyUsage).toBe(true);

        next = reducer(next, actions.bulkUpdateKeyUsageSuccess({}));
        expect(next.isBulkUpdatingKeyUsage).toBe(false);

        next = reducer({ ...next, isBulkUpdatingKeyUsage: true }, actions.bulkUpdateKeyUsageFailure({ error: 'err' }));
        expect(next.isBulkUpdatingKeyUsage).toBe(false);
    });

    test('bulkUpdateKeyItemUsage / success updates matched items / failure updates non-failed items', () => {
        const stateWithKey = {
            ...initialState,
            cryptographicKey: {
                uuid: 'key-1',
                items: [
                    { uuid: 'item-1', usage: [] },
                    { uuid: 'item-2', usage: [] },
                ],
            },
        } as any;

        let next = reducer(stateWithKey, actions.bulkUpdateKeyItemUsage({ usage: {} as any }));
        expect(next.isBulkUpdatingKeyUsage).toBe(true);

        next = reducer(next, actions.bulkUpdateKeyItemUsageSuccess({ uuids: ['item-1'], usages: ['Sign'] as any }));
        expect(next.isBulkUpdatingKeyUsage).toBe(false);
        expect(next.cryptographicKey?.items[0].usage).toEqual(['Sign']);
        expect(next.cryptographicKey?.items[1].usage).toEqual([]);

        const failState = { ...stateWithKey, isBulkUpdatingKeyUsage: true };
        next = reducer(
            failState,
            actions.bulkUpdateKeyItemUsageFailure({
                requestUuids: ['item-1', 'item-2'],
                failedUuids: ['item-2'],
                usages: ['Verify'] as any,
            }),
        );
        expect(next.isBulkUpdatingKeyUsage).toBe(false);
        expect(next.cryptographicKey?.items[0].usage).toEqual(['Verify']);
        expect(next.cryptographicKey?.items[1].usage).toEqual([]);
    });

    test('bulkCompromiseCryptographicKeys / success / failure', () => {
        let next = reducer(initialState, actions.bulkCompromiseCryptographicKeys({ request: {} as any }));
        expect(next.isBulkCompromising).toBe(true);

        next = reducer(next, actions.bulkCompromiseCryptographicKeysSuccess({ request: {} as any }));
        expect(next.isBulkCompromising).toBe(false);

        next = reducer({ ...next, isBulkCompromising: true }, actions.bulkCompromiseCryptographicKeysFailure({ error: 'err' }));
        expect(next.isBulkCompromising).toBe(false);
    });

    test('bulkCompromiseCryptographicKeyItems / success marks matched items / failure marks non-failed items', () => {
        const stateWithKeys = {
            ...initialState,
            cryptographicKeys: [
                { uuid: 'key-1', state: KeyState.Active },
                { uuid: 'key-2', state: KeyState.Active },
            ],
        } as any;

        let next = reducer(stateWithKeys, actions.bulkCompromiseCryptographicKeyItems({ request: { uuids: ['key-1'] } as any }));
        expect(next.isBulkCompromising).toBe(true);

        next = reducer(next, actions.bulkCompromiseCryptographicKeyItemsSuccess({ request: { uuids: ['key-1'] } as any }));
        expect(next.isBulkCompromising).toBe(false);
        expect(next.cryptographicKeys[0].state).toBe(KeyState.Compromised);
        expect(next.cryptographicKeys[1].state).toBe(KeyState.Active);

        const failState = { ...stateWithKeys, isBulkCompromising: true };
        next = reducer(
            failState,
            actions.bulkCompromiseCryptographicKeyItemsFailure({ requestUuids: ['key-1', 'key-2'], failedUuids: ['key-2'] }),
        );
        expect(next.isBulkCompromising).toBe(false);
        expect(next.cryptographicKeys[0].state).toBe(KeyState.Compromised);
        expect(next.cryptographicKeys[1].state).toBe(KeyState.Active);
    });

    test('bulkDestroyCryptographicKeys / success / failure', () => {
        let next = reducer(initialState, actions.bulkDestroyCryptographicKeys({ uuids: ['key-1'] }));
        expect(next.isBulkDestroying).toBe(true);

        next = reducer(next, actions.bulkDestroyCryptographicKeysSuccess({ uuids: ['key-1'] }));
        expect(next.isBulkDestroying).toBe(false);

        next = reducer({ ...next, isBulkDestroying: true }, actions.bulkDestroyCryptographicKeysFailure({ error: 'err' }));
        expect(next.isBulkDestroying).toBe(false);
    });

    test('bulkDestroyCryptographicKeyItems / success updates state / failure updates non-failed items', () => {
        const stateWithKeys = {
            ...initialState,
            cryptographicKeys: [
                { uuid: 'key-1', state: KeyState.Active },
                { uuid: 'key-2', state: KeyState.Compromised },
            ],
        } as any;

        let next = reducer(stateWithKeys, actions.bulkDestroyCryptographicKeyItems({ uuids: ['key-1', 'key-2'] }));
        expect(next.isBulkDestroying).toBe(true);

        next = reducer(next, actions.bulkDestroyCryptographicKeyItemsSuccess({ uuids: ['key-1', 'key-2'] }));
        expect(next.isBulkDestroying).toBe(false);
        expect(next.cryptographicKeys[0].state).toBe(KeyState.Destroyed);
        expect(next.cryptographicKeys[1].state).toBe(KeyState.DestroyedCompromised);

        const failState = {
            ...initialState,
            cryptographicKeys: [
                { uuid: 'key-1', state: KeyState.Active },
                { uuid: 'key-2', state: KeyState.Active },
            ],
        } as any;
        next = reducer(
            failState,
            actions.bulkDestroyCryptographicKeyItemsFailure({ requestUuids: ['key-1', 'key-2'], failedUuids: ['key-2'] }),
        );
        expect(next.isBulkDestroying).toBe(false);
        expect(next.cryptographicKeys[0].state).toBe(KeyState.Destroyed);
        expect(next.cryptographicKeys[1].state).toBe(KeyState.Active);
    });

    test('getHistory / success / failure', () => {
        const stateWithHistory = {
            ...initialState,
            keyHistory: [{ uuid: 'item-1', history: [{ uuid: 'hist-old' }] }],
        } as any;

        let next = reducer(stateWithHistory, actions.getHistory({ keyUuid: 'key-1', keyItemUuid: 'item-1' }));
        expect(next.isFetchingHistory).toBe(true);
        expect(next.keyHistory?.find((h: any) => h.uuid === 'item-1')).toBeUndefined();

        next = reducer(next, actions.getHistorySuccess({ keyItemUuid: 'item-1', keyHistory: [{ uuid: 'hist-new' }] as any }));
        expect(next.isFetchingHistory).toBe(false);
        expect(next.keyHistory?.find((h: any) => h.uuid === 'item-1')?.history).toHaveLength(1);

        next = reducer({ ...next, isFetchingHistory: true }, actions.getHistoryFailure({ error: 'err' }));
        expect(next.isFetchingHistory).toBe(false);
    });
});

describe('cryptographic-keys selectors', () => {
    test('all selectors read from feature state', () => {
        const featureState: any = {
            ...initialState,
            cryptographicKey: { uuid: 'key-detail-1' },
            cryptographicKeys: [{ uuid: 'key-list-1' }],
            cryptographicKeyPairs: [{ uuid: 'kp-1' }],
            altCryptographicKeyPairs: [{ uuid: 'alt-kp-1' }],
            isFetchingKeyPairs: true,
            isFetchingDetail: true,
            isCreating: true,
            createCryptographicKeySucceeded: true,
            isDeleting: true,
            isBulkDeleting: true,
            isUpdating: true,
            updateCryptographicKeySucceeded: true,
            isEnabling: true,
            isBulkEnabling: true,
            isDisabling: true,
            isBulkDisabling: true,
            isCompromising: true,
            isBulkCompromising: true,
            isDestroying: true,
            isBulkDestroying: true,
            isSyncing: true,
            isUpdatingKeyUsage: true,
            isUpdatingKeyItem: true,
            isBulkUpdatingKeyUsage: true,
            isFetchingAttributes: true,
            keyAttributeDescriptors: [{ uuid: 'attr-1' }],
            isFetchingHistory: true,
            keyHistory: [{ uuid: 'item-1', history: [] }],
        };

        const rootState = { cryptographicKeys: featureState } as any;

        expect(selectors.cryptographicKey(rootState)).toEqual({ uuid: 'key-detail-1' });
        expect(selectors.cryptographicKeys(rootState)).toHaveLength(1);
        expect(selectors.cryptographicKeyPairs(rootState)).toHaveLength(1);
        expect(selectors.altCryptographicKeyPairs(rootState)).toHaveLength(1);

        expect(selectors.isFetchingKeyPairs(rootState)).toBe(true);
        expect(selectors.isFetchingDetail(rootState)).toBe(true);
        expect(selectors.isCreating(rootState)).toBe(true);
        expect(selectors.createCryptographicKeySucceeded(rootState)).toBe(true);
        expect(selectors.isDeleting(rootState)).toBe(true);
        expect(selectors.isBulkDeleting(rootState)).toBe(true);
        expect(selectors.isUpdating(rootState)).toBe(true);
        expect(selectors.updateCryptographicKeySucceeded(rootState)).toBe(true);
        expect(selectors.isEnabling(rootState)).toBe(true);
        expect(selectors.isBulkEnabling(rootState)).toBe(true);
        expect(selectors.isDisabling(rootState)).toBe(true);
        expect(selectors.isBulkDisabling(rootState)).toBe(true);
        expect(selectors.isCompromising(rootState)).toBe(true);
        expect(selectors.isBulkCompromising(rootState)).toBe(true);
        expect(selectors.isDestroying(rootState)).toBe(true);
        expect(selectors.isBulkDestroying(rootState)).toBe(true);
        expect(selectors.isSyncing(rootState)).toBe(true);

        expect(selectors.isUpdatingKeyUsage(rootState)).toBe(true);
        expect(selectors.isUpdatingKeyItem(rootState)).toBe(true);
        expect(selectors.isBulkUpdatingKeyUsage(rootState)).toBe(true);

        expect(selectors.isFetchingAttributes(rootState)).toBe(true);
        expect(selectors.keyAttributeDescriptors(rootState)).toHaveLength(1);

        expect(selectors.isFetchingHistory(rootState)).toBe(true);
        expect(selectors.keyHistory(rootState)).toHaveLength(1);
    });
});
