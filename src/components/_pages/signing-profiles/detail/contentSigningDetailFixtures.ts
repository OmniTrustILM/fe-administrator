// Runtime values for ContentSigningProfileDetail.spec.tsx. Playwright CT rewrites imports from a mounted component's module, so they
// live apart from ContentSigningProfileDetailTestWrapper.
import { core as formCore, savedProfile } from 'components/_pages/signing-profiles/form/contentSigningFormFixtures';
import { type ContentSigningWorkflowDto, SignatureLevel, type SigningProfileDto, SigningProtocol, SigningScheme } from 'types/openapi';
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
