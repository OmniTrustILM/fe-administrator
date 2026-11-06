import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { EntityType } from 'ducks/filters';
import { actions as pagingActions } from 'ducks/paging';
import { testInitialState } from 'ducks/test-reducers';
import { createMockStore } from 'utils/test-helpers';
import CertificateList from './index';

type Props = Readonly<{
    pickerMode?: boolean;
}>;

export function CertificateListWithStore({ pickerMode = false }: Props) {
    const [store] = useState(() =>
        createMockStore({ certificates: { ...testInitialState.certificates, certificates: [] } } as Parameters<typeof createMockStore>[0]),
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
