import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import ExportPassphraseForm from 'components/ExportPassphraseForm';
import TextInput from 'components/TextInput';
import { actions as cryptographicKeysActions, selectors as cryptographicKeysSelectors } from 'ducks/cryptographic-keys';
import type { CryptographicKeyItemDetailResponseModel } from 'types/cryptographic-keys';
import type { RequestAttribute } from 'types/openapi';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';

export const EXPORT_FORMAT_LABEL = 'Encrypted PKCS8 – private key (PEM)';

const EXPORT_INFO =
    'The key is encrypted under your password inside the provider and never leaves it unprotected. Export requires the key export permission and is audit-logged.';

type Props = Readonly<{
    keyUuid: string;
    keyItem: CryptographicKeyItemDetailResponseModel;
    providerName?: string;
    onClose: () => void;
}>;

/** The body of the key export dialog: the key's identity and fixed export format above the shared passphrase
 * form, submitted as a key export request. It closes once the export succeeds. */
export default function KeyExportDialog({ keyUuid, keyItem, providerName, onClose }: Props) {
    const dispatch = useDispatch();
    const isExportingKey = useSelector(cryptographicKeysSelectors.isExportingKey);
    const exportKeySucceeded = useSelector(cryptographicKeysSelectors.exportKeySucceeded);
    const exportKeyError = useSelector(cryptographicKeysSelectors.exportKeyError);

    useRunOnSuccessfulFinish(isExportingKey, exportKeySucceeded, onClose);

    const handleSubmit = useCallback(
        (request: { passphrase: string; exportAttributes: RequestAttribute[] }) => {
            dispatch(
                cryptographicKeysActions.exportKey({
                    uuid: keyUuid,
                    keyItemUuid: keyItem.uuid,
                    keyExportRequestDto: { passphrase: request.passphrase, exportAttributes: request.exportAttributes },
                    fallbackName: `${keyItem.name}.pem`,
                }),
            );
        },
        [dispatch, keyUuid, keyItem.uuid, keyItem.name],
    );

    return (
        <div className="space-y-4">
            <div className="text-sm text-content-muted">
                {[keyItem.name, keyItem.keyAlgorithm, providerName].filter(Boolean).join(' | ')}
            </div>
            <TextInput id="exportFormat" label="Format" value={EXPORT_FORMAT_LABEL} onChange={() => {}} disabled />
            <ExportPassphraseForm
                keyUuid={keyUuid}
                keyItemUuid={keyItem.uuid}
                info={EXPORT_INFO}
                submitLabel="Export"
                busyLabel="Exporting..."
                busy={isExportingKey}
                error={exportKeyError}
                onSubmit={handleSubmit}
                onCancel={onClose}
            />
        </div>
    );
}
