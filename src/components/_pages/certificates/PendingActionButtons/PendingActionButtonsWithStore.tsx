import type React from 'react';
import { useMemo, useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { type CertificatesTestState, testInitialState } from 'ducks/test-reducers';
import { Resource, ResourceAction } from 'types/openapi';
import { useRecordingStore } from 'utils/test-helpers';
import PendingActionButtons from './index';
import PendingActionDialogs from './PendingActionDialogs';
import type { PendingAction } from './types';

export type PendingActionButtonsWithStoreProps = Readonly<
    Omit<React.ComponentProps<typeof PendingActionButtons>, 'onAction'> & {
        preloadedState?: Partial<CertificatesTestState>;
        certificateActions?: ResourceAction[];
    }
>;

function ButtonsAndDialogs({ certificate, compact }: Omit<PendingActionButtonsWithStoreProps, 'preloadedState' | 'certificateActions'>) {
    const [action, setAction] = useState<PendingAction | null>(null);
    return (
        <>
            <PendingActionButtons certificate={certificate} compact={compact} onAction={setAction} />
            <PendingActionDialogs action={action} onClose={() => setAction(null)} />
        </>
    );
}

const issueAndRevoke = [ResourceAction.Issue, ResourceAction.Revoke];

const pendingActionsProfile = (actions: ResourceAction[]) => ({
    username: 'operator',
    permissions: {
        allowedListings: [],
        allowedActions: [{ resource: Resource.Certificates, actions }],
    },
});

export default function PendingActionButtonsWithStore({
    preloadedState,
    certificateActions = issueAndRevoke,
    ...props
}: PendingActionButtonsWithStoreProps) {
    const state = useMemo(
        () => ({
            certificates: { ...testInitialState.certificates, ...preloadedState },
            auth: { profile: pendingActionsProfile(certificateActions) },
        }),
        [preloadedState, certificateActions],
    );
    const { store, dispatched } = useRecordingStore(state, 'certificates/manuallyIssueCertificate');
    const manualIssuePayload = dispatched.at(-1)?.payload;

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/']}>
                <ButtonsAndDialogs {...props} />
                <div data-testid="manual-issue-payload">{manualIssuePayload ? JSON.stringify(manualIssuePayload) : ''}</div>
            </MemoryRouter>
        </Provider>
    );
}
