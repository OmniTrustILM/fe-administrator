import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import ExportPassphraseForm from 'components/ExportPassphraseForm';
import { actions as certificatesActions, selectors as certificatesSelectors } from 'ducks/certificates';
import { actions as userInterfaceActions } from 'ducks/user-interface';
import type { RequestAttribute } from 'types/openapi';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';

export const KEYSTORE_FORMAT_OPTION = {
    value: 'pkcs12',
    label: 'PKCS12 – certificate, private key and chain (.p12)',
} as const;

const KEYSTORE_INFO = 'The container is protected with your password. Downloading requires the key export permission and is audit-logged.';

const keepOpen = () => {
    // Called in place of closing the global modal, which then stays open.
};

type Props = Readonly<{
    certificateUuid: string;
    certificateName: string;
    keyUuid: string;
    privateKeyItemUuid: string;
    onClose: () => void;
}>;

/** The body of the certificate download dialog once PKCS#12 is chosen as the format: the passphrase and the
 * provider's export attributes, submitted as a keystore download request. It closes once the download succeeds. */
export default function KeystoreDownloadDialog({ certificateUuid, certificateName, keyUuid, privateKeyItemUuid, onClose }: Props) {
    const dispatch = useDispatch();
    const isDownloadingKeystore = useSelector(certificatesSelectors.isDownloadingKeystore);
    const downloadKeystoreSucceeded = useSelector(certificatesSelectors.downloadKeystoreSucceeded);
    const downloadKeystoreError = useSelector(certificatesSelectors.downloadKeystoreError);

    useRunOnSuccessfulFinish(isDownloadingKeystore, downloadKeystoreSucceeded, onClose);

    // A download in flight is seen through, so the global modal's X and Escape do nothing until it ends.
    useEffect(() => {
        if (!isDownloadingKeystore) return;
        dispatch(userInterfaceActions.setCancelButtonCallback(keepOpen));
        return () => {
            dispatch(userInterfaceActions.setCancelButtonCallback(undefined));
        };
    }, [dispatch, isDownloadingKeystore]);

    const handleSubmit = useCallback(
        (request: { passphrase: string; exportAttributes: RequestAttribute[] }) => {
            dispatch(
                certificatesActions.downloadKeystore({
                    uuid: certificateUuid,
                    certificateKeystoreRequestDto: { passphrase: request.passphrase, exportAttributes: request.exportAttributes },
                    fallbackName: `${certificateName}.p12`,
                }),
            );
        },
        [dispatch, certificateUuid, certificateName],
    );

    return (
        <ExportPassphraseForm
            keyUuid={keyUuid}
            keyItemUuid={privateKeyItemUuid}
            info={KEYSTORE_INFO}
            submitLabel="Download"
            busyLabel="Downloading..."
            busy={isDownloadingKeystore}
            error={downloadKeystoreError}
            onSubmit={handleSubmit}
            onCancel={onClose}
        />
    );
}
