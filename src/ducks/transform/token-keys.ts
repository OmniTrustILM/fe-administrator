import type { TokenKeyOnboardingResultDto } from 'types/openapi';

export function describeOnboarding(results: TokenKeyOnboardingResultDto[]): string {
    const onboarded = results.filter((result) => result.onboarded).length;
    const keyPairs = results.length === 1 ? 'key pair' : 'key pairs';
    return `Onboarded ${onboarded} of ${results.length} ${keyPairs}.`;
}
