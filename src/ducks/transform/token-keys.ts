import type { TokenKeyOnboardingResultDto } from 'types/openapi';

type OnboardingSummary = {
    allOnboarded: boolean;
    message: string;
};

function keyPairCount(count: number): string {
    return `${count} ${count === 1 ? 'key pair' : 'key pairs'}`;
}

function withReasons(headline: string, refused: TokenKeyOnboardingResultDto[]): string {
    return [headline, ...refused.map((result) => result.reason)].filter(Boolean).join('\n');
}

function describeRefusals(refused: TokenKeyOnboardingResultDto[], onboardedCount: number): string {
    if (onboardedCount > 0) {
        const batch = keyPairCount(onboardedCount + refused.length);
        return withReasons(`Onboarded ${onboardedCount} of ${batch} and failed to onboard ${refused.length}.`, refused);
    }
    if (refused.length === 1) return ['Failed to onboard the key pair.', refused[0].reason].filter(Boolean).join(' ');
    return withReasons(`Failed to onboard ${keyPairCount(refused.length)}.`, refused);
}

export function summarizeOnboarding(results: TokenKeyOnboardingResultDto[]): OnboardingSummary {
    const refused = results.filter((result) => !result.onboarded);
    const onboardedCount = results.length - refused.length;
    if (refused.length === 0) return { allOnboarded: true, message: `Onboarded ${keyPairCount(onboardedCount)}.` };
    return { allOnboarded: false, message: describeRefusals(refused, onboardedCount) };
}
