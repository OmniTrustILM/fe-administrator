import type { UnknownAction } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import GlobalModal from 'components/GlobalModal';
import { type ExportAnswer, exportDialogTestStore, keyPermissionsAuth } from 'components/_pages/test-utils/exportDialogTestStore';
import { slice as certificateSlice } from 'ducks/certificates';
import { initialState as userInterfaceInitialState, type State as UserInterfaceState } from 'ducks/user-interface';
import type { CertificateDetailResponseModel } from 'types/certificate';
import {
    CertificateFormat,
    CertificateFormatEncoding,
    CertificateState as CertState,
    CertificateType,
    CertificateValidationStatus,
    ComplianceStatus,
    KeyAlgorithm,
    KeyFormat,
    KeyState as KeyItemState,
    KeyType,
    PlatformEnum,
    type BaseAttributeDto,
} from 'types/openapi';
import CertificateDownloadForm from './CertificateDownloadForm';

const platformEnums = {
    [PlatformEnum.CertificateFormat]: {
        [CertificateFormat.Raw]: { code: CertificateFormat.Raw, label: 'Raw' },
        [CertificateFormat.Pkcs7]: { code: CertificateFormat.Pkcs7, label: 'PKCS#7' },
    },
    [PlatformEnum.CertificateFormatEncoding]: {
        [CertificateFormatEncoding.Pem]: { code: CertificateFormatEncoding.Pem, label: 'PEM' },
        [CertificateFormatEncoding.Der]: { code: CertificateFormatEncoding.Der, label: 'DER' },
    },
};

const testCertificate = (keystoreAvailable: boolean, hasPrivateKeyItem: boolean): CertificateDetailResponseModel =>
    ({
        uuid: 'certificate-uuid',
        commonName: 'web-server-01.omnitrust.com',
        subjectDn: 'CN=web-server-01.omnitrust.com',
        publicKeyAlgorithm: 'RSA',
        hybridCertificate: false,
        keySize: 2048,
        state: CertState.Issued,
        validationStatus: CertificateValidationStatus.Valid,
        certificateType: CertificateType.X509,
        complianceStatus: ComplianceStatus.Ok,
        privateKeyAvailability: keystoreAvailable,
        keystoreAvailable,
        key: hasPrivateKeyItem
            ? {
                  uuid: 'key-uuid',
                  name: 'web-server-01',
                  creationTime: '2026-01-01T00:00:00Z',
                  associations: 0,
                  complianceStatus: ComplianceStatus.Ok,
                  items: [
                      {
                          uuid: 'key-item-private-uuid',
                          name: 'web-server-01',
                          creationTime: '2026-01-01T00:00:00Z',
                          keyWrapperUuid: 'key-wrapper-uuid',
                          type: KeyType.Private,
                          keyAlgorithm: KeyAlgorithm.Rsa,
                          format: KeyFormat.Raw,
                          length: 2048,
                          enabled: true,
                          state: KeyItemState.Active,
                          complianceStatus: ComplianceStatus.Ok,
                          associations: 0,
                      },
                  ],
              }
            : undefined,
    }) as CertificateDetailResponseModel;

/** The global modal as the certificate's Download action opens it. */
const downloadModal: UserInterfaceState = {
    ...userInterfaceInitialState,
    globalModal: {
        ...userInterfaceInitialState.globalModal,
        isOpen: true,
        size: 'md',
        title: 'Download',
        icon: 'download',
        content: <CertificateDownloadForm />,
    },
};

export type CertificateDownloadFormTestWrapperProps = Readonly<{
    keystoreAvailable?: boolean;
    /** Whether `certificateDetail.key` holds an item of the private key type. Defaults to `keystoreAvailable`, so
     * a test that sets only `keystoreAvailable` gets a consistent fixture; a test for the mismatch passes
     * this explicitly. */
    hasPrivateKeyItem?: boolean;
    exportAttributeDescriptors?: BaseAttributeDto[];
    /** Leaves a PKCS#12 download in flight when absent. */
    exportAnswer?: ExportAnswer;
    /** Shows the form in the global modal, as the certificate's Download action does, in place of on its own. */
    inGlobalModal?: boolean;
    /** Whether the signed-in user holds the key export permission. */
    canExportKeys?: boolean;
    onAction?: (action: UnknownAction) => void;
}>;

/** Mounts the form against {@link exportDialogTestStore}'s store, with a certificate preloaded as its detail page already
 * has it. */
export function CertificateDownloadFormTestWrapper({
    keystoreAvailable = true,
    hasPrivateKeyItem = keystoreAvailable,
    exportAttributeDescriptors,
    exportAnswer,
    inGlobalModal = false,
    canExportKeys = true,
    onAction,
}: CertificateDownloadFormTestWrapperProps) {
    const store = useMemo(
        () =>
            exportDialogTestStore(
                { exportAttributeDescriptors, exportAnswer, onAction },
                {
                    auth: keyPermissionsAuth({ exportKey: canExportKeys }),
                    enums: { platformEnums },
                    certificates: {
                        ...certificateSlice.getInitialState(),
                        certificateDetail: testCertificate(keystoreAvailable, hasPrivateKeyItem),
                    },
                    ...(inGlobalModal ? { userInterface: downloadModal } : {}),
                },
            ),
        [keystoreAvailable, hasPrivateKeyItem, exportAttributeDescriptors, exportAnswer, inGlobalModal, canExportKeys, onAction],
    );

    return (
        <Provider store={store}>
            <MemoryRouter>{inGlobalModal ? <GlobalModal /> : <CertificateDownloadForm />}</MemoryRouter>
        </Provider>
    );
}

export default CertificateDownloadFormTestWrapper;
