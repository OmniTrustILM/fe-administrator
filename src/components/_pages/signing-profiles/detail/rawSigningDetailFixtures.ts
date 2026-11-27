// Runtime values for RawSigningProfileDetail.spec.tsx. Playwright CT rewrites imports from a mounted component's module, so they
// live apart from ContentSigningProfileDetailTestWrapper.
import { rawSigningProfile } from 'components/_pages/signing-profiles/form/contentSigningFormFixtures';
import { rawIlmNativeProfile, rawProfileWithoutPurpose } from 'components/_pages/signing-profiles/form/rawSigningFormFixtures';
import { SigningProtocol } from 'types/openapi';
import type { DetailCoreAnswers } from './ContentSigningProfileDetailTestWrapper';

export { DOCUMENT_SIGNING_EKU } from 'components/_pages/signing-profiles/form/contentSigningFormFixtures';

export const rawDetailCore: DetailCoreAnswers = {
    profile: rawSigningProfile,
    declarations: [],
    supportedProtocols: [SigningProtocol.IlmNative],
};

export const rawWithoutPurposeDetailCore: DetailCoreAnswers = { ...rawDetailCore, profile: rawProfileWithoutPurpose };

export const rawIlmNativeDetailCore: DetailCoreAnswers = { ...rawDetailCore, profile: rawIlmNativeProfile };
