import type { AppEpic, EpicDependencies } from 'ducks';
import type { UnknownAction } from '@reduxjs/toolkit';
import { iif, type Observable, of } from 'rxjs';
import { catchError, filter, map, mergeMap, switchMap } from 'rxjs/operators';
import { extractError } from 'utils/net';
import { FunctionGroupCode, type UuidDto } from '../types/openapi';
import { actions as alertActions } from './alerts';
import { actions as appRedirectActions } from './app-redirect';
import { actions as userInterfaceActions } from './user-interface';

import { store } from '../App';
import { LockWidgetNameEnum } from 'types/user-interface';
import { slice } from './discoveries';
import { EntityType } from './filters';
import { actions as pagingActions } from './paging';
import { transformAttributeDescriptorDtoToModel } from './transform/attributes';
import { transformSearchRequestModelToDto } from './transform/certificates';
import { transformConnectorResponseDtoToModel } from './transform/connectors';
import {
    transformDiscoveryCertificateListDtoToModel,
    transformDiscoveryItemListDtoToModel,
    transformDiscoveryMessageListDtoToModel,
    transformDiscoveryRequestModelToDto,
    transformDiscoveryResponseDetailDtoToModel,
    transformDiscoveryResponseDtoToModel,
} from './transform/discoveries';

const listDiscoveries: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listDiscoveries.match),
        switchMap((action) => {
            store.dispatch(pagingActions.list(EntityType.DISCOVERY));
            return deps.apiClients.discoveries.listDiscoveries({ searchRequestDto: transformSearchRequestModelToDto(action.payload) }).pipe(
                mergeMap((discoveryResponse) =>
                    of(
                        slice.actions.listDiscoveriesSuccess(discoveryResponse.discoveries.map(transformDiscoveryResponseDtoToModel)),
                        pagingActions.listSuccess({ entity: EntityType.DISCOVERY, totalItems: discoveryResponse.totalItems }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.DiscoveriesStore),
                    ),
                ),

                catchError((err) =>
                    of(
                        pagingActions.listFailure(EntityType.DISCOVERY),
                        userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.DiscoveriesStore),
                    ),
                ),
            );
        }),
    );
};

const getDiscoveryDetail: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getDiscoveryDetail.match),

        switchMap((action) =>
            deps.apiClients.discoveries.getDiscovery({ uuid: action.payload.uuid }).pipe(
                switchMap((discoveryDto) =>
                    of(
                        slice.actions.getDiscoveryDetailSuccess({ discovery: transformDiscoveryResponseDetailDtoToModel(discoveryDto) }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.DiscoveryDetails),
                    ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.getDiscoveryDetailFailure({ error: extractError(err, 'Failed to get Discovery detail') }),
                        userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.DiscoveryDetails),
                    ),
                ),
            ),
        ),
    );
};

const listDiscoveryProviders: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.listDiscoveryProviders.match),
        switchMap(() =>
            deps.apiClients.connectors.listConnectors({ functionGroup: FunctionGroupCode.DiscoveryProvider }).pipe(
                map((providers) =>
                    slice.actions.listDiscoveryProvidersSuccess({
                        connectors: providers.map(transformConnectorResponseDtoToModel),
                    }),
                ),

                catchError((err) =>
                    of(
                        slice.actions.listDiscoveryProvidersFailure({ error: extractError(err, 'Failed to get Discovery Provider list') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to get Discovery Provider list' }),
                    ),
                ),
            ),
        ),
    );
};

const getDiscoveryProviderAttributesDescriptors: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getDiscoveryProviderAttributesDescriptors.match),
        switchMap((action) =>
            deps.apiClients.connectors
                .getAttributes({
                    uuid: action.payload.uuid,
                    functionGroup: FunctionGroupCode.DiscoveryProvider,
                    kind: action.payload.kind,
                })
                .pipe(
                    map((attributeDescriptors) =>
                        slice.actions.getDiscoveryProviderAttributesDescriptorsSuccess({
                            attributeDescriptor: attributeDescriptors.map(transformAttributeDescriptorDtoToModel),
                        }),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.getDiscoveryProviderAttributeDescriptorsFailure({
                                error: extractError(err, 'Failed to get Discovery Provider Attribute list'),
                            }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to get Discovery Provider Attribute list' }),
                        ),
                    ),
                ),
        ),
    );
};

// The run-level relay for a v2 connector. It sits under /v1/discoveries but is keyed by the connector, the same split
// the authority instance endpoints already use.
export const getDiscoveryInterfaceAttributesDescriptors: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getDiscoveryInterfaceAttributesDescriptors.match),
        switchMap((action) =>
            deps.apiClients.discoveries.getDiscoveryAttributes({ connectorUuid: action.payload.connectorUuid }).pipe(
                map((attributeDescriptors) =>
                    slice.actions.getDiscoveryProviderAttributesDescriptorsSuccess({
                        attributeDescriptor: attributeDescriptors.map(transformAttributeDescriptorDtoToModel),
                    }),
                ),

                catchError((err) =>
                    of(
                        slice.actions.getDiscoveryProviderAttributeDescriptorsFailure({
                            error: extractError(err, 'Failed to get Discovery Attribute list'),
                        }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to get Discovery Attribute list' }),
                    ),
                ),
            ),
        ),
    );
};

// mergeMap rather than switchMap: selecting two resources at once issues two requests, and neither may cancel the other.
export const getDiscoveryResourceAttributesDescriptors: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getDiscoveryResourceAttributesDescriptors.match),
        mergeMap((action) =>
            deps.apiClients.discoveries
                .getDiscoveryResourceAttributes({ connectorUuid: action.payload.connectorUuid, resource: action.payload.resource })
                .pipe(
                    map((attributeDescriptors) =>
                        slice.actions.getDiscoveryResourceAttributesDescriptorsSuccess({
                            resource: action.payload.resource,
                            attributeDescriptor: attributeDescriptors.map(transformAttributeDescriptorDtoToModel),
                        }),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.getDiscoveryResourceAttributesDescriptorsFailure({
                                resource: action.payload.resource,
                                error: extractError(err, 'Failed to get Discovery Resource Attribute list'),
                            }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to get Discovery Resource Attribute list' }),
                        ),
                    ),
                ),
        ),
    );
};

export const listDiscoveryResources: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.listDiscoveryResources.match),
        switchMap((action) =>
            deps.apiClients.discoveries.listDiscoveryResources({ connectorUuid: action.payload.connectorUuid }).pipe(
                map((supported) => slice.actions.listDiscoveryResourcesSuccess({ resources: supported.map((entry) => entry.resource) })),

                catchError((err) =>
                    of(
                        slice.actions.listDiscoveryResourcesFailure({ error: extractError(err, 'Failed to get discoverable resources') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to get discoverable resources' }),
                    ),
                ),
            ),
        ),
    );
};

const getDiscoveryCertificates: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getDiscoveryCertificates.match),
        switchMap((action) =>
            deps.apiClients.discoveries.getDiscoveryCertificates(action.payload).pipe(
                map((certificates) =>
                    slice.actions.getDiscoveryCertificatesSuccess(transformDiscoveryCertificateListDtoToModel(certificates)),
                ),
                catchError((err) =>
                    of(
                        slice.actions.getDiscoveryCertificatesFailure({
                            error: extractError(err, 'Failed to get Discovery Certificates list'),
                        }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to get Discovery Certificates list' }),
                    ),
                ),
            ),
        ),
    );
};

const getDiscoveryItems: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getDiscoveryItems.match),
        switchMap((action) =>
            deps.apiClients.discoveries.getDiscoveryItems(action.payload).pipe(
                map((items) => slice.actions.getDiscoveryItemsSuccess(transformDiscoveryItemListDtoToModel(items))),
                catchError((err) =>
                    of(
                        slice.actions.getDiscoveryItemsFailure({ error: extractError(err, 'Failed to get Discovery Items list') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to get Discovery Items list' }),
                    ),
                ),
            ),
        ),
    );
};

const getDiscoveryMessages: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getDiscoveryMessages.match),
        switchMap((action) =>
            deps.apiClients.discoveries.getDiscoveryRunMessages(action.payload).pipe(
                map((messages) => slice.actions.getDiscoveryMessagesSuccess(transformDiscoveryMessageListDtoToModel(messages))),
                catchError((err) =>
                    of(
                        slice.actions.getDiscoveryMessagesFailure({ error: extractError(err, 'Failed to get Discovery Run Messages') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to get Discovery Run Messages' }),
                    ),
                ),
            ),
        ),
    );
};

const createDiscovery: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.createDiscovery.match),
        switchMap((action) => {
            const url = action.payload.scheduled ? '../../jobs/detail/' : '../discoveries/detail/';
            return iif(
                () => action.payload.scheduled,
                deps.apiClients.discoveries.scheduleDiscovery({
                    scheduleDiscoveryDto: {
                        jobName: action.payload.jobName,
                        cronExpression: action.payload.cronExpression,
                        oneTime: action.payload.oneTime,
                        request: transformDiscoveryRequestModelToDto(action.payload.request),
                    },
                }),
                deps.apiClients.discoveries.createDiscovery({ discoveryDto: transformDiscoveryRequestModelToDto(action.payload.request) }),
            ).pipe(
                mergeMap((obj: UuidDto) =>
                    of(slice.actions.createDiscoverySuccess({ uuid: obj.uuid }), appRedirectActions.redirect({ url: `${url}${obj.uuid}` })),
                ),

                catchError((err) =>
                    of(
                        slice.actions.createDiscoveryFailure({ error: extractError(err, 'Failed to create discovery') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to create discovery' }),
                    ),
                ),
            );
        }),
    );
};

const deleteDiscovery: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.deleteDiscovery.match),
        switchMap((action) =>
            deps.apiClients.discoveries.deleteDiscovery({ uuid: action.payload.uuid }).pipe(
                mergeMap(() =>
                    of(
                        slice.actions.deleteDiscoverySuccess({ uuid: action.payload.uuid }),
                        appRedirectActions.redirect({ url: '../../discoveries' }),
                    ),
                ),

                catchError((err) =>
                    of(
                        slice.actions.deleteDiscoveryFailure({ error: extractError(err, 'Failed to delete discovery') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to delete discovery' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkDeleteDiscovery: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkDeleteDiscovery.match),
        switchMap((action) =>
            deps.apiClients.discoveries.bulkDeleteDiscovery({ requestBody: action.payload.uuids }).pipe(
                mergeMap(() =>
                    of(
                        slice.actions.bulkDeleteDiscoverySuccess({ uuids: action.payload.uuids }),
                        alertActions.success('Selected discoveries successfully deleted.'),
                    ),
                ),

                catchError((err) =>
                    of(
                        slice.actions.bulkDeleteDiscoveryFailure({ error: extractError(err, 'Failed to bulk delete Discoveries') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to bulk delete Discoveries' }),
                    ),
                ),
            ),
        ),
    );
};

/**
 * A refused lifecycle action is a 422 whose body is an array of strings rather than an ErrorMessageDto: the run's state
 * no longer allows the action, or the provider does not support it. The strings are what the operator should read.
 */
export function describeLifecycleRefusal(err: unknown, headline: string): string {
    const response = (err as { response?: unknown } | undefined)?.response;
    if (Array.isArray(response) && response.every((entry) => typeof entry === 'string')) {
        return `${headline}: ${response.join(' ')}`;
    }
    return extractError(err as Error, headline);
}

const lifecycleEpic = (
    match: (action: unknown) => action is { payload: { uuid: string } },
    call: (deps: EpicDependencies, uuid: string) => Observable<void>,
    onSuccess: (uuid: string) => UnknownAction,
    onFailure: (error: string) => UnknownAction,
    successMessage: string,
    headline: string,
): AppEpic => {
    return (action$, state$, deps) =>
        action$.pipe(
            filter(match),
            switchMap((action) =>
                call(deps, action.payload.uuid).pipe(
                    // The action answers 204 with no body; the detail carries the new state, so it is re-read.
                    mergeMap(() =>
                        of(
                            onSuccess(action.payload.uuid),
                            alertActions.success(successMessage),
                            slice.actions.getDiscoveryDetail({ uuid: action.payload.uuid }),
                        ),
                    ),
                    // A visible control can still be refused: the provider may pass its point of no return between
                    // the read that rendered the button and the click. The run has moved on, so the detail is re-read
                    // here too and the stale button set goes with it.
                    catchError((err) => {
                        const message = describeLifecycleRefusal(err, headline);
                        return of(
                            onFailure(message),
                            alertActions.error(message),
                            slice.actions.getDiscoveryDetail({ uuid: action.payload.uuid }),
                        );
                    }),
                ),
            ),
        );
};

export const stopDiscovery = lifecycleEpic(
    slice.actions.stopDiscovery.match,
    (deps, uuid) => deps.apiClients.discoveries.stopDiscovery({ uuid }),
    (uuid) => slice.actions.stopDiscoverySuccess({ uuid }),
    (error) => slice.actions.stopDiscoveryFailure({ error }),
    'Discovery stop requested.',
    'Failed to stop discovery',
);

export const resumeDiscovery = lifecycleEpic(
    slice.actions.resumeDiscovery.match,
    (deps, uuid) => deps.apiClients.discoveries.resumeDiscovery({ uuid }),
    (uuid) => slice.actions.resumeDiscoverySuccess({ uuid }),
    (error) => slice.actions.resumeDiscoveryFailure({ error }),
    'Discovery resumed.',
    'Failed to resume discovery',
);

export const cancelDiscovery = lifecycleEpic(
    slice.actions.cancelDiscovery.match,
    (deps, uuid) => deps.apiClients.discoveries.cancelDiscovery({ uuid }),
    (uuid) => slice.actions.cancelDiscoverySuccess({ uuid }),
    (error) => slice.actions.cancelDiscoveryFailure({ error }),
    'Discovery cancelled.',
    'Failed to cancel discovery',
);

const epics = [
    listDiscoveries,
    getDiscoveryDetail,
    listDiscoveryProviders,
    getDiscoveryProviderAttributesDescriptors,
    getDiscoveryInterfaceAttributesDescriptors,
    getDiscoveryResourceAttributesDescriptors,
    listDiscoveryResources,
    getDiscoveryCertificates,
    getDiscoveryItems,
    getDiscoveryMessages,
    createDiscovery,
    deleteDiscovery,
    bulkDeleteDiscovery,
    stopDiscovery,
    resumeDiscovery,
    cancelDiscovery,
];

export default epics;
