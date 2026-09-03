import { describe, expect, test } from 'vitest';
import { mixOklab, rgbToHex } from './oklab';

/**
 * The authoritative check on this module is in the browser: `BrandTokens.spec.tsx` mixes the same colours with the
 * real `color-mix(in oklab, ...)` and compares the sRGB each side paints. What is asserted here is the algebra that
 * has to hold whatever the transform coefficients are, plus one value derived from first principles rather than from
 * the code.
 */
describe('oklab', () => {
    describe('mixOklab', () => {
        test('should return the first colour at full weight', () => {
            expect(mixOklab('#0073cf', '#ffffff', 1)).toBe('#0073cf');
        });

        test('should return the second colour at zero weight', () => {
            expect(mixOklab('#0073cf', '#ffffff', 0)).toBe('#ffffff');
        });

        test('should clamp a weight above one', () => {
            expect(mixOklab('#0073cf', '#ffffff', 1.5)).toBe('#0073cf');
        });

        test('should clamp a weight below zero', () => {
            expect(mixOklab('#0073cf', '#ffffff', -0.5)).toBe('#ffffff');
        });

        // For a grey, the three Oklab cone responses are equal, so L reduces to the cube root of the relative
        // luminance. The midpoint of white and black is therefore L = 0.5, hence luminance 0.125, which gamma-encodes
        // to 1.055 * 0.125^(1/2.4) - 0.055 = 0.3885 - that is 99, or #636363. Note that this is *not* the sRGB
        // midpoint #808080: mixing in a perceptual space is the whole point of using it.
        test('should place the white-black midpoint at Oklab lightness 0.5', () => {
            expect(mixOklab('#ffffff', '#000000', 0.5)).toBe('#636363');
        });

        test('should be symmetric in its operands', () => {
            expect(mixOklab('#ff0000', '#0000ff', 0.25)).toBe(mixOklab('#0000ff', '#ff0000', 0.75));
        });

        test('should preserve a colour when mixed with itself', () => {
            expect(mixOklab('#4a90d9', '#4a90d9', 0.37)).toBe('#4a90d9');
        });

        test('should move monotonically towards white as the white share grows', () => {
            const steps = [1, 0.75, 0.5, 0.25, 0].map((weight) => mixOklab('#0073cf', '#ffffff', weight));
            const blueChannels = steps.map((hex) => Number.parseInt(hex.slice(5, 7), 16));

            expect(blueChannels).toStrictEqual([...blueChannels].sort((first, second) => first - second));
            expect(steps.at(-1)).toBe('#ffffff');
        });

        // The sRGB gamut is not convex in Oklab, so this mix genuinely leaves it: the linear red channel comes out at
        // 1.10. Clipping is what the browser paints for the same mix, which `BrandTokens.spec.tsx` pins against a
        // real pixel; asserted here so the value cannot drift silently.
        test('should clip a mix that leaves the sRGB gamut to the colour a browser paints', () => {
            expect(mixOklab('#ff0033', '#ffffff', 0.6)).toBe('#ff8c87');
        });

        test('should always return a representable sRGB hex', () => {
            expect(mixOklab('#00ff00', '#0000ff', 0.5)).toMatch(/^#[0-9a-f]{6}$/);
            expect(mixOklab('#ff0033', '#ffffff', 0.7)).toMatch(/^#[0-9a-f]{6}$/);
        });

        test('should reject a colour that is not hex', () => {
            expect(() => mixOklab('rebeccapurple', '#ffffff', 0.5)).toThrow('Invalid hex colour');
        });
    });

    describe('rgbToHex', () => {
        test('should pad single-digit channels', () => {
            expect(rgbToHex({ r: 0, g: 8, b: 15 })).toBe('#00080f');
        });

        test('should round fractional channels', () => {
            expect(rgbToHex({ r: 0.4, g: 127.5, b: 254.6 })).toBe('#0080ff');
        });
    });
});
