import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import { Provider } from 'react-redux';
import { createMockStore } from 'utils/test-helpers';
import approvalsReducer, { actions, initialState as approvalsInitialState } from 'ducks/approvals';
import ApprovalDetails from './index';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('components/CommentPanel', () => ({ default: () => <div>comment-panel</div> }));
vi.mock('components/_pages/notifications/events-settings/ObjectEventHistoryWidget', () => ({ default: () => <div>event-history</div> }));

const approval = {
    approvalUuid: 'ap1',
    approvalProfileUuid: 'pr1',
    approvalProfileName: 'Max Approval Profile Test',
    description: '',
    creatorUuid: 'u-requester',
    creatorUsername: 'soloviovmax',
    status: 'APPROVED',
    resource: 'certificates',
    resourceAction: 'issue',
    objectUuid: 'c1',
    createdAt: '2026-09-15T06:36:21.331+00:00',
    closedAt: '2026-09-15T06:43:29.189+00:00',
    expiry: 36,
    version: 1,
    approvalSteps: [
        {
            uuid: 's1',
            order: 1,
            requiredApprovals: 2,
            roleUuid: 'r1',
            approvalStepRecipients: [
                {
                    approvalRecipientUuid: 'rc1',
                    userUuid: 'u-approver',
                    username: 'czertainly-admin',
                    status: 'APPROVED',
                    createdAt: '2026-09-15T06:36:21.335+00:00',
                    closedAt: '2026-09-15T06:43:29.184+00:00',
                    comment: 'Checked the subject and SANs',
                },
                {
                    approvalRecipientUuid: 'rc2',
                    status: 'PENDING',
                    createdAt: '2026-09-15T06:36:21.335+00:00',
                },
            ],
        },
    ],
};

function buildStore(approvals: { approvalDetails?: unknown; isFetchingDetail?: boolean }) {
    return createMockStore({ approvals: { isFetchingDetail: false, ...approvals } as never });
}

describe('ApprovalDetails approvers', () => {
    let container: HTMLDivElement;
    let root: Root;

    const render = async (store: ReturnType<typeof createMockStore>) => {
        await act(async () => {
            root.render(
                <Provider store={store}>
                    <MemoryRouter initialEntries={['/approvals/detail/ap1']}>
                        <Routes>
                            <Route path="/approvals/detail/:id" element={<ApprovalDetails />} />
                        </Routes>
                    </MemoryRouter>
                </Provider>,
            );
        });
    };

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.clearAllMocks();
    });

    it('requests the approval detail on mount', async () => {
        const store = buildStore({ approvalDetails: approval });
        const dispatch = vi.spyOn(store, 'dispatch');
        await render(store);

        expect(dispatch).toHaveBeenCalledWith(actions.getApproval({ uuid: 'ap1' }));
    });

    it('shows every approver decision with its comment on the page', async () => {
        await render(buildStore({ approvalDetails: approval }));

        expect(container.textContent).toContain('Approvers');
        expect(container.textContent).toContain('Checked the subject and SANs');

        const approverLinks = [...container.querySelectorAll('a')].filter((a) => a.getAttribute('href')?.includes('/users/detail/'));
        expect(approverLinks.map((a) => a.textContent)).toEqual(['czertainly-admin']);
        expect(approverLinks[0].getAttribute('href')).toContain('/users/detail/u-approver');
    });

    it('keeps the loaded approval on screen while the same approval is refetched', async () => {
        const refetching = approvalsReducer(
            { ...approvalsInitialState, approvalDetails: approval as never },
            actions.getApproval({ uuid: 'ap1' }),
        );
        await render(createMockStore({ approvals: refetching as never }));

        expect(container.textContent).toContain('Checked the subject and SANs');
    });

    it('shows the skeleton while a different approval is loading', async () => {
        const switching = approvalsReducer(
            { ...approvalsInitialState, approvalDetails: { ...approval, approvalUuid: 'other' } as never },
            actions.getApproval({ uuid: 'ap1' }),
        );
        await render(createMockStore({ approvals: switching as never }));

        expect(container.textContent).not.toContain('Approvers');
    });
});
