// Runtime values for RawSigningProfileForm.spec.tsx. Playwright CT rewrites imports from a mounted component's module, so they
// live apart from ContentSigningProfileFormTestWrapper.
import { type SigningProfileDto, SigningProtocol, SigningWorkflowType } from 'types/openapi';
import { rawSigningProfile } from './contentSigningFormFixtures';

export const rawIlmNativeProfile: SigningProfileDto = { ...rawSigningProfile, enabledProtocols: [SigningProtocol.IlmNative] };

export const rawProfileWithoutPurpose: SigningProfileDto = {
    ...rawSigningProfile,
    workflow: { type: SigningWorkflowType.RawSigning },
} as SigningProfileDto;
