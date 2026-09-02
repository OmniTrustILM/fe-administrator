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

import { brandTokenValues, type BrandColors } from './brand-tokens';
import { contrastRatio } from './contrast';
import type { ResolvedTheme } from './theme';

/** WCAG 2.1 1.4.3: body text and images of text. */
export const AA_TEXT = 4.5;

/** WCAG 2.1 1.4.11: user-interface components and meaningful graphics - borders, status dots, chart series. */
export const AA_NON_TEXT = 3;

const THEME_LABEL: Record<ResolvedTheme, string> = { light: 'Light theme', dark: 'Dark theme' };

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
    /** What the operator is being told about, in the terms the Appearance tab uses rather than token names. */
    label: string;
    foreground: string;
    background: string;
    threshold: number;
};

/**
 * The pairings `theme-tokens.spec.ts` covers, restricted to the ones branding can reach.
 *
 * White text is measured against `surface-header` only, and the label says it covers primary buttons too: the mapping
 * derives `brand-solid` and `surface-header` from Primary alike, so the two are the same colour and a second pairing
 * would only repeat the finding. `brand-contrast.spec.ts` asserts that invariant, so the label cannot quietly go stale.
 *
 * `compositeOver` from `contrast.ts` has no call site here on purpose: no branded token is painted through an opacity
 * modifier, so there is no translucent fill to flatten. The flow chart, which is where that happens, is not branded.
 */
const PAIRINGS: readonly Pairing[] = [
    { label: 'Body text on the page background', foreground: 'content', background: 'surface', threshold: AA_TEXT },
    { label: 'Body text on cards and dialogs', foreground: 'content', background: 'surface-raised', threshold: AA_TEXT },
    { label: 'Body text on inset panels', foreground: 'content', background: 'surface-sunken', threshold: AA_TEXT },
    { label: 'Secondary text on the page background', foreground: 'content-muted', background: 'surface', threshold: AA_TEXT },
    { label: 'Secondary text on cards and dialogs', foreground: 'content-muted', background: 'surface-raised', threshold: AA_TEXT },
    { label: 'Hint text on cards and dialogs', foreground: 'content-subtle', background: 'surface-raised', threshold: AA_TEXT },
    { label: 'Links and active states on cards and dialogs', foreground: 'brand', background: 'surface-raised', threshold: AA_TEXT },
    {
        label: 'White text on the page header and primary buttons',
        foreground: 'content-on-brand',
        background: 'surface-header',
        threshold: AA_TEXT,
    },
    { label: 'Informational text on its badge', foreground: 'info', background: 'info-surface', threshold: AA_TEXT },
    {
        label: 'Informational indicators on cards and dialogs',
        foreground: 'info-solid',
        background: 'surface-raised',
        threshold: AA_NON_TEXT,
    },
    { label: 'Input borders on cards and dialogs', foreground: 'outline', background: 'surface-raised', threshold: AA_NON_TEXT },
];

export type ContrastFinding = {
    label: string;
    theme: ResolvedTheme;
    themeLabel: string;
    foreground: string;
    background: string;
    ratio: number;
    threshold: number;
};

const findingsForTheme = (colors: BrandColors, theme: ResolvedTheme): ContrastFinding[] => {
    const branded = brandTokenValues(colors, theme);
    const tokens = { ...PLATFORM_TOKENS[theme], ...branded };
    const findings: ContrastFinding[] = [];

    for (const { label, foreground, background, threshold } of PAIRINGS) {
        // A pairing neither side of which branding reaches is the platform's own, and is already asserted at build
        // time. Reporting it would blame the operator's colours for something they did not change - and in the dark
        // composition, where Background and Text do not apply, that is most of the list.
        if (!(foreground in branded) && !(background in branded)) {
            continue;
        }

        const ratio = contrastRatio(tokens[foreground], tokens[background]);

        if (ratio < threshold) {
            findings.push({
                label,
                theme,
                themeLabel: THEME_LABEL[theme],
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

/** One finding as a sentence: what fails, in which theme, by how much. */
export const describeFinding = ({ label, themeLabel, ratio, threshold }: ContrastFinding): string =>
    `${themeLabel}: ${label} reaches ${ratio.toFixed(2)}:1, below the required ${threshold}:1.`;
