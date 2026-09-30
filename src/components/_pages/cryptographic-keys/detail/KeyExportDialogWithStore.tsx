import type { UnknownAction } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { type ExportAnswer, exportDialogTestStore } from 'components/_pages/test-utils/exportDialogTestStore';
import type { CryptographicKeyItemDetailResponseModel } from 'types/cryptographic-keys';
import { ComplianceStatus, KeyAlgorithm, KeyFormat, KeyState, KeyType, type BaseAttributeDto } from 'types/openapi';
import type { SchemaAnswer } from 'components/_pages/test-utils/testAnswers';
import KeyExportDialog from './KeyExportDialog';

const defaultKeyItem: CryptographicKeyItemDetailResponseModel = {
    uuid: 'key-item-uuid',
    name: 'server-01',
    type: KeyType.Private,
    keyAlgorithm: KeyAlgorithm.Rsa,
    format: KeyFormat.PrivateKeyInfo,
    length: 2048,
    enabled: true,
    state: KeyState.Active,
    complianceStatus: ComplianceStatus.NotChecked,
    exportable: true,
};

export type KeyExportDialogWithStoreProps = Readonly<{
    keyUuid?: string;
    keyItem?: CryptographicKeyItemDetailResponseModel;
    providerName?: string;
    exportAttributeDescriptors?: BaseAttributeDto[];
    exportAttributeListings?: SchemaAnswer[];
    exportAnswer?: ExportAnswer;
    onClose?: () => void;
    onAction?: (action: UnknownAction) => void;
}>;

const noop = () => {};

/** Mounts the dialog against {@link exportDialogTestStore}'s store. */
export function KeyExportDialogWithStore({
    keyUuid = 'key-uuid',
    keyItem = defaultKeyItem,
    providerName = 'Token instance',
    exportAttributeDescriptors,
    exportAttributeListings,
    exportAnswer,
    onClose = noop,
    onAction,
}: KeyExportDialogWithStoreProps) {
    const store = useMemo(
        () => exportDialogTestStore({ exportAttributeDescriptors, exportAttributeListings, exportAnswer, onAction }),
        [exportAttributeDescriptors, exportAttributeListings, exportAnswer, onAction],
    );

    return (
        <Provider store={store}>
            <MemoryRouter>
                <KeyExportDialog keyUuid={keyUuid} keyItem={keyItem} providerName={providerName} onClose={onClose} />
            </MemoryRouter>
        </Provider>
    );
}

export default KeyExportDialogWithStore;
