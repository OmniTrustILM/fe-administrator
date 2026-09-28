import type { UnknownAction } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { type ExportAnswer, exportDialogTestStore } from 'components/_pages/test-utils/exportDialogTestStore';
import type { BaseAttributeDto } from 'types/openapi';
import KeystoreDownloadDialog from './index';

export type KeystoreDownloadDialogWithStoreProps = Readonly<{
    certificateUuid?: string;
    certificateName?: string;
    keyUuid?: string;
    privateKeyItemUuid?: string;
    exportAttributeDescriptors?: BaseAttributeDto[];
    exportAnswer?: ExportAnswer;
    onClose?: () => void;
    onAction?: (action: UnknownAction) => void;
}>;

const noop = () => {};

/** Mounts the dialog against {@link exportDialogTestStore}'s store. */
export function KeystoreDownloadDialogWithStore({
    certificateUuid = 'certificate-uuid',
    certificateName = 'web-server-01.omnitrust.com',
    keyUuid = 'key-uuid',
    privateKeyItemUuid = 'key-item-uuid',
    exportAttributeDescriptors,
    exportAnswer,
    onClose = noop,
    onAction,
}: KeystoreDownloadDialogWithStoreProps) {
    const store = useMemo(
        () => exportDialogTestStore({ exportAttributeDescriptors, exportAnswer, onAction }),
        [exportAttributeDescriptors, exportAnswer, onAction],
    );

    return (
        <Provider store={store}>
            <MemoryRouter>
                <KeystoreDownloadDialog
                    certificateUuid={certificateUuid}
                    certificateName={certificateName}
                    keyUuid={keyUuid}
                    privateKeyItemUuid={privateKeyItemUuid}
                    onClose={onClose}
                />
            </MemoryRouter>
        </Provider>
    );
}

export default KeystoreDownloadDialogWithStore;
