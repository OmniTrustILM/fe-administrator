import type { AppEpic } from 'ducks';
import { of } from 'rxjs';
import { catchError, filter, map, mergeMap, switchMap } from 'rxjs/operators';
import { extractError } from 'utils/net';

import { LockWidgetNameEnum } from 'types/user-interface';
import { actions as alertActions } from './alerts';
import { actions as appRedirectActions } from './app-redirect';
import { EntityType } from './filters';
import { actions as pagingActions, selectors as pagingSelectors, entityListParams, listParamsAfterDelete } from './paging';
import { selectors, slice } from './signing-profiles';
import { isTimestampingWorkflow } from 'utils/type-guards';
import { transformSearchRequestModelToDto } from './transform/certificates';
import { transformConnectorDtoV2ToModel } from './transform/connectors';
import { ConnectorInterface, FilterConditionOperator, FilterFieldSource, SigningWorkflowType } from 'types/openapi';
import { actions as userInterfaceActions } from './user-interface';
import { store } from '../App';

const listSigningProfiles: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listSigningProfiles.match),
        switchMap((action) => {
            store.dispatch(pagingActions.list(EntityType.SIGNING_PROFILE));
            return deps.apiClients.signingProfiles
                .listSigningProfiles({ searchRequestDto: action.payload ? transformSearchRequestModelToDto(action.payload) : {} })
                .pipe(
                    switchMap((response) =>
                        of(
                            slice.actions.listSigningProfilesSuccess({
                                signingProfiles: response.items ?? [],
                            }),
                            pagingActions.listSuccess({ entity: EntityType.SIGNING_PROFILE, totalItems: response.totalItems ?? 0 }),
                            userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfSigningProfiles),
                        ),
                    ),
                    catchError((error) =>
                        of(
                            slice.actions.listSigningProfilesFailure({ error: extractError(error, 'Failed to get Signing Profiles list') }),
                            pagingActions.listFailure(EntityType.SIGNING_PROFILE),
                            userInterfaceActions.insertWidgetLock(error, LockWidgetNameEnum.ListOfSigningProfiles),
                        ),
                    ),
                );
        }),
    );
};

const getSigningProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getSigningProfile.match),
        switchMap((action) =>
            deps.apiClients.signingProfiles.getSigningProfile({ uuid: action.payload.uuid, version: action.payload.version }).pipe(
                switchMap((detail) =>
                    of(
                        slice.actions.getSigningProfileSuccess({ signingProfile: detail }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.SigningProfileDetails),
                    ),
                ),
                catchError((error) =>
                    of(
                        slice.actions.getSigningProfileFailure({ error: extractError(error, 'Failed to get Signing Profile details') }),
                        appRedirectActions.fetchError({ error, message: 'Failed to get Signing Profile details' }),
                        userInterfaceActions.insertWidgetLock(error, LockWidgetNameEnum.SigningProfileDetails),
                    ),
                ),
            ),
        ),
    );
};

const listSigningProfileSearchableFields: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listSigningProfileSearchableFields.match),
        switchMap(() =>
            deps.apiClients.signingProfiles.listSigningProfileSearchableFields().pipe(
                map((fields) => slice.actions.listSigningProfileSearchableFieldsSuccess({ searchableFields: fields })),
                catchError((error) =>
                    of(
                        slice.actions.listSigningProfileSearchableFieldsFailure({
                            error: extractError(error, 'Failed to get Signing Profile searchable fields'),
                        }),
                    ),
                ),
            ),
        ),
    );
};

const createSigningProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.createSigningProfile.match),
        switchMap((action) =>
            deps.apiClients.signingProfiles
                .createSigningProfile({ signingProfileRequestDto: action.payload.signingProfileRequestDto })
                .pipe(
                    mergeMap((created) =>
                        of(
                            slice.actions.createSigningProfileSuccess({ signingProfile: created }),
                            appRedirectActions.redirect({ url: `../signingprofiles/detail/${created.uuid}` }),
                        ),
                    ),
                    catchError((error) =>
                        of(
                            slice.actions.createSigningProfileFailure({ error: extractError(error, 'Failed to create Signing Profile') }),
                            appRedirectActions.fetchError({ error, message: 'Failed to create Signing Profile' }),
                        ),
                    ),
                ),
        ),
    );
};

const updateSigningProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.updateSigningProfile.match),
        switchMap((action) =>
            deps.apiClients.signingProfiles
                .updateSigningProfile({
                    uuid: action.payload.uuid,
                    signingProfileRequestDto: action.payload.signingProfileRequestDto,
                })
                .pipe(
                    mergeMap((updated) =>
                        of(
                            slice.actions.updateSigningProfileSuccess({ signingProfile: updated }),
                            appRedirectActions.redirect({ url: `../../signingprofiles/detail/${updated.uuid}` }),
                        ),
                    ),
                    catchError((error) =>
                        of(
                            slice.actions.updateSigningProfileFailure({ error: extractError(error, 'Failed to update Signing Profile') }),
                            appRedirectActions.fetchError({ error, message: 'Failed to update Signing Profile' }),
                        ),
                    ),
                ),
        ),
    );
};

const deleteSigningProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.deleteSigningProfile.match),
        switchMap((action) =>
            deps.apiClients.signingProfiles.deleteSigningProfile({ uuid: action.payload.uuid }).pipe(
                mergeMap(() =>
                    of(
                        slice.actions.deleteSigningProfileSuccess({ uuid: action.payload.uuid }),
                        appRedirectActions.redirect({ url: '../../signingprofiles' }),
                    ),
                ),
                catchError((error) =>
                    of(
                        slice.actions.deleteSigningProfileFailure({ error: extractError(error, 'Failed to delete Signing Profile') }),
                        appRedirectActions.fetchError({ error, message: 'Failed to delete Signing Profile' }),
                    ),
                ),
            ),
        ),
    );
};

const enableSigningProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.enableSigningProfile.match),
        switchMap((action) =>
            deps.apiClients.signingProfiles.enableSigningProfile({ uuid: action.payload.uuid }).pipe(
                map(() => slice.actions.enableSigningProfileSuccess({ uuid: action.payload.uuid })),
                catchError((error) =>
                    of(
                        slice.actions.enableSigningProfileFailure({ error: extractError(error, 'Failed to enable Signing Profile') }),
                        appRedirectActions.fetchError({ error, message: 'Failed to enable Signing Profile' }),
                    ),
                ),
            ),
        ),
    );
};

const disableSigningProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.disableSigningProfile.match),
        switchMap((action) =>
            deps.apiClients.signingProfiles.disableSigningProfile({ uuid: action.payload.uuid }).pipe(
                map(() => slice.actions.disableSigningProfileSuccess({ uuid: action.payload.uuid })),
                catchError((error) =>
                    of(
                        slice.actions.disableSigningProfileFailure({ error: extractError(error, 'Failed to disable Signing Profile') }),
                        appRedirectActions.fetchError({ error, message: 'Failed to disable Signing Profile' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkDeleteSigningProfiles: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkDeleteSigningProfiles.match),
        switchMap((action) => {
            // Snapshot paging *before* the delete resolves — PagedList fires an immediate
            // pre-commit re-fetch on delete whose listSuccess can overwrite totalItems.
            const paramsBeforeDelete = entityListParams(EntityType.SIGNING_PROFILE, state$.value);
            const totalBeforeDelete = pagingSelectors.totalItems(EntityType.SIGNING_PROFILE)(state$.value);

            return deps.apiClients.signingProfiles.bulkDeleteSigningProfiles({ requestBody: action.payload.uuids }).pipe(
                mergeMap((errors) => {
                    const successAction = slice.actions.bulkDeleteSigningProfilesSuccess({ uuids: action.payload.uuids, errors });
                    // Per-item failures are reported in `errors`; the rest were deleted server-side.
                    const deletedCount = action.payload.uuids.length - errors.length;
                    if (deletedCount === 0) {
                        return of(successAction);
                    }

                    const listParams = listParamsAfterDelete(paramsBeforeDelete, totalBeforeDelete, deletedCount);

                    return of(
                        successAction,
                        // Success alert only when every selected profile was deleted; partial
                        // failures surface through bulkDeleteErrorMessages instead.
                        ...(errors.length === 0 ? [alertActions.success('Selected Signing Profiles successfully deleted.')] : []),
                        // Only re-align the paging slice when the deletion emptied the current page
                        // and we had to step back; otherwise the re-fetch below is enough.
                        ...(listParams.pageNumber !== paramsBeforeDelete.pageNumber
                            ? [
                                  pagingActions.setPagination({
                                      entity: EntityType.SIGNING_PROFILE,
                                      pageNumber: listParams.pageNumber,
                                      pageSize: listParams.itemsPerPage,
                                  }),
                              ]
                            : []),
                        slice.actions.listSigningProfiles(listParams),
                    );
                }),
                catchError((error) =>
                    of(
                        slice.actions.bulkDeleteSigningProfilesFailure({ error: extractError(error, 'Failed to delete Signing Profiles') }),
                        appRedirectActions.fetchError({ error, message: 'Failed to delete Signing Profiles' }),
                    ),
                ),
            );
        }),
    );
};

const bulkEnableSigningProfiles: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkEnableSigningProfiles.match),
        switchMap((action) =>
            deps.apiClients.signingProfiles.bulkEnableSigningProfiles({ requestBody: action.payload.uuids }).pipe(
                map(() => slice.actions.bulkEnableSigningProfilesSuccess({ uuids: action.payload.uuids })),
                catchError((error) =>
                    of(
                        slice.actions.bulkEnableSigningProfilesFailure({ error: extractError(error, 'Failed to enable Signing Profiles') }),
                        appRedirectActions.fetchError({ error, message: 'Failed to enable Signing Profiles' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkDisableSigningProfiles: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkDisableSigningProfiles.match),
        switchMap((action) =>
            deps.apiClients.signingProfiles.bulkDisableSigningProfiles({ requestBody: action.payload.uuids }).pipe(
                map(() => slice.actions.bulkDisableSigningProfilesSuccess({ uuids: action.payload.uuids })),
                catchError((error) =>
                    of(
                        slice.actions.bulkDisableSigningProfilesFailure({
                            error: extractError(error, 'Failed to disable Signing Profiles'),
                        }),
                        appRedirectActions.fetchError({ error, message: 'Failed to disable Signing Profiles' }),
                    ),
                ),
            ),
        ),
    );
};

const activateTsp: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.activateTsp.match),
        switchMap((action) =>
            deps.apiClients.signingProfiles
                .activateTsp({
                    signingProfileUuid: action.payload.signingProfileUuid,
                    tspProfileUuid: action.payload.tspProfileUuid,
                })
                .pipe(
                    map((details) => slice.actions.activateTspSuccess({ tspActivationDetails: details })),
                    catchError((error) =>
                        of(
                            slice.actions.activateTspFailure({ error: extractError(error, 'Failed to activate TSP') }),
                            appRedirectActions.fetchError({ error, message: 'Failed to activate TSP' }),
                        ),
                    ),
                ),
        ),
    );
};

const deactivateTsp: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.deactivateTsp.match),
        switchMap((action) =>
            deps.apiClients.signingProfiles.deactivateTsp({ uuid: action.payload.uuid }).pipe(
                map(() => slice.actions.deactivateTspSuccess({ uuid: action.payload.uuid })),
                catchError((error) =>
                    of(
                        slice.actions.deactivateTspFailure({ error: extractError(error, 'Failed to deactivate TSP') }),
                        appRedirectActions.fetchError({ error, message: 'Failed to deactivate TSP' }),
                    ),
                ),
            ),
        ),
    );
};

const getTspActivationDetails: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getTspActivationDetails.match),
        switchMap((action) =>
            deps.apiClients.signingProfiles.getTspActivationDetails({ uuid: action.payload.uuid }).pipe(
                map((details) => slice.actions.getTspActivationDetailsSuccess({ tspActivationDetails: details })),
                catchError((error) =>
                    of(
                        slice.actions.getTspActivationDetailsFailure({
                            error: extractError(error, 'Failed to get TSP activation details'),
                        }),
                    ),
                ),
            ),
        ),
    );
};

const listSupportedProtocols: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listSupportedProtocols.match),
        switchMap((action) =>
            deps.apiClients.signingProfiles.listSupportedProtocols({ signingWorkflowType: action.payload.workflowType }).pipe(
                map((protocols) => slice.actions.listSupportedProtocolsSuccess({ supportedProtocols: protocols })),
                catchError((error) =>
                    of(
                        slice.actions.listSupportedProtocolsFailure({
                            error: extractError(error, 'Failed to get supported protocols'),
                        }),
                    ),
                ),
            ),
        ),
    );
};

const listSigningCertificates: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listSigningCertificates.match),
        switchMap((action) =>
            deps.apiClients.signingProfiles
                .listSigningCertificates({
                    signingWorkflowType: action.payload.workflowType,
                    qualifiedTimestamp: action.payload.qualifiedTimestamp,
                })
                .pipe(
                    map((certificates) => slice.actions.listSigningCertificatesSuccess({ signingCertificates: certificates })),
                    catchError((error) =>
                        of(
                            slice.actions.listSigningCertificatesFailure({
                                error: extractError(error, 'Failed to get signing certificates'),
                            }),
                        ),
                    ),
                ),
        ),
    );
};

const listSignatureAttributesForCertificate: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listSignatureAttributesForCertificate.match),
        switchMap((action) =>
            deps.apiClients.signingProfiles.listSignatureAttributesForCertificate({ certificateUuid: action.payload.certificateUuid }).pipe(
                map((descriptors) => slice.actions.listSignatureAttributesForCertificateSuccess({ attributeDescriptors: descriptors })),
                catchError((error) =>
                    of(
                        slice.actions.listSignatureAttributesForCertificateFailure({
                            error: extractError(error, 'Failed to get signature attributes for certificate'),
                        }),
                    ),
                ),
            ),
        ),
    );
};

const listSignatureFormattingConnectorAttributes: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listSignatureFormattingConnectorAttributes.match),
        switchMap((action) =>
            deps.apiClients.signingProfiles
                .listSignatureFormattingConnectorAttributes({
                    connectorUuid: action.payload.connectorUuid,
                    signingProfileUuid: action.payload.signingProfileUuid,
                })
                .pipe(
                    map((descriptors) => {
                        const profile = selectors.signingProfile(state$.value);
                        const savedAttrs =
                            profile && isTimestampingWorkflow(profile.workflow)
                                ? (profile.workflow.signatureFormattingConnectorAttributes ?? [])
                                : [];

                        const savedContentByUuid = new Map(
                            savedAttrs.filter((a) => 'content' in a).map((a) => [a.uuid, (a as any).content]),
                        );
                        const merged = descriptors.map((descriptor) => {
                            const savedContent = savedContentByUuid.get(descriptor.uuid);
                            return savedContent === undefined ? descriptor : { ...descriptor, content: savedContent };
                        });

                        return slice.actions.listSignatureFormattingConnectorAttributesSuccess({ attributeDescriptors: merged });
                    }),
                    catchError((error) =>
                        of(
                            slice.actions.listSignatureFormattingConnectorAttributesFailure({
                                error: extractError(error, 'Failed to get signature formatting connector attributes'),
                            }),
                        ),
                    ),
                ),
        ),
    );
};

const listSigningRecordsForSigningProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listSigningRecordsForSigningProfile.match),
        switchMap((action) => {
            const searchRequest = { filters: [] };
            return deps.apiClients.signingProfiles
                .listSigningRecordsForSigningProfile({ uuid: action.payload.uuid, searchRequestDto: searchRequest })
                .pipe(
                    map((response) => slice.actions.listSigningRecordsForSigningProfileSuccess({ signingRecords: response })),
                    catchError((error) =>
                        of(
                            slice.actions.listSigningRecordsForSigningProfileFailure({
                                error: extractError(error, 'Failed to get signing records for Signing Profile'),
                            }),
                        ),
                    ),
                );
        }),
    );
};

const workflowTypeToConnectorFeature: Partial<Record<SigningWorkflowType, string>> = {
    [SigningWorkflowType.Timestamping]: 'timestamping',
};

const listSignatureFormattingConnectors: AppEpic = (action$, _state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listSignatureFormattingConnectors.match),
        switchMap((action) => {
            const featureValue = workflowTypeToConnectorFeature[action.payload.workflowType];
            const featureFilter = featureValue
                ? [
                      {
                          fieldSource: FilterFieldSource.Property,
                          fieldIdentifier: 'CONNECTOR_FEATURES',
                          condition: FilterConditionOperator.Equals,
                          value: featureValue,
                      },
                  ]
                : [];
            return deps.apiClients.connectorsV2
                .listConnectorsV2({
                    searchRequestDto: {
                        pageNumber: 1,
                        itemsPerPage: 1000,
                        filters: [
                            ...featureFilter,
                            {
                                fieldSource: FilterFieldSource.Property,
                                fieldIdentifier: 'CONNECTOR_INTERFACE',
                                condition: FilterConditionOperator.Equals,
                                value: ConnectorInterface.SignatureFormatting,
                            },
                        ],
                    },
                })
                .pipe(
                    map((page) =>
                        slice.actions.listSignatureFormattingConnectorsSuccess({
                            connectors: page.items.map(transformConnectorDtoV2ToModel),
                        }),
                    ),
                    catchError((error) =>
                        of(
                            slice.actions.listSignatureFormattingConnectorsFailure({
                                error: extractError(error, 'Failed to get signature formatting connectors'),
                            }),
                        ),
                    ),
                );
        }),
    );
};

const epics = [
    listSigningProfiles,
    getSigningProfile,
    listSigningProfileSearchableFields,
    createSigningProfile,
    updateSigningProfile,
    deleteSigningProfile,
    enableSigningProfile,
    disableSigningProfile,
    bulkDeleteSigningProfiles,
    bulkEnableSigningProfiles,
    bulkDisableSigningProfiles,
    activateTsp,
    deactivateTsp,
    getTspActivationDetails,
    listSupportedProtocols,
    listSigningCertificates,
    listSignatureAttributesForCertificate,
    listSignatureFormattingConnectorAttributes,
    listSignatureFormattingConnectors,
    listSigningRecordsForSigningProfile,
];

export default epics;
