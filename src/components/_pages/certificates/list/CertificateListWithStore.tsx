import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { EntityType } from 'ducks/filters';
import { actions as pagingActions } from 'ducks/paging';
import { testInitialState } from 'ducks/test-reducers';
import { Resource, ResourceAction } from 'types/openapi';
import { createMockStore } from 'utils/test-helpers';
import CertificateList from './index';

type Props = Readonly<{
    pickerMode?: boolean;
    /** The user's grants on certificates; omitted means every action the inventory offers. */
    allowedActions?: ResourceAction[];
}>;

const EVERY_ACTION = [ResourceAction.Create, ResourceAction.Update, ResourceAction.Archive, ResourceAction.Delete];

export function CertificateListWithStore({ pickerMode = false, allowedActions = EVERY_ACTION }: Props) {
    const [store] = useState(() =>
        createMockStore({
            certificates: { ...testInitialState.certificates, certificates: [] },
            auth: {
                profile: {
                    username: 'user',
                    permissions: {
                        allowedListings: [Resource.Certificates],
                        allowedActions: [{ resource: Resource.Certificates, actions: allowedActions }],
                    },
                },
            },
            resource: {
                ...testInitialState.resource,
                resourcesList: [{ resource: Resource.Certificates, hasObjectAccess: false, hasOwner: false }],
            },
        } as Parameters<typeof createMockStore>[0]),
    );

    return (
        <Provider store={store}>
            <MemoryRouter>
                {pickerMode ? <CertificateList selectCertsOnly hideWidgetButtons /> : <CertificateList />}
                <button
                    type="button"
                    data-testid="select-certificate"
                    onClick={() =>
                        store.dispatch(pagingActions.setCheckedRows({ entity: EntityType.CERTIFICATE, checkedRows: ['cert-1'] }))
                    }
                >
                    Select a certificate
                </button>
            </MemoryRouter>
        </Provider>
    );
}

export default CertificateListWithStore;
