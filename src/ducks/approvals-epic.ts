import type { AppEpic } from 'ducks';
import { of } from 'rxjs';
import { catchError, filter, switchMap } from 'rxjs/operators';
import { actions as appRedirectActions } from './app-redirect';
import { actions as userInterfaceActions } from './user-interface';

import { LockWidgetNameEnum } from 'types/user-interface';
import { extractError } from 'utils/net';
import { slice } from './approvals';
import { transformDetailApprovalDtoToModel } from './transform/approvals';

const getApproval: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getApproval.match),

        switchMap((action) =>
            deps.apiClients.approvals.getApproval({ uuid: action.payload.uuid }).pipe(
                switchMap((response) => of(slice.actions.getApprovalSuccess(transformDetailApprovalDtoToModel(response)))),

                catchError((err) =>
                    of(
                        slice.actions.getApprovalFailure({ error: extractError(err, 'Failed to get Approval details') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to get approval detail' }),
                    ),
                ),
            ),
        ),
    );
};

const listApprovals: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listApprovals.match),

        switchMap((action) =>
            deps.apiClients.approvals
                .listApprovals({
                    itemsPerPage: action.payload.itemsPerPage,
                    pageNumber: action.payload.pageNumber,
                })
                .pipe(
                    switchMap((response) =>
                        of(
                            slice.actions.listApprovalsSuccess(response),
                            userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfApprovals),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.listApprovalsFailure({ error: extractError(err, 'Failed to list Approvals') }),
                            userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.ListOfApprovals),
                        ),
                    ),
                ),
        ),
    );
};

const listUserApprovals: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listUserApprovals.match),

        switchMap((action) =>
            deps.apiClients.approvals
                .listUserApprovals({
                    itemsPerPage: action.payload.itemsPerPage,
                    pageNumber: action.payload.pageNumber,
                    // history: {},
                })
                .pipe(
                    switchMap((response) => of(slice.actions.listUserApprovalsSuccess(response))),

                    catchError((err) =>
                        of(
                            slice.actions.listUserApprovalsFailure({ error: extractError(err, 'Failed to list Approvals') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to list approvals' }),
                        ),
                    ),
                ),
        ),
    );
};

const approveApproval: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.approveApproval.match),

        switchMap((action) =>
            deps.apiClients.approvals.approveApproval({ uuid: action.payload.uuid }).pipe(
                switchMap(() => of(slice.actions.approveApprovalSuccess({ uuid: action.payload.uuid }))),

                catchError((err) =>
                    of(
                        slice.actions.approveApprovalsFailure({ error: extractError(err, 'Failed to approve Approval') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to approve approval' }),
                    ),
                ),
            ),
        ),
    );
};

export const approveApprovalRecipient: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.approveApprovalRecipient.match),

        switchMap((action) =>
            deps.apiClients.approvals
                .approveApprovalRecipient({
                    uuid: action.payload.uuid,
                    userApprovalDto: action.payload.userApproval,
                })
                .pipe(
                    switchMap(() =>
                        of(
                            slice.actions.approveApprovalRecipientSuccess({ uuid: action.payload.uuid }),
                            slice.actions.getApproval({ uuid: action.payload.uuid }),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.approveApprovalsFailure({ error: extractError(err, 'Failed to approve Approval recipient') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to approve approval recipient' }),
                        ),
                    ),
                ),
        ),
    );
};

const rejectApproval: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.rejectApproval.match),

        switchMap((action) =>
            deps.apiClients.approvals.rejectApproval({ uuid: action.payload.uuid }).pipe(
                switchMap(() => of(slice.actions.rejectApprovalSuccess({ uuid: action.payload.uuid }))),

                catchError((err) =>
                    of(
                        slice.actions.rejectApprovalFailure({ error: extractError(err, 'Failed to reject Approval') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to reject approval' }),
                    ),
                ),
            ),
        ),
    );
};

export const rejectApprovalRecipient: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.rejectApprovalRecipient.match),

        switchMap((action) =>
            deps.apiClients.approvals
                .rejectApprovalRecipient({
                    uuid: action.payload.uuid,
                    userApprovalDto: action.payload.userApproval,
                })
                .pipe(
                    switchMap(() =>
                        of(
                            slice.actions.rejectApprovalRecipientSuccess({ uuid: action.payload.uuid }),
                            slice.actions.getApproval({ uuid: action.payload.uuid }),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.rejectApprovalFailure({ error: extractError(err, 'Failed to reject Approval recipient') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to reject approval recipient' }),
                        ),
                    ),
                ),
        ),
    );
};

const epics = [
    getApproval,
    listApprovals,
    listUserApprovals,
    approveApproval,
    approveApprovalRecipient,
    rejectApproval,
    rejectApprovalRecipient,
];

export default epics;
