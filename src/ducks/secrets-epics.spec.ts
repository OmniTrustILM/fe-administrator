import { describe, expect, test, vi } from 'vitest';
import type { UnknownAction } from '@reduxjs/toolkit';
import { firstValueFrom, of, throwError } from 'rxjs';
import { take, toArray } from 'rxjs/operators';

import { SECRET_OPTIONS_PAGE_SIZE, actions as secretsActions } from './secrets';
import { actions as userInterfaceActions } from './user-interface';
import { actions as pagingActions } from './paging';
import { actions as appRedirectActions } from './app-redirect';
import { actions as alertActions } from './alerts';
import { EntityType } from './filters';
import { LockWidgetNameEnum } from 'types/user-interface';

vi.mock('../App', async () => ({ store: (await import('./epics-test-mocks')).getEpicMocks().appStore }));
vi.mock('./alerts', async () => ({ actions: (await import('./epics-test-mocks')).getEpicMocks().alertActions }));

type EpicDeps = {
    apiClients: {
        secrets: {
            listSecrets: (args: any) => any;
            getSecretDetails: (args: any) => any;
            getSecretVersions: (args: any) => any;
            getSecretContent: (args: any) => any;
            createSecret: (args: any) => any;
            deleteSecret: (args: any) => any;
            enableSecret: (args: any) => any;
            disableSecret: (args: any) => any;
            updateSecret: (args: any) => any;
            updateSecretObjects: (args: any) => any;
            addVaultProfileToSecret: (args: any) => any;
            removeVaultProfileFromSecret: (args: any) => any;
        };
        vaultProfiles: {
            listSecretAttributes: (args: any) => any;
        };
    };
};

enum SecretsEpicIndex {
    ListSecrets = 0,
    GetDetail = 1,
    GetVersions = 2,
    GetContent = 3,
    GetCreationAttributes = 4,
    Create = 5,
    Delete = 6,
    Enable = 7,
    Disable = 8,
    Update = 9,
    UpdateObjects = 10,
    AddSyncVaultProfile = 11,
    RemoveSyncVaultProfile = 12,
    GetSyncVaultProfileAttributes = 13,
    ListSecretOptions = 14,
}

async function runEpic(
    epicIndex: number,
    action: any,
    depsOverrides: Partial<EpicDeps['apiClients']> = {},
    takeCount = 1,
): Promise<UnknownAction[]> {
    const { default: epics } = await import('./secrets-epics');

    const defaultSecrets = {
        listSecrets: () =>
            of({
                items: [{ uuid: 's-1' }],
                totalItems: 1,
                pageNumber: 1,
                itemsPerPage: 10,
                totalPages: 1,
            }),
        getSecretDetails: () => of({ uuid: 's-1', name: 'Secret' }),
        getSecretVersions: () => of([{ version: 1 }]),
        getSecretContent: () => of({ type: 'generic', content: 'secret-value' }),
        createSecret: () => of({ uuid: 's-1', name: 'Secret' }),
        deleteSecret: () => of(null),
        enableSecret: () => of(null),
        disableSecret: () => of(null),
        updateSecret: () => of({ uuid: 's-1', name: 'Updated Secret' }),
        updateSecretObjects: () => of(null),
        addVaultProfileToSecret: () => of(null),
        removeVaultProfileFromSecret: () => of(null),
    };
    const defaultVaultProfiles = {
        listSecretAttributes: () => of([{ uuid: 'attr-1' }]),
    };
    const deps: EpicDeps = {
        apiClients: {
            secrets: depsOverrides.secrets ? { ...defaultSecrets, ...depsOverrides.secrets } : defaultSecrets,
            vaultProfiles: depsOverrides.vaultProfiles ? { ...defaultVaultProfiles, ...depsOverrides.vaultProfiles } : defaultVaultProfiles,
        },
    };

    const epic = (epics as any)[epicIndex];
    const output$ = epic(of(action), of({}) as any, deps as any);
    return firstValueFrom(output$.pipe(take(takeCount), toArray()));
}

describe('secrets epics', () => {
    test('listSecrets success emits listSecretsSuccess, paging listSuccess and removeWidgetLock', async () => {
        const search = { pageNumber: 1, itemsPerPage: 10, filters: [] } as any;
        const emitted = await runEpic(SecretsEpicIndex.ListSecrets, secretsActions.listSecrets(search), {}, 3);

        expect(emitted[0].type).toBe(secretsActions.listSecretsSuccess.type);
        expect(emitted[1]).toEqual(pagingActions.listSuccess({ entity: EntityType.SECRET, totalItems: 1 }));
        expect(emitted[2]).toEqual(userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfSecrets));
    });

    test('listSecrets failure emits listSecretsFailure, paging listFailure and insertWidgetLock', async () => {
        const err = new Error('failed');
        const emitted = await runEpic(
            SecretsEpicIndex.ListSecrets,
            secretsActions.listSecrets({ pageNumber: 1, itemsPerPage: 10, filters: [] } as any),
            {
                secrets: {
                    listSecrets: () => throwError(() => err),
                } as any,
            },
            3,
        );

        expect(emitted[0].type).toBe(secretsActions.listSecretsFailure.type);
        expect(emitted[1]).toEqual(pagingActions.listFailure(EntityType.SECRET));
        expect(emitted[2].type).toBe(userInterfaceActions.insertWidgetLock.type);
    });

    test('listSecretOptions asks for one full page and emits only its own success', async () => {
        let request: any;
        const emitted = await runEpic(
            SecretsEpicIndex.ListSecretOptions,
            secretsActions.listSecretOptions(),
            {
                secrets: {
                    listSecrets: (args: any) => {
                        request = args;
                        return of({ items: [{ uuid: 's-1' }], totalItems: 1 });
                    },
                } as any,
            },
            5,
        );

        expect(request.searchRequestDto).toEqual({ itemsPerPage: SECRET_OPTIONS_PAGE_SIZE, pageNumber: 1, filters: [] });
        expect(emitted).toEqual([secretsActions.listSecretOptionsSuccess({ secrets: [{ uuid: 's-1' }] as any })]);
    });

    test('listSecretOptions failure carries the reason without a toast, widget lock or paging change', async () => {
        const emitted = await runEpic(
            SecretsEpicIndex.ListSecretOptions,
            secretsActions.listSecretOptions(),
            { secrets: { listSecrets: () => throwError(() => new Error('denied')) } as any },
            5,
        );

        expect(emitted).toHaveLength(1);
        expect(emitted[0].type).toBe(secretsActions.listSecretOptionsFailure.type);
        expect((emitted[0] as any).payload.error).toContain('denied');
    });

    test('getSecretContent success emits getSecretContentSuccess', async () => {
        const emitted = await runEpic(SecretsEpicIndex.GetContent, secretsActions.getSecretContent({ uuid: 's-1' }), {}, 1);

        expect(emitted[0].type).toBe(secretsActions.getSecretContentSuccess.type);
        expect((emitted[0] as any).payload.content).toEqual({ type: 'generic', content: 'secret-value' });
    });

    test('getSecretContent failure emits getSecretContentFailure and fetchError', async () => {
        const err = new Error('failed');
        const emitted = await runEpic(
            SecretsEpicIndex.GetContent,
            secretsActions.getSecretContent({ uuid: 's-1' }),
            {
                secrets: {
                    getSecretContent: () => throwError(() => err),
                } as any,
            },
            2,
        );

        expect(emitted[0].type).toBe(secretsActions.getSecretContentFailure.type);
        expect(emitted[1]).toEqual(appRedirectActions.fetchError({ error: err, message: 'Failed to get Secret content' }));
    });

    test('createSecret success redirects to the inventory without listing it, leaving that to the host', async () => {
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
        const emitted = await runEpic(SecretsEpicIndex.Create, secretsActions.createSecret(payload), {}, 3);

        expect(emitted[0].type).toBe(secretsActions.createSecretSuccess.type);
        expect(emitted[1]).toEqual(appRedirectActions.redirect({ url: '/secrets' }));
        expect(emitted[2]).toEqual(alertActions.success('Secret created successfully.'));
        // The inventory lists under the columns and ordering it owns, which this request could not name.
        expect(emitted.some((action: any) => action.type === secretsActions.listSecrets.type)).toBe(false);
    });

    test('deleteSecret success emits deleteSecretSuccess and info fetchError', async () => {
        const emitted = await runEpic(SecretsEpicIndex.Delete, secretsActions.deleteSecret({ uuid: 's-1' }), {}, 3);

        expect(emitted[0]).toEqual(secretsActions.deleteSecretSuccess({ uuid: 's-1' }));
        expect(emitted[1]).toEqual(appRedirectActions.redirect({ url: '/secrets' }));
        expect(emitted[2]).toEqual(alertActions.success('Secret deleted successfully.'));
    });

    test('deleteSecret failure emits deleteSecretFailure and fetchError', async () => {
        const err = new Error('failed');
        const emitted = await runEpic(
            SecretsEpicIndex.Delete,
            secretsActions.deleteSecret({ uuid: 's-1' }),
            {
                secrets: {
                    deleteSecret: () => throwError(() => err),
                } as any,
            },
            2,
        );

        expect(emitted[0].type).toBe(secretsActions.deleteSecretFailure.type);
        expect(emitted[1]).toEqual(appRedirectActions.fetchError({ error: err, message: 'Failed to delete Secret' }));
    });

    test('updateSecret success emits updateSecretSuccess and success fetchError', async () => {
        const emitted = await runEpic(
            SecretsEpicIndex.Update,
            secretsActions.updateSecret({ uuid: 's-1', update: { description: '', attributes: [] } as any }),
            {},
            2,
        );

        expect(emitted[0].type).toBe(secretsActions.updateSecretSuccess.type);
        expect(emitted[1]).toEqual(alertActions.success('Secret updated successfully.'));
    });

    test('updateSecret failure emits updateSecretFailure and fetchError', async () => {
        const err = new Error('failed');
        const emitted = await runEpic(
            SecretsEpicIndex.Update,
            secretsActions.updateSecret({ uuid: 's-1', update: { description: '', attributes: [] } as any }),
            {
                secrets: {
                    updateSecret: () => throwError(() => err),
                } as any,
            },
            2,
        );

        expect(emitted[0].type).toBe(secretsActions.updateSecretFailure.type);
        expect(emitted[1]).toEqual(appRedirectActions.fetchError({ error: err, message: 'Failed to update Secret' }));
    });

    test('updateSecretObjects success emits updateSecretObjectsSuccess and info fetchError', async () => {
        const emitted = await runEpic(
            SecretsEpicIndex.UpdateObjects,
            secretsActions.updateSecretObjects({ uuid: 's-1', update: { ownerUuid: 'u-1' } as any }),
            {},
            2,
        );

        expect(emitted[0]).toEqual(secretsActions.updateSecretObjectsSuccess({ uuid: 's-1' }));
        expect(emitted[1]).toEqual(alertActions.success('Secret updated successfully.'));
    });

    test('updateSecretObjects failure emits updateSecretObjectsFailure and fetchError', async () => {
        const err = new Error('failed');
        const emitted = await runEpic(
            SecretsEpicIndex.UpdateObjects,
            secretsActions.updateSecretObjects({ uuid: 's-1', update: { ownerUuid: 'u-1' } as any }),
            {
                secrets: {
                    updateSecretObjects: () => throwError(() => err),
                } as any,
            },
            2,
        );

        expect(emitted[0].type).toBe(secretsActions.updateSecretObjectsFailure.type);
        expect(emitted[1]).toEqual(appRedirectActions.fetchError({ error: err, message: 'Failed to update Secret' }));
    });

    test('addSyncVaultProfile success emits addSyncVaultProfileSuccess, getSecretDetail and success alert', async () => {
        const emitted = await runEpic(
            SecretsEpicIndex.AddSyncVaultProfile,
            secretsActions.addSyncVaultProfile({ uuid: 's-1', vaultProfileUuid: 'vp-1', attributes: [] }),
            {},
            3,
        );

        expect(emitted[0]).toEqual(secretsActions.addSyncVaultProfileSuccess({ uuid: 's-1' }));
        expect(emitted[1]).toEqual(secretsActions.getSecretDetail({ uuid: 's-1' }));
        expect(emitted[2]).toEqual(alertActions.success('Vault profile added successfully.'));
    });

    test('addSyncVaultProfile failure emits addSyncVaultProfileFailure and fetchError', async () => {
        const err = new Error('failed');
        const emitted = await runEpic(
            SecretsEpicIndex.AddSyncVaultProfile,
            secretsActions.addSyncVaultProfile({ uuid: 's-1', vaultProfileUuid: 'vp-1', attributes: [] }),
            {
                secrets: {
                    addVaultProfileToSecret: () => throwError(() => err),
                } as any,
            },
            2,
        );

        expect(emitted[0].type).toBe(secretsActions.addSyncVaultProfileFailure.type);
        expect(emitted[1]).toEqual(
            appRedirectActions.fetchError({
                error: err,
                message: 'Failed to add Vault profile to Secret',
            }),
        );
    });

    test('removeSyncVaultProfile success emits removeSyncVaultProfileSuccess, getSecretDetail and success alert', async () => {
        const emitted = await runEpic(
            SecretsEpicIndex.RemoveSyncVaultProfile,
            secretsActions.removeSyncVaultProfile({ uuid: 's-1', vaultProfileUuid: 'vp-1' } as any),
            {},
            3,
        );

        expect(emitted[0]).toEqual(secretsActions.removeSyncVaultProfileSuccess({ uuid: 's-1', vaultProfileUuid: 'vp-1' }));
        expect(emitted[1]).toEqual(secretsActions.getSecretDetail({ uuid: 's-1' }));
        expect(emitted[2]).toEqual(alertActions.success('Vault profile removed successfully.'));
    });

    test('removeSyncVaultProfile failure emits removeSyncVaultProfileFailure and fetchError', async () => {
        const err = new Error('failed');
        const emitted = await runEpic(
            SecretsEpicIndex.RemoveSyncVaultProfile,
            secretsActions.removeSyncVaultProfile({ uuid: 's-1', vaultProfileUuid: 'vp-1' } as any),
            {
                secrets: {
                    removeVaultProfileFromSecret: () => throwError(() => err),
                } as any,
            },
            2,
        );

        expect(emitted[0].type).toBe(secretsActions.removeSyncVaultProfileFailure.type);
        expect(emitted[1]).toEqual(
            appRedirectActions.fetchError({
                error: err,
                message: 'Failed to remove Vault profile from Secret',
            }),
        );
    });

    test('getSyncVaultProfileAttributes success emits getSyncVaultProfileAttributesSuccess', async () => {
        const payload = { vaultUuid: 'v-1', vaultProfileUuid: 'vp-1', secretType: 'Generic' as any };
        const emitted = await runEpic(
            SecretsEpicIndex.GetSyncVaultProfileAttributes,
            secretsActions.getSyncVaultProfileAttributes(payload),
            {},
            1,
        );

        expect(emitted[0].type).toBe(secretsActions.getSyncVaultProfileAttributesSuccess.type);
        expect((emitted[0] as any).payload.descriptors).toHaveLength(1);
    });

    test('getSyncVaultProfileAttributes failure emits getSyncVaultProfileAttributesFailure and fetchError', async () => {
        const err = new Error('failed');
        const payload = { vaultUuid: 'v-1', vaultProfileUuid: 'vp-1', secretType: 'Generic' as any };
        const emitted = await runEpic(
            SecretsEpicIndex.GetSyncVaultProfileAttributes,
            secretsActions.getSyncVaultProfileAttributes(payload),
            {
                vaultProfiles: {
                    listSecretAttributes: () => throwError(() => err),
                } as any,
            },
            2,
        );

        expect(emitted[0].type).toBe(secretsActions.getSyncVaultProfileAttributesFailure.type);
        expect(emitted[1]).toEqual(
            appRedirectActions.fetchError({ error: err, message: 'Failed to get Vault profile attributes for sync' }),
        );
    });

    test('getSecretDetail success emits getSecretDetailSuccess and removeWidgetLock', async () => {
        const emitted = await runEpic(SecretsEpicIndex.GetDetail, secretsActions.getSecretDetail({ uuid: 's-1' }), {}, 2);

        expect(emitted[0].type).toBe(secretsActions.getSecretDetailSuccess.type);
        expect(emitted[1]).toEqual(userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.SecretDetailsWidget));
    });

    test('getSecretDetail failure emits getSecretDetailFailure and insertWidgetLock', async () => {
        const err = new Error('failed');
        const emitted = await runEpic(
            SecretsEpicIndex.GetDetail,
            secretsActions.getSecretDetail({ uuid: 's-1' }),
            {
                secrets: {
                    getSecretDetails: () => throwError(() => err),
                } as any,
            },
            2,
        );

        expect(emitted[0].type).toBe(secretsActions.getSecretDetailFailure.type);
        expect(emitted[1].type).toBe(userInterfaceActions.insertWidgetLock.type);
    });

    test('getSecretVersions success emits getSecretVersionsSuccess', async () => {
        const emitted = await runEpic(SecretsEpicIndex.GetVersions, secretsActions.getSecretVersions({ uuid: 's-1' }), {}, 1);

        expect(emitted[0].type).toBe(secretsActions.getSecretVersionsSuccess.type);
        expect((emitted[0] as any).payload.versions).toHaveLength(1);
    });

    test('getSecretVersions failure emits getSecretVersionsFailure', async () => {
        const err = new Error('failed');
        const emitted = await runEpic(
            SecretsEpicIndex.GetVersions,
            secretsActions.getSecretVersions({ uuid: 's-1' }),
            {
                secrets: {
                    getSecretVersions: () => throwError(() => err),
                } as any,
            },
            1,
        );

        expect(emitted[0].type).toBe(secretsActions.getSecretVersionsFailure.type);
    });

    test('listSecretAttributes success emits listSecretAttributesSuccess', async () => {
        const payload = { vaultUuid: 'v-1', vaultProfileUuid: 'vp-1', secretType: 'Generic' as any };
        const emitted = await runEpic(SecretsEpicIndex.GetCreationAttributes, secretsActions.listSecretAttributes(payload), {}, 1);

        expect(emitted[0].type).toBe(secretsActions.listSecretAttributesSuccess.type);
        expect((emitted[0] as any).payload.descriptors).toHaveLength(1);
    });

    test('listSecretAttributes failure emits listSecretAttributesFailure', async () => {
        const err = new Error('failed');
        const payload = { vaultUuid: 'v-1', vaultProfileUuid: 'vp-1', secretType: 'Generic' as any };
        const emitted = await runEpic(
            SecretsEpicIndex.GetCreationAttributes,
            secretsActions.listSecretAttributes(payload),
            {
                vaultProfiles: {
                    listSecretAttributes: () => throwError(() => err),
                } as any,
            },
            1,
        );

        expect(emitted[0].type).toBe(secretsActions.listSecretAttributesFailure.type);
    });

    test('createSecret failure emits createSecretFailure and fetchError', async () => {
        const err = new Error('failed');
        const payload = {
            vaultUuid: 'v-1',
            vaultProfileUuid: 'vp-1',
            request: { name: 's1', description: '', secret: { type: 'Generic', content: '' }, attributes: [] } as any,
        };
        const emitted = await runEpic(
            SecretsEpicIndex.Create,
            secretsActions.createSecret(payload),
            {
                secrets: {
                    createSecret: () => throwError(() => err),
                } as any,
            },
            2,
        );

        expect(emitted[0].type).toBe(secretsActions.createSecretFailure.type);
        expect(emitted[1]).toEqual(appRedirectActions.fetchError({ error: err, message: 'Failed to create Secret' }));
    });

    test('enableSecret success emits enableSecretSuccess, getSecretDetail and success alert', async () => {
        const emitted = await runEpic(SecretsEpicIndex.Enable, secretsActions.enableSecret({ uuid: 's-1' }), {}, 3);

        expect(emitted[0]).toEqual(secretsActions.enableSecretSuccess({ uuid: 's-1' }));
        expect(emitted[1]).toEqual(secretsActions.getSecretDetail({ uuid: 's-1' }));
        expect(emitted[2]).toEqual(alertActions.success('Secret enabled successfully.'));
    });

    test('enableSecret failure emits enableSecretFailure and fetchError', async () => {
        const err = new Error('failed');
        const emitted = await runEpic(
            SecretsEpicIndex.Enable,
            secretsActions.enableSecret({ uuid: 's-1' }),
            {
                secrets: {
                    enableSecret: () => throwError(() => err),
                } as any,
            },
            2,
        );

        expect(emitted[0].type).toBe(secretsActions.enableSecretFailure.type);
        expect(emitted[1]).toEqual(appRedirectActions.fetchError({ error: err, message: 'Failed to enable Secret' }));
    });

    test('disableSecret success emits disableSecretSuccess, getSecretDetail and success alert', async () => {
        const emitted = await runEpic(SecretsEpicIndex.Disable, secretsActions.disableSecret({ uuid: 's-1' }), {}, 3);

        expect(emitted[0]).toEqual(secretsActions.disableSecretSuccess({ uuid: 's-1' }));
        expect(emitted[1]).toEqual(secretsActions.getSecretDetail({ uuid: 's-1' }));
        expect(emitted[2]).toEqual(alertActions.success('Secret disabled successfully.'));
    });

    test('disableSecret failure emits disableSecretFailure and fetchError', async () => {
        const err = new Error('failed');
        const emitted = await runEpic(
            SecretsEpicIndex.Disable,
            secretsActions.disableSecret({ uuid: 's-1' }),
            {
                secrets: {
                    disableSecret: () => throwError(() => err),
                } as any,
            },
            2,
        );

        expect(emitted[0].type).toBe(secretsActions.disableSecretFailure.type);
        expect(emitted[1]).toEqual(appRedirectActions.fetchError({ error: err, message: 'Failed to disable Secret' }));
    });
});
