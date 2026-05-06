import { describe, expect, test } from 'vitest';

import reducer, { actions, initialState, selectors } from './secrets';

describe('secrets slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('resetState restores initial values and clears extra keys', () => {
        const dirtyState = {
            ...initialState,
            secrets: [{ uuid: 's-1' } as any],
            secret: { uuid: 's-1' } as any,
            versions: [{ uuid: 'v-1' } as any],
            isFetchingList: true,
            isFetchingDetail: true,
            isFetchingVersions: true,
            isCreating: true,
            isUpdating: true,
            isDeleting: true,
            isEnabling: true,
            isDisabling: true,
            tempOnlyKey: 'to-be-removed',
        } as any;

        const next = reducer(dirtyState, actions.resetState());

        expect(next).toEqual(initialState);
        expect((next as any).tempOnlyKey).toBeUndefined();
    });

    test('listSecrets / success / failure update list flags and data', () => {
        const search = { pageNumber: 1, itemsPerPage: 10, filters: [] } as any;

        let next = reducer(initialState, actions.listSecrets(search));
        expect(next.isFetchingList).toBe(true);
        expect(next.secrets).toEqual([]);

        const items = [{ uuid: 's-1' }, { uuid: 's-2' }] as any[];
        next = reducer(next, actions.listSecretsSuccess({ secrets: items }));
        expect(next.isFetchingList).toBe(false);
        expect(next.secrets).toEqual(items);

        next = reducer({ ...next, isFetchingList: true }, actions.listSecretsFailure({ error: 'err' }));
        expect(next.isFetchingList).toBe(false);
    });

    test('getSecretDetail / success / failure update detail and flags', () => {
        let next = reducer({ ...initialState, secret: { uuid: 'old' } as any }, actions.getSecretDetail({ uuid: 's-1' }));
        expect(next.secret).toBeUndefined();
        expect(next.isFetchingDetail).toBe(true);

        const detail = { uuid: 's-1', name: 'Secret' } as any;
        next = reducer(next, actions.getSecretDetailSuccess({ secret: detail }));
        expect(next.isFetchingDetail).toBe(false);
        expect(next.secret).toEqual(detail);

        next = reducer({ ...next, isFetchingDetail: true }, actions.getSecretDetailFailure({ error: 'err' }));
        expect(next.isFetchingDetail).toBe(false);
    });

    test('getSecretContent / success / failure update content and flags', () => {
        let next = reducer(
            { ...initialState, secretContent: { type: 'generic', content: 'old' } as any },
            actions.getSecretContent({ uuid: 's-1' }),
        );
        expect(next.secretContent).toBeUndefined();
        expect(next.isFetchingContent).toBe(true);

        const content = { type: 'generic', content: 'secret-value' } as any;
        next = reducer(next, actions.getSecretContentSuccess({ content }));
        expect(next.isFetchingContent).toBe(false);
        expect(next.secretContent).toEqual(content);

        next = reducer({ ...next, isFetchingContent: true }, actions.getSecretContentFailure({ error: 'err' }));
        expect(next.isFetchingContent).toBe(false);
        expect(next.secretContent).toEqual(content);
    });

    test('clearSecretContent clears secretContent but leaves other state intact', () => {
        const detail = { uuid: 's-1' } as any;
        const content = { type: 'generic', content: 'value' } as any;
        const next = reducer({ ...initialState, secret: detail, secretContent: content }, actions.clearSecretContent());
        expect(next.secretContent).toBeUndefined();
        expect(next.secret).toEqual(detail);
    });

    test('clearSecret also clears secretContent', () => {
        const next = reducer(
            {
                ...initialState,
                secret: { uuid: 's-1' } as any,
                versions: [{ uuid: 'v-1' } as any],
                secretContent: { type: 'generic', content: 'val' } as any,
            },
            actions.clearSecret(),
        );
        expect(next.secret).toBeUndefined();
        expect(next.versions).toEqual([]);
        expect(next.secretContent).toBeUndefined();
    });

    test('getSecretVersions / success / failure update versions and flags', () => {
        let next = reducer(initialState, actions.getSecretVersions({ uuid: 's-1' }));
        expect(next.isFetchingVersions).toBe(true);
        expect(next.versions).toEqual([]);

        const versions = [{ uuid: 'v-1' }, { uuid: 'v-2' }] as any[];
        next = reducer(next, actions.getSecretVersionsSuccess({ versions }));
        expect(next.isFetchingVersions).toBe(false);
        expect(next.versions).toEqual(versions);

        next = reducer({ ...next, isFetchingVersions: true }, actions.getSecretVersionsFailure({ error: 'err' }));
        expect(next.isFetchingVersions).toBe(false);
    });

    test('getSyncVaultProfileAttributes / success / failure updates dedicated flags and descriptors', () => {
        const payload = { vaultUuid: 'v-1', vaultProfileUuid: 'vp-1', secretType: 'Generic' as any };

        let next = reducer(initialState, actions.getSyncVaultProfileAttributes(payload));
        expect(next.isFetchingSyncVaultProfileAttributes).toBe(true);
        expect(next.syncVaultProfileAttributeDescriptors).toEqual([]);

        const descriptors = [{ uuid: 'a-1' }] as any[];
        next = reducer(next, actions.getSyncVaultProfileAttributesSuccess({ descriptors }));
        expect(next.isFetchingSyncVaultProfileAttributes).toBe(false);
        expect(next.syncVaultProfileAttributeDescriptors).toEqual(descriptors);

        next = reducer(
            { ...next, isFetchingSyncVaultProfileAttributes: true },
            actions.getSyncVaultProfileAttributesFailure({ error: 'err' }),
        );
        expect(next.isFetchingSyncVaultProfileAttributes).toBe(false);
    });

    test('getSyncVaultProfileAttributes does not touch secretCreationAttributeDescriptors', () => {
        const existingDescriptors = [{ uuid: 'existing' }] as any[];
        const stateWithDescriptors = {
            ...initialState,
            secretCreationAttributeDescriptors: existingDescriptors,
            isFetchingSecretCreationAttributes: false,
        };
        const next = reducer(
            stateWithDescriptors,
            actions.getSyncVaultProfileAttributes({ vaultUuid: 'v', vaultProfileUuid: 'vp', secretType: 'Generic' as any }),
        );
        expect(next.secretCreationAttributeDescriptors).toEqual(existingDescriptors);
        expect(next.isFetchingSecretCreationAttributes).toBe(false);
    });

    test('createSecret / success / failure update flags and detail', () => {
        const payload = {
            vaultUuid: 'v-1',
            vaultProfileUuid: 'vp-1',
            request: {
                name: 's1',
                description: '',
                secret: { type: 'Generic', content: '' },
                attributes: [],
            } as any,
        };
        let next = reducer(initialState, actions.createSecret(payload));
        expect(next.isCreating).toBe(true);

        const detail = { uuid: 's-1', name: 'Secret' } as any;
        next = reducer(next, actions.createSecretSuccess({ secret: detail }));
        expect(next.isCreating).toBe(false);
        expect(next.secret).toEqual(detail);

        next = reducer({ ...next, isCreating: true }, actions.createSecretFailure({ error: 'err' }));
        expect(next.isCreating).toBe(false);
    });

    test('updateSecret / success / failure update flags and detail', () => {
        let next = reducer(initialState, actions.updateSecret({ uuid: 's-1', update: { description: '', attributes: [] } as any }));
        expect(next.isUpdating).toBe(true);

        const detail = { uuid: 's-1', name: 'Updated' } as any;
        next = reducer(next, actions.updateSecretSuccess({ secret: detail }));
        expect(next.isUpdating).toBe(false);
        expect(next.secret).toEqual(detail);

        next = reducer({ ...next, isUpdating: true }, actions.updateSecretFailure({ error: 'err' }));
        expect(next.isUpdating).toBe(false);
    });

    test('updateSecretObjects / success / failure toggle isUpdating flag only', () => {
        let next = reducer(initialState, actions.updateSecretObjects({ uuid: 's-1', update: { ownerUuid: 'u-1' } as any }));
        expect(next.isUpdating).toBe(true);

        next = reducer(next, actions.updateSecretObjectsSuccess({ uuid: 's-1' }));
        expect(next.isUpdating).toBe(false);

        next = reducer({ ...next, isUpdating: true }, actions.updateSecretObjectsFailure({ error: 'err' }));
        expect(next.isUpdating).toBe(false);
    });

    test('deleteSecret / success / failure update flags, list and detail', () => {
        const list = [{ uuid: 's-1' } as any, { uuid: 's-2' } as any];

        let next = reducer(
            { ...initialState, secrets: list, secret: { uuid: 's-1' } as any, versions: [{ uuid: 'v-1' } as any] },
            actions.deleteSecret({ uuid: 's-1' }),
        );
        expect(next.isDeleting).toBe(true);

        next = reducer(next, actions.deleteSecretSuccess({ uuid: 's-1' }));
        expect(next.isDeleting).toBe(false);
        expect(next.secrets).toEqual([{ uuid: 's-2' }]);
        expect(next.secret).toBeUndefined();
        expect(next.versions).toEqual([]);

        next = reducer({ ...next, isDeleting: true }, actions.deleteSecretFailure({ error: 'err' }));
        expect(next.isDeleting).toBe(false);
    });

    test('enableSecret / success / failure update enabling flag and enabled state', () => {
        const list = [{ uuid: 's-1', enabled: false } as any, { uuid: 's-2', enabled: false } as any];
        let next = reducer(
            { ...initialState, secrets: list, secret: { uuid: 's-1', enabled: false } as any },
            actions.enableSecret({ uuid: 's-1' }),
        );
        expect(next.isEnabling).toBe(true);

        next = reducer(next, actions.enableSecretSuccess({ uuid: 's-1' }));
        expect(next.isEnabling).toBe(false);
        expect(next.secrets.find((s) => s.uuid === 's-1')?.enabled).toBe(true);
        expect(next.secret?.enabled).toBe(true);

        next = reducer({ ...next, isEnabling: true }, actions.enableSecretFailure({ error: 'err' }));
        expect(next.isEnabling).toBe(false);
    });

    test('disableSecret / success / failure update disabling flag and enabled state', () => {
        const list = [{ uuid: 's-1', enabled: true } as any, { uuid: 's-2', enabled: true } as any];
        let next = reducer(
            { ...initialState, secrets: list, secret: { uuid: 's-1', enabled: true } as any },
            actions.disableSecret({ uuid: 's-1' }),
        );
        expect(next.isDisabling).toBe(true);

        next = reducer(next, actions.disableSecretSuccess({ uuid: 's-1' }));
        expect(next.isDisabling).toBe(false);
        expect(next.secrets.find((s) => s.uuid === 's-1')?.enabled).toBe(false);
        expect(next.secret?.enabled).toBe(false);

        next = reducer({ ...next, isDisabling: true }, actions.disableSecretFailure({ error: 'err' }));
        expect(next.isDisabling).toBe(false);
    });

    test('listSecretAttributes / success / failure update secret creation attribute flags and data', () => {
        const payload = { vaultUuid: 'v-1', vaultProfileUuid: 'vp-1', secretType: 'Generic' as any };

        let next = reducer(
            { ...initialState, secretCreationAttributeDescriptors: [{ uuid: 'old' }] as any },
            actions.listSecretAttributes(payload),
        );
        expect(next.isFetchingSecretCreationAttributes).toBe(true);
        expect(next.secretCreationAttributeDescriptors).toEqual([]);

        const descriptors = [{ uuid: 'a-1' }] as any[];
        next = reducer(next, actions.listSecretAttributesSuccess({ descriptors }));
        expect(next.isFetchingSecretCreationAttributes).toBe(false);
        expect(next.secretCreationAttributeDescriptors).toEqual(descriptors);

        next = reducer({ ...next, isFetchingSecretCreationAttributes: true }, actions.listSecretAttributesFailure());
        expect(next.isFetchingSecretCreationAttributes).toBe(false);
    });

    test('addSyncVaultProfile / success / failure toggle isUpdating flag', () => {
        let next = reducer(initialState, actions.addSyncVaultProfile({ uuid: 's-1', vaultProfileUuid: 'vp-1', attributes: [] }));
        expect(next.isUpdating).toBe(true);

        next = reducer(next, actions.addSyncVaultProfileSuccess({ uuid: 's-1' }));
        expect(next.isUpdating).toBe(false);

        next = reducer({ ...next, isUpdating: true }, actions.addSyncVaultProfileFailure({ error: 'err' }));
        expect(next.isUpdating).toBe(false);
    });

    test('removeSyncVaultProfile / success / failure toggle isUpdating flag', () => {
        let next = reducer(initialState, actions.removeSyncVaultProfile({ uuid: 's-1', vaultProfileUuid: 'vp-1' }));
        expect(next.isUpdating).toBe(true);

        next = reducer(next, actions.removeSyncVaultProfileSuccess({ uuid: 's-1', vaultProfileUuid: 'vp-1' }));
        expect(next.isUpdating).toBe(false);

        next = reducer({ ...next, isUpdating: true }, actions.removeSyncVaultProfileFailure({ error: 'err' }));
        expect(next.isUpdating).toBe(false);
    });
});

describe('secrets selectors', () => {
    test('selectors read values from secrets state', () => {
        const content = { type: 'generic', content: 'value' } as any;
        const secretsState = {
            ...initialState,
            secrets: [{ uuid: 's-1' } as any],
            secret: { uuid: 's-1' } as any,
            versions: [{ uuid: 'v-1' } as any],
            secretContent: content,
            isFetchingList: true,
            isFetchingDetail: true,
            isFetchingVersions: true,
            isFetchingContent: true,
            isCreating: true,
            isUpdating: true,
            isDeleting: true,
            isEnabling: true,
            isDisabling: true,
        };

        const state = { secrets: secretsState } as any;

        expect(selectors.secrets(state)).toEqual(secretsState.secrets);
        expect(selectors.secret(state)).toEqual(secretsState.secret);
        expect(selectors.versions(state)).toEqual(secretsState.versions);
        expect(selectors.secretContent(state)).toEqual(content);
        expect(selectors.isFetchingList(state)).toBe(true);
        expect(selectors.isFetchingDetail(state)).toBe(true);
        expect(selectors.isFetchingVersions(state)).toBe(true);
        expect(selectors.isFetchingContent(state)).toBe(true);
        expect(selectors.isCreating(state)).toBe(true);
        expect(selectors.isUpdating(state)).toBe(true);
        expect(selectors.isDeleting(state)).toBe(true);
        expect(selectors.isEnabling(state)).toBe(true);
        expect(selectors.isDisabling(state)).toBe(true);
        expect(selectors.secretCreationAttributeDescriptors(state)).toEqual([]);
        expect(selectors.isFetchingSecretCreationAttributes(state)).toBe(false);
        expect(selectors.syncVaultProfileAttributeDescriptors(state)).toEqual([]);
        expect(selectors.isFetchingSyncVaultProfileAttributes(state)).toBe(false);
    });
});
