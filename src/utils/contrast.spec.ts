import { describe, expect, test } from 'vitest';
import { compositeOver, contrastRatio, hexToRgb, relativeLuminance } from './contrast';

describe('contrast', () => {
    describe('hexToRgb', () => {
        test('should parse a six-digit hex', () => {
            expect(hexToRgb('#0073cf')).toEqual({ r: 0, g: 115, b: 207 });
        });

        test('should parse a three-digit shorthand hex', () => {
            expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
        });

        test('should parse without a leading hash', () => {
            expect(hexToRgb('171717')).toEqual({ r: 23, g: 23, b: 23 });
        });

        test('should be case insensitive', () => {
            expect(hexToRgb('#ABCDEF')).toEqual(hexToRgb('#abcdef'));
        });

        test('should throw on a malformed value', () => {
            expect(() => hexToRgb('#12345')).toThrow('Invalid hex colour: #12345');
        });
    });

    describe('relativeLuminance', () => {
        test('should return 0 for black', () => {
            expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBe(0);
        });

        test('should return 1 for white', () => {
            expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBe(1);
        });

        test('should apply the linear segment below the gamma threshold', () => {
            expect(relativeLuminance({ r: 8, g: 8, b: 8 })).toBeCloseTo(0.0024, 4);
        });
    });

    describe('contrastRatio', () => {
        test('should return 21 for black on white', () => {
            expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
        });

        test('should return 1 for identical colours', () => {
            expect(contrastRatio('#0073cf', '#0073cf')).toBeCloseTo(1, 5);
        });

        test('should be order independent', () => {
            expect(contrastRatio('#525252', '#ffffff')).toBeCloseTo(contrastRatio('#ffffff', '#525252'), 5);
        });

        test('should confirm the documented failure of gray-700 on white', () => {
            expect(contrastRatio('#8c8c8c', '#ffffff')).toBeLessThan(4.5);
        });

        test('should confirm the replacement muted colour passes AA', () => {
            expect(contrastRatio('#525252', '#ffffff')).toBeGreaterThanOrEqual(4.5);
        });
    });

    describe('compositeOver', () => {
        test('should return the background unchanged at 0% alpha', () => {
            expect(compositeOver('#1ab394', '#ffffff', 0)).toBe('#ffffff');
        });

        test('should return the foreground unchanged at 100% alpha', () => {
            expect(compositeOver('#1ab394', '#ffffff', 100)).toBe('#1ab394');
        });

        test('should flatten a translucent foreground over the background', () => {
            expect(compositeOver('#1ab394', '#ffffff', 62)).toBe('#71d0bd');
        });

        test('should flatten the same foreground differently over a dark background', () => {
            expect(compositeOver('#1ab394', '#171717', 62)).toBe('#197865');
        });
    });
});

describe('JsonViewer light palette', () => {
    test.each(['#1f2937', '#0550ae', '#0a7c42', '#b3246b', '#7c3aed', '#8a5a00'])(
        'should meet AA body contrast for %s on the light code background',
        (colour) => {
            expect(contrastRatio(colour, '#f5f5f5')).toBeGreaterThanOrEqual(4.5);
        },
    );
});

describe('JsonViewer dark palette', () => {
    test.each(['#c8d3f5', '#7aa2f7', '#9ece6a', '#f7768e', '#bb9af7', '#e0af68'])(
        'should meet AA body contrast for %s on the dark code background',
        (colour) => {
            expect(contrastRatio(colour, '#0b1220')).toBeGreaterThanOrEqual(4.5);
        },
    );
});
