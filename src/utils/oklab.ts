/**
 * Oklab colour mixing, matching CSS `color-mix(in oklab, ...)`.
 *
 * The branding token layer derives its intermediate steps in CSS, so the browser does the mixing that the operator
 * actually sees. The contrast warning has to evaluate those same steps before they are rendered, which means a second
 * implementation of the mix - in JS - or a warning that describes colours the page will not use. This module is that
 * second implementation, and `oklab.spec.ts` pins it against values produced by the CSS function.
 *
 * Only opaque colours are mixed. `color-mix` premultiplies alpha; with both sides opaque that reduces to a straight
 * linear interpolation of the three Oklab coordinates, which is what this does.
 *
 * Transform coefficients are Björn Ottosson's, from the Oklab reference (https://bottosson.github.io/posts/oklab/).
 */

import { hexToRgb, type Rgb } from './contrast';

type Oklab = { l: number; a: number; b: number };

const SRGB_MAX = 255;
const GAMMA_TO_LINEAR_THRESHOLD = 0.04045;
const LINEAR_TO_GAMMA_THRESHOLD = 0.0031308;

const toLinear = (channel: number): number => (channel <= GAMMA_TO_LINEAR_THRESHOLD ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);

const toGamma = (channel: number): number =>
    channel <= LINEAR_TO_GAMMA_THRESHOLD ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const rgbToOklab = ({ r, g, b }: Rgb): Oklab => {
    const red = toLinear(r / SRGB_MAX);
    const green = toLinear(g / SRGB_MAX);
    const blue = toLinear(b / SRGB_MAX);

    const long = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
    const medium = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
    const short = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);

    return {
        l: 0.2104542553 * long + 0.793617785 * medium - 0.0040720468 * short,
        a: 1.9779984951 * long - 2.428592205 * medium + 0.4505937099 * short,
        b: 0.0259040371 * long + 0.7827717662 * medium - 0.808675766 * short,
    };
};

const oklabToRgb = ({ l, a, b }: Oklab): Rgb => {
    const long = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const medium = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const short = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;

    const red = 4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short;
    const green = -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short;
    const blue = -0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short;

    // Clamped rather than gamut-mapped: a mix of two in-gamut sRGB colours only leaves the gamut through rounding, so
    // there is nothing to map back. Browsers clip the same way for `in oklab`.
    return {
        r: clamp01(toGamma(red)) * SRGB_MAX,
        g: clamp01(toGamma(green)) * SRGB_MAX,
        b: clamp01(toGamma(blue)) * SRGB_MAX,
    };
};

const toHexChannel = (channel: number): string => Math.round(channel).toString(16).padStart(2, '0');

export const rgbToHex = ({ r, g, b }: Rgb): string => `#${toHexChannel(r)}${toHexChannel(g)}${toHexChannel(b)}`;

/**
 * Mixes two hex colours in Oklab, `firstWeight` being the share of the first as a fraction from 0 to 1. Equivalent to
 * `color-mix(in oklab, <first> <firstWeight * 100>%, <second>)`.
 */
export const mixOklab = (first: string, second: string, firstWeight: number): string => {
    const weight = clamp01(firstWeight);
    const from = rgbToOklab(hexToRgb(first));
    const to = rgbToOklab(hexToRgb(second));

    return rgbToHex(
        oklabToRgb({
            l: from.l * weight + to.l * (1 - weight),
            a: from.a * weight + to.a * (1 - weight),
            b: from.b * weight + to.b * (1 - weight),
        }),
    );
};
