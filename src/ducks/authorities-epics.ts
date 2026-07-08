import type { AppEpic } from 'ducks';
import { forkJoin, iif, of, throwError } from 'rxjs';
import { AjaxError } from 'rxjs/ajax';
import { catchError, filter, map, mergeMap, switchMap } from 'rxjs/operators';
import { ConnectorInterface, FilterConditionOperator, FilterFieldSource, FunctionGroupCode } from 'types/openapi';
import { extractError } from 'utils/net';
import { actions as alertActions } from './alerts';
import { actions as appRedirectActions } from './app-redirect';
import { slice } from './authorities';
import { transformAttributeDescriptorDtoToModel } from './transform/attributes';
import { actions as userInterfaceActions } from './user-interface';

import { LockWidgetNameEnum } from 'types/user-interface';
import {
    transformAuthorityRequestModelToDto,
    transformAuthorityResponseDtoToModel,
    transformAuthorityUpdateRequestModelToDto,
} from './transform/authorities';
import { transformConnectorDtoV2ToModel, transformConnectorResponseDtoToModel } from './transform/connectors';
import { transformSearchRequestModelToDto } from './transform/certificates';

// The NG connector listing is paginated; authority connectors per environment are far below this,
// so a single large page is fetched instead of following pagination.
const NG_CONNECTORS_PAGE_SIZE = 1000;

const listAuthorities: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listAuthorities.match),
        switchMap(() =>
            deps.apiClients.authorities.listAuthorityInstances().pipe(
                switchMap((authorities) =>
                    of(
                        slice.actions.listAuthoritiesSuccess({
                            authorityList: authorities.map(transformAuthorityResponseDtoToModel),
                        }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.AuthorityStore),
                    ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.listAuthoritiesFailure({ error: extractError(err, 'Failed to get Authorities list') }),
                        userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.AuthorityStore),
                    ),
                ),
            ),
        ),
    );
};

const getAuthorityDetail: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getAuthorityDetail.match),

        switchMap((action) =>
            deps.apiClients.authorities.getAuthorityInstance({ uuid: action.payload.uuid }).pipe(
                switchMap((authorityDto) =>
                    of(
                        slice.actions.getAuthorityDetailSuccess({ authority: transformAuthorityResponseDtoToModel(authorityDto) }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.CertificationAuthorityDetails),
                    ),
                ),

                catchError((err) =>
                    of(
                        slice.actions.getAuthorityDetailFailure({ error: extractError(err, 'Failed to get Authority detail') }),
                        userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.CertificationAuthorityDetails),
                    ),
                ),
            ),
        ),
    );
};

const listAuthorityProviders: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.listAuthorityProviders.match),
        switchMap(() =>
            forkJoin({
                legacy: deps.apiClients.connectors.listConnectors({ functionGroup: FunctionGroupCode.AuthorityProvider }),
                legacyDeprecated: deps.apiClients.connectors
                    .listConnectors({ functionGroup: FunctionGroupCode.LegacyAuthorityProvider })
                    .pipe(catchError((err) => (err instanceof AjaxError && err.status === 404 ? of([]) : throwError(() => err)))),
                ng: deps.apiClients.connectorsV2
                    .listConnectorsV2({
                        searchRequestDto: transformSearchRequestModelToDto({
                            itemsPerPage: NG_CONNECTORS_PAGE_SIZE,
                            pageNumber: 1,
                            filters: [
                                {
                                    fieldSource: FilterFieldSource.Property,
                                    fieldIdentifier: 'CONNECTOR_INTERFACE',
                                    condition: FilterConditionOperator.Equals,
                                    value: ConnectorInterface.Authority,
                                },
                            ],
                        }),
                    })
                    .pipe(
                        catchError((err) =>
                            err instanceof AjaxError && err.status === 404 ? of({ items: [], totalItems: 0 }) : throwError(() => err),
                        ),
                    ),
            }).pipe(
                map(({ legacy, legacyDeprecated, ng }) => {
                    const byUuid = new Map(
                        [...legacy, ...legacyDeprecated].map((connector) => [
                            connector.uuid,
                            transformConnectorResponseDtoToModel(connector),
                        ]),
                    );
                    ng.items.forEach((connector) => {
                        byUuid.set(connector.uuid, transformConnectorDtoV2ToModel(connector));
                    });
                    return slice.actions.listAuthorityProvidersSuccess({
                        connectors: Array.from(byUuid.values()),
                    });
                }),

                catchError((err) =>
                    of(
                        slice.actions.listAuthorityProvidersFailure({ error: extractError(err, 'Failed to get Authority Provider list') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to get Authority Provider list' }),
                    ),
                ),
            ),
        ),
    );
};

const getAuthorityProviderAttributesDescriptors: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getAuthorityProviderAttributesDescriptors.match),
        switchMap((action) =>
            deps.apiClients.connectors
                .getAttributes({
                    uuid: action.payload.uuid,
                    functionGroup: action.payload.functionGroup,
                    kind: action.payload.kind,
                })
                .pipe(
                    map((attributeDescriptors) => {
                        return slice.actions.getAuthorityProviderAttributesDescriptorsSuccess({
                            attributeDescriptor: attributeDescriptors.map(transformAttributeDescriptorDtoToModel),
                        });
                    }),

                    catchError((err) =>
                        of(
                            slice.actions.getAuthorityProviderAttributeDescriptorsFailure({
                                error: extractError(err, 'Failed to get Authority Provider Attribute Descriptor list'),
                            }),
                            appRedirectActions.fetchError({
                                error: err,
                                message: 'Failed to get Authority Provider Attribute Descriptor list',
                            }),
                        ),
                    ),
                ),
        ),
    );
};

const getAuthorityInstanceAttributesDescriptors: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getAuthorityInstanceAttributesDescriptors.match),
        switchMap((action) =>
            deps.apiClients.authorities
                .listAuthorityInstanceAttributes({
                    connectorUuid: action.payload.connectorUuid,
                    interfaceUuid: action.payload.interfaceUuid,
                })
                .pipe(
                    map((attributeDescriptors) =>
                        slice.actions.getAuthorityProviderAttributesDescriptorsSuccess({
                            attributeDescriptor: attributeDescriptors.map(transformAttributeDescriptorDtoToModel),
                        }),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.getAuthorityProviderAttributeDescriptorsFailure({
                                error: extractError(err, 'Failed to get Authority Provider Attribute Descriptor list'),
                            }),
                            appRedirectActions.fetchError({
                                error: err,
                                message: 'Failed to get Authority Provider Attribute Descriptor list',
                            }),
                        ),
                    ),
                ),
        ),
    );
};

const getRAProfilesAttributesDescriptors: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getRAProfilesAttributesDescriptors.match),
        switchMap((action) =>
            deps.apiClients.authorities.listRAProfileAttributes({ uuid: action.payload.authorityUuid }).pipe(
                map((descriptors) =>
                    slice.actions.getRAProfilesAttributesDescriptorsSuccess({
                        authorityUuid: action.payload.authorityUuid,
                        attributesDescriptors: descriptors.map(transformAttributeDescriptorDtoToModel),
                    }),
                ),

                catchError((err) =>
                    of(
                        slice.actions.getRAProfilesAttributesDescriptorsFailure({
                            error: extractError(err, 'Failed to get RA Profile Attribute Descriptor list'),
                        }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to get RA Profile Attribute Descriptor list' }),
                    ),
                ),
            ),
        ),
    );
};

const createAuthority: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.createAuthority.match),
        switchMap((action) =>
            deps.apiClients.authorities
                .createAuthorityInstance({ authorityInstanceRequestDto: transformAuthorityRequestModelToDto(action.payload) })
                .pipe(
                    mergeMap((obj) =>
                        of(
                            slice.actions.createAuthoritySuccess({ uuid: obj.uuid }),
                            appRedirectActions.redirect({ url: `../authorities/detail/${obj.uuid}` }),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.createAuthorityFailure({ error: extractError(err, 'Failed to create Authority') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to create Authority' }),
                        ),
                    ),
                ),
        ),
    );
};

const updateAuthority: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.updateAuthority.match),

        switchMap((action) =>
            deps.apiClients.authorities
                .editAuthorityInstance({
                    uuid: action.payload.uuid,
                    authorityInstanceUpdateRequestDto: transformAuthorityUpdateRequestModelToDto(action.payload.updateAuthority),
                })
                .pipe(
                    mergeMap((authorityDto) =>
                        of(
                            slice.actions.updateAuthoritySuccess({ authority: transformAuthorityResponseDtoToModel(authorityDto) }),
                            appRedirectActions.redirect({ url: `../../authorities/detail/${authorityDto.uuid}` }),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.updateAuthorityFailure({ error: extractError(err, 'Failed to update Authority') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to update Authority' }),
                        ),
                    ),
                ),
        ),
    );
};

const deleteAuthority: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.deleteAuthority.match),
        switchMap((action) =>
            deps.apiClients.authorities.deleteAuthorityInstance({ uuid: action.payload.uuid }).pipe(
                mergeMap(() =>
                    of(
                        slice.actions.deleteAuthoritySuccess({ uuid: action.payload.uuid }),
                        appRedirectActions.redirect({ url: '../../authorities' }),
                    ),
                ),

                catchError((err) =>
                    of(
                        slice.actions.deleteAuthorityFailure({ error: extractError(err, 'Failed to delete Authority') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to delete Authority' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkDeleteAuthority: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkDeleteAuthority.match),
        switchMap((action) =>
            deps.apiClients.authorities.bulkDeleteAuthorityInstance({ requestBody: action.payload.uuids }).pipe(
                mergeMap((errors) =>
                    of(
                        slice.actions.bulkDeleteAuthoritySuccess({ uuids: action.payload.uuids, errors }),
                        alertActions.success('Selected authorities successfully deleted.'),
                    ),
                ),

                catchError((err) =>
                    of(
                        slice.actions.bulkDeleteAuthorityFailure({ error: extractError(err, 'Failed to bulk delete Authorities') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to bulk delete Authorities' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkForceDeleteAuthority: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkForceDeleteAuthority.match),

        switchMap((action) =>
            deps.apiClients.authorities.forceDeleteAuthorityInstances({ requestBody: action.payload.uuids }).pipe(
                mergeMap(() =>
                    iif(
                        () => !!action.payload.redirect,
                        of(
                            slice.actions.bulkForceDeleteAuthoritySuccess({
                                uuids: action.payload.uuids,
                                redirect: action.payload.redirect,
                            }),
                            appRedirectActions.redirect({ url: action.payload.redirect! }),
                        ),
                        of(
                            slice.actions.bulkForceDeleteAuthoritySuccess({
                                uuids: action.payload.uuids,
                                redirect: action.payload.redirect,
                            }),
                        ),
                    ),
                ),

                catchError((err) =>
                    of(
                        slice.actions.bulkForceDeleteAuthorityFailure({
                            error: extractError(err, 'Failed to bulk force delete Authorities'),
                        }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to bulk force delete Authorities' }),
                    ),
                ),
            ),
        ),
    );
};

const epics = [
    listAuthorities,
    getAuthorityDetail,
    listAuthorityProviders,
    getAuthorityProviderAttributesDescriptors,
    getAuthorityInstanceAttributesDescriptors,
    getRAProfilesAttributesDescriptors,
    createAuthority,
    updateAuthority,
    deleteAuthority,
    bulkDeleteAuthority,
    bulkForceDeleteAuthority,
];

export { listAuthorityProviders, getAuthorityInstanceAttributesDescriptors };
export default epics;
