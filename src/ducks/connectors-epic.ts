import type { AppEpic } from 'ducks';
import { of } from 'rxjs';
import { catchError, filter, map, mergeMap, startWith, switchMap } from 'rxjs/operators';
import { LockWidgetNameEnum } from 'types/user-interface';
import { ConnectorVersion } from 'types/openapi';
import { extractError } from 'utils/net';
import { actions as alertActions } from './alerts';
import { actions as appRedirectActions } from './app-redirect';
import { actions as userInterfaceActions } from './user-interface';
import { actions as pagingActions } from './paging';
import { EntityType } from './filters';

import { slice } from './connectors';

import {
    transformAttributeDescriptorCollectionDtoToModel,
    transformAttributeDescriptorDtoToModel,
    transformAttributeRequestModelToDto,
    transformCallbackAttributeModelToDto,
    transformHealthInfoToModel,
} from './transform/attributes';

import {
    transformBulkActionDtoToModel,
    transformConnectorDetailV2ToModel,
    transformConnectorDtoV2ToModel,
    transformConnectorRequestModelToDto,
    transformConnectorResponseDtoToModel,
    transformConnectorUpdateRequestModelToDto,
    transformConnectInfoDtoToFunctionGroups,
    transformFunctionGroupDtoToModel,
} from './transform/connectors';
import { transformSearchRequestModelToDto } from './transform/certificates';

const listConnectors: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.listConnectors.match),
        switchMap((action) => {
            const search = action.payload ?? { itemsPerPage: 10, pageNumber: 1, filters: [] };
            return deps.apiClients.connectorsV2
                .listConnectorsV2({
                    searchRequestDto: transformSearchRequestModelToDto(search),
                })
                .pipe(
                    mergeMap((page) =>
                        of(
                            slice.actions.listConnectorsSuccess({
                                connectorList: page.items.map(transformConnectorDtoV2ToModel),
                            }),
                            pagingActions.listSuccess({ entity: EntityType.CONNECTOR, totalItems: page.totalItems }),
                            userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ConnectorStore),
                        ),
                    ),

                    catchError((error) =>
                        of(
                            slice.actions.listConnectorsFailure(),
                            pagingActions.listFailure(EntityType.CONNECTOR),
                            userInterfaceActions.insertWidgetLock(error, LockWidgetNameEnum.ConnectorStore),
                        ),
                    ),
                    startWith(pagingActions.list(EntityType.CONNECTOR)),
                );
        }),
    );
};

const listConnectorsMerge: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.listConnectorsMerge.match),
        mergeMap((action) =>
            deps.apiClients.connectors.listConnectors({ functionGroup: action.payload.functionGroup }).pipe(
                mergeMap((list) =>
                    of(
                        slice.actions.listConnectorsMergeSuccess({
                            connectorList: list.map(transformConnectorResponseDtoToModel),
                        }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ConnectorStore),
                    ),
                ),
                catchError((error) =>
                    of(
                        slice.actions.listConnectorsMergeFailure(),
                        userInterfaceActions.insertWidgetLock(error, LockWidgetNameEnum.ConnectorStore),
                    ),
                ),
            ),
        ),
    );
};

const getConnectorDetail: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getConnectorDetail.match),
        switchMap((action) =>
            deps.apiClients.connectorsV2.getConnectorV2({ uuid: action.payload.uuid }).pipe(
                mergeMap((detail) =>
                    of(
                        slice.actions.getConnectorDetailSuccess({ connector: transformConnectorDetailV2ToModel(detail) }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ConnectorDetails),
                    ),
                ),
                catchError((error) =>
                    of(
                        slice.actions.getConnectorDetailFailure(),
                        userInterfaceActions.insertWidgetLock(error, LockWidgetNameEnum.ConnectorDetails),
                    ),
                ),
            ),
        ),
    );
};

const getConnectorInfoV2: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getConnectorInfoV2.match),
        switchMap((action) =>
            deps.apiClients.connectorsV2.getInfoV2({ uuid: action.payload.uuid }).pipe(
                map((info) => slice.actions.getConnectorInfoV2Success({ info })),
                catchError(() => of(slice.actions.getConnectorInfoV2Failure())),
            ),
        ),
    );
};

const getConnectorAttributesDescriptors: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getConnectorAttributesDescriptors.match),
        switchMap((action) =>
            deps.apiClients.connectors
                .getAttributes({
                    uuid: action.payload.uuid,
                    functionGroup: action.payload.functionGroup,
                    kind: action.payload.kind,
                })
                .pipe(
                    map((attrs) =>
                        slice.actions.getConnectorAttributeDescriptorsSuccess({
                            functionGroup: action.payload.functionGroup,
                            kind: action.payload.kind,
                            attributes: attrs.map(transformAttributeDescriptorDtoToModel),
                        }),
                    ),

                    catchError((error) =>
                        of(
                            slice.actions.getConnectorAttributesDescriptorsFailure(),
                            appRedirectActions.fetchError({ error, message: 'Failed to get connector attributes' }),
                        ),
                    ),
                ),
        ),
    );
};

const getConnectorAllAttributesDescriptors: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getConnectorAllAttributesDescriptors.match),
        switchMap((action) =>
            deps.apiClients.connectors.getAttributesAll({ uuid: action.payload.uuid }).pipe(
                map(
                    (descColl) =>
                        slice.actions.getConnectorAllAttributesDescriptorsSuccess({
                            attributeDescriptorCollection: transformAttributeDescriptorCollectionDtoToModel(descColl),
                        }),
                    userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ConnectorAttributes),
                ),

                catchError((error) =>
                    of(
                        slice.actions.getAllConnectorAllAttributesDescriptorsFailure(),
                        userInterfaceActions.insertWidgetLock(error, LockWidgetNameEnum.ConnectorAttributes),
                    ),
                ),
            ),
        ),
    );
};

const getConnectorHealth: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getConnectorHealth.match),
        switchMap((action) =>
            deps.apiClients.connectorsV2.checkHealthV2({ uuid: action.payload.uuid }).pipe(
                map((healthInfo) =>
                    slice.actions.getConnectorHealthSuccess({
                        health: transformHealthInfoToModel(healthInfo as any),
                    }),
                ),
                catchError((error) => of(slice.actions.getConnectorHealthFailure())),
            ),
        ),
    );
};

const createConnector: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.createConnector.match),
        switchMap((action) =>
            deps.apiClients.connectorsV2
                .createConnectorV2({ connectorRequestDtoV2: transformConnectorRequestModelToDto(action.payload) as any })
                .pipe(
                    mergeMap((connector) =>
                        of(
                            slice.actions.createConnectorSuccess({
                                connector: transformConnectorDetailV2ToModel(connector),
                            }),
                            appRedirectActions.redirect({ url: `../connectors/detail/${connector.uuid}` }),
                        ),
                    ),

                    catchError((error) =>
                        of(
                            slice.actions.createConnectorFailure(),
                            appRedirectActions.fetchError({ error, message: 'Failed to create connector' }),
                        ),
                    ),
                ),
        ),
    );
};

const updateConnector: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.updateConnector.match),
        switchMap((action) =>
            deps.apiClients.connectorsV2
                .editConnectorV2({
                    uuid: action.payload.uuid,
                    connectorUpdateRequestDtoV2: transformConnectorUpdateRequestModelToDto(action.payload.connectorUpdateRequest) as any,
                })
                .pipe(
                    mergeMap((connector) =>
                        of(
                            slice.actions.updateConnectorSuccess({ connector: transformConnectorDetailV2ToModel(connector) }),
                            appRedirectActions.redirect({ url: `../../connectors/detail/${connector.uuid}` }),
                        ),
                    ),

                    catchError((error) =>
                        of(
                            slice.actions.updateConnectorFailure(),
                            appRedirectActions.fetchError({ error, message: 'Failed to update connector' }),
                        ),
                    ),
                ),
        ),
    );
};

const deleteConnector: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.deleteConnector.match),
        switchMap((action) =>
            deps.apiClients.connectorsV2.deleteConnectorV2({ uuid: action.payload.uuid }).pipe(
                mergeMap(() =>
                    of(
                        slice.actions.deleteConnectorSuccess({ uuid: action.payload.uuid }),
                        appRedirectActions.redirect({ url: '../../connectors' }),
                    ),
                ),

                catchError((error) =>
                    of(
                        slice.actions.deleteConnectorFailure({ error: extractError(error, 'Failed to delete connector') }),
                        appRedirectActions.fetchError({ error, message: 'Failed to delete connector' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkDeleteConnectors: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkDeleteConnectors.match),
        switchMap((action) =>
            deps.apiClients.connectorsV2.bulkDeleteConnectorV2({ requestBody: action.payload.uuids }).pipe(
                mergeMap((errors) => {
                    const errorsTransformed = (errors ?? []).map(transformBulkActionDtoToModel);
                    const successAction = slice.actions.bulkDeleteConnectorsSuccess({
                        uuids: action.payload.uuids,
                        errors: errorsTransformed,
                    });
                    if (errorsTransformed.length === 0) {
                        return of(successAction, alertActions.success('Selected connectors successfully deleted.'));
                    }
                    return of(successAction);
                }),

                catchError((error) =>
                    of(
                        slice.actions.bulkDeleteConnectorsFailure(),
                        appRedirectActions.fetchError({ error, message: 'Failed to delete connector' }),
                    ),
                ),
            ),
        ),
    );
};

const connectConnector: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.connectConnector.match),
        switchMap((action) =>
            deps.apiClients.connectorsV2
                .connectV2({
                    connectRequestDto: {
                        ...action.payload,
                        authAttributes: action.payload.authAttributes?.map(transformAttributeRequestModelToDto),
                    } as any,
                })
                .pipe(
                    map((connection) =>
                        slice.actions.connectConnectorSuccess({
                            connectionDetails: connection.flatMap((c) => transformConnectInfoDtoToFunctionGroups(c)),
                            connectInfo: connection,
                        }),
                    ),

                    catchError((error) =>
                        of(
                            slice.actions.connectConnectorFailure(),
                            appRedirectActions.fetchError({ error, message: 'Failed to connect to connector' }),
                        ),
                    ),
                ),
        ),
    );
};

const reconnectConnector: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.reconnectConnector.match),
        switchMap((action) =>
            deps.apiClients.connectorsV2.reconnectV2({ uuid: action.payload.uuid }).pipe(
                mergeMap((connection) =>
                    of(
                        slice.actions.reconnectConnectorSuccess({
                            uuid: action.payload.uuid,
                            functionGroups: transformConnectInfoDtoToFunctionGroups(connection),
                            connectInfo: [connection],
                        }),
                        slice.actions.getConnectorHealth({ uuid: action.payload.uuid }),
                    ),
                ),

                catchError((error) =>
                    of(
                        slice.actions.reconnectConnectorFailure(),
                        appRedirectActions.fetchError({ error, message: 'Failed to reconnect to connector' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkReconnectConnectors: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkReconnectConnectors.match),
        switchMap((action) =>
            deps.apiClients.connectorsV2.bulkReconnectV2({ requestBody: action.payload.uuids }).pipe(
                map(() => slice.actions.bulkReconnectConnectorsSuccess({ uuids: action.payload.uuids })),

                catchError((error) =>
                    of(
                        slice.actions.bulkReconnectConnectorsFailure(),
                        appRedirectActions.fetchError({ error, message: 'Failed to bulk reconnect to connectors' }),
                    ),
                ),
            ),
        ),
    );
};

const authorizeConnector: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.authorizeConnector.match),
        switchMap((action) =>
            deps.apiClients.connectorsV2.approveV2({ uuid: action.payload.uuid }).pipe(
                mergeMap(() =>
                    of(
                        slice.actions.authorizeConnectorSuccess({ uuid: action.payload.uuid }),
                        slice.actions.getConnectorDetail({ uuid: action.payload.uuid }),
                        slice.actions.getConnectorHealth({ uuid: action.payload.uuid }),
                    ),
                ),

                catchError((error) =>
                    of(
                        slice.actions.authorizeConnectorFailure(),
                        appRedirectActions.fetchError({ error, message: 'Failed to authorize connector' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkAuthorizeConnectors: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkAuthorizeConnectors.match),
        switchMap((action) =>
            deps.apiClients.connectorsV2.bulkApproveV2({ requestBody: action.payload.uuids }).pipe(
                mergeMap(() =>
                    of(
                        slice.actions.bulkAuthorizeConnectorsSuccess({ uuids: action.payload.uuids }),
                        slice.actions.listConnectors({ itemsPerPage: 1000, pageNumber: 1, filters: [] }),
                    ),
                ),

                catchError((error) =>
                    of(
                        slice.actions.bulkAuthorizeConnectorsFailure(),
                        appRedirectActions.fetchError({ error, message: 'Failed to bulk authorize connectors' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkForceDeleteConnectors: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkForceDeleteConnectors.match),
        switchMap((action) =>
            deps.apiClients.connectors.forceDeleteConnector({ requestBody: action.payload.uuids }).pipe(
                mergeMap(() => {
                    const successAction = slice.actions.bulkForceDeleteConnectorsSuccess({
                        uuids: action.payload.uuids,
                        successRedirect: action.payload.successRedirect,
                    });
                    const alertAction = alertActions.success('Selected connectors successfully deleted.');
                    if (action.payload.successRedirect) {
                        return of(successAction, alertAction, appRedirectActions.redirect({ url: action.payload.successRedirect }));
                    }
                    return of(successAction, alertAction);
                }),

                catchError((error) =>
                    of(
                        slice.actions.bulkForceDeleteConnectorsFailure(),
                        appRedirectActions.fetchError({ error, message: 'Failed to force delete connectors' }),
                    ),
                ),
            ),
        ),
    );
};

const callbackConnector: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.callbackConnector.match),
        mergeMap((action) => {
            const { callbackConnector: payload } = action.payload;
            const requestAttributeCallback = transformCallbackAttributeModelToDto(payload.requestAttributeCallback);
            // Guard against missing UUID (would produce /v1/connectors/undefined/... URLs)
            if (!payload.uuid) {
                return of(slice.actions.callbackFailure({ callbackId: action.payload.callbackId }));
            }
            const rootState: any = (state as any).value ?? (state as any);
            const connectorsState: any = rootState.connectors;
            const connector = connectorsState?.connectors?.find((c: any) => c.uuid === payload.uuid) ?? connectorsState?.connector;
            // Fall back to v1 when the connector is not in connectors state (e.g. authority/credential providers)
            const isV2 = connector?.version === ConnectorVersion.V2;
            const api$ = isV2
                ? deps.apiClients.callback.callbackV2({
                      uuid: payload.uuid,
                      requestAttributeCallback,
                  })
                : deps.apiClients.callback.callback({
                      uuid: payload.uuid,
                      functionGroup: payload.functionGroup,
                      kind: payload.kind,
                      requestAttributeCallback,
                  });

            return api$.pipe(
                map((data) => {
                    return slice.actions.callbackSuccess({ callbackId: action.payload.callbackId, data });
                }),

                catchError((error) =>
                    of(
                        slice.actions.callbackFailure({ callbackId: action.payload.callbackId }),
                        appRedirectActions.fetchError({ error, message: 'Connector callback failure' }),
                    ),
                ),
            );
        }),

        catchError((error) =>
            of(
                slice.actions.callbackFailure({ callbackId: '' }),
                appRedirectActions.fetchError({ error, message: 'Failed to perform connector callback' }),
            ),
        ),
    );
};

const callbackResource: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.callbackResource.match),
        mergeMap((action) =>
            deps.apiClients.callback
                .resourceCallback({
                    ...action.payload.callbackResource,
                    requestAttributeCallback: transformCallbackAttributeModelToDto(
                        action.payload.callbackResource.requestAttributeCallback,
                    ),
                })
                .pipe(
                    map((data) => {
                        return slice.actions.callbackSuccess({ callbackId: action.payload.callbackId, data });
                    }),

                    catchError((error) =>
                        of(
                            slice.actions.callbackFailure({ callbackId: action.payload.callbackId }),
                            appRedirectActions.fetchError({ error, message: 'Resource callback failure' }),
                        ),
                    ),
                ),
        ),

        catchError((error) =>
            of(
                slice.actions.callbackFailure({ callbackId: '' }),
                appRedirectActions.fetchError({ error, message: 'Failed to perform resource callback' }),
            ),
        ),
    );
};

const epics = [
    listConnectors,
    listConnectorsMerge,
    getConnectorDetail,
    getConnectorAttributesDescriptors,
    getConnectorAllAttributesDescriptors,
    getConnectorHealth,
    createConnector,
    updateConnector,
    deleteConnector,
    bulkDeleteConnectors,
    connectConnector,
    getConnectorInfoV2,
    reconnectConnector,
    bulkReconnectConnectors,
    authorizeConnector,
    bulkAuthorizeConnectors,
    bulkForceDeleteConnectors,
    callbackConnector,
    callbackResource,
];

export default epics;
