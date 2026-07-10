import type { AppEpic } from 'ducks';
import { iif, of } from 'rxjs';
import { catchError, filter, map, mergeMap, switchMap } from 'rxjs/operators';
import { extractError } from 'utils/net';
import { actions as alertActions } from './alerts';
import { actions as appRedirectActions } from './app-redirect';
import { slice } from './ra-profiles';
import { transformAttributeDescriptorDtoToModel } from './transform/attributes';
import { actions as userInterfaceActions } from './user-interface';

import { LockWidgetNameEnum } from 'types/user-interface';
import { transformProfileApprovalDtoToModel } from './transform/approval-profiles';
import {
    transformRaProfileAcmeDetailResponseDtoToModel,
    transformRaProfileActivateAcmeRequestModelToDto,
    transformRaProfileActivateCmpRequestModelToDto,
    transformRaProfileActivateScepRequestModelToDto,
    transformRaProfileAddRequestModelToDto,
    transformRaProfileCertificateValidationSettingsUpdateModelToDto,
    transformRaProfileCmpDetailResponseDtoToModel,
    transformRaProfileEditRequestModelToDto,
    transformRaProfileResponseDtoToModel,
    transformRaProfileScepDetailResponseDtoToModel,
} from './transform/ra-profiles';
import { Resource } from 'types/openapi';

const listRaProfiles: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listRaProfiles.match),
        switchMap(() =>
            deps.apiClients.raProfiles.listRaProfiles({}).pipe(
                switchMap((list) =>
                    of(
                        slice.actions.listRaProfilesSuccess({
                            raProfiles: list.map(transformRaProfileResponseDtoToModel),
                        }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfRAProfiles),
                    ),
                ),

                catchError((error) =>
                    of(
                        slice.actions.listRaProfilesFailure({ error: extractError(error, 'Failed to get RA profiles list') }),
                        userInterfaceActions.insertWidgetLock(error, LockWidgetNameEnum.ListOfRAProfiles),
                    ),
                ),
            ),
        ),
    );
};

const getRaProfileDetail: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getRaProfileDetail.match),
        switchMap((action) =>
            deps.apiClients.raProfiles
                .getRaProfile({ authorityUuid: action.payload.authorityUuid, raProfileUuid: action.payload.uuid })
                .pipe(
                    switchMap((profileDto) =>
                        of(
                            slice.actions.getRaProfileDetailSuccess({
                                raProfile: transformRaProfileResponseDtoToModel(profileDto),
                            }),
                            userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.RaProfileDetails),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.getRaProfileDetailFailure({ error: extractError(err, 'Failed to get RA Profile detail') }),
                            userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.RaProfileDetails),
                        ),
                    ),
                ),
        ),
    );
};

const createRaProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.createRaProfile.match),

        switchMap((action) =>
            deps.apiClients.raProfiles
                .createRaProfile({
                    authorityUuid: action.payload.authorityInstanceUuid,
                    addRaProfileRequestDto: transformRaProfileAddRequestModelToDto(action.payload.raProfileAddRequest),
                })
                .pipe(
                    mergeMap((obj) =>
                        of(
                            slice.actions.createRaProfileSuccess({
                                uuid: obj.uuid,
                                authorityInstanceUuid: action.payload.authorityInstanceUuid,
                            }),
                            appRedirectActions.redirect({
                                url: `../raprofiles/detail/${action.payload.authorityInstanceUuid}/${obj.uuid}`,
                            }),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.createRaProfileFailure({ error: extractError(err, 'Failed to create profile') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to create profile' }),
                        ),
                    ),
                ),
        ),
    );
};

const updateRaProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.updateRaProfile.match),
        switchMap((action) =>
            deps.apiClients.raProfiles
                .editRaProfile({
                    raProfileUuid: action.payload.profileUuid,
                    authorityUuid: action.payload.authorityInstanceUuid,
                    editRaProfileRequestDto: transformRaProfileEditRequestModelToDto(action.payload.raProfileEditRequest),
                })
                .pipe(
                    mergeMap((raProfileDto) =>
                        iif(
                            () => !!action.payload.redirect,
                            of(
                                slice.actions.updateRaProfileSuccess({
                                    raProfile: transformRaProfileResponseDtoToModel(raProfileDto),
                                    redirect: action.payload.redirect,
                                }),

                                appRedirectActions.redirect({ url: action.payload.redirect! }),
                            ),
                            of(
                                slice.actions.updateRaProfileSuccess({
                                    raProfile: transformRaProfileResponseDtoToModel(raProfileDto),
                                    redirect: action.payload.redirect,
                                }),
                            ),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            (slice.actions.updateRaProfileFailure({ error: extractError(err, 'Failed to update profile') }),
                            alertActions.error(extractError(err, 'Failed to update profile'))),
                        ),
                    ),
                ),
        ),
    );
};

const updateRaProfileCertificateValidation: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.updateRaProfileCertificateValidation.match),
        switchMap((action) =>
            deps.apiClients.raProfiles
                .updateRaProfileValidationConfiguration({
                    raProfileUuid: action.payload.profileUuid,
                    authorityUuid: action.payload.authorityInstanceUuid,
                    raProfileCertificateValidationSettingsUpdateDto: transformRaProfileCertificateValidationSettingsUpdateModelToDto(
                        action.payload.validation,
                    ),
                })
                .pipe(
                    mergeMap((raProfileDto) =>
                        of(
                            slice.actions.updateRaProfileCertificateValidationSuccess({
                                raProfile: transformRaProfileResponseDtoToModel(raProfileDto),
                            }),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            (slice.actions.updateRaProfileCertificateValidationFailure({
                                error: extractError(err, 'Failed to update profile validation settings'),
                            }),
                            alertActions.error(extractError(err, 'Failed to update profile validation settings'))),
                        ),
                    ),
                ),
        ),
    );
};

const updateRaProfileRequestAttributes: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.updateRaProfileRequestAttributes.match),
        switchMap((action) =>
            deps.apiClients.raProfiles
                .updateRaProfileRequestAttributesConfiguration({
                    raProfileUuid: action.payload.profileUuid,
                    authorityUuid: action.payload.authorityInstanceUuid,
                    raProfileCertificateRequestAttributesUpdateDto: action.payload.requestAttributes,
                })
                .pipe(
                    mergeMap((raProfileDto) =>
                        of(
                            slice.actions.updateRaProfileRequestAttributesSuccess({
                                raProfile: transformRaProfileResponseDtoToModel(raProfileDto),
                            }),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.updateRaProfileRequestAttributesFailure({
                                error: extractError(err, 'Failed to update request validation settings'),
                            }),
                            alertActions.error(extractError(err, 'Failed to update request validation settings')),
                        ),
                    ),
                ),
        ),
    );
};

const enableRaProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.enableRaProfile.match),

        switchMap((action) =>
            deps.apiClients.raProfiles
                .enableRaProfile({ authorityUuid: action.payload.authorityUuid, raProfileUuid: action.payload.uuid })
                .pipe(
                    map(() => slice.actions.enableRaProfileSuccess({ uuid: action.payload.uuid })),

                    catchError((err) =>
                        of(
                            slice.actions.enableRaProfileFailure({ error: extractError(err, 'Failed to enable profile') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to enable profile' }),
                        ),
                    ),
                ),
        ),
    );
};

const disableRaProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.disableRaProfile.match),

        switchMap((action) =>
            deps.apiClients.raProfiles
                .disableRaProfile({ authorityUuid: action.payload.authorityUuid, raProfileUuid: action.payload.uuid })
                .pipe(
                    map(() => slice.actions.disableRaProfileSuccess({ uuid: action.payload.uuid })),

                    catchError((err) =>
                        of(
                            slice.actions.enableRaProfileFailure({ error: extractError(err, 'Failed to disable profile') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to disable profile' }),
                        ),
                    ),
                ),
        ),
    );
};

const deleteRaProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.deleteRaProfile.match),
        switchMap((action) =>
            deps.apiClients.raProfiles
                .deleteRaProfile({ authorityUuid: action.payload.authorityUuid, raProfileUuid: action.payload.uuid })
                .pipe(
                    mergeMap(() =>
                        iif(
                            () => !!action.payload.redirect,
                            of(
                                slice.actions.deleteRaProfileSuccess({ uuid: action.payload.uuid }),
                                appRedirectActions.redirect({ url: action.payload.redirect! }),
                            ),
                            of(slice.actions.deleteRaProfileSuccess({ uuid: action.payload.uuid })),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.deleteRaProfileFailure({ error: extractError(err, 'Failed to delete profile') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to delete profile' }),
                        ),
                    ),
                ),
        ),
    );
};

const activateAcme: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.activateAcme.match),
        switchMap((action) =>
            deps.apiClients.raProfiles
                .activateAcmeForRaProfile({
                    authorityUuid: action.payload.authorityUuid,
                    raProfileUuid: action.payload.uuid,
                    acmeProfileUuid: action.payload.acmeProfileUuid,
                    activateAcmeForRaProfileRequestDto: transformRaProfileActivateAcmeRequestModelToDto(
                        action.payload.raProfileActivateAcmeRequest,
                    ),
                })
                .pipe(
                    map((raProfileAcmeDetailResponse) =>
                        slice.actions.activateAcmeSuccess({
                            raProfileAcmeDetailResponse: transformRaProfileAcmeDetailResponseDtoToModel(raProfileAcmeDetailResponse),
                        }),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.activateAcmeFailure({ error: extractError(err, 'Failed to activate ACME') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to activate ACME' }),
                        ),
                    ),
                ),
        ),
    );
};

const deactivateAcme: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.deactivateAcme.match),
        switchMap((action) =>
            deps.apiClients.raProfiles
                .deactivateAcmeForRaProfile({ authorityUuid: action.payload.authorityUuid, raProfileUuid: action.payload.uuid })
                .pipe(
                    map(() => slice.actions.deactivateAcmeSuccess({ uuid: action.payload.uuid })),

                    catchError((err) =>
                        of(
                            slice.actions.deactivateAcmeFailure({ error: extractError(err, 'Failed to deactivate ACME') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to deactivate ACME' }),
                        ),
                    ),
                ),
        ),
    );
};

const getAcmeDetails: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getAcmeDetails.match),
        switchMap((action) =>
            deps.apiClients.raProfiles
                .getAcmeForRaProfile({ authorityUuid: action.payload.authorityUuid, raProfileUuid: action.payload.uuid })
                .pipe(
                    map((acmeDetails) =>
                        slice.actions.getAcmeDetailsSuccess({
                            raAcmeLink: transformRaProfileAcmeDetailResponseDtoToModel(acmeDetails),
                        }),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.getAcmeDetailsFailure({ error: extractError(err, 'Failed to get ACME details') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to get ACME details' }),
                        ),
                    ),
                ),
        ),
    );
};

const activateCmp: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.activateCmp.match),
        switchMap((action) =>
            deps.apiClients.raProfiles
                .activateCmpForRaProfile({
                    authorityUuid: action.payload.authorityUuid,
                    raProfileUuid: action.payload.uuid,
                    cmpProfileUuid: action.payload.cmpProfileUuid,
                    activateCmpForRaProfileRequestDto: transformRaProfileActivateCmpRequestModelToDto(
                        action.payload.raProfileActivateCmpRequest,
                    ),
                })
                .pipe(
                    map((raProfileCmpDetailResponse) =>
                        slice.actions.activateCmpSuccess({
                            raProfileCmpDetailResponse: transformRaProfileCmpDetailResponseDtoToModel(raProfileCmpDetailResponse),
                        }),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.activateCmpFailure({ error: extractError(err, 'Failed to activate CMP') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to activate CMP' }),
                        ),
                    ),
                ),
        ),
    );
};

const deactivateCmp: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.deactivateCmp.match),
        switchMap((action) =>
            deps.apiClients.raProfiles
                .deactivateCmpForRaProfile({ authorityUuid: action.payload.authorityUuid, raProfileUuid: action.payload.uuid })
                .pipe(
                    map(() => slice.actions.deactivateCmpSuccess({ uuid: action.payload.uuid })),

                    catchError((err) =>
                        of(
                            slice.actions.deactivateCmpFailure({ error: extractError(err, 'Failed to deactivate CMP') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to deactivate CMP' }),
                        ),
                    ),
                ),
        ),
    );
};

const getCmpDetails: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getCmpDetails.match),
        switchMap((action) =>
            deps.apiClients.raProfiles
                .getCmpForRaProfile({ authorityUuid: action.payload.authorityUuid, raProfileUuid: action.payload.uuid })
                .pipe(
                    map((cmpDetails) =>
                        slice.actions.getCmpDetailsSuccess({
                            raCmpLink: transformRaProfileCmpDetailResponseDtoToModel(cmpDetails),
                        }),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.getCmpDetailsFailure({ error: extractError(err, 'Failed to get CMP details') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to get CMP details' }),
                        ),
                    ),
                ),
        ),
    );
};

const activateScep: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.activateScep.match),
        switchMap((action) =>
            deps.apiClients.raProfiles
                .activateScepForRaProfile({
                    authorityUuid: action.payload.authorityUuid,
                    raProfileUuid: action.payload.uuid,
                    scepProfileUuid: action.payload.scepProfileUuid,
                    activateScepForRaProfileRequestDto: transformRaProfileActivateScepRequestModelToDto(
                        action.payload.raProfileActivateScepRequest,
                    ),
                })
                .pipe(
                    map((raProfileScepDetailResponse) =>
                        slice.actions.activateScepSuccess({
                            raProfileScepDetailResponse: transformRaProfileScepDetailResponseDtoToModel(raProfileScepDetailResponse),
                        }),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.activateScepFailure({ error: extractError(err, 'Failed to activate SCEP') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to activate SCEP' }),
                        ),
                    ),
                ),
        ),
    );
};

const deactivateScep: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.deactivateScep.match),
        switchMap((action) =>
            deps.apiClients.raProfiles
                .deactivateScepForRaProfile({ authorityUuid: action.payload.authorityUuid, raProfileUuid: action.payload.uuid })
                .pipe(
                    map(() => slice.actions.deactivateScepSuccess({ uuid: action.payload.uuid })),

                    catchError((err) =>
                        of(
                            slice.actions.deactivateScepFailure({ error: extractError(err, 'Failed to deactivate SCEP') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to deactivate SCEP' }),
                        ),
                    ),
                ),
        ),
    );
};

const getScepDetails: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getScepDetails.match),
        switchMap((action) =>
            deps.apiClients.raProfiles
                .getScepForRaProfile({ authorityUuid: action.payload.authorityUuid, raProfileUuid: action.payload.uuid })
                .pipe(
                    map((scepDetails) =>
                        slice.actions.getScepDetailsSuccess({
                            raScepLink: transformRaProfileScepDetailResponseDtoToModel(scepDetails),
                        }),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.getScepDetailsFailure({ error: extractError(err, 'Failed to get SCEP details') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to get SCEP details' }),
                        ),
                    ),
                ),
        ),
    );
};

const listIssuanceAttributeDescriptors: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listIssuanceAttributeDescriptors.match),
        switchMap((action) =>
            deps.apiClients.raProfiles
                .listRaProfileIssueCertificateAttributes({
                    authorityUuid: action.payload.authorityUuid,
                    raProfileUuid: action.payload.uuid,
                })
                .pipe(
                    map((issuanceAttributes) =>
                        slice.actions.listIssuanceAttributesDescriptorsSuccess({
                            uuid: action.payload.uuid,
                            attributesDescriptors: issuanceAttributes.map(transformAttributeDescriptorDtoToModel),
                        }),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.listIssuanceAttributesFailure({ error: extractError(err, 'Failed to list issue attributes') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to list issue attributes' }),
                        ),
                    ),
                ),
        ),
    );
};

const listRevocationAttributeDescriptors: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listRevocationAttributeDescriptors.match),

        switchMap((action) =>
            deps.apiClients.raProfiles
                .listRaProfileRevokeCertificateAttributes({
                    authorityUuid: action.payload.authorityUuid,
                    raProfileUuid: action.payload.uuid,
                })
                .pipe(
                    map((revocationAttributes) =>
                        slice.actions.listRevocationAttributeDescriptorsSuccess({
                            uuid: action.payload.uuid,
                            attributesDescriptors: revocationAttributes.map(transformAttributeDescriptorDtoToModel),
                        }),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.listRevocationAttributeDescriptorsFailure({
                                error: extractError(err, 'Failed to list revocation attributes'),
                            }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to list revocation attributes' }),
                        ),
                    ),
                ),
        ),
    );
};

const bulkEnableProfiles: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkEnableRaProfiles.match),
        switchMap((action) =>
            deps.apiClients.raProfiles.bulkEnableRaProfile({ requestBody: action.payload.uuids }).pipe(
                map(() => slice.actions.bulkEnableRaProfilesSuccess({ uuids: action.payload.uuids })),

                catchError((err) =>
                    of(
                        slice.actions.bulkEnableRaProfilesFailure({ error: extractError(err, 'Failed to enable profiles') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to enable profiles' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkDisableProfiles: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkDisableRaProfiles.match),

        switchMap((action) =>
            deps.apiClients.raProfiles.bulkDisableRaProfile({ requestBody: action.payload.uuids }).pipe(
                map(() => slice.actions.bulkDisableRaProfilesSuccess({ uuids: action.payload.uuids })),

                catchError((err) =>
                    of(
                        slice.actions.bulkDisableRaProfilesFailure({ error: extractError(err, 'Failed to disable profiles') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to disable profiles' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkDeleteProfiles: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkDeleteRaProfiles.match),
        switchMap((action) =>
            deps.apiClients.raProfiles.bulkDeleteRaProfile({ requestBody: action.payload.uuids }).pipe(
                mergeMap(() =>
                    of(
                        slice.actions.bulkDeleteRaProfilesSuccess({ uuids: action.payload.uuids }),
                        alertActions.success('Selected RA profiles successfully deleted.'),
                    ),
                ),

                catchError((err) =>
                    of(
                        slice.actions.bulkDeleteRaProfilesFailure({ error: extractError(err, 'Failed to delete profiles') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to delete profiles' }),
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
            deps.apiClients.complianceManagement
                .checkResourceObjectsComplianceV2({ resource: Resource.RaProfiles, requestBody: action.payload.uuids })
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

const getAssociatedApprovalProfiles: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getAssociatedApprovalProfiles.match),
        switchMap((action) =>
            deps.apiClients.raProfiles.getAssociatedApprovalProfiles({ ...action.payload }).pipe(
                switchMap((approvalProfiles) =>
                    of(
                        slice.actions.getAssociatedApprovalProfilesSuccess({
                            associatedApprovalProfiles: approvalProfiles.map(transformProfileApprovalDtoToModel),
                        }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfApprovalProfiles),
                    ),
                ),

                catchError((err) =>
                    of(
                        slice.actions.getAssociatedApprovalProfilesFailure({
                            error: extractError(err, 'Failed to get associated Approval Profiles'),
                        }),
                        userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.ListOfApprovalProfiles),
                    ),
                ),
            ),
        ),
    );
};

const associateRAProfileWithApprovalProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.associateRAProfileWithApprovalProfile.match),
        switchMap((action) =>
            deps.apiClients.raProfiles
                .associateRAProfileWithApprovalProfile({
                    ...action.payload,
                })
                .pipe(
                    switchMap(() =>
                        of(
                            slice.actions.associateRAProfileWithApprovalProfileSuccess({
                                ...action.payload,
                            }),
                            slice.actions.getAssociatedApprovalProfiles({
                                ...action.payload,
                            }),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.associateRAProfileWithApprovalProfileFailure({
                                error: extractError(err, 'Failed to associate RA Profile with Approval Profile'),
                            }),
                            appRedirectActions.fetchError({
                                error: err,
                                message: 'Failed to associate RA Profile with Approval Profile',
                            }),
                        ),
                    ),
                ),
        ),
    );
};

const disassociateRAProfileFromApprovalProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.disassociateRAProfileFromApprovalProfile.match),
        switchMap((action) =>
            deps.apiClients.raProfiles
                .disassociateRAProfileFromApprovalProfile({
                    ...action.payload,
                })
                .pipe(
                    switchMap(() => of(slice.actions.disassociateRAProfileFromApprovalProfileSuccess({ ...action.payload }))),

                    catchError((err) =>
                        of(
                            slice.actions.disassociateRAProfileFromApprovalProfileFailure({
                                error: extractError(err, 'Failed to disassociate RA Profile from Approval Profile'),
                            }),
                            appRedirectActions.fetchError({
                                error: err,
                                message: 'Failed to disassociate RA Profile from Approval Profile',
                            }),
                        ),
                    ),
                ),
        ),
    );
};

const getRaProfileWithoutAuthority: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getRaProfileWithoutAuthority.match),
        switchMap((action) =>
            deps.apiClients.raProfiles.getRaProfileWithoutAuthority({ raProfileUuid: action.payload.uuid }).pipe(
                switchMap((raProfile) =>
                    of(
                        slice.actions.getRaProfileWithoutAuthoritySuccess({ raProfile: transformRaProfileResponseDtoToModel(raProfile) }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.RaProfileDetails),
                    ),
                ),

                catchError((err) =>
                    of(
                        slice.actions.getRaProfileWithoutAuthorityFailure({
                            error: extractError(err, 'Failed to get RA Profile without authority'),
                        }),
                        userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.RaProfileDetails),
                    ),
                ),
            ),
        ),
    );
};

const deleteRaProfileWithoutAuthority: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.deleteRaProfileWithoutAuthority.match),
        switchMap((action) =>
            deps.apiClients.raProfiles.deleteRaProfileWithoutAuthority({ raProfileUuid: action.payload.uuid }).pipe(
                mergeMap(() =>
                    iif(
                        () => !!action.payload.redirect,
                        of(
                            slice.actions.deleteRaProfileWithoutAuthoritySuccess({ uuid: action.payload.uuid }),
                            appRedirectActions.redirect({ url: action.payload.redirect! }),
                        ),
                        of(slice.actions.deleteRaProfileWithoutAuthoritySuccess({ uuid: action.payload.uuid })),
                    ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.deleteRaProfileWithoutAuthorityFailure({
                            error: extractError(err, 'Failed to delete RA Profile without authority'),
                        }),
                    ),
                ),
            ),
        ),
    );
};

const epics = [
    listRaProfiles,
    getRaProfileDetail,
    createRaProfile,
    updateRaProfile,
    updateRaProfileCertificateValidation,
    updateRaProfileRequestAttributes,
    enableRaProfile,
    disableRaProfile,
    deleteRaProfile,
    activateCmp,
    deactivateCmp,
    getCmpDetails,
    activateAcme,
    deactivateAcme,
    getAcmeDetails,
    activateScep,
    deactivateScep,
    getScepDetails,
    listIssuanceAttributeDescriptors,
    listRevocationAttributeDescriptors,
    bulkEnableProfiles,
    bulkDisableProfiles,
    bulkDeleteProfiles,
    checkCompliance,
    getAssociatedApprovalProfiles,
    associateRAProfileWithApprovalProfile,
    disassociateRAProfileFromApprovalProfile,
    getRaProfileWithoutAuthority,
    deleteRaProfileWithoutAuthority,
];

export default epics;
