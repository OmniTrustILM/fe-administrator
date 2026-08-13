import { contrastRatio } from './contrast';

/**
 * The two `surface-raised` values a chart series, legend swatch or status dot can be painted on.
 * These colours are chosen in JS rather than through a Tailwind token, so they cannot flip with
 * the theme: a single value has to be legible on both. The pair is duplicated from the stylesheet
 * because the choice happens before any element exists to read a custom property from;
 * chart-contrast.spec.ts asserts it still matches the tokens.
 */
export const CHART_SURFACES = ['#ffffff', '#171717'] as const;

/** WCAG 1.4.11: a graphic that carries meaning needs 3:1 against its background. */
export const CHART_MIN_CONTRAST = 3;

/** Whether a colour is legible as a chart series or status dot in both themes. */
export const meetsChartContrast = (colour: string): boolean =>
    CHART_SURFACES.every((surface) => contrastRatio(colour, surface) >= CHART_MIN_CONTRAST);

const toHexChannel = (channel: number): string =>
    Math.round(255 * channel)
        .toString(16)
        .padStart(2, '0');

const hslToHex = (hue: number, saturation: number, lightness: number): string => {
    const l = lightness / 100;
    const a = (saturation * Math.min(l, 1 - l)) / 100;
    const channel = (n: number) => {
        const k = (n + hue / 30) % 12;
        return toHexChannel(l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1));
    };

    return `#${channel(0)}${channel(8)}${channel(4)}`;
};

const LIGHTNESS_STEP = 0.5;

/**
 * Renders an HSL colour as hex, darkening or lightening it until it clears
 * {@link CHART_MIN_CONTRAST} against both surfaces. Only the lightness moves, so the hue that
 * distinguishes one generated series from the next is preserved. Mid-luminance hues are returned
 * unchanged; the ones that need the nudge are the very light (yellow, cyan) and very dark (pure
 * blue) ends, which would otherwise vanish into one theme or the other.
 */
export const toChartHex = (hue: number, saturation: number, lightness: number): string => {
    const preferred = hslToHex(hue, saturation, lightness);

    if (meetsChartContrast(preferred)) {
        return preferred;
    }

    for (let delta = LIGHTNESS_STEP; delta <= 100; delta += LIGHTNESS_STEP) {
        for (const candidate of [lightness - delta, lightness + delta]) {
            if (candidate < 0 || candidate > 100) {
                continue;
            }

            const colour = hslToHex(hue, saturation, candidate);

            if (meetsChartContrast(colour)) {
                return colour;
            }
        }
    }

    return preferred;
};
