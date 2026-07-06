import type { AppEpic } from 'ducks';
import { of } from 'rxjs';
import { catchError, filter, map, mergeMap, switchMap } from 'rxjs/operators';
import { LockWidgetNameEnum } from 'types/user-interface';
import type { AttributeDescriptorDto } from 'types/attributes';
import { extractError } from 'utils/net';
import { actions as appRedirectActions } from './app-redirect';
import { actions as alertActions } from './alerts';
import { slice } from './vaults';
import { transformAttributeDescriptorDtoToModel } from './transform/attributes';
import { actions as userInterfaceActions } from './user-interface';
import { actions as pagingActions } from './paging';
import { EntityType } from './filters';
import { transformSearchRequestModelToDto } from './transform/certificates';
import { store } from '../App';

const listVaults: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listVaults.match),
        switchMap((action: ReturnType<typeof slice.actions.listVaults>) => {
            store.dispatch(pagingActions.list(EntityType.VAULT));
            return deps.apiClients.vaults.listVaultInstances({ searchRequestDto: transformSearchRequestModelToDto(action.payload) }).pipe(
                mergeMap((response) =>
                    of(
                        slice.actions.listVaultsSuccess({ items: response.items }),
                        pagingActions.listSuccess({ entity: EntityType.VAULT, totalItems: response.totalItems }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfVaults),
                    ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.listVaultsFailure({
                            error: extractError(err, 'Failed to get Vaults list'),
                        }),
                        pagingActions.listFailure(EntityType.VAULT),
                        userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.ListOfVaults),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to get Vaults list' }),
                    ),
                ),
            );
        }),
    );
};

const getVaultDetail: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getVaultDetail.match),
        switchMap((action: ReturnType<typeof slice.actions.getVaultDetail>) =>
            deps.apiClients.vaults.getVaultInstanceDetails({ uuid: action.payload.uuid }).pipe(
                mergeMap((vault) =>
                    of(
                        slice.actions.getVaultDetailSuccess({ vault }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.VaultDetails),
                    ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.getVaultDetailFailure({
                            error: extractError(err, 'Failed to get Vault details'),
                        }),
                        userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.VaultDetails),
                    ),
                ),
            ),
        ),
    );
};

const getVaultInstanceAttributes: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getVaultInstanceAttributes.match),
        switchMap((action: ReturnType<typeof slice.actions.getVaultInstanceAttributes>) => {
            const { connectorUuid } = action.payload;
            return deps.apiClients.vaults.listVaultInstanceAttributes({ connectorUuid }).pipe(
                map((attributes: unknown) => {
                    const list: unknown[] = Array.isArray(attributes) ? attributes : [];
                    return slice.actions.getVaultInstanceAttributesSuccess({
                        connectorUuid,
                        attributes: list.map((attr) => transformAttributeDescriptorDtoToModel(attr as AttributeDescriptorDto)),
                    });
                }),
                catchError(() => of(slice.actions.getVaultInstanceAttributesFailure({ connectorUuid }))),
            );
        }),
    );
};

const createVault: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.createVault.match),
        switchMap((action: ReturnType<typeof slice.actions.createVault>) =>
            deps.apiClients.vaults
                .createVaultInstance({
                    vaultInstanceRequestDto: action.payload.request,
                })
                .pipe(
                    mergeMap((vault) =>
                        of(
                            slice.actions.createVaultSuccess({ vault }),
                            slice.actions.listVaults({ pageNumber: 1, itemsPerPage: 10, filters: [] }),
                            appRedirectActions.redirect({ url: `/${'vaults'}` }),
                        ),
                    ),
                    catchError((err) =>
                        of(
                            slice.actions.createVaultFailure({
                                error: extractError(err, 'Failed to create Vault'),
                            }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to create Vault' }),
                        ),
                    ),
                ),
        ),
    );
};

const updateVault: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.updateVault.match),
        switchMap((action: ReturnType<typeof slice.actions.updateVault>) =>
            deps.apiClients.vaults
                .updateVaultInstance({
                    uuid: action.payload.uuid,
                    vaultInstanceUpdateRequestDto: action.payload.request,
                })
                .pipe(
                    mergeMap((vault) =>
                        of(slice.actions.updateVaultSuccess({ vault }), slice.actions.getVaultDetail({ uuid: action.payload.uuid })),
                    ),
                    catchError((err) =>
                        of(
                            slice.actions.updateVaultFailure({
                                error: extractError(err, 'Failed to update Vault'),
                            }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to update Vault' }),
                        ),
                    ),
                ),
        ),
    );
};

const deleteVault: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.deleteVault.match),
        mergeMap((action: ReturnType<typeof slice.actions.deleteVault>) =>
            deps.apiClients.vaults.deleteVaultInstance({ uuid: action.payload.uuid }).pipe(
                mergeMap(() =>
                    of(
                        slice.actions.deleteVaultSuccess({ uuid: action.payload.uuid }),
                        slice.actions.listVaults({ pageNumber: 1, itemsPerPage: 10, filters: [] }),
                        appRedirectActions.redirect({ url: `/${'vaults'}` }),
                        alertActions.success('Vault deleted successfully.'),
                    ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.deleteVaultFailure({
                            error: extractError(err, 'Failed to delete Vault'),
                        }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to delete Vault' }),
                    ),
                ),
            ),
        ),
    );
};

const epics = [listVaults, getVaultDetail, getVaultInstanceAttributes, createVault, updateVault, deleteVault];

export default epics;
