export type Rgb = { r: number; g: number; b: number };

const SHORTHAND_LENGTH = 3;
const FULL_LENGTH = 6;
const GAMMA_THRESHOLD = 0.03928;
const LUMINANCE_WEIGHTS = { r: 0.2126, g: 0.7152, b: 0.0722 };

const expandShorthand = (value: string): string =>
    value.length === SHORTHAND_LENGTH
        ? value
              .split('')
              .map((char) => char + char)
              .join('')
        : value;

/** Parses `#rgb`, `#rrggbb` or the same without the leading hash into 0-255 channels. */
export const hexToRgb = (hex: string): Rgb => {
    const normalised = expandShorthand(hex.trim().replace(/^#/, '').toLowerCase());

    if (normalised.length !== FULL_LENGTH || !/^[0-9a-f]{6}$/.test(normalised)) {
        throw new Error(`Invalid hex colour: ${hex}`);
    }

    return {
        r: Number.parseInt(normalised.slice(0, 2), 16),
        g: Number.parseInt(normalised.slice(2, 4), 16),
        b: Number.parseInt(normalised.slice(4, 6), 16),
    };
};

const channelLuminance = (channel: number): number => {
    const ratio = channel / 255;
    return ratio <= GAMMA_THRESHOLD ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
};

/** WCAG 2.1 relative luminance, 0 for black through 1 for white. */
export const relativeLuminance = ({ r, g, b }: Rgb): number =>
    LUMINANCE_WEIGHTS.r * channelLuminance(r) + LUMINANCE_WEIGHTS.g * channelLuminance(g) + LUMINANCE_WEIGHTS.b * channelLuminance(b);

/** WCAG 2.1 contrast ratio between two hex colours, from 1 to 21. Order independent. */
export const contrastRatio = (foreground: string, background: string): number => {
    const first = relativeLuminance(hexToRgb(foreground));
    const second = relativeLuminance(hexToRgb(background));
    const lighter = Math.max(first, second);
    const darker = Math.min(first, second);

    return (lighter + 0.05) / (darker + 0.05);
};

const toHexChannel = (channel: number): string => Math.round(channel).toString(16).padStart(2, '0');

/**
 * Flattens a translucent foreground colour (as painted by a Tailwind `/<alpha>` opacity modifier)
 * onto an opaque background, returning the resulting opaque hex colour. `alphaPercent` is 0-100,
 * matching the opacity modifier's own scale, so call sites can pass the exact number used in the
 * className (e.g. `bg-node-valid/62` composites with `alphaPercent: 62`).
 */
export const compositeOver = (foreground: string, background: string, alphaPercent: number): string => {
    const fg = hexToRgb(foreground);
    const bg = hexToRgb(background);
    const alpha = alphaPercent / 100;

    return `#${toHexChannel(alpha * fg.r + (1 - alpha) * bg.r)}${toHexChannel(alpha * fg.g + (1 - alpha) * bg.g)}${toHexChannel(alpha * fg.b + (1 - alpha) * bg.b)}`;
};
