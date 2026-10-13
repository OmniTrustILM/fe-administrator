import type { Locator } from '@playwright/test';
import { relativeLuminance } from 'utils/contrast';

const channelsOf = (cssColour: string) => (cssColour.match(/\d+(\.\d+)?/g) ?? []).map(Number);

/**
 * WCAG contrast between an element's own text colour and its own background, as the browser computed them.
 *
 * Refuses an element that paints no background: its text sits on whatever is behind it, so a ratio taken against the
 * transparent value would describe a pairing the page does not show.
 */
export async function textContrast(locator: Locator): Promise<number> {
    const { colour, background } = await locator.evaluate((node) => {
        const style = getComputedStyle(node);
        return { colour: style.color, background: style.backgroundColor };
    });
    const [red, green, blue, alpha = 1] = channelsOf(background);

    if (alpha === 0) {
        throw new Error(`The element paints no background of its own (${background}), so there is nothing to measure its text against.`);
    }

    const [r, g, b] = channelsOf(colour);
    const [darker, lighter] = [relativeLuminance({ r, g, b }), relativeLuminance({ r: red, g: green, b: blue })].sort((x, y) => x - y);

    return (lighter + 0.05) / (darker + 0.05);
}
