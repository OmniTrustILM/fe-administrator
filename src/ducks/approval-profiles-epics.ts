import type { AppEpic } from 'ducks';
import { of } from 'rxjs';
import { catchError, filter, switchMap } from 'rxjs/operators';
import { actions as appRedirectActions } from './app-redirect';
import { actions as userInterfaceActions } from './user-interface';

import { LockWidgetNameEnum } from 'types/user-interface';
import { extractError } from 'utils/net';
import { slice } from './approval-profiles';
import {
    transformProfileApprovalDetailDtoToModel,
    transformProfileApprovalDtoToModel,
    transformProfileApprovalRequestDtoToModel,
    transformProfileApprovalUpdateRequestDtoToModel,
} from './transform/approval-profiles';

const getApprovalProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getApprovalProfile.match),

        switchMap((action) =>
            deps.apiClients.approvalProfiles
                .getApprovalProfile({
                    uuid: action.payload.uuid,
                    ...(action.payload.version ? { version: action.payload.version } : {}),
                })
                .pipe(
                    switchMap((response) =>
                        of(
                            slice.actions.getApprovalProfileSuccess(transformProfileApprovalDetailDtoToModel(response)),
                            userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ApprovalProfileDetails),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.getApprovalProfileFailure({ error: extractError(err, 'Failed to get Approval Profile details') }),
                            userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.ApprovalProfileDetails),
                        ),
                    ),
                ),
        ),
    );
};

const createApprovalProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.createApprovalProfile.match),

        switchMap((action) =>
            deps.apiClients.approvalProfiles
                .createApprovalProfile({ approvalProfileRequestDto: transformProfileApprovalRequestDtoToModel(action.payload) })
                .pipe(
                    switchMap((response) =>
                        of(
                            slice.actions.createApprovalProfileSuccess(response),
                            appRedirectActions.redirect({ url: `/approvalprofiles/detail/${response.uuid}` }),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            appRedirectActions.fetchError({ error: err, message: 'Failed to create approvalprofile' }),
                            slice.actions.createApprovalProfileFailure({ error: extractError(err, 'Failed to create Approval Profile') }),
                        ),
                    ),
                ),
        ),
    );
};

const listApprovalProfiles: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listApprovalProfiles.match),

        switchMap((action) =>
            deps.apiClients.approvalProfiles
                .listApprovalProfiles({ itemsPerPage: action.payload?.itemsPerPage, pageNumber: action.payload?.pageNumber })
                .pipe(
                    switchMap((response) =>
                        of(
                            slice.actions.listApprovalProfilesSuccess(response),
                            userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfApprovalProfiles),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.ListOfApprovalProfiles),
                            slice.actions.listApprovalProfilesFailure({ error: extractError(err, 'Failed to get Approval Profiles list') }),
                        ),
                    ),
                ),
        ),
    );
};

const deleteApprovalProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.deleteApprovalProfile.match),

        switchMap((action) =>
            deps.apiClients.approvalProfiles.deleteApprovalProfile({ uuid: action.payload.uuid }).pipe(
                switchMap(() =>
                    of(
                        slice.actions.deleteApprovalProfileSuccess({ uuid: action.payload.uuid }),
                        appRedirectActions.redirect({ url: `/approvalprofiles` }),
                    ),
                ),
                catchError((err) =>
                    of(
                        appRedirectActions.fetchError({ error: err, message: 'Failed to delete approval profile' }),
                        slice.actions.deleteApprovalProfileFailure({ error: extractError(err, 'Failed to delete Approval Profile') }),
                    ),
                ),
            ),
        ),
    );
};

const editApprovalProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.editApprovalProfile.match),

        switchMap((action) =>
            deps.apiClients.approvalProfiles
                .editApprovalProfile({
                    uuid: action.payload.uuid,
                    approvalProfileUpdateRequestDto: transformProfileApprovalUpdateRequestDtoToModel(action.payload.editProfileApproval),
                })
                .pipe(
                    switchMap(() =>
                        of(
                            slice.actions.editApprovalProfileSuccess({ uuid: action.payload.uuid }),
                            appRedirectActions.redirect({ url: `/approvalprofiles/detail/${action.payload.uuid}` }),
                        ),
                    ),
                    catchError((err) =>
                        of(
                            appRedirectActions.fetchError({ error: err, message: 'Failed to update approval profile' }),
                            slice.actions.editApprovalProfile(err),
                        ),
                    ),
                ),
        ),
    );
};

const getAssociatedApprovalProfilesForResource: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getAssociatedApprovalProfilesForResource.match),
        switchMap((action) =>
            deps.apiClients.approvalProfiles
                .getAssociatedApprovalProfiles1({
                    resource: action.payload.resource,
                    associationObjectUuid: action.payload.associationObjectUuid,
                })
                .pipe(
                    switchMap((approvalProfiles) =>
                        of(
                            slice.actions.getAssociatedApprovalProfilesForResourceSuccess({
                                approvalProfiles: approvalProfiles.map(transformProfileApprovalDtoToModel),
                            }),
                            userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfApprovalProfiles),
                        ),
                    ),
                    catchError((err) =>
                        of(
                            userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.ListOfApprovalProfiles),
                            slice.actions.getAssociatedApprovalProfilesForResourceFailure({
                                error: extractError(err, 'Failed to get associated Approval Profiles'),
                            }),
                        ),
                    ),
                ),
        ),
    );
};

const associateApprovalProfileToResource: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.associateApprovalProfileToResource.match),
        switchMap((action) =>
            deps.apiClients.approvalProfiles
                .associateApprovalProfile({
                    uuid: action.payload.uuid,
                    resource: action.payload.resource,
                    associationObjectUuid: action.payload.associationObjectUuid,
                })
                .pipe(
                    switchMap(() =>
                        of(
                            slice.actions.associateApprovalProfileToResourceSuccess(action.payload),
                            slice.actions.getAssociatedApprovalProfilesForResource({
                                resource: action.payload.resource,
                                associationObjectUuid: action.payload.associationObjectUuid,
                            }),
                        ),
                    ),
                    catchError((err) =>
                        of(
                            appRedirectActions.fetchError({ error: err, message: 'Failed to associate Approval Profile' }),
                            slice.actions.associateApprovalProfileToResourceFailure({
                                error: extractError(err, 'Failed to associate Approval Profile'),
                            }),
                        ),
                    ),
                ),
        ),
    );
};

const dissociateApprovalProfileFromResource: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.dissociateApprovalProfileFromResource.match),
        switchMap((action) =>
            deps.apiClients.approvalProfiles
                .disassociateApprovalProfile({
                    uuid: action.payload.uuid,
                    resource: action.payload.resource,
                    associationObjectUuid: action.payload.associationObjectUuid,
                })
                .pipe(
                    switchMap(() =>
                        of(
                            slice.actions.dissociateApprovalProfileFromResourceSuccess(action.payload),
                            slice.actions.getAssociatedApprovalProfilesForResource({
                                resource: action.payload.resource,
                                associationObjectUuid: action.payload.associationObjectUuid,
                            }),
                        ),
                    ),
                    catchError((err) =>
                        of(
                            appRedirectActions.fetchError({ error: err, message: 'Failed to disassociate Approval Profile' }),
                            slice.actions.dissociateApprovalProfileFromResourceFailure({
                                error: extractError(err, 'Failed to disassociate Approval Profile'),
                            }),
                        ),
                    ),
                ),
        ),
    );
};

const epics = [
    getApprovalProfile,
    createApprovalProfile,
    listApprovalProfiles,
    deleteApprovalProfile,
    editApprovalProfile,
    getAssociatedApprovalProfilesForResource,
    associateApprovalProfileToResource,
    dissociateApprovalProfileFromResource,
];

export default epics;
