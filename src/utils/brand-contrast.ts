/**
 * WCAG 2.1 AA contrast for the operator's brand colours.
 *
 * `theme-tokens.spec.ts` already enforces AA over the platform palette at build time, by parsing the token values out
 * of the stylesheet. Operator colours arrive at runtime and are invisible to that check, so the same guard has to run
 * on save - over the *derived* token families rather than the four raw inputs, because that is what the page paints.
 *
 * The derivation is not repeated here. `brand-tokens.ts` owns the mapping and resolves it to hex through the same
 * Oklab mix the stylesheet performs, so what is measured below is what the browser will render.
 *
 * The result warns, it never blocks. The operator stays in control of the brand and is told what it costs.
 */

import { brandTokenSources, brandTokenValues, type BrandColorKey, type BrandColors } from './brand-tokens';
import { mixOklab } from './oklab';
import { contrastRatio } from './contrast';
import type { ResolvedTheme } from './theme';

/** WCAG 2.1 1.4.3: body text and images of text. */
export const AA_TEXT = 4.5;

/** WCAG 2.1 1.4.11: user-interface components and meaningful graphics - borders, status dots, chart series. */
export const AA_NON_TEXT = 3;

/**
 * The platform token values a pairing may need for the side branding does not override - white on a branded header,
 * a branded link on the platform's dark card, an unbranded input border on a branded card.
 *
 * These duplicate the stylesheet, which is why `brand-contrast.spec.ts` asserts every entry against the value
 * `readSemanticTokens` parses out of `tailwindcss.css`. A token retuned there and not here would otherwise make the
 * warning describe a pairing the application no longer has.
 */
export const PLATFORM_TOKENS: Record<ResolvedTheme, Record<string, string>> = {
    light: {
        surface: '#f8fafc',
        'surface-raised': '#ffffff',
        'surface-sunken': '#f5f5f5',
        'surface-header': '#0073cf',
        content: '#1f2937',
        'content-muted': '#525252',
        'content-subtle': '#6e6e6e',
        'content-on-brand': '#ffffff',
        outline: '#8f8f8f',
        brand: '#0073cf',
        info: '#0369a1',
        'info-surface': '#e6f2ff',
        'info-solid': '#2798e7',
    },
    dark: {
        surface: '#0a0a0a',
        'surface-raised': '#171717',
        'surface-sunken': '#262626',
        'surface-header': '#171717',
        content: '#f5f5f5',
        'content-muted': '#d4d4d4',
        'content-subtle': '#a3a3a3',
        'content-on-brand': '#ffffff',
        outline: '#666666',
        brand: '#3399ff',
        info: '#38bdf8',
        'info-surface': '#002d59',
        'info-solid': '#2798e7',
    },
};

type Pairing = {
    /** What the operator loses by it, in the terms the Appearance tab uses rather than token or standard names. */
    consequence: string;
    foreground: string;
    background: string;
    threshold: number;
};

/**
 * The pairings `theme-tokens.spec.ts` covers, restricted to the ones branding can reach.
 *
 * White text is measured against `surface-header` only, and the sentence says it covers primary buttons too: the
 * mapping derives `brand-solid` and `surface-header` from Primary alike, so the two are the same colour and a second
 * pairing would only repeat the finding. `brand-contrast.spec.ts` asserts that invariant, so it cannot go stale.
 *
 * `compositeOver` from `contrast.ts` has no call site here on purpose: no branded token is painted through an opacity
 * modifier, so there is no translucent fill to flatten. The flow chart, which is where that happens, is not branded.
 *
 * `content-hint`, the placeholder weight, is deliberately absent although branding derives it: `theme-tokens.spec.ts`
 * holds it below AA on purpose, so measuring it here would warn about a rule the platform does not keep for itself.
 */
export const PAIRINGS: readonly Pairing[] = [
    { consequence: 'Body text is hard to read on the page background', foreground: 'content', background: 'surface', threshold: AA_TEXT },
    {
        consequence: 'Body text is hard to read on cards and dialogs',
        foreground: 'content',
        background: 'surface-raised',
        threshold: AA_TEXT,
    },
    { consequence: 'Body text is hard to read on inset panels', foreground: 'content', background: 'surface-sunken', threshold: AA_TEXT },
    {
        consequence: 'Supporting text is hard to read on the page background',
        foreground: 'content-muted',
        background: 'surface',
        threshold: AA_TEXT,
    },
    {
        consequence: 'Supporting text is hard to read on cards and dialogs',
        foreground: 'content-muted',
        background: 'surface-raised',
        threshold: AA_TEXT,
    },
    {
        consequence: 'Hint text is hard to read on cards and dialogs',
        foreground: 'content-subtle',
        background: 'surface-raised',
        threshold: AA_TEXT,
    },
    {
        consequence: 'Links and active controls are hard to read on cards and dialogs',
        foreground: 'brand',
        background: 'surface-raised',
        threshold: AA_TEXT,
    },
    {
        consequence: 'White text is hard to read on the page header and on primary buttons',
        foreground: 'content-on-brand',
        background: 'surface-header',
        threshold: AA_TEXT,
    },
    { consequence: 'Text on informational badges is hard to read', foreground: 'info', background: 'info-surface', threshold: AA_TEXT },
    {
        consequence: 'Informational status dots are hard to see on cards and dialogs',
        foreground: 'info-solid',
        background: 'surface-raised',
        threshold: AA_NON_TEXT,
    },
    {
        consequence: 'Input borders are hard to see on cards and dialogs',
        foreground: 'outline',
        background: 'surface-raised',
        threshold: AA_NON_TEXT,
    },
];

/**
 * The brand field a finding is filed under, which is the field the operator would change to answer it. `logo` carries
 * advice about an uploaded image rather than a colour, and has no contrast pairing behind it.
 */
export type FindingCategory = BrandColorKey | 'logo';

/**
 * Every finding the contrast measurement produces is a `warning`. `info` is for advice that measures nothing, such as
 * a note about an uploaded logo's shape.
 */
export type FindingSeverity = 'warning' | 'info';

export type ContrastFinding = {
    consequence: string;
    category: FindingCategory;
    theme: ResolvedTheme;
    foreground: string;
    background: string;
    ratio: number;
    threshold: number;
};

const findingsForTheme = (colors: BrandColors, theme: ResolvedTheme): ContrastFinding[] => {
    const branded = brandTokenValues(colors, theme);
    const sources = brandTokenSources(colors, theme);
    const tokens = { ...PLATFORM_TOKENS[theme], ...branded };
    const findings: ContrastFinding[] = [];

    for (const { consequence, foreground, background, threshold } of PAIRINGS) {
        // A pairing neither side of which branding reaches is the platform's own, and is already asserted at build
        // time. Reporting it would blame the operator's colours for something they did not change - and in the dark
        // composition, where Background and Text do not apply, that is most of the list.
        if (!(foreground in branded) && !(background in branded)) {
            continue;
        }

        const ratio = contrastRatio(tokens[foreground], tokens[background]);

        if (ratio < threshold) {
            findings.push({
                consequence,
                // Filed under the foreground where branding reaches it, and under the background otherwise: the text,
                // link or indicator is what the operator chose that colour to be, so it is the side they would go
                // back and change. A pairing with neither side branded never gets this far.
                category: sources[foreground] ?? sources[background],
                theme,
                foreground: tokens[foreground],
                background: tokens[background],
                // Rounded to the precision the warning states, so the number the operator reads is the number that
                // was compared against the threshold rather than one that rounds to look like it passes.
                ratio: Math.floor(ratio * 100) / 100,
                threshold,
            });
        }
    }

    return findings;
};

/**
 * Every AA failure the chosen colours would produce, in both compositions. Empty when the brand passes everywhere,
 * which is what lets the Appearance tab save without asking.
 */
export const brandContrastFindings = (colors: BrandColors): ContrastFinding[] => [
    ...findingsForTheme(colors, 'light'),
    ...findingsForTheme(colors, 'dark'),
];

/**
 * One thing the operator is told, ready to render: which field it is filed under, how loudly it speaks, the sentence
 * itself and the evidence behind it. Contrast is only one source of these - advice about anything else the brand
 * carries takes the same shape, so the dialog never has to know where a line came from.
 */
export type BrandFinding = {
    category: FindingCategory;
    severity: FindingSeverity;
    message: string;
    /** Evidence rather than message, shown under the sentence: what the colours reach and what they are asked for. */
    detail?: string;
};

/** One box in the dialog: everything filed under a single field, at the loudest severity any of it carries. */
export type BrandFindingGroup = {
    category: FindingCategory;
    severity: FindingSeverity;
    findings: BrandFinding[];
};

/** How far each search step moves the colour: fine enough to stay recognisable, coarse enough to settle quickly. */
const SUGGESTION_STEP = 0.05;

/**
 * A rank per category rather than a list of them: a `Record` makes a new `FindingCategory` a compile error here, where
 * a list would simply stop emitting that category's box and drop its findings in silence.
 */
const CATEGORY_RANK: Record<FindingCategory, number> = { primary: 0, secondary: 1, background: 2, text: 3, logo: 4 };

const CATEGORY_ORDER = (Object.keys(CATEGORY_RANK) as FindingCategory[]).sort((a, b) => CATEGORY_RANK[a] - CATEGORY_RANK[b]);

const describeThemes = (themes: readonly ResolvedTheme[]): string =>
    themes.length > 1 ? 'in the light and dark themes' : `in the ${themes[0]} theme`;

/**
 * One pairing as the single line it gets, however many compositions it failed in. A brand that misses the same
 * pairing on both sides of the theme switch has one thing wrong with it, not two.
 *
 * The lowest of the measured ratios is the one quoted, so the evidence is the worst case rather than the flattering
 * one.
 */
export const describeFinding = (findings: readonly [ContrastFinding, ...ContrastFinding[]]): BrandFinding => {
    const [{ consequence, category, threshold }] = findings;
    const ratio = Math.min(...findings.map((finding) => finding.ratio));

    return {
        category,
        severity: 'warning',
        message: `${consequence} ${describeThemes(findings.map(({ theme }) => theme))}.`,
        detail: `${ratio.toFixed(2)}:1, needs ${threshold}:1`,
    };
};

/** Everything the chosen colours cost, one line per pairing. Empty when the brand passes everywhere. */
export const brandFindings = (colors: BrandColors): BrandFinding[] => {
    const byPairing = new Map<string, [ContrastFinding, ...ContrastFinding[]]>();

    for (const finding of brandContrastFindings(colors)) {
        const merged = byPairing.get(finding.consequence);

        byPairing.set(finding.consequence, merged ? [...merged, finding] : [finding]);
    }

    return [...byPairing.values()].map(describeFinding);
};

/**
 * The nearest shade of the operator's own colour that clears every threshold filed under it without adding one to
 * any other field. Undefined when the colour is unset, when it already passes - there is nothing to suggest - or when no
 * shade of it would do.
 *
 * Darkening and lightening are both tried, in step, and the first candidate that silences the field wins - so the
 * suggestion is the smallest move away from what they chose rather than a colour picked for them. It is searched by
 * re-measuring the whole brand rather than by solving for a ratio, because one input drives a family and a step that
 * fixes text on the page can break white on the header.
 */
export const suggestBrandColor = (colors: BrandColors, category: BrandColorKey): string | undefined => {
    const chosen = colors[category];

    if (chosen === undefined) {
        return undefined;
    }

    const findingsFor = (candidate: string) => brandContrastFindings({ ...colors, [category]: candidate });
    const before = findingsFor(chosen);

    if (!before.some((finding) => finding.category === category)) {
        return undefined;
    }

    const identify = ({ category: field, theme, consequence }: ContrastFinding) => `${field}|${theme}|${consequence}`;
    const alreadyReported = new Set(before.map(identify));

    // Silencing its own category is not enough, and counting what is left is the wrong guard at any granularity: one
    // input drives several tokens, so a shade can lift a warning off an untouched field and drop a different one on it
    // without the count moving. Every finding a candidate leaves behind has to be one the operator was already shown.
    const isImprovement = (candidate: string) =>
        findingsFor(candidate).every((finding) => finding.category !== category && alreadyReported.has(identify(finding)));

    // Counted in steps rather than accumulated: adding 0.05 repeatedly overshoots 1 and drops the last candidate.
    for (let step = 1; step * SUGGESTION_STEP <= 1; step += 1) {
        const weight = step * SUGGESTION_STEP;

        for (const towards of ['black', 'white'] as const) {
            const candidate = mixOklab(chosen, towards === 'black' ? '#000000' : '#ffffff', 1 - weight);

            if (isImprovement(candidate)) {
                return candidate.toUpperCase();
            }
        }
    }

    return undefined;
};

/** Findings boxed by the field that causes them, in the order the Appearance tab lists those fields. */
export const groupBrandFindings = (findings: readonly BrandFinding[]): BrandFindingGroup[] =>
    CATEGORY_ORDER.flatMap((category) => {
        const inCategory = findings.filter((finding) => finding.category === category);

        if (inCategory.length === 0) {
            return [];
        }

        return [
            {
                category,
                severity: inCategory.some(({ severity }) => severity === 'warning') ? ('warning' as const) : ('info' as const),
                findings: inCategory,
            },
        ];
    });
