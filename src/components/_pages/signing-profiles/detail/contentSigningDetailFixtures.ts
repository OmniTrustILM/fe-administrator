// Runtime values for ContentSigningProfileDetail.spec.tsx. Playwright CT rewrites imports from a mounted component's module, so they
// live apart from ContentSigningProfileDetailTestWrapper.
import { core as formCore, savedProfile } from 'components/_pages/signing-profiles/form/contentSigningFormFixtures';
import {
    type CertificateSimpleDto,
    CertificateType,
    type ContentSigningWorkflowDto,
    SignatureLevel,
    type SigningProfileDto,
    SigningProtocol,
    SigningScheme,
    type StaticKeyManagedSigningDto,
} from 'types/openapi';
import type { DetailCoreAnswers } from './ContentSigningProfileDetailTestWrapper';

export { DOCUMENT_SIGNING_EKU } from 'components/_pages/signing-profiles/form/contentSigningFormFixtures';

const savedWorkflow = savedProfile.workflow as ContentSigningWorkflowDto;

export const detailCore: DetailCoreAnswers = {
    profile: savedProfile,
    declarations: formCore.declarationsByConnector['c-pades'],
    supportedProtocols: [SigningProtocol.IlmNative],
};

export const signedProfile: SigningProfileDto = {
    ...savedProfile,
    workflow: {
        ...savedWorkflow,
        level: SignatureLevel.Signed,
        timestampSource: undefined,
        requiredExtendedKeyUsageOids: [],
    } as ContentSigningWorkflowDto,
};

export const ilmNativeProfile: SigningProfileDto = { ...savedProfile, enabledProtocols: [SigningProtocol.IlmNative] };

export const delegatedProfile: SigningProfileDto = {
    ...savedProfile,
    signingScheme: { signingScheme: SigningScheme.Delegated },
} as SigningProfileDto;

const signingCertificate = (savedProfile.signingScheme as StaticKeyManagedSigningDto).certificate;

const signedWith = (certificate: Partial<CertificateSimpleDto>): SigningProfileDto =>
    ({
        ...savedProfile,
        signingScheme: { ...savedProfile.signingScheme, certificate: { ...signingCertificate, ...certificate } },
    }) as SigningProfileDto;

/** Signs with a certificate whose display name is not its common name. */
export const namedCertificateProfile = signedWith({ displayName: 'Qualified Cert', commonName: 'qualified.example' });

/** Signs with an X.509 certificate without a common name, for which Core sends a placeholder as the display name. */
export const noCommonNameProfile = signedWith({ displayName: '<empty>', commonName: undefined });

/** Signs with a certificate of a type without a common name. */
export const otherTypeCertificateProfile = signedWith({
    certificateType: CertificateType.Ssh,
    displayName: 'web-01 host key',
    commonName: undefined,
});
