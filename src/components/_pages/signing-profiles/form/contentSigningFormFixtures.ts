// Runtime values for ContentSigningProfileForm.spec.tsx. Playwright CT rewrites imports from a mounted component's module, so they
// live apart from ContentSigningProfileFormTestWrapper.
import {
    AttributeContentType,
    AttributeType,
    AttributeVersion,
    type BaseAttributeDto,
    CertificateRelationType,
    CertificateState,
    CertificateType,
    ManagedSigningType,
    SignatureLevel,
    SigningRecordPersistenceMode,
    SigningScheme,
    type SigningProfileDto,
    SigningWorkflowType,
    TimestampSourceType,
} from 'types/openapi';
import type { CoreAnswers } from './ContentSigningProfileFormTestWrapper';

export const DOCUMENT_SIGNING_EKU = '1.3.6.1.4.1.311.10.3.12';

const signingReason = {
    uuid: 'attr-reason',
    name: 'reason',
    type: AttributeType.Data,
    contentType: AttributeContentType.String,
    version: 2,
    properties: { label: 'Signing Reason', required: false, readOnly: false, visible: true, list: false, multiSelect: false },
} as BaseAttributeDto;

export const requestAttribute = (uuid: string, name: string, group?: string, required = false, label = name) =>
    ({
        uuid,
        name,
        type: AttributeType.Data,
        contentType: AttributeContentType.String,
        version: 2,
        properties: { label, group, required, readOnly: false, visible: true, list: false, multiSelect: false },
    }) as BaseAttributeDto;

const stampPage = requestAttribute('attr-stamp-page', 'stamp-page', 'signature_appearance');
const timestampPolicy = requestAttribute('attr-timestamp-policy', 'timestamp-policy');

export const core: CoreAnswers = {
    connectorsByWorkflow: {
        [SigningWorkflowType.Timestamping]: [{ uuid: 'c-tsp', name: 'Timestamp Connector' }],
        [SigningWorkflowType.ContentSigning]: [
            { uuid: 'c-pades', name: 'PAdES Connector' },
            { uuid: 'c-cades', name: 'CAdES Connector' },
        ],
    },
    declarationsByConnector: {
        'c-pades': [
            {
                code: 'pades',
                label: 'PAdES',
                levels: [
                    { level: SignatureLevel.Signed, name: 'PAdES-B' },
                    { level: SignatureLevel.Timestamped, name: 'PAdES-B-T' },
                    { level: SignatureLevel.LongTerm, name: 'PAdES-B-LT' },
                ],
                transferModes: [],
            },
        ],
        'c-cades': [
            {
                code: 'pades',
                label: 'PAdES',
                levels: [
                    { level: SignatureLevel.Signed, name: 'PAdES-B' },
                    { level: SignatureLevel.Timestamped, name: 'PAdES-B-T' },
                ],
                transferModes: [],
            },
        ],
    },
    certificates: [
        { uuid: 'cert-plain', displayName: 'Plain Cert', commonName: 'Plain Cert', serialNumber: '1' },
        {
            uuid: 'cert-nr',
            displayName: 'Qualified Cert',
            commonName: 'Qualified Cert',
            serialNumber: '2',
            nonRepudiation: true,
            extendedKeyUsageOids: [DOCUMENT_SIGNING_EKU],
        },
    ],
    profileAttributesByLevel: { [SignatureLevel.Signed]: [signingReason], [SignatureLevel.Timestamped]: [signingReason] },
    requestAttributesByLevel: {
        [SignatureLevel.Signed]: [stampPage],
        [SignatureLevel.Timestamped]: [stampPage, timestampPolicy],
    },
    timestampSources: {
        candidates: [
            { uuid: 'tsa-1', name: 'Durable TSA', enabled: true },
            { uuid: 'tsa-paused', name: 'Paused TSA', enabled: false },
            { uuid: 'sp-pades', name: 'DocumentSigning', enabled: true },
        ],
        ineligible: [{ uuid: 'tsa-retired', name: 'Retired TSA' }],
        unreadable: [{ uuid: 'tsa-hidden', name: 'Hidden TSA' }],
    },
};

const stampImage = {
    ...requestAttribute('attr-stamp-image', 'stamp-image', 'signature_appearance'),
    contentType: AttributeContentType.File,
    version: 3,
} as BaseAttributeDto;

export const coreWithStampImage: CoreAnswers = {
    ...core,
    requestAttributesByLevel: { [SignatureLevel.Timestamped]: [stampPage, timestampPolicy, stampImage] },
};

const stampPageWithDefault = { ...stampPage, content: [{ data: 'first' }] } as BaseAttributeDto;

/** Core declares a default stamp page at both levels that list request attributes. */
export const coreWithDefaultStampPage: CoreAnswers = {
    ...core,
    requestAttributesByLevel: {
        [SignatureLevel.Signed]: [stampPageWithDefault],
        [SignatureLevel.Timestamped]: [stampPageWithDefault, timestampPolicy],
    },
};

const requiredStampPage = requestAttribute('attr-stamp-page', 'stamp-page', 'signature_appearance', true);

export const coreWithRequiredStampPage: CoreAnswers = {
    ...core,
    requestAttributesByLevel: { [SignatureLevel.Timestamped]: [requiredStampPage, timestampPolicy] },
};

const stampFont = requestAttribute('attr-stamp-font', 'stamp-font', 'signature_appearance');

/** Core lists a profile attribute in the same group as the stamp page, a request attribute. */
export const coreWithMixedAppearanceGroup: CoreAnswers = {
    ...core,
    profileAttributesByLevel: { [SignatureLevel.Timestamped]: [signingReason, stampFont] },
};

const stampHeight = {
    ...requestAttribute('attr-stamp-height', 'stamp-height'),
    contentType: AttributeContentType.Integer,
} as BaseAttributeDto;

/** Core lists an integer profile attribute at both levels. */
export const coreWithStampHeight: CoreAnswers = {
    ...core,
    profileAttributesByLevel: { [SignatureLevel.Signed]: [stampHeight], [SignatureLevel.Timestamped]: [stampHeight] },
};

const signingPin = { ...requestAttribute('attr-signing-pin', 'signing-pin'), contentType: AttributeContentType.Secret } as BaseAttributeDto;

/** Core lists a secret profile attribute at both levels. */
export const coreWithSigningPin: CoreAnswers = {
    ...core,
    profileAttributesByLevel: { [SignatureLevel.Signed]: [signingPin], [SignatureLevel.Timestamped]: [signingPin] },
};

export const SAVED_REQUEST_ATTRIBUTES = ['signature_appearance', 'timestamp-policy'];

const savedValue = (uuid: string, name: string, data: string) => ({
    uuid,
    name,
    label: name,
    type: AttributeType.Data,
    contentType: AttributeContentType.String,
    version: AttributeVersion.V2,
    content: [{ data }],
});

/** A saved PAdES-B-T profile that requires the document-signing purpose and signs with the qualified certificate. */
export const savedProfile: SigningProfileDto = {
    uuid: 'sp-pades',
    name: 'DocumentSigning',
    version: 1,
    enabled: true,
    workflow: {
        type: SigningWorkflowType.ContentSigning,
        signatureFormattingConnector: { uuid: 'c-pades', name: 'PAdES Connector' },
        signatureFormattingConnectorAttributes: [
            {
                uuid: 'attr-reason',
                name: 'reason',
                label: 'Signing Reason',
                type: AttributeType.Data,
                contentType: AttributeContentType.String,
                version: AttributeVersion.V2,
                content: [{ data: 'Contract' }],
            },
            savedValue('attr-stamp-page', 'stamp-page', 'last'),
            savedValue('attr-timestamp-policy', 'timestamp-policy', '1.2.3.4'),
        ],
        family: 'pades',
        level: SignatureLevel.Timestamped,
        timestampSource: { signingProfile: { uuid: 'tsa-1', name: 'Durable TSA' }, type: TimestampSourceType.Internal },
        requireNonRepudiation: true,
        requiredExtendedKeyUsageOids: [DOCUMENT_SIGNING_EKU],
        allowedRequestAttributes: SAVED_REQUEST_ATTRIBUTES,
    },
    signingScheme: {
        signingScheme: SigningScheme.Managed,
        managedSigningType: ManagedSigningType.StaticKey,
        certificate: {
            uuid: 'cert-nr',
            displayName: 'Qualified Cert',
            commonName: 'Qualified Cert',
            serialNumber: '2',
            certificateType: CertificateType.X509,
            state: CertificateState.Issued,
            relationType: CertificateRelationType.Renewal,
            subjectDn: 'CN=Qualified Cert',
            publicKeyAlgorithm: 'RSA',
        },
        signingOperationAttributes: [],
    },
    recordPolicy: {
        recordingEnabled: false,
        recordRequestMetadata: false,
        recordSignature: false,
        recordSignedDocument: false,
        recordDtbs: false,
        persistenceMode: SigningRecordPersistenceMode.DeferredDurable,
    },
    customAttributes: [],
} as SigningProfileDto;

/** The saved profile with a timestamp source that no longer meets the requirements. */
export const profileWithRetiredSource: SigningProfileDto = {
    ...savedProfile,
    workflow: {
        ...savedProfile.workflow,
        timestampSource: { signingProfile: { uuid: 'tsa-retired', name: 'Retired TSA' }, type: TimestampSourceType.Internal },
    },
} as SigningProfileDto;

/** The saved profile with a timestamp source this account cannot list. */
export const profileWithUnlistedSource: SigningProfileDto = {
    ...savedProfile,
    workflow: {
        ...savedProfile.workflow,
        timestampSource: { signingProfile: { uuid: 'tsa-unlisted', name: 'Unlisted TSA' }, type: TimestampSourceType.Internal },
    },
} as SigningProfileDto;

/** A saved raw-signing profile that requires the document-signing purpose. */
export const rawSigningProfile: SigningProfileDto = {
    ...savedProfile,
    name: 'RawSigning',
    workflow: {
        type: SigningWorkflowType.RawSigning,
        requireNonRepudiation: true,
        requiredExtendedKeyUsageOids: [DOCUMENT_SIGNING_EKU],
    },
} as SigningProfileDto;

/** Saved request-attribute value as the update request carries it. */
export const requestValue = (uuid: string, name: string, data: string) => ({
    uuid,
    name,
    contentType: AttributeContentType.String,
    version: AttributeVersion.V2,
    content: [{ data }],
});

/** The saved profile with a timestamp source Core could not read. */
export const profileWithUnreadableSource: SigningProfileDto = {
    ...savedProfile,
    workflow: {
        ...savedProfile.workflow,
        timestampSource: { signingProfile: { uuid: 'tsa-hidden', name: 'Hidden TSA' }, type: TimestampSourceType.Internal },
    },
} as SigningProfileDto;

/** A PAdES-style choice attribute declaring two packagings. */
export const packagingAttribute = {
    uuid: 'attr-packaging',
    name: 'packaging',
    type: AttributeType.Data,
    contentType: AttributeContentType.String,
    version: 2,
    properties: { label: 'Packaging', required: false, readOnly: false, visible: true, list: true, multiSelect: false },
    content: [{ data: 'Enveloped' }, { data: 'Enveloping' }],
} as BaseAttributeDto;

/** The saved profile with one of the two packagings selected. */
export const profileWithSavedPackaging: SigningProfileDto = {
    ...savedProfile,
    workflow: {
        ...savedProfile.workflow,
        signatureFormattingConnectorAttributes: [savedValue('attr-packaging', 'packaging', 'Enveloped')],
    },
} as SigningProfileDto;

/** Another saved profile on the same connector and level, with a reason of its own. */
export const invoiceSigningProfile: SigningProfileDto = {
    ...savedProfile,
    uuid: 'sp-invoice',
    name: 'InvoiceSigning',
    workflow: {
        ...savedProfile.workflow,
        signatureFormattingConnectorAttributes: [savedValue('attr-reason', 'reason', 'Invoice')],
    },
} as SigningProfileDto;
