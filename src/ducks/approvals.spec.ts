import { describe, expect, test } from 'vitest';

import reducer, { actions, initialState, selectors } from './approvals';

describe('approvals slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('resetState restores initialState', () => {
        const dirty = { ...initialState, isFetchingList: true } as any;
        expect(reducer(dirty, actions.resetState())).toEqual(initialState);
    });

    test('getApproval / success / failure', () => {
        let next = reducer(initialState, actions.getApproval({ uuid: 'a1' }));
        expect(next.isFetchingDetail).toBe(true);
        expect(next.approvalDetails).toBeUndefined();

        next = reducer(next, actions.getApprovalSuccess({ approvalUuid: 'a1' } as any));
        expect(next.isFetchingDetail).toBe(false);
        expect(next.approvalDetails).toEqual({ approvalUuid: 'a1' });

        next = reducer({ ...next, isFetchingDetail: true }, actions.getApprovalFailure({ error: 'err' }));
        expect(next.approvalDetails).toBeUndefined();
    });

    test('listApprovals / success / failure', () => {
        let next = reducer(initialState, actions.listApprovals({ itemsPerPage: 10, pageNumber: 1 }));
        expect(next.isFetchingList).toBe(true);
        expect(next.approvals).toEqual([]);
        expect(next.approvalsTotalItems).toBe(0);

        next = reducer(next, actions.listApprovalsSuccess({ approvals: [{ approvalUuid: 'x' } as any], totalItems: 5 }));
        expect(next.isFetchingList).toBe(false);
        expect(next.approvals).toEqual([{ approvalUuid: 'x' }]);
        expect(next.approvalsTotalItems).toBe(5);

        next = reducer({ ...next, isFetchingList: true }, actions.listApprovalsFailure({ error: 'err' }));
        expect(next.isFetchingList).toBe(false);
        expect(next.approvals).toEqual([]);
    });

    test('listUserApprovals / success / failure', () => {
        let next = reducer(initialState, actions.listUserApprovals({ itemsPerPage: 10, pageNumber: 1 }));
        expect(next.isFetchingUserList).toBe(true);
        expect(next.userApprovals).toEqual([]);

        next = reducer(next, actions.listUserApprovalsSuccess({ approvals: [{ approvalUuid: 'u1' } as any], totalItems: 3 }));
        expect(next.isFetchingUserList).toBe(false);
        expect(next.userApprovals).toEqual([{ approvalUuid: 'u1' }]);
        expect(next.userApprovalsTotalItems).toBe(3);

        next = reducer({ ...next, isFetchingUserList: true }, actions.listUserApprovalsFailure({ error: 'err' }));
        expect(next.isFetchingUserList).toBe(false);
        expect(next.userApprovals).toEqual([]);
        expect(next.userApprovalsTotalItems).toBe(0);
    });

    test('approveApproval / success / failure', () => {
        const withApprovals = {
            ...initialState,
            approvals: [{ approvalUuid: 'a1', status: 'pending' } as any],
            userApprovals: [{ approvalUuid: 'a1', status: 'pending' } as any],
        };

        let next = reducer(withApprovals, actions.approveApproval({ uuid: 'a1' }));
        expect(next.isApproving).toBe(true);

        next = reducer(next, actions.approveApprovalSuccess({ uuid: 'a1' }));
        expect(next.isApproving).toBe(false);
        expect(next.approvals[0].status).toBe('APPROVED');
        expect(next.userApprovals[0].status).toBe('APPROVED');

        next = reducer({ ...next, isApproving: true }, actions.approveApprovalsFailure({ error: 'err' }));
        expect(next.isApproving).toBe(false);
    });

    test('rejectApproval / success / failure', () => {
        const withApprovals = {
            ...initialState,
            approvals: [{ approvalUuid: 'a1', status: 'pending' } as any],
            userApprovals: [{ approvalUuid: 'a1', status: 'pending' } as any],
        };

        let next = reducer(withApprovals, actions.rejectApproval({ uuid: 'a1' }));
        expect(next.isRejecting).toBe(true);

        next = reducer(next, actions.rejectApprovalSuccess({ uuid: 'a1' }));
        expect(next.isRejecting).toBe(false);
        expect(next.approvals[0].status).toBe('REJECTED');
        expect(next.userApprovals[0].status).toBe('REJECTED');

        next = reducer({ ...next, isRejecting: true }, actions.rejectApprovalFailure({ error: 'err' }));
        expect(next.isRejecting).toBe(false);
    });

    test('approveApprovalRecipient / success / failure', () => {
        const withData = {
            ...initialState,
            approvals: [{ approvalUuid: 'a1', status: 'pending' } as any],
            userApprovals: [{ approvalUuid: 'a1', status: 'pending' } as any],
            approvalDetails: { approvalUuid: 'a1', status: 'pending' } as any,
        };

        let next = reducer(withData, actions.approveApprovalRecipient({ uuid: 'a1', userApproval: {} as any }));
        expect(next.isApproving).toBe(true);

        next = reducer(next, actions.approveApprovalRecipientSuccess({ uuid: 'a1' }));
        expect(next.isApproving).toBe(false);
        expect(next.approvals[0].status).toBe('APPROVED');
        expect(next.userApprovals[0].status).toBe('APPROVED');
        expect(next.approvalDetails?.status).toBe('APPROVED');

        next = reducer({ ...next, isApproving: true }, actions.approveApprovalRecipientFailure({ error: 'err' }));
        expect(next.isApproving).toBe(false);
    });

    test('rejectApprovalRecipient / success / failure', () => {
        const withData = {
            ...initialState,
            approvals: [{ approvalUuid: 'a1', status: 'pending' } as any],
            userApprovals: [{ approvalUuid: 'a1', status: 'pending' } as any],
            approvalDetails: { approvalUuid: 'a1', status: 'pending' } as any,
        };

        let next = reducer(withData, actions.rejectApprovalRecipient({ uuid: 'a1', userApproval: {} as any }));
        expect(next.isRejecting).toBe(true);

        next = reducer(next, actions.rejectApprovalRecipientSuccess({ uuid: 'a1' }));
        expect(next.isRejecting).toBe(false);
        expect(next.approvals[0].status).toBe('REJECTED');
        expect(next.userApprovals[0].status).toBe('REJECTED');
        expect(next.approvalDetails?.status).toBe('REJECTED');

        next = reducer({ ...next, isRejecting: true }, actions.rejectApprovalRecipientFailure({ error: 'err' }));
        expect(next.isRejecting).toBe(false);
    });
});

describe('approvals selectors', () => {
    test('selectors read from state', () => {
        const featureState: any = {
            ...initialState,
            approvalDetails: { approvalUuid: 'a1' },
            approvals: [{ approvalUuid: 'a1' }],
            userApprovals: [{ approvalUuid: 'u1' }],
            approvalsTotalItems: 10,
            userApprovalsTotalItems: 5,
            isFetchingDetail: true,
            isFetchingList: true,
            isFetchingUserList: true,
            isApproving: true,
            isRejecting: true,
        };
        const state = { approvals: featureState } as any;

        expect(selectors.approvalDetails(state)).toEqual({ approvalUuid: 'a1' });
        expect(selectors.approvals(state)).toEqual([{ approvalUuid: 'a1' }]);
        expect(selectors.userApprovals(state)).toEqual([{ approvalUuid: 'u1' }]);
        expect(selectors.approvalsTotalItems(state)).toBe(10);
        expect(selectors.userApprovalsTotalItems(state)).toBe(5);
        expect(selectors.isFetchingDetail(state)).toBe(true);
        expect(selectors.isFetchingList(state)).toBe(true);
        expect(selectors.isFetchingUserList(state)).toBe(true);
        expect(selectors.isApproving(state)).toBe(true);
        expect(selectors.isRejecting(state)).toBe(true);
    });
});
