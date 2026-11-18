import { type MetadataAttribute, TokenKeyOnboardingOutcome, type TokenKeyOnboardingResultDto } from 'types/openapi';

/** Each sent pair's caption in the onboarding dialog. */
export type CaptionsByHandle = Record<string, string>;

type OnboardingSummary = {
    allOnboarded: boolean;
    message: string;
};

const UNEXPLAINED_FAILURE = 'No reason was given.';

/** The FE's own key for a pair across listings and in its onboarding result: each metadata name with its data, in name order. */
export function handleOf(keyPairMeta: readonly MetadataAttribute[]): string {
    const dataByName = keyPairMeta.map((attribute) => [attribute.name, (attribute.content ?? []).map((item) => item.data)] as const);
    return JSON.stringify([...dataByName].sort(([name], [other]) => (name < other ? -1 : 1)));
}

/** The inventory holds an onboarded pair, as a new key or as one joined to an existing key. */
export function isOnboarded(result: TokenKeyOnboardingResultDto): boolean {
    return result.outcome === TokenKeyOnboardingOutcome.Onboarded || result.outcome === TokenKeyOnboardingOutcome.JoinedExistingKey;
}

function keyPairCount(count: number): string {
    return `${count} ${count === 1 ? 'key pair' : 'key pairs'}`;
}

/** The connector's own words follow Core's reason, so an operator can match them to the token's logs. */
export function explanationOf({ reason, diagnostic }: Readonly<{ reason?: string; diagnostic?: string }>): string[] {
    const connectorNote = diagnostic && `Connector: ${diagnostic}`;
    return [reason, connectorNote].filter((line): line is string => !!line);
}

function reasonOf(result: TokenKeyOnboardingResultDto): string {
    return explanationOf(result).join(' ') || UNEXPLAINED_FAILURE;
}

/** The caption tells the failures of a batch apart, since a reason may name no key. */
function failureLine(result: TokenKeyOnboardingResultDto, captions: CaptionsByHandle): string {
    const caption = captions[handleOf(result.keyPairMeta)];
    return caption ? `${caption}: ${reasonOf(result)}` : reasonOf(result);
}

function withFailures(headline: string, notOnboarded: TokenKeyOnboardingResultDto[], captions: CaptionsByHandle): string {
    return [headline, ...notOnboarded.map((result) => failureLine(result, captions))].join('\n');
}

function describeFailures(notOnboarded: TokenKeyOnboardingResultDto[], onboardedCount: number, captions: CaptionsByHandle): string {
    if (onboardedCount > 0) {
        const batch = keyPairCount(onboardedCount + notOnboarded.length);
        return withFailures(
            `Onboarded ${onboardedCount} of ${batch} and failed to onboard ${notOnboarded.length}.`,
            notOnboarded,
            captions,
        );
    }
    if (notOnboarded.length === 1) return `Failed to onboard the key pair. ${reasonOf(notOnboarded[0])}`;
    return withFailures(`Failed to onboard ${keyPairCount(notOnboarded.length)}.`, notOnboarded, captions);
}

export function summarizeOnboarding(results: TokenKeyOnboardingResultDto[], captions: CaptionsByHandle): OnboardingSummary {
    const notOnboarded = results.filter((result) => !isOnboarded(result));
    const onboardedCount = results.length - notOnboarded.length;
    if (notOnboarded.length === 0) return { allOnboarded: true, message: `Onboarded ${keyPairCount(onboardedCount)}.` };
    return { allOnboarded: false, message: describeFailures(notOnboarded, onboardedCount, captions) };
}
