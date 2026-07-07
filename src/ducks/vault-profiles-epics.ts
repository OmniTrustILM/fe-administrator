import type { AppEpic } from 'ducks';
import { of } from 'rxjs';
import { catchError, filter, switchMap, mergeMap, map } from 'rxjs/operators';
import { extractError } from 'utils/net';
import { slice } from './vault-profiles';
import { actions as appRedirectActions } from './app-redirect';
import { actions as alertActions } from './alerts';
import { actions as pagingActions } from './paging';
import { EntityType } from './filters';
import { actions as userInterfaceActions } from './user-interface';
import { LockWidgetNameEnum } from 'types/user-interface';
import { transformSearchRequestModelToDto } from './transform/certificates';
import { transformAttributeDescriptorDtoToModel } from './transform/attributes';
import { store } from '../App';

const defaultSearch = { pageNumber: 1, itemsPerPage: 10, filters: [] };

const listVaultProfiles: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listVaultProfiles.match),
        switchMap((action: ReturnType<typeof slice.actions.listVaultProfiles>) => {
            const search = action.payload ?? defaultSearch;
            const searchRequestDto = transformSearchRequestModelToDto(search);
            store.dispatch(pagingActions.list(EntityType.VAULT_PROFILE));
            return deps.apiClients.vaultProfiles.listVaultProfiles({ searchRequestDto }).pipe(
                mergeMap((response: { items?: import('types/openapi').VaultProfileDto[]; totalItems?: number }) =>
                    of(
                        slice.actions.listVaultProfilesSuccess({
                            items: response.items ?? [],
                        }),
                        pagingActions.listSuccess({ entity: EntityType.VAULT_PROFILE, totalItems: response.totalItems ?? 0 }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfVaultProfiles),
                    ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.listVaultProfilesFailure({
                            error: extractError(err, 'Failed to get Vault profiles'),
                        }),
                        pagingActions.listFailure(EntityType.VAULT_PROFILE),
                        userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.ListOfVaultProfiles),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to get Vault profiles' }),
                    ),
                ),
            );
        }),
    );
};

const createVaultProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.createVaultProfile.match),
        switchMap((action: ReturnType<typeof slice.actions.createVaultProfile>) =>
            deps.apiClients.vaultProfiles
                .createVaultProfile({
                    vaultUuid: action.payload.vaultUuid,
                    vaultProfileRequestDto: action.payload.request,
                })
                .pipe(
                    mergeMap((profile: Parameters<typeof slice.actions.createVaultProfileSuccess>[0]['profile']) =>
                        of(slice.actions.createVaultProfileSuccess({ profile }), appRedirectActions.redirect({ url: '/vaultprofiles' })),
                    ),
                    catchError((err) =>
                        of(
                            slice.actions.createVaultProfileFailure({
                                error: extractError(err, 'Failed to create Vault Profile'),
                            }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to create Vault Profile' }),
                        ),
                    ),
                ),
        ),
    );
};

const getVaultProfileDetail: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getVaultProfileDetail.match),
        switchMap((action: ReturnType<typeof slice.actions.getVaultProfileDetail>) =>
            deps.apiClients.vaultProfiles
                .getVaultProfileDetails({
                    vaultUuid: action.payload.vaultUuid,
                    vaultProfileUuid: action.payload.vaultProfileUuid,
                })
                .pipe(
                    mergeMap((profile: import('types/openapi').VaultProfileDetailDto) =>
                        of(slice.actions.getVaultProfileDetailSuccess({ profile })),
                    ),
                    catchError((err) =>
                        of(
                            slice.actions.getVaultProfileDetailFailure({
                                error: extractError(err, 'Failed to get Vault Profile details'),
                            }),
                            appRedirectActions.fetchError({
                                error: err,
                                message: 'Failed to get Vault Profile details',
                            }),
                        ),
                    ),
                ),
        ),
    );
};

const enableVaultProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.enableVaultProfile.match),
        switchMap((action: ReturnType<typeof slice.actions.enableVaultProfile>) =>
            deps.apiClients.vaultProfiles
                .enableVaultProfile({
                    vaultUuid: action.payload.vaultUuid,
                    vaultProfileUuid: action.payload.vaultProfileUuid,
                })
                .pipe(
                    switchMap(() =>
                        deps.apiClients.vaultProfiles.getVaultProfileDetails({
                            vaultUuid: action.payload.vaultUuid,
                            vaultProfileUuid: action.payload.vaultProfileUuid,
                        }),
                    ),
                    mergeMap((profile: import('types/openapi').VaultProfileDetailDto) =>
                        of(
                            slice.actions.enableVaultProfileSuccess({ profile }),
                            alertActions.success('Vault Profile enabled successfully.'),
                        ),
                    ),
                    catchError((err) =>
                        of(
                            slice.actions.enableVaultProfileFailure({
                                error: extractError(err, 'Failed to enable Vault Profile'),
                            }),
                            appRedirectActions.fetchError({
                                error: err,
                                message: 'Failed to enable Vault Profile',
                            }),
                        ),
                    ),
                ),
        ),
    );
};

const disableVaultProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.disableVaultProfile.match),
        switchMap((action: ReturnType<typeof slice.actions.disableVaultProfile>) =>
            deps.apiClients.vaultProfiles
                .disableVaultProfile({
                    vaultUuid: action.payload.vaultUuid,
                    vaultProfileUuid: action.payload.vaultProfileUuid,
                })
                .pipe(
                    switchMap(() =>
                        deps.apiClients.vaultProfiles.getVaultProfileDetails({
                            vaultUuid: action.payload.vaultUuid,
                            vaultProfileUuid: action.payload.vaultProfileUuid,
                        }),
                    ),
                    mergeMap((profile: import('types/openapi').VaultProfileDetailDto) =>
                        of(
                            slice.actions.disableVaultProfileSuccess({ profile }),
                            alertActions.success('Vault Profile disabled successfully.'),
                        ),
                    ),
                    catchError((err) =>
                        of(
                            slice.actions.disableVaultProfileFailure({
                                error: extractError(err, 'Failed to disable Vault Profile'),
                            }),
                            appRedirectActions.fetchError({
                                error: err,
                                message: 'Failed to disable Vault Profile',
                            }),
                        ),
                    ),
                ),
        ),
    );
};

const updateVaultProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.updateVaultProfile.match),
        switchMap((action: ReturnType<typeof slice.actions.updateVaultProfile>) =>
            deps.apiClients.vaultProfiles
                .updateVaultProfile({
                    vaultUuid: action.payload.vaultUuid,
                    vaultProfileUuid: action.payload.vaultProfileUuid,
                    vaultProfileUpdateRequestDto: action.payload.request,
                })
                .pipe(
                    mergeMap((profile: import('types/openapi').VaultProfileDetailDto) =>
                        of(
                            slice.actions.updateVaultProfileSuccess({ profile }),
                            alertActions.success('Vault Profile updated successfully.'),
                        ),
                    ),
                    catchError((err) =>
                        of(
                            slice.actions.updateVaultProfileFailure({
                                error: extractError(err, 'Failed to update Vault Profile'),
                            }),
                            appRedirectActions.fetchError({
                                error: err,
                                message: 'Failed to update Vault Profile',
                            }),
                        ),
                    ),
                ),
        ),
    );
};

const deleteVaultProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.deleteVaultProfile.match),
        mergeMap((action: ReturnType<typeof slice.actions.deleteVaultProfile>) =>
            deps.apiClients.vaultProfiles
                .deleteVaultProfile({
                    vaultUuid: action.payload.vaultUuid,
                    vaultProfileUuid: action.payload.vaultProfileUuid,
                })
                .pipe(
                    mergeMap(() =>
                        of(
                            slice.actions.deleteVaultProfileSuccess({ vaultProfileUuid: action.payload.vaultProfileUuid }),
                            appRedirectActions.redirect({ url: '/vaultprofiles' }),
                            alertActions.success('Vault Profile deleted successfully.'),
                        ),
                    ),
                    catchError((err) =>
                        of(
                            slice.actions.deleteVaultProfileFailure({
                                error: extractError(err, 'Failed to delete Vault Profile'),
                            }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to delete Vault Profile' }),
                        ),
                    ),
                ),
        ),
    );
};

const getVaultProfileAttributes: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getVaultProfileAttributes.match),
        switchMap((action) => {
            const { vaultUuid } = action.payload;
            return deps.apiClients.vaults.listVaultProfileAttributes({ uuid: vaultUuid }).pipe(
                map((attributes) => {
                    const list = Array.isArray(attributes) ? attributes : [];
                    return slice.actions.getVaultProfileAttributesSuccess({
                        vaultUuid,
                        attributes: list.map((attr) => transformAttributeDescriptorDtoToModel(attr)),
                    });
                }),
                catchError((err) =>
                    of(
                        slice.actions.getVaultProfileAttributesFailure({
                            vaultUuid,
                            error: extractError(err, 'Failed to get Vault Profile Attribute Descriptor list'),
                        }),
                        appRedirectActions.fetchError({
                            error: err,
                            message: 'Failed to get Vault Profile Attribute Descriptor list',
                        }),
                    ),
                ),
            );
        }),
    );
};

const epics = [
    listVaultProfiles,
    getVaultProfileDetail,
    createVaultProfile,
    enableVaultProfile,
    disableVaultProfile,
    updateVaultProfile,
    deleteVaultProfile,
    getVaultProfileAttributes,
];

export default epics;
