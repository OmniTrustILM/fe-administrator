import type { AppEpic } from 'ducks';
import { of } from 'rxjs';
import { catchError, filter, map, mergeMap, switchMap } from 'rxjs/operators';
import { extractError } from 'utils/net';
import { actions as alertActions } from './alerts';
import { actions as appRedirectActions } from './app-redirect';

import * as slice from './certificates';
import { transformAttributeDescriptorDtoToModel } from './transform/attributes';

import { store } from '../App';
import { LockWidgetNameEnum } from 'types/user-interface';
import { EntityType } from './filters';
import { actions as pagingActions } from './paging';
import {
    transformCertificateBulkDeleteRequestModelToDto,
    transformCertificateBulkDeleteResponseDtoToModel,
    transformCertificateBulkObjectModelToDto,
    transformCertificateComplianceCheckModelToDto,
    transformCertificateContentResponseDtoToModel,
    transformCertificateDetailResponseDtoToModel,
    transformCertificateHistoryDtoToModel,
    transformCertificateListResponseDtoToModel,
    transformCertificateObjectModelToDto,
    transformCertificateRekeyRequestModelToDto,
    transformCertificateRenewRequestModelToDto,
    transformCertificateRevokeRequestModelToDto,
    transformCertificateSignRequestModelToDto,
    transformCertificateUploadModelToDto,
    transformSearchRequestModelToDto,
} from './transform/certificates';
import { transformLocationResponseDtoToModel } from './transform/locations';
import { transformRaProfileResponseDtoToModel } from './transform/ra-profiles';
import { actions as userInterfaceActions } from './user-interface';

const listCertificates: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.listCertificates.match),
        switchMap((action) => {
            store.dispatch(pagingActions.list(EntityType.CERTIFICATE));
            return deps.apiClients.certificates
                .listCertificates({ certificateSearchRequestDto: transformSearchRequestModelToDto(action.payload) })
                .pipe(
                    mergeMap((list) =>
                        of(
                            slice.actions.listCertificatesSuccess(list.certificates.map(transformCertificateListResponseDtoToModel)),
                            pagingActions.listSuccess({ entity: EntityType.CERTIFICATE, totalItems: list.totalItems }),
                            userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfCertificates),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            pagingActions.listFailure(EntityType.CERTIFICATE),
                            userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.ListOfCertificates),
                        ),
                    ),
                );
        }),
    );
};

const getCertificateDetail: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getCertificateDetail.match),
        switchMap((action) =>
            deps.apiClients.certificates.getCertificate({ uuid: action.payload.uuid }).pipe(
                switchMap((certificate) =>
                    of(
                        slice.actions.getCertificateDetailSuccess({
                            certificate: transformCertificateDetailResponseDtoToModel(certificate),
                        }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.CertificateDetailsWidget),
                    ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.getCertificateDetailFailure({ error: extractError(err, 'Failed to get certificate detail') }),
                        userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.CertificateDetailsWidget),
                    ),
                ),
            ),
        ),
    );
};

const getCertificateRelations: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getCertificateRelations.match),
        switchMap((action) =>
            deps.apiClients.certificates.getCertificateRelations({ uuid: action.payload.uuid }).pipe(
                map((response) => slice.actions.getCertificateRelationsSuccess({ certificateRelations: response })),
                catchError((error) =>
                    of(
                        slice.actions.getCertificateRelationsFailure({ error: extractError(error, 'Failed to get certificate relations') }),
                        appRedirectActions.fetchError({ error, message: 'Failed to get certificate relations' }),
                    ),
                ),
            ),
        ),
    );
};

const associateCertificate: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.associateCertificate.match),
        switchMap((action) =>
            deps.apiClients.certificates.associateCertificates(action.payload).pipe(
                mergeMap(() => of(slice.actions.associateCertificateSuccess(action.payload))),
                catchError((err) =>
                    of(
                        slice.actions.associateCertificateFailure({ error: extractError(err, 'Failed to associate certificate') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to associate certificate' }),
                    ),
                ),
            ),
        ),
    );
};

const handleAssociateCertificateSuccess: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.associateCertificateSuccess.match),
        map((action) => slice.actions.getCertificateRelations({ uuid: action.payload.uuid })),
    );
};

const deassociateCertificate: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.deassociateCertificate.match),
        switchMap((action) =>
            deps.apiClients.certificates
                .removeCertificateAssociation({ uuid: action.payload.uuid, certificateUuid: action.payload.certificateUuid })
                .pipe(
                    mergeMap(() => of(slice.actions.deassociateCertificateSuccess(action.payload))),
                    catchError((err) =>
                        of(
                            slice.actions.deassociateCertificateFailure({
                                error: extractError(err, 'Failed to deassociate certificate'),
                            }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to deassociate certificate' }),
                        ),
                    ),
                ),
        ),
    );
};

const handleDeassociateCertificateSuccess: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.deassociateCertificateSuccess.match),
        map((action) => slice.actions.getCertificateRelations({ uuid: action.payload.uuid })),
    );
};

const getCertificateValidationResult: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getCertificateValidationResult.match),
        switchMap((action) =>
            deps.apiClients.certificates.getCertificateValidationResult({ uuid: action.payload.uuid }).pipe(
                map((result) => slice.actions.getCertificateValidationResultSuccess(result)),

                catchError((err) =>
                    of(
                        slice.actions.getCertificateValidationResultFailure({
                            error: extractError(err, 'Failed to get certificate validation result'),
                        }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to get certificate validation result' }),
                    ),
                ),
            ),
        ),
    );
};

const issueCertificate: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.issueCertificate.match),
        switchMap((action) =>
            deps.apiClients.clientOperations
                .issueCertificate({
                    authorityUuid: action.payload.authorityUuid,
                    raProfileUuid: action.payload.raProfileUuid,
                    clientCertificateSignRequestDto: transformCertificateSignRequestModelToDto(action.payload.signRequest),
                })
                .pipe(
                    mergeMap((operation) =>
                        of(
                            slice.actions.issueCertificateSuccess({ uuid: operation.uuid, certificateData: operation.certificateData }),
                            appRedirectActions.redirect({ url: `../certificates/detail/${operation.uuid}` }),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.issueCertificateFailure({ error: extractError(err, 'Failed to issue certificate') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to issue certificate' }),
                        ),
                    ),
                ),
        ),
    );
};

const issueCertificateNew: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.issueCertificateNew.match),
        switchMap((action) =>
            deps.apiClients.clientOperations
                .issueRequestedCertificate({
                    authorityUuid: action.payload.authorityUuid,
                    raProfileUuid: action.payload.raProfileUuid,
                    certificateUuid: action.payload.certificateUuid,
                })
                .pipe(
                    mergeMap((operation) =>
                        of(
                            slice.actions.issueCertificateSuccess({ uuid: operation.uuid, certificateData: operation.certificateData }),
                            appRedirectActions.redirect({ url: `../certificates/detail/${operation.uuid}` }),
                            alertActions.success('Issue new certificate operation successfully initiated'),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.issueCertificateFailure({ error: extractError(err, 'Failed to issue certificate') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to issue certificate' }),
                        ),
                    ),
                ),
        ),
    );
};

const revokeCertificate: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.revokeCertificate.match),
        switchMap((action) =>
            deps.apiClients.clientOperations
                .revokeCertificate({
                    authorityUuid: action.payload.authorityUuid,
                    raProfileUuid: action.payload.raProfileUuid,
                    certificateUuid: action.payload.uuid,
                    clientCertificateRevocationDto: transformCertificateRevokeRequestModelToDto(action.payload.revokeRequest),
                })
                .pipe(
                    mergeMap(() =>
                        of(
                            slice.actions.revokeCertificateSuccess({ uuid: action.payload.uuid }),
                            alertActions.success('Revoke certificate operation successfully initiated'),
                            slice.actions.getCertificateDetail({ uuid: action.payload.uuid }),
                            slice.actions.getCertificateHistory({ uuid: action.payload.uuid }),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.revokeCertificateFailure({ error: extractError(err, 'Failed to revoke certificate') }),
                            slice.actions.getCertificateDetail({ uuid: action.payload.uuid }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to revoke certificate' }),
                        ),
                    ),
                ),
        ),
    );
};

const renewCertificate: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.renewCertificate.match),
        switchMap((action) =>
            deps.apiClients.clientOperations
                .renewCertificate({
                    authorityUuid: action.payload.authorityUuid,
                    raProfileUuid: action.payload.raProfileUuid,
                    certificateUuid: action.payload.uuid,
                    clientCertificateRenewRequestDto: transformCertificateRenewRequestModelToDto(action.payload.renewRequest),
                })
                .pipe(
                    mergeMap((operation) =>
                        of(
                            slice.actions.renewCertificateSuccess({ uuid: operation.uuid }),
                            appRedirectActions.redirect({ url: `../certificates/detail/${operation.uuid}` }),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.renewCertificateFailure({ error: extractError(err, 'Failed to renew certificate') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to renew certificate' }),
                        ),
                    ),
                ),
        ),
    );
};

const rekeyCertificate: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.rekeyCertificate.match),
        switchMap((action) =>
            deps.apiClients.clientOperations
                .rekeyCertificate({
                    authorityUuid: action.payload.authorityUuid,
                    raProfileUuid: action.payload.raProfileUuid,
                    certificateUuid: action.payload.uuid,
                    clientCertificateRekeyRequestDto: transformCertificateRekeyRequestModelToDto(action.payload.rekey),
                })
                .pipe(
                    mergeMap((operation) =>
                        of(
                            slice.actions.rekeyCertificateSuccess({ uuid: operation.uuid }),
                            appRedirectActions.redirect({ url: `../certificates/detail/${operation.uuid}` }),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.rekeyCertificateFailure({ error: extractError(err, 'Failed to rekey certificate') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to rekey certificate' }),
                        ),
                    ),
                ),
        ),
    );
};

const manuallyIssueCertificate: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.manuallyIssueCertificate.match),
        mergeMap((action) =>
            deps.apiClients.clientOperations
                .manuallyIssueCertificate({
                    authorityUuid: action.payload.authorityUuid,
                    raProfileUuid: action.payload.raProfileUuid,
                    certificateUuid: action.payload.uuid,
                    uploadCertificateRequestDto: action.payload.uploadRequest,
                })
                .pipe(
                    mergeMap((certificate) =>
                        of(
                            slice.actions.manuallyIssueCertificateSuccess({
                                uuid: action.payload.uuid,
                                certificate: transformCertificateDetailResponseDtoToModel(certificate),
                            }),
                            alertActions.success('Certificate issued and pending operation finalised'),
                            slice.actions.getCertificateDetail({ uuid: action.payload.uuid }),
                            slice.actions.getCertificateHistory({ uuid: action.payload.uuid }),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.manuallyIssueCertificateFailure({
                                uuid: action.payload.uuid,
                                error: extractError(err, 'Failed to finalise certificate issuance'),
                            }),
                            slice.actions.getCertificateDetail({ uuid: action.payload.uuid }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to finalise certificate issuance' }),
                        ),
                    ),
                ),
        ),
    );
};

const manuallyConfirmRevoke: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.manuallyConfirmRevoke.match),
        mergeMap((action) =>
            deps.apiClients.clientOperations
                .manuallyConfirmRevoke({
                    authorityUuid: action.payload.authorityUuid,
                    raProfileUuid: action.payload.raProfileUuid,
                    certificateUuid: action.payload.uuid,
                })
                .pipe(
                    mergeMap(() =>
                        of(
                            slice.actions.manuallyConfirmRevokeSuccess({ uuid: action.payload.uuid }),
                            alertActions.success('Pending revocation confirmed'),
                            slice.actions.getCertificateDetail({ uuid: action.payload.uuid }),
                            slice.actions.getCertificateHistory({ uuid: action.payload.uuid }),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.manuallyConfirmRevokeFailure({
                                uuid: action.payload.uuid,
                                error: extractError(err, 'Failed to confirm revocation'),
                            }),
                            slice.actions.getCertificateDetail({ uuid: action.payload.uuid }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to confirm revocation' }),
                        ),
                    ),
                ),
        ),
    );
};

const cancelPendingCertificateOperation: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.cancelPendingCertificateOperation.match),
        mergeMap((action) =>
            deps.apiClients.clientOperations
                .cancelPendingCertificateOperation({
                    authorityUuid: action.payload.authorityUuid,
                    raProfileUuid: action.payload.raProfileUuid,
                    certificateUuid: action.payload.uuid,
                    cancelPendingCertificateRequestDto: { reason: action.payload.reason },
                })
                .pipe(
                    mergeMap((certificate) =>
                        of(
                            slice.actions.cancelPendingCertificateOperationSuccess({
                                uuid: action.payload.uuid,
                                certificate: transformCertificateDetailResponseDtoToModel(certificate),
                            }),
                            alertActions.success('Pending operation cancelled'),
                            slice.actions.getCertificateDetail({ uuid: action.payload.uuid }),
                            slice.actions.getCertificateHistory({ uuid: action.payload.uuid }),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.cancelPendingCertificateOperationFailure({
                                uuid: action.payload.uuid,
                                error: extractError(err, 'Failed to cancel pending operation'),
                            }),
                            slice.actions.getCertificateDetail({ uuid: action.payload.uuid }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to cancel pending operation' }),
                        ),
                    ),
                ),
        ),
    );
};

const getCertificateHistory: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getCertificateHistory.match),
        switchMap((action) =>
            deps.apiClients.certificates.getCertificateEventHistory({ uuid: action.payload.uuid }).pipe(
                mergeMap((records) =>
                    of(
                        slice.actions.getCertificateHistorySuccess({
                            certificateHistory: records.map((record) => transformCertificateHistoryDtoToModel(record)),
                        }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.CertificateEventHistory),
                    ),
                ),

                catchError((err) =>
                    of(
                        slice.actions.getCertificateHistoryFailure({ error: extractError(err, 'Failed to get certificate history') }),
                        userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.CertificateEventHistory),
                    ),
                ),
            ),
        ),
    );
};

const listCertificateLocations: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.listCertificateLocations.match),
        switchMap((action) =>
            deps.apiClients.certificates.listCertificateLocations({ certificateUuid: action.payload.uuid }).pipe(
                switchMap((locations) =>
                    of(
                        slice.actions.listCertificateLocationsSuccess({
                            certificateLocations: locations.map((location) => transformLocationResponseDtoToModel(location)),
                        }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.CertificationLocations),
                    ),
                ),

                catchError((err) =>
                    of(
                        slice.actions.listCertificateLocationsFailure({ error: extractError(err, 'Failed to list certificate locations') }),
                        userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.CertificationLocations),
                    ),
                ),
            ),
        ),
    );
};

const deleteCertificate: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.deleteCertificate.match),
        switchMap((action) =>
            deps.apiClients.certificates.deleteCertificate({ uuid: action.payload.uuid }).pipe(
                mergeMap(() =>
                    of(
                        slice.actions.deleteCertificateSuccess({ uuid: action.payload.uuid }),
                        appRedirectActions.redirect({ url: '../../certificates' }),
                    ),
                ),

                catchError((err) =>
                    of(
                        slice.actions.deleteCertificateFailure({ error: extractError(err, 'Failed to delete certificate') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to delete certificate' }),
                    ),
                ),
            ),
        ),
    );
};

const updateGroup: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.updateGroup.match),
        switchMap((action) =>
            deps.apiClients.certificates
                .updateCertificateObjects({
                    uuid: action.payload.uuid,
                    certificateUpdateObjectsDto: transformCertificateObjectModelToDto(action.payload.updateGroupRequest),
                })
                .pipe(
                    mergeMap(() =>
                        of(
                            slice.actions.updateGroupSuccess({
                                uuid: action.payload.uuid,
                            }),
                            slice.actions.getCertificateHistory({ uuid: action.payload.uuid }),
                            slice.actions.getCertificateDetail({ uuid: action.payload.uuid }),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.updateGroupFailure({ error: extractError(err, 'Failed to update group') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to update group' }),
                        ),
                    ),
                ),
        ),
    );
};

const deleteGroups: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.deleteGroups.match),
        switchMap((action) =>
            deps.apiClients.certificates
                .updateCertificateObjects({
                    uuid: action.payload.uuid,
                    certificateUpdateObjectsDto: { groupUuids: [] },
                })
                .pipe(
                    mergeMap(() =>
                        of(
                            slice.actions.deleteGroupsSuccess({
                                uuid: action.payload.uuid,
                            }),
                            slice.actions.getCertificateHistory({ uuid: action.payload.uuid }),
                            slice.actions.getCertificateDetail({ uuid: action.payload.uuid }),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.deleteGroupsFailure({ error: extractError(err, 'Failed to delete group') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to delete group' }),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.deleteGroupsFailure({ error: extractError(err, 'Failed to delete group') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to delete group' }),
                        ),
                    ),
                ),
        ),
    );
};

const updateRaProfile: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.updateRaProfile.match),
        switchMap((action) =>
            deps.apiClients.certificates
                .updateCertificateObjects({
                    uuid: action.payload.uuid,
                    certificateUpdateObjectsDto: transformCertificateObjectModelToDto(action.payload.updateRaProfileRequest),
                })
                .pipe(
                    switchMap(() =>
                        deps.apiClients.raProfiles
                            .getRaProfile({
                                authorityUuid: action.payload.authorityUuid,
                                raProfileUuid: action.payload.updateRaProfileRequest.raProfileUuid!,
                            })
                            .pipe(
                                mergeMap((raProfile) =>
                                    of(
                                        slice.actions.updateRaProfileSuccess({
                                            uuid: action.payload.uuid,
                                            raProfileUuid: action.payload.updateRaProfileRequest.raProfileUuid!,
                                            raProfile: transformRaProfileResponseDtoToModel(raProfile),
                                        }),
                                        slice.actions.getCertificateHistory({ uuid: action.payload.uuid }),
                                    ),
                                ),

                                catchError((err) =>
                                    of(
                                        slice.actions.updateRaProfileFailure({ error: extractError(err, 'Failed to update RA profile') }),
                                        appRedirectActions.fetchError({ error: err, message: 'Failed to update RA profile' }),
                                    ),
                                ),
                            ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.updateRaProfileFailure({ error: extractError(err, 'Failed to update RA profile') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to update RA profile' }),
                        ),
                    ),
                ),
        ),
    );
};

const deleteRaProfile: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.deleteRaProfile.match),
        switchMap((action) =>
            deps.apiClients.certificates
                .updateCertificateObjects({
                    uuid: action.payload.uuid,
                    certificateUpdateObjectsDto: { raProfileUuid: '' },
                })
                .pipe(
                    mergeMap(() =>
                        of(
                            slice.actions.deleteRaProfileSuccess({
                                uuid: action.payload.uuid,
                            }),
                            slice.actions.getCertificateHistory({ uuid: action.payload.uuid }),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.deleteRaProfileFailure({ error: extractError(err, 'Failed to delete RA profile') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to delete RA profile' }),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.deleteRaProfileFailure({ error: extractError(err, 'Failed to delete RA profile') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to delete RA profile' }),
                        ),
                    ),
                ),
        ),
    );
};

const updateOwner: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.updateOwner.match),
        switchMap((action) =>
            deps.apiClients.certificates
                .updateCertificateObjects({
                    uuid: action.payload.uuid,
                    certificateUpdateObjectsDto: action.payload.updateOwnerRequest,
                })
                .pipe(
                    mergeMap(() =>
                        of(
                            slice.actions.updateOwnerSuccess({
                                uuid: action.payload.uuid,
                                user: action.payload.user,
                            }),
                            slice.actions.getCertificateHistory({ uuid: action.payload.uuid }),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.updateOwnerFailure({ error: extractError(err, 'Failed to update owner') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to update owner' }),
                        ),
                    ),
                ),
        ),
    );
};

const deleteOwner: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.deleteOwner.match),
        switchMap((action) =>
            deps.apiClients.certificates
                .updateCertificateObjects({
                    uuid: action.payload.uuid,
                    certificateUpdateObjectsDto: { ownerUuid: '' },
                })
                .pipe(
                    mergeMap(() =>
                        of(
                            slice.actions.deleteOwnerSuccess({
                                uuid: action.payload.uuid,
                            }),
                            slice.actions.getCertificateHistory({ uuid: action.payload.uuid }),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.deleteOwnerFailure({ error: extractError(err, 'Failed to delete owner') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to delete owner' }),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.deleteOwnerFailure({ error: extractError(err, 'Failed to delete owner') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to delete owner' }),
                        ),
                    ),
                ),
        ),
    );
};

const updateCertificateTrustedStatus: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.updateCertificateTrustedStatus.match),
        switchMap((action) =>
            deps.apiClients.certificates
                .updateCertificateObjects({
                    uuid: action.payload.uuid,
                    certificateUpdateObjectsDto: action.payload.updateCertificateTrustedStatusRequest,
                })
                .pipe(
                    mergeMap(() =>
                        of(
                            slice.actions.updateCertificateTrustedStatusSuccess({
                                uuid: action.payload.uuid,
                                trustedCa: action.payload.updateCertificateTrustedStatusRequest.trustedCa,
                            }),
                            slice.actions.getCertificateHistory({ uuid: action.payload.uuid }),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.updateCertificateTrustedStatusFailure({
                                error: extractError(err, 'Failed to update certificate trusted status'),
                            }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to update certificate trusted status' }),
                        ),
                    ),
                ),
        ),
    );
};

const bulkUpdateGroup: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkUpdateGroup.match),
        switchMap((action) =>
            deps.apiClients.certificates
                .bulkUpdateCertificateObjects({
                    multipleCertificateObjectUpdateDto: transformCertificateBulkObjectModelToDto(action.payload),
                })
                .pipe(
                    mergeMap(() =>
                        of(
                            slice.actions.bulkUpdateGroupSuccess({
                                uuids: action.payload.certificateUuids!,
                            }),
                            alertActions.success('Update operation for selected certificates groups completed.'),
                            slice.actions.listCertificates({}),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.updateOwnerFailure({ error: extractError(err, 'Failed to bulk update update group') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to bulk update update group' }),
                        ),
                    ),
                ),
        ),
    );
};

const bulkDeleteGroup: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkDeleteGroup.match),
        switchMap((action) =>
            deps.apiClients.certificates
                .bulkUpdateCertificateObjects({
                    multipleCertificateObjectUpdateDto: transformCertificateBulkObjectModelToDto({
                        certificateUuids: action.payload.certificateUuids,
                        groupUuids: [],
                    }),
                })
                .pipe(
                    mergeMap(() =>
                        of(
                            slice.actions.bulkDeleteGroupSuccess({
                                uuids: action.payload.certificateUuids!,
                            }),
                            alertActions.success('Delete operation for selected certificates groups completed.'),
                            slice.actions.listCertificates({}),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.updateOwnerFailure({ error: extractError(err, 'Failed to bulk delete certificates groups') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to bulk delete certificates groups' }),
                        ),
                    ),
                ),
        ),
    );
};

const bulkUpdateRaProfile: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkUpdateRaProfile.match),
        switchMap((action) =>
            deps.apiClients.certificates
                .bulkUpdateCertificateObjects({
                    multipleCertificateObjectUpdateDto: transformCertificateBulkObjectModelToDto(action.payload.raProfileRequest),
                })
                .pipe(
                    switchMap(() =>
                        deps.apiClients.raProfiles
                            .getRaProfile({
                                authorityUuid: action.payload.authorityUuid,
                                raProfileUuid: action.payload.raProfileRequest.raProfileUuid!,
                            })
                            .pipe(
                                map((raProfile) =>
                                    slice.actions.bulkUpdateRaProfileSuccess({
                                        uuids: action.payload.raProfileRequest.certificateUuids!,
                                        raProfile: transformRaProfileResponseDtoToModel(raProfile),
                                    }),
                                ),

                                catchError((err) =>
                                    of(
                                        slice.actions.updateOwnerFailure({
                                            error: extractError(err, 'Failed to bulk update update RA profile'),
                                        }),
                                        appRedirectActions.fetchError({ error: err, message: 'Failed to bulk update update RA profile' }),
                                    ),
                                ),
                            ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.updateOwnerFailure({ error: extractError(err, 'Failed to bulk update update RA profile') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to bulk update update RA profile' }),
                        ),
                    ),
                ),
        ),
    );
};

const bulkDeleteRaProfile: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkDeleteRaProfile.match),
        switchMap((action) =>
            deps.apiClients.certificates
                .bulkUpdateCertificateObjects({
                    multipleCertificateObjectUpdateDto: transformCertificateBulkObjectModelToDto({
                        certificateUuids: action.payload.certificateUuids,
                        raProfileUuid: '',
                    }),
                })
                .pipe(
                    mergeMap(() =>
                        of(
                            slice.actions.bulkDeleteRaProfileSuccess({
                                uuids: action.payload.certificateUuids!,
                            }),
                            alertActions.success('Delete operation for selected Certificates RA profiles completed.'),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.updateOwnerFailure({
                                error: extractError(err, 'Failed to bulk delete Certificates RA profiles'),
                            }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to bulk delete Certificates RA profiles' }),
                        ),
                    ),
                ),
        ),
    );
};

const bulkUpdateOwner: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkUpdateOwner.match),
        switchMap((action) =>
            deps.apiClients.certificates
                .bulkUpdateCertificateObjects({
                    multipleCertificateObjectUpdateDto: transformCertificateBulkObjectModelToDto(action.payload.request),
                })
                .pipe(
                    map(() =>
                        slice.actions.bulkUpdateOwnerSuccess({
                            uuids: action.payload.request.certificateUuids!,
                            user: action.payload.user,
                        }),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.updateOwnerFailure({ error: extractError(err, 'Failed to bulk update update owner') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to bulk update update owner' }),
                        ),
                    ),
                ),
        ),
    );
};

const bulkDeleteOwner: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkDeleteOwner.match),
        switchMap((action) =>
            deps.apiClients.certificates
                .bulkUpdateCertificateObjects({
                    multipleCertificateObjectUpdateDto: transformCertificateBulkObjectModelToDto({
                        certificateUuids: action.payload.certificateUuids,
                        ownerUuid: '',
                    }),
                })
                .pipe(
                    mergeMap(() =>
                        of(
                            slice.actions.bulkDeleteOwnerSuccess({
                                uuids: action.payload.certificateUuids!,
                            }),
                            alertActions.success('Delete operation for selected certificates owners completed.'),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.updateOwnerFailure({ error: extractError(err, 'Failed to bulk delete certificates owners') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to bulk delete certificates owners' }),
                        ),
                    ),
                ),
        ),
    );
};

const bulkDelete: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkDelete.match),
        switchMap((action) =>
            deps.apiClients.certificates
                .bulkDeleteCertificate({ removeCertificateDto: transformCertificateBulkDeleteRequestModelToDto(action.payload) })
                .pipe(
                    mergeMap((result) =>
                        of(
                            slice.actions.bulkDeleteSuccess({ response: transformCertificateBulkDeleteResponseDtoToModel(result) }),
                            alertActions.success('Delete operation for selected certificates initiated.'),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.bulkDeleteFailure({ error: extractError(err, 'Failed to bulk delete certificates') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to bulk delete certificates' }),
                        ),
                    ),
                ),
        ),
    );
};

const uploadCertificate: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.uploadCertificate.match),
        switchMap((action) =>
            deps.apiClients.certificates.upload({ uploadCertificateRequestDto: transformCertificateUploadModelToDto(action.payload) }).pipe(
                switchMap((obj) =>
                    deps.apiClients.certificates.getCertificate({ uuid: obj.uuid }).pipe(
                        map((certificate) =>
                            slice.actions.uploadCertificateSuccess({
                                uuid: obj.uuid,
                                certificate: transformCertificateDetailResponseDtoToModel(certificate),
                            }),
                        ),

                        catchError((err) =>
                            of(
                                slice.actions.uploadCertificateFailure({ error: extractError(err, 'Failed to upload certificate') }),
                                appRedirectActions.fetchError({ error: err, message: 'Failed to upload certificate' }),
                            ),
                        ),
                    ),
                ),

                catchError((err) =>
                    of(
                        slice.actions.uploadCertificateFailure({ error: extractError(err, 'Failed to upload certificate') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to upload certificate' }),
                    ),
                ),
            ),
        ),
    );
};

const getIssuanceAttributes: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getIssuanceAttributes.match),
        switchMap((action) =>
            deps.apiClients.clientOperations
                .listIssueCertificateAttributes({
                    authorityUuid: action.payload.authorityUuid,
                    raProfileUuid: action.payload.raProfileUuid,
                })
                .pipe(
                    map((attributes) =>
                        slice.actions.getIssuanceAttributesSuccess({
                            raProfileUuid: action.payload.raProfileUuid,
                            issuanceAttributes: attributes.map((attribute) => transformAttributeDescriptorDtoToModel(attribute)),
                        }),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.getIssuanceAttributesFailure({ error: extractError(err, 'Failed to get issue attributes') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to get issue attributes' }),
                        ),
                    ),
                ),
        ),
    );
};

const getRevocationAttributes: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getRevocationAttributes.match),
        switchMap((action) =>
            deps.apiClients.clientOperations
                .listRevokeCertificateAttributes({
                    authorityUuid: action.payload.authorityUuid,
                    raProfileUuid: action.payload.raProfileUuid,
                })
                .pipe(
                    map((attributes) =>
                        slice.actions.getRevocationAttributesSuccess({
                            raProfileUuid: action.payload.raProfileUuid,
                            revocationAttributes: attributes.map((attribute) => transformAttributeDescriptorDtoToModel(attribute)),
                        }),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.getRevocationAttributesFailure({
                                error: extractError(err, 'Failed to get revocation attributes'),
                            }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to get revocation attributes' }),
                        ),
                    ),
                ),
        ),
    );
};

const checkCompliance: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.checkCompliance.match),
        switchMap((action) =>
            deps.apiClients.certificates
                .checkCertificatesCompliance({
                    certificateComplianceCheckDto: transformCertificateComplianceCheckModelToDto(action.payload),
                })
                .pipe(
                    mergeMap(() =>
                        of(slice.actions.checkComplianceSuccess(), alertActions.success('Compliance Check for the certificates initiated')),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.checkComplianceFailed({ error: extractError(err, 'Failed to start compliance check') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to start compliance check' }),
                        ),
                    ),
                ),
        ),
    );
};

const getCsrAttributes: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getCsrAttributes.match),
        switchMap((action) =>
            deps.apiClients.certificates.getCsrGenerationAttributes().pipe(
                map((attributes) =>
                    slice.actions.getCsrAttributesSuccess({
                        csrAttributes: attributes.map((attribute) => transformAttributeDescriptorDtoToModel(attribute)),
                    }),
                ),

                catchError((err) =>
                    of(
                        slice.actions.getCsrAttributesFailure({ error: extractError(err, 'Failed to get CSR generation attributes') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to get CSR generation attributes' }),
                    ),
                ),
            ),
        ),
    );
};

const getCertificateContent: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getCertificateContents.match),
        switchMap((action) =>
            deps.apiClients.certificates.getCertificateContent({ requestBody: action.payload.uuids }).pipe(
                map((list) =>
                    slice.actions.getCertificateContentsSuccess({
                        contents: list.map(transformCertificateContentResponseDtoToModel),
                        format: action.payload.format,
                        uuids: action.payload.uuids,
                    }),
                ),

                catchError((error) =>
                    of(
                        slice.actions.getCertificateContentsFailure({ error: extractError(error, 'Failed to download certificates') }),
                        appRedirectActions.fetchError({ error, message: 'Failed to download certificates' }),
                    ),
                ),
            ),
        ),
    );
};

const listCertificateApprovals: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listCertificateApprovals.match),
        switchMap((action) =>
            deps.apiClients.certificates.listCertificateApprovals(action.payload).pipe(
                map((response) => slice.actions.listCertificateApprovalsSuccess({ approvals: response.approvals })),

                catchError((error) =>
                    of(
                        slice.actions.listCertificateApprovalsFailure({
                            error: extractError(error, 'Failed to list certificate approvals'),
                        }),
                        appRedirectActions.fetchError({ error, message: 'Failed to list certificate approvals' }),
                    ),
                ),
            ),
        ),
    );
};

const getCertificateChain: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getCertificateChain.match),
        switchMap((action) =>
            deps.apiClients.certificates.getCertificateChain(action.payload).pipe(
                map((response) => slice.actions.getCertificateChainSuccess({ certificateChain: response })),

                catchError((error) =>
                    of(
                        slice.actions.getCertificateChainFailure({
                            error: extractError(error, 'Failed to get certificate chain'),
                        }),
                        appRedirectActions.fetchError({ error, message: 'Failed to get certificate chain' }),
                    ),
                ),
            ),
        ),
    );
};

const downloadCertificateChain: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.downloadCertificateChain.match),
        switchMap((action) =>
            deps.apiClients.certificates.downloadCertificateChain(action.payload).pipe(
                map((response) => slice.actions.downloadCertificateChainSuccess({ certificateChainDownloadContent: response })),

                catchError((error) =>
                    of(
                        slice.actions.downloadCertificateChainFailure({
                            error: extractError(error, 'Failed to download certificate chain'),
                        }),
                        appRedirectActions.fetchError({ error, message: 'Failed to download certificate chain' }),
                    ),
                ),
            ),
        ),
    );
};

const downloadCertificate: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.downloadCertificate.match),
        switchMap((action) =>
            deps.apiClients.certificates.downloadCertificate(action.payload).pipe(
                map((response) => slice.actions.downloadCertificateSuccess({ certificateDownloadContent: response })),

                catchError((error) =>
                    of(
                        slice.actions.downloadCertificateFailure({
                            error: extractError(error, 'Failed to download certificate'),
                        }),
                        appRedirectActions.fetchError({ error, message: 'Failed to download certificate' }),
                    ),
                ),
            ),
        ),
    );
};

const archiveCertificate: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.archiveCertificate.match),
        switchMap((action) =>
            deps.apiClients.certificates.archiveCertificate(action.payload).pipe(
                mergeMap(() => {
                    return of(
                        slice.actions.archiveCertificateSuccess(action.payload),
                        alertActions.success('Archive operation for selected certificate completed.'),
                    );
                }),
                catchError((error) =>
                    of(
                        slice.actions.archiveCertificateFailure({ error: extractError(error, 'Failed to archive certificate') }),
                        appRedirectActions.fetchError({ error, message: 'Failed to archive certificate' }),
                    ),
                ),
            ),
        ),
    );
};

const unarchiveCertificate: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.unarchiveCertificate.match),
        switchMap((action) =>
            deps.apiClients.certificates.unarchiveCertificate(action.payload).pipe(
                mergeMap(() => {
                    return of(
                        slice.actions.unarchiveCertificateSuccess(action.payload),
                        alertActions.success('Unarchive operation for selected certificate completed.'),
                    );
                }),
                catchError((error) =>
                    of(
                        slice.actions.unarchiveCertificateFailure({ error: extractError(error, 'Failed to unarchive certificate') }),
                        appRedirectActions.fetchError({ error, message: 'Failed to unarchive certificate' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkArchiveCertificates: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkArchiveCertificate.match),
        switchMap((action) =>
            deps.apiClients.certificates.bulkArchiveCertificate({ requestBody: action.payload.uuids }).pipe(
                mergeMap(() => {
                    const currentState = state$.value;
                    return of(
                        slice.actions.bulkArchiveCertificateSuccess(action.payload),
                        alertActions.success('Archive operation for selected certificates completed.'),
                        slice.actions.listCertificates({
                            includeArchived: currentState.certificates.isIncludeArchived,
                            ...action.payload.filters,
                        }),
                    );
                }),
                catchError((error) =>
                    of(
                        slice.actions.bulkArchiveCertificateFailure({ error: extractError(error, 'Failed to bulk archive certificates') }),
                        appRedirectActions.fetchError({ error, message: 'Failed to bulk archive certificates' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkUnarchiveCertificates: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkUnarchiveCertificate.match),
        switchMap((action) =>
            deps.apiClients.certificates.bulkUnarchiveCertificate({ requestBody: action.payload.uuids }).pipe(
                mergeMap(() => {
                    const currentState = state$.value;
                    return of(
                        slice.actions.bulkUnarchiveCertificateSuccess(action.payload),
                        alertActions.success('Unarchive operation for selected certificates completed.'),
                        slice.actions.listCertificates({
                            includeArchived: currentState.certificates.isIncludeArchived,
                            ...action.payload.filters,
                        }),
                    );
                }),
                catchError((error) =>
                    of(
                        slice.actions.bulkUnarchiveCertificateFailure({
                            error: extractError(error, 'Failed to bulk unarchive certificates'),
                        }),
                        appRedirectActions.fetchError({ error, message: 'Failed to bulk unarchive certificates' }),
                    ),
                ),
            ),
        ),
    );
};

const epics = [
    listCertificates,
    getCertificateDetail,
    getCertificateRelations,
    associateCertificate,
    deassociateCertificate,
    handleAssociateCertificateSuccess,
    handleDeassociateCertificateSuccess,
    getCertificateValidationResult,
    issueCertificate,
    issueCertificateNew,
    revokeCertificate,
    renewCertificate,
    rekeyCertificate,
    manuallyIssueCertificate,
    manuallyConfirmRevoke,
    cancelPendingCertificateOperation,
    getCertificateHistory,
    listCertificateLocations,
    deleteCertificate,
    updateGroup,
    deleteGroups,
    bulkDeleteGroup,
    updateRaProfile,
    deleteRaProfile,
    bulkDeleteRaProfile,
    updateCertificateTrustedStatus,
    updateOwner,
    bulkDeleteOwner,
    deleteOwner,
    bulkUpdateGroup,
    bulkUpdateRaProfile,
    bulkUpdateOwner,
    bulkDelete,
    uploadCertificate,
    getIssuanceAttributes,
    getRevocationAttributes,
    checkCompliance,
    getCsrAttributes,
    getCertificateContent,
    listCertificateApprovals,
    getCertificateChain,
    downloadCertificateChain,
    downloadCertificate,
    archiveCertificate,
    unarchiveCertificate,
    bulkArchiveCertificates,
    bulkUnarchiveCertificates,
];

export default epics;
