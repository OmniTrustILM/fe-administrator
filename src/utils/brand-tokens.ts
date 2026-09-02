/**
 * Turns the operator's four brand colours into an override layer over the semantic colour tokens.
 *
 * Four inputs cannot drive thirty tokens one-to-one, so each input drives a *family* and the intermediate steps are
 * derived rather than configured. The derivations live in one table, {@link BRAND_TOKEN_RULES}, which is rendered two
 * ways: to CSS here, and to concrete hex values by `brand-contrast.ts`. Both readings therefore describe the same
 * colours, which is what lets the contrast warning speak about what the page will actually show.
 *
 * The overrides are emitted as a separate stylesheet rather than by editing `tailwindcss.css`, for two reasons. An
 * unbranded instance then produces no override at all, so its rendering is unchanged by construction rather than by
 * a fallback that has to be kept in step with the platform palette; and the two selectors used here -
 * `html:not(.dark)` and `html.dark` - outrank the base `:root` and `.dark` blocks on specificity, so the layer wins
 * without depending on where the browser happens to order the stylesheets.
 *
 * Values are written to the tier-2 custom properties (`--brand`, `--surface`, ...). The `--color-*` names are never
 * written: `@theme inline` does not emit those into `:root`, it only feeds Tailwind's utility generator, so setting
 * one parses and resolves to nothing.
 */

import { isBrandColor } from './branding';
import { mixOklab } from './oklab';
import type { ResolvedTheme } from './theme';

export type BrandColorKey = 'primary' | 'secondary' | 'background' | 'text';

/** The operator's inputs, keyed by role. Partial: a colour that is unset simply drives nothing. */
export type BrandColors = Partial<Record<BrandColorKey, string>>;

export const BRAND_TOKENS_STYLE_ID = 'brand-tokens';

/**
 * The generated override CSS, cached for the next load's first paint. Branding is server-held, so without a cache the
 * pre-paint script in `index.html` has nothing to apply and every load would flash the platform palette before the
 * branding response lands.
 */
export const BRAND_CSS_STORAGE_KEY = 'theme-brand-css';

/** One derived step: the input it comes from, and optionally how far it is mixed towards white or black. */
type Step = { source: BrandColorKey; towards?: 'white' | 'black'; weight?: number };

/** One token's override. A theme left out is not overridden there, so it keeps its platform value. */
type Rule = { token: string; light?: Step; dark?: Step };

/**
 * The colour-to-token mapping, as ratified by the Epic.
 *
 * Primary and Secondary apply to both compositions; Background and Text apply to the light one only, and no colour is
 * inverted to derive the other theme - the dark composition keeps its own surfaces and content, which is what keeps it
 * readable whatever the operator chose against a light page.
 *
 * Deliberately absent, and not to be added without a design decision: `success`, `danger` and `warning`, which must
 * keep their conventional meaning; the `node-*` family, which encodes certificate status in the flow chart;
 * `content-inverse` and `content-on-brand`, which are the fixed foregrounds the branded fills are measured against;
 * and `divider`, `outline` and `code-color`.
 *
 * The weights reproduce the relationships the platform palette already has - a hover a step darker, a subtle surface a
 * wash of the same hue, a dark-theme foreground lightened for contrast - so a brand set to the platform's own blue
 * lands close to the platform's own look: the dark-theme lift of 30% white takes it to 6.4:1 against the dark card,
 * where the platform's own hand-picked value sits at 6.1:1.
 *
 * A fixed lift cannot rescue every input. A near-black Primary stays under AA as a dark-theme link however it is
 * mixed, and lifting it far enough to pass would no longer be the colour the operator chose - so it is warned about
 * rather than silently corrected. That warning is `brand-contrast.ts`, and warning is the ratified behaviour.
 */
export const BRAND_TOKEN_RULES: readonly Rule[] = [
    // Primary: foreground, fill and header. `brand` lightens in dark mode for contrast; `brand-solid` stays put in
    // both, because `content-on-brand` white is measured against it and is not itself branded.
    { token: 'brand', light: { source: 'primary' }, dark: { source: 'primary', towards: 'white', weight: 0.7 } },
    { token: 'brand-solid', light: { source: 'primary' }, dark: { source: 'primary' } },
    {
        token: 'brand-solid-hover',
        light: { source: 'primary', towards: 'black', weight: 0.8 },
        dark: { source: 'primary', towards: 'black', weight: 0.8 },
    },
    {
        token: 'brand-hover',
        light: { source: 'primary', towards: 'black', weight: 0.8 },
        dark: { source: 'primary', towards: 'white', weight: 0.5 },
    },
    {
        token: 'brand-subtle',
        light: { source: 'primary', towards: 'white', weight: 0.1 },
        dark: { source: 'primary', towards: 'black', weight: 0.42 },
    },
    { token: 'surface-header', light: { source: 'primary' }, dark: { source: 'primary' } },

    // Secondary: accents, chips and informational badges, which the stylesheet expresses as the `info` family.
    { token: 'info', light: { source: 'secondary' }, dark: { source: 'secondary', towards: 'white', weight: 0.7 } },
    {
        token: 'info-surface',
        light: { source: 'secondary', towards: 'white', weight: 0.1 },
        dark: { source: 'secondary', towards: 'black', weight: 0.42 },
    },
    { token: 'info-solid', light: { source: 'secondary' }, dark: { source: 'secondary' } },

    // Background: the page and the surfaces layered on it. Raised goes towards white, the sunken and interactive
    // states towards black, which is the ordering the platform surfaces already have.
    { token: 'surface', light: { source: 'background' } },
    { token: 'surface-raised', light: { source: 'background', towards: 'white', weight: 0.6 } },
    { token: 'surface-sunken', light: { source: 'background', towards: 'black', weight: 0.97 } },
    { token: 'surface-hover', light: { source: 'background', towards: 'black', weight: 0.93 } },
    { token: 'surface-active', light: { source: 'background', towards: 'black', weight: 0.87 } },

    // Text: body copy and the two quieter weights below it. Both weights are set against the platform's own ramp,
    // which clears AA with room to spare - #525252 at 7.8:1 and #6e6e6e at 5.1:1 on white - so a brand Text a shade
    // lighter than the platform's does not immediately drag the quietest weight under the threshold.
    { token: 'content', light: { source: 'text' } },
    { token: 'content-muted', light: { source: 'text', towards: 'white', weight: 0.78 } },
    { token: 'content-subtle', light: { source: 'text', towards: 'white', weight: 0.66 } },
];

const MIX_TARGET_HEX: Record<'white' | 'black', string> = { white: '#ffffff', black: '#000000' };

/** Trailing zeros trimmed, so a weight of 0.8 reads as `80%` rather than `80.0%`. */
const toPercent = (weight: number): string => String(Number((weight * 100).toFixed(1)));

/** The colours the operator has actually set, as recognisable hex. Anything else drives nothing rather than guessing. */
export const brandColors = (branding: {
    primaryColor?: string | null;
    secondaryColor?: string | null;
    backgroundColor?: string | null;
    textColor?: string | null;
}): BrandColors => {
    const inputs: ReadonlyArray<[BrandColorKey, string | null | undefined]> = [
        ['primary', branding.primaryColor],
        ['secondary', branding.secondaryColor],
        ['background', branding.backgroundColor],
        ['text', branding.textColor],
    ];
    const colors: BrandColors = {};

    for (const [key, value] of inputs) {
        if (typeof value === 'string' && isBrandColor(value)) {
            colors[key] = value.toLowerCase();
        }
    }

    return colors;
};

/** The CSS value for one step, or undefined when the input it derives from is unset. */
const stepToCss = (colors: BrandColors, step: Step): string | undefined => {
    const source = colors[step.source];

    if (!source) {
        return undefined;
    }

    if (!step.towards || step.weight === undefined) {
        return source;
    }

    return `color-mix(in oklab, ${source} ${toPercent(step.weight)}%, ${step.towards})`;
};

/** The hex value for one step, or undefined when the input it derives from is unset. */
const stepToHex = (colors: BrandColors, step: Step): string | undefined => {
    const source = colors[step.source];

    if (!source) {
        return undefined;
    }

    if (!step.towards || step.weight === undefined) {
        return source;
    }

    return mixOklab(source, MIX_TARGET_HEX[step.towards], step.weight);
};

/**
 * The tokens branding overrides in one composition, resolved to hex. This is what the page will render, so it is also
 * what the contrast warning measures - the CSS below carries the same table.
 */
export const brandTokenValues = (colors: BrandColors, theme: ResolvedTheme): Record<string, string> => {
    const values: Record<string, string> = {};

    for (const rule of BRAND_TOKEN_RULES) {
        const step = rule[theme];
        const value = step && stepToHex(colors, step);

        if (value) {
            values[rule.token] = value;
        }
    }

    return values;
};

const declarations = (colors: BrandColors, theme: ResolvedTheme): string => {
    const parts: string[] = [];

    for (const rule of BRAND_TOKEN_RULES) {
        const step = rule[theme];
        const value = step && stepToCss(colors, step);

        if (value) {
            parts.push(`--${rule.token}:${value};`);
        }
    }

    return parts.join('');
};

/**
 * The override stylesheet for a set of brand colours, or undefined when there is nothing to override.
 *
 * `html:not(.dark)` and `html.dark` are used rather than `:root` and `.dark` so that each block outranks the base
 * stylesheet on specificity: the light-only families must beat the base `.dark` block while it is not in force, and
 * must stop applying the moment it is.
 */
export const brandTokenCss = (colors: BrandColors): string | undefined => {
    const light = declarations(colors, 'light');
    const dark = declarations(colors, 'dark');

    if (!light && !dark) {
        return undefined;
    }

    const blocks: string[] = [];

    if (light) {
        blocks.push(`html:not(.dark){${light}}`);
    }
    if (dark) {
        blocks.push(`html.dark{${dark}}`);
    }

    return blocks.join('\n');
};

/** Applies the override stylesheet to the document, or removes it when there is no branding to apply. */
export const applyBrandTokens = (css: string | undefined): void => {
    const existing = document.getElementById(BRAND_TOKENS_STYLE_ID);

    if (css === undefined) {
        existing?.remove();
        return;
    }

    if (existing) {
        if (existing.textContent !== css) {
            existing.textContent = css;
        }
        return;
    }

    const style = document.createElement('style');

    style.id = BRAND_TOKENS_STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
};

/** Caches the override stylesheet for the next load's first paint. `undefined` clears it, so unbranding takes effect. */
export const storeBrandCss = (css: string | undefined): void => {
    try {
        if (css === undefined) {
            globalThis.localStorage?.removeItem(BRAND_CSS_STORAGE_KEY);
        } else {
            globalThis.localStorage?.setItem(BRAND_CSS_STORAGE_KEY, css);
        }
    } catch {
        // Storage can be unavailable through private browsing, disabled cookies or an exceeded quota. The cache is an
        // optimisation for the next load's first paint, never required for this one.
    }
};
