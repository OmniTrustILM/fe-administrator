import type { MetadataAttribute, TokenKeyOnboardingResultDto } from 'types/openapi';

/** Each sent pair's caption in the onboarding dialog. */
export type CaptionsByHandle = Record<string, string>;

type OnboardingSummary = {
    allOnboarded: boolean;
    message: string;
};

const UNEXPLAINED_REFUSAL = 'No reason was given.';

/** The FE's own key for a pair across listings and in its onboarding result: each metadata name with its data, in name order. */
export function handleOf(keyPairMeta: readonly MetadataAttribute[]): string {
    const dataByName = keyPairMeta.map((attribute) => [attribute.name, (attribute.content ?? []).map((item) => item.data)] as const);
    return JSON.stringify([...dataByName].sort(([name], [other]) => (name < other ? -1 : 1)));
}

function keyPairCount(count: number): string {
    return `${count} ${count === 1 ? 'key pair' : 'key pairs'}`;
}

function reasonOf(result: TokenKeyOnboardingResultDto): string {
    return result.reason || UNEXPLAINED_REFUSAL;
}

/** The caption tells the refusals of a batch apart, since a reason may name no key. */
function refusalLine(result: TokenKeyOnboardingResultDto, captions: CaptionsByHandle): string {
    const caption = captions[handleOf(result.keyPairMeta)];
    return caption ? `${caption}: ${reasonOf(result)}` : reasonOf(result);
}

function withRefusals(headline: string, refused: TokenKeyOnboardingResultDto[], captions: CaptionsByHandle): string {
    return [headline, ...refused.map((result) => refusalLine(result, captions))].join('\n');
}

function describeRefusals(refused: TokenKeyOnboardingResultDto[], onboardedCount: number, captions: CaptionsByHandle): string {
    if (onboardedCount > 0) {
        const batch = keyPairCount(onboardedCount + refused.length);
        return withRefusals(`Onboarded ${onboardedCount} of ${batch} and failed to onboard ${refused.length}.`, refused, captions);
    }
    if (refused.length === 1) return `Failed to onboard the key pair. ${reasonOf(refused[0])}`;
    return withRefusals(`Failed to onboard ${keyPairCount(refused.length)}.`, refused, captions);
}

export function summarizeOnboarding(results: TokenKeyOnboardingResultDto[], captions: CaptionsByHandle): OnboardingSummary {
    const refused = results.filter((result) => !result.onboarded);
    const onboardedCount = results.length - refused.length;
    if (refused.length === 0) return { allOnboarded: true, message: `Onboarded ${keyPairCount(onboardedCount)}.` };
    return { allOnboarded: false, message: describeRefusals(refused, onboardedCount, captions) };
}
