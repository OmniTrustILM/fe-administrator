import type { AppEpic } from 'ducks';
import { EMPTY, type Observable, of } from 'rxjs';
import { catchError, filter, map, mergeMap, startWith, switchMap } from 'rxjs/operators';
import { LockWidgetNameEnum } from 'types/user-interface';
import { AuthType, ConnectorVersion } from 'types/openapi';
import { extractError } from 'utils/net';
import { actions as alertActions } from './alerts';
import { actions as appRedirectActions } from './app-redirect';
import { actions as userInterfaceActions } from './user-interface';
import { actions as pagingActions, entityListParams } from './paging';
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
                mergeMap((descColl) =>
                    of(
                        slice.actions.getConnectorAllAttributesDescriptorsSuccess({
                            attributeDescriptorCollection: transformAttributeDescriptorCollectionDtoToModel(descColl),
                        }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ConnectorAttributes),
                    ),
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
                        slice.actions.listConnectors(entityListParams(EntityType.CONNECTOR, state.value)),
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

const currentCallbackSeq = (state: any, callbackId: string): number => (state.value ?? state)?.connectors?.callbackSeq?.[callbackId] ?? 0;

// Captures the dispatch sequence; a response arriving after a newer dispatch for the same
// callbackId is stale and must be discarded (kept out of callbackData, no failure state, no toast).
const staleGuard = (state: any, callbackId: string): (() => boolean) => {
    const seq = currentCallbackSeq(state, callbackId);
    return () => currentCallbackSeq(state, callbackId) !== seq;
};

// Maps a callback API response to success/failure actions, discarding superseded (stale) responses.
const toCallbackActions = (callbackId: string, isStale: () => boolean, failureMessage: string) => (api$: Observable<object>) =>
    api$.pipe(
        mergeMap((data) => (isStale() ? EMPTY : of(slice.actions.callbackSuccess({ callbackId, data })))),
        catchError((error) =>
            isStale()
                ? EMPTY
                : of(slice.actions.callbackFailure({ callbackId }), appRedirectActions.fetchError({ error, message: failureMessage })),
        ),
    );

const callbackConnector: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.callbackConnector.match),
        mergeMap((action) => {
            const { callbackConnector: payload, callbackId } = action.payload;
            try {
                const requestAttributeCallback = transformCallbackAttributeModelToDto(payload.requestAttributeCallback);
                // Guard against missing UUID (would produce /v1/connectors/undefined/... URLs)
                if (!payload.uuid) {
                    return of(slice.actions.callbackFailure({ callbackId }));
                }
                const rootState: any = (state as any).value ?? (state as any);
                const connectorsState: any = rootState.connectors;
                const connector = connectorsState?.connectors?.find((c: any) => c.uuid === payload.uuid) ?? connectorsState?.connector;
                // An interfaceUuid exists only on interface-based connectors, so it pins the route on its own:
                // parent-less NG forms carry no kind/functionGroup for the version lookup to fall back on.
                const isV2 =
                    !!payload.interfaceUuid || payload.version === ConnectorVersion.V2 || connector?.version === ConnectorVersion.V2;
                const isStale = staleGuard(state, callbackId);

                let api$: Observable<object>;
                if (isV2) {
                    api$ = deps.apiClients.callback.callbackV2({
                        uuid: payload.uuid,
                        requestAttributeCallback: payload.interfaceUuid
                            ? { ...requestAttributeCallback, interfaceUuid: payload.interfaceUuid }
                            : requestAttributeCallback,
                    });
                } else if (payload.functionGroup && payload.kind) {
                    api$ = deps.apiClients.callback.callback({
                        uuid: payload.uuid,
                        functionGroup: payload.functionGroup,
                        kind: payload.kind,
                        requestAttributeCallback,
                    });
                } else {
                    // The v1 route requires both; without them the client throws synchronously.
                    return of(slice.actions.callbackFailure({ callbackId }));
                }

                return api$.pipe(toCallbackActions(callbackId, isStale, 'Connector callback failure'));
            } catch (error) {
                // Contain synchronous throws to this one action. Letting them reach a catchError on the
                // outer stream would unsubscribe action$ and permanently stop the epic, so every later
                // callback would hang with isRunningCallback stuck true.
                return of(
                    slice.actions.callbackFailure({ callbackId }),
                    appRedirectActions.fetchError({ error, message: 'Failed to perform connector callback' }),
                );
            }
        }),
    );
};

const callbackResource: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.callbackResource.match),
        mergeMap((action) => {
            const { callbackId } = action.payload;
            try {
                const isStale = staleGuard(state, callbackId);
                return deps.apiClients.callback
                    .resourceCallback({
                        ...action.payload.callbackResource,
                        requestAttributeCallback: transformCallbackAttributeModelToDto(
                            action.payload.callbackResource.requestAttributeCallback,
                        ),
                    })
                    .pipe(toCallbackActions(callbackId, isStale, 'Resource callback failure'));
            } catch (error) {
                // See callbackConnector: a throw reaching the outer stream would kill this epic for good.
                return of(
                    slice.actions.callbackFailure({ callbackId }),
                    appRedirectActions.fetchError({ error, message: 'Failed to perform resource callback' }),
                );
            }
        }),
    );
};

const getConnectorAuthAttributesDescriptors: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getConnectorAuthAttributesDescriptors.match),
        switchMap((action) => {
            const { authType } = action.payload;
            if (authType !== AuthType.Basic && authType !== AuthType.Certificate) {
                return of(slice.actions.getConnectorAuthAttributesDescriptorsSuccess({ attributes: [] }));
            }

            const source$ =
                authType === AuthType.Certificate
                    ? deps.apiClients.connectorAuthentication.getCertificateAttributes()
                    : deps.apiClients.connectorAuthentication.getBasicAuthAttributes();

            return source$.pipe(
                map((attributes) =>
                    slice.actions.getConnectorAuthAttributesDescriptorsSuccess({
                        attributes: attributes.map(transformAttributeDescriptorDtoToModel),
                    }),
                ),
                catchError((error) =>
                    of(
                        slice.actions.getConnectorAuthAttributesDescriptorsFailure(),
                        appRedirectActions.fetchError({ error, message: 'Failed to get connector authentication attributes' }),
                    ),
                ),
            );
        }),
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
    getConnectorAuthAttributesDescriptors,
];

export default epics;
