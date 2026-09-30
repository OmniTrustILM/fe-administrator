import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import Alerts from 'components/Alerts';
import Dialog from 'components/Dialog';
import { useImportTestStore, type ImportWizardAnswers } from '../ImportWizard/ImportWizardWithStore';
import CertificateImportDialog from '.';

export type CertificateImportDialogWithStoreProps = ImportWizardAnswers;

/**
 * Stands in for the inventory's upload `Dialog`: the same caption and the same store fixtures as
 * {@link ImportWizardWithStore}, with Cancel and Done closing the dialog.
 */
export function CertificateImportDialogWithStore(fixtures: CertificateImportDialogWithStoreProps) {
    const [isOpen, setIsOpen] = useState(true);
    const store = useImportTestStore(fixtures);
    const close = () => setIsOpen(false);

    return (
        <Provider store={store}>
            <MemoryRouter>
                <Dialog
                    isOpen={isOpen}
                    toggle={close}
                    caption="Import certificates and keys"
                    body={<CertificateImportDialog onCancel={close} onDone={close} />}
                    buttons={[]}
                    size="xl"
                    icon="upload"
                />
                <Alerts />
            </MemoryRouter>
        </Provider>
    );
}

export default CertificateImportDialogWithStore;
