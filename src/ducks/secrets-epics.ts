import type { AppEpic } from 'ducks';
import { type Observable, of } from 'rxjs';
import { catchError, filter, map, mergeMap, switchMap, takeUntil } from 'rxjs/operators';

import type { AttributeDescriptorDto, AttributeDescriptorModel } from 'types/attributes';
import type { SecretType, VaultProfileManagementApi } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import { extractError } from 'utils/net';

import { actions as alertActions } from './alerts';
import { actions as appRedirectActions } from './app-redirect';
import { EntityType } from './filters';
import { actions as pagingActions } from './paging';
import { slice } from './secrets';
import { actions as userInterfaceActions } from './user-interface';
import { transformSearchRequestModelToDto } from './transform/certificates';
import { transformAttributeDescriptorDtoToModel } from './transform/attributes';
import { store } from '../App';

const listSecrets: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listSecrets.match),
        switchMap((action) => {
            store.dispatch(pagingActions.list(EntityType.SECRET));
            return deps.apiClients.secrets.listSecrets({ searchRequestDto: transformSearchRequestModelToDto(action.payload) }).pipe(
                mergeMap((response) =>
                    of(
                        slice.actions.listSecretsSuccess({ secrets: response.items }),
                        pagingActions.listSuccess({ entity: EntityType.SECRET, totalItems: response.totalItems }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfSecrets),
                    ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.listSecretsFailure({
                            error: extractError(err, 'Failed to get Secret list'),
                        }),
                        pagingActions.listFailure(EntityType.SECRET),
                        userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.ListOfSecrets),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to get Secret list' }),
                    ),
                ),
            );
        }),
    );
};

const getSecretDetail: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getSecretDetail.match),
        switchMap((action: ReturnType<typeof slice.actions.getSecretDetail>) =>
            deps.apiClients.secrets.getSecretDetails({ uuid: action.payload.uuid }).pipe(
                mergeMap((secret) =>
                    of(
                        slice.actions.getSecretDetailSuccess({ secret }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.SecretDetailsWidget),
                    ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.getSecretDetailFailure({
                            error: extractError(err, 'Failed to get Secret details'),
                        }),
                        userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.SecretDetailsWidget),
                    ),
                ),
            ),
        ),
    );
};

const getSecretVersions: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getSecretVersions.match),
        switchMap((action: ReturnType<typeof slice.actions.getSecretVersions>) =>
            deps.apiClients.secrets.getSecretVersions({ uuid: action.payload.uuid }).pipe(
                mergeMap((versions) =>
                    of(
                        slice.actions.getSecretVersionsSuccess({ versions }),
                        // no widget lock for versions list for now
                    ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.getSecretVersionsFailure({
                            error: extractError(err, 'Failed to get Secret versions'),
                        }),
                    ),
                ),
            ),
        ),
    );
};

const deleteSecret: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.deleteSecret.match),
        mergeMap((action: ReturnType<typeof slice.actions.deleteSecret>) =>
            deps.apiClients.secrets.deleteSecret({ uuid: action.payload.uuid }).pipe(
                mergeMap(() =>
                    of(
                        slice.actions.deleteSecretSuccess({ uuid: action.payload.uuid }),
                        appRedirectActions.redirect({ url: '/secrets' }),
                        alertActions.success('Secret deleted successfully.'),
                    ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.deleteSecretFailure({
                            error: extractError(err, 'Failed to delete Secret'),
                        }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to delete Secret' }),
                    ),
                ),
            ),
        ),
    );
};

const updateSecret: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.updateSecret.match),
        switchMap((action: ReturnType<typeof slice.actions.updateSecret>) =>
            deps.apiClients.secrets
                .updateSecret({
                    uuid: action.payload.uuid,
                    secretUpdateRequestDto: action.payload.update,
                })
                .pipe(
                    mergeMap((secret) =>
                        of(slice.actions.updateSecretSuccess({ secret }), alertActions.success('Secret updated successfully.')),
                    ),
                    catchError((err) =>
                        of(
                            slice.actions.updateSecretFailure({
                                error: extractError(err, 'Failed to update Secret'),
                            }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to update Secret' }),
                        ),
                    ),
                ),
        ),
    );
};

const enableSecret: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.enableSecret.match),
        mergeMap((action: ReturnType<typeof slice.actions.enableSecret>) =>
            deps.apiClients.secrets.enableSecret({ uuid: action.payload.uuid }).pipe(
                mergeMap(() =>
                    of(
                        slice.actions.enableSecretSuccess({ uuid: action.payload.uuid }),
                        slice.actions.getSecretDetail({ uuid: action.payload.uuid }),
                        alertActions.success('Secret enabled successfully.'),
                    ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.enableSecretFailure({
                            error: extractError(err, 'Failed to enable Secret'),
                        }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to enable Secret' }),
                    ),
                ),
            ),
        ),
    );
};

const disableSecret: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.disableSecret.match),
        mergeMap((action: ReturnType<typeof slice.actions.disableSecret>) =>
            deps.apiClients.secrets.disableSecret({ uuid: action.payload.uuid }).pipe(
                mergeMap(() =>
                    of(
                        slice.actions.disableSecretSuccess({ uuid: action.payload.uuid }),
                        slice.actions.getSecretDetail({ uuid: action.payload.uuid }),
                        alertActions.success('Secret disabled successfully.'),
                    ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.disableSecretFailure({
                            error: extractError(err, 'Failed to disable Secret'),
                        }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to disable Secret' }),
                    ),
                ),
            ),
        ),
    );
};

const updateSecretObjects: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.updateSecretObjects.match),
        switchMap((action: ReturnType<typeof slice.actions.updateSecretObjects>) =>
            deps.apiClients.secrets
                .updateSecretObjects({
                    uuid: action.payload.uuid,
                    secretUpdateObjectsDto: action.payload.update,
                })
                .pipe(
                    mergeMap(() =>
                        of(
                            slice.actions.updateSecretObjectsSuccess({ uuid: action.payload.uuid }),
                            alertActions.success('Secret updated successfully.'),
                        ),
                    ),
                    catchError((err) =>
                        of(
                            slice.actions.updateSecretObjectsFailure({
                                error: extractError(err, 'Failed to update Secret'),
                            }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to update Secret' }),
                        ),
                    ),
                ),
        ),
    );
};

const addSyncVaultProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.addSyncVaultProfile.match),
        switchMap((action: ReturnType<typeof slice.actions.addSyncVaultProfile>) =>
            deps.apiClients.secrets
                .addVaultProfileToSecret({
                    uuid: action.payload.uuid,
                    vaultProfileUuid: action.payload.vaultProfileUuid,
                    requestAttribute: action.payload.attributes,
                })
                .pipe(
                    mergeMap(() =>
                        of(
                            slice.actions.addSyncVaultProfileSuccess({ uuid: action.payload.uuid }),
                            slice.actions.getSecretDetail({ uuid: action.payload.uuid }),
                            alertActions.success('Vault profile added successfully.'),
                        ),
                    ),
                    catchError((err) =>
                        of(
                            slice.actions.addSyncVaultProfileFailure({
                                error: extractError(err, 'Failed to add Vault profile to Secret'),
                            }),
                            appRedirectActions.fetchError({
                                error: err,
                                message: 'Failed to add Vault profile to Secret',
                            }),
                        ),
                    ),
                ),
        ),
    );
};

const removeSyncVaultProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.removeSyncVaultProfile.match),
        switchMap((action: ReturnType<typeof slice.actions.removeSyncVaultProfile>) =>
            deps.apiClients.secrets
                .removeVaultProfileFromSecret({
                    uuid: action.payload.uuid,
                    vaultProfileUuid: action.payload.vaultProfileUuid,
                })
                .pipe(
                    mergeMap(() =>
                        of(
                            slice.actions.removeSyncVaultProfileSuccess({
                                uuid: action.payload.uuid,
                                vaultProfileUuid: action.payload.vaultProfileUuid,
                            }),
                            slice.actions.getSecretDetail({ uuid: action.payload.uuid }),
                            alertActions.success('Vault profile removed successfully.'),
                        ),
                    ),
                    catchError((err) =>
                        of(
                            slice.actions.removeSyncVaultProfileFailure({
                                error: extractError(err, 'Failed to remove Vault profile from Secret'),
                            }),
                            appRedirectActions.fetchError({
                                error: err,
                                message: 'Failed to remove Vault profile from Secret',
                            }),
                        ),
                    ),
                ),
        ),
    );
};

function fetchSecretAttributes(
    vaultProfilesApi: VaultProfileManagementApi,
    params: { vaultUuid: string; vaultProfileUuid: string; secretType: SecretType },
): Observable<AttributeDescriptorModel[]> {
    return vaultProfilesApi
        .listSecretAttributes({
            vaultUuid: params.vaultUuid,
            vaultProfileUuid: params.vaultProfileUuid,
            secretType: params.secretType,
        })
        .pipe(
            map((list: unknown) => {
                const arr = Array.isArray(list) ? list : [];
                return arr.map((attr: unknown) => transformAttributeDescriptorDtoToModel(attr as AttributeDescriptorDto));
            }),
        );
}

const listSecretAttributes: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listSecretAttributes.match),
        switchMap((action: ReturnType<typeof slice.actions.listSecretAttributes>) =>
            fetchSecretAttributes(deps.apiClients.vaultProfiles, action.payload).pipe(
                mergeMap((descriptors) => of(slice.actions.listSecretAttributesSuccess({ descriptors }))),
                catchError(() => of(slice.actions.listSecretAttributesFailure())),
            ),
        ),
    );
};

const getSyncVaultProfileAttributes: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getSyncVaultProfileAttributes.match),
        switchMap((action: ReturnType<typeof slice.actions.getSyncVaultProfileAttributes>) =>
            fetchSecretAttributes(deps.apiClients.vaultProfiles, action.payload).pipe(
                mergeMap((descriptors) => of(slice.actions.getSyncVaultProfileAttributesSuccess({ descriptors }))),
                catchError((err) =>
                    of(
                        slice.actions.getSyncVaultProfileAttributesFailure({
                            error: extractError(err, 'Failed to get Vault profile attributes for sync'),
                        }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to get Vault profile attributes for sync' }),
                    ),
                ),
            ),
        ),
    );
};

const getSecretContent: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getSecretContent.match),
        switchMap((action: ReturnType<typeof slice.actions.getSecretContent>) =>
            deps.apiClients.secrets.getSecretContent({ uuid: action.payload.uuid }).pipe(
                map((content) => slice.actions.getSecretContentSuccess({ content })),
                catchError((err) =>
                    of(
                        slice.actions.getSecretContentFailure({
                            error: extractError(err, 'Failed to get Secret content'),
                        }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to get Secret content' }),
                    ),
                ),
                takeUntil(action$.pipe(filter((a) => slice.actions.clearSecret.match(a) || slice.actions.clearSecretContent.match(a)))),
            ),
        ),
    );
};

const createSecret: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.createSecret.match),
        switchMap((action: ReturnType<typeof slice.actions.createSecret>) =>
            deps.apiClients.secrets
                .createSecret({
                    vaultUuid: action.payload.vaultUuid,
                    vaultProfileUuid: action.payload.vaultProfileUuid,
                    secretRequestDto: action.payload.request,
                })
                .pipe(
                    mergeMap((secret) =>
                        of(
                            slice.actions.createSecretSuccess({ secret }),
                            slice.actions.listSecrets({ pageNumber: 1, itemsPerPage: 10, filters: [] }),
                            appRedirectActions.redirect({ url: '/secrets' }),
                            alertActions.success('Secret created successfully.'),
                        ),
                    ),
                    catchError((err) =>
                        of(
                            slice.actions.createSecretFailure({
                                error: extractError(err, 'Failed to create Secret'),
                            }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to create Secret' }),
                        ),
                    ),
                ),
        ),
    );
};

const epics = [
    listSecrets,
    getSecretDetail,
    getSecretVersions,
    getSecretContent,
    listSecretAttributes,
    createSecret,
    deleteSecret,
    enableSecret,
    disableSecret,
    updateSecret,
    updateSecretObjects,
    addSyncVaultProfile,
    removeSyncVaultProfile,
    getSyncVaultProfileAttributes,
];

export default epics;
