import { describe, expect, test } from 'vitest';
import { getInputStringFromIso8601String, getIso8601StringFromInputString, getMillisecondsFromIso8601String } from './duration';

describe('duration', () => {
    describe('getInputStringFromIso8601String', () => {
        test.each([
            ['PT1H', '1h'],
            ['PT30M', '30m'],
            ['P1D', '1d'],
            ['PT0.1S', '100ms'],
            ['PT0S', ''],
            ['', ''],
            ['invalid', ''],
            ['P1W', '7d'],
        ])('should parse %s to "%s"', (input, expected) => {
            expect(getInputStringFromIso8601String(input)).toBe(expected);
        });

        test.each([
            ['PT1H30M', ['1h', '30m']],
            ['PT1.5S', ['1s', '500ms']],
            ['PT90S', ['1m', '30s']],
            ['PT90M', ['1h', '30m']],
            ['PT25H', ['1d', '1h']],
            ['PT1.5M', ['1m', '30s']],
            ['PT1.5H', ['1h', '30m']],
        ])('should parse %s to contain parts %s', (input, expectedParts) => {
            const result = getInputStringFromIso8601String(input);
            for (const part of expectedParts) {
                expect(result).toContain(part);
            }
        });

        test('should not produce invalid 1000ms when seconds value rounds up (PT0.9995S)', () => {
            const result = getInputStringFromIso8601String('PT0.9995S');
            expect(result).not.toContain('1000ms');
            expect(result).toBe('1s');
        });
    });

    describe('getIso8601StringFromInputString', () => {
        test.each([
            ['1h', 'PT1H'],
            ['30m', 'PT30M'],
            ['1d', 'P1D'],
            ['500ms', 'PT0.5S'],
            ['1s 500ms', 'PT1.5S'],
        ])('should convert "%s" to %s', (input, expected) => {
            expect(getIso8601StringFromInputString(input)).toBe(expected);
        });

        test('should convert 1d 2h 30m', () => {
            const result = getIso8601StringFromInputString('1d 2h 30m');
            expect(result).toContain('1D');
            expect(result).toContain('2H');
            expect(result).toContain('30M');
        });

        test.each([
            ['1d 2h 30m 45s 500ms', ['1d', '2h', '30m', '45s', '500ms']],
            ['1d 2h 30m 45s', ['1d', '2h', '30m', '45s']],
        ])('should roundtrip "%s"', (input, expectedParts) => {
            const iso = getIso8601StringFromInputString(input);
            const back = getInputStringFromIso8601String(iso);
            for (const part of expectedParts) {
                expect(back).toContain(part);
            }
        });
    });

    describe('getMillisecondsFromIso8601String', () => {
        test.each([
            ['PT1S', 1000],
            ['PT1H', 3600000],
            ['PT30S', 30000],
            ['PT0.5S', 500],
            ['P1D', 86400000],
            ['PT1H30M', 5400000],
            ['PT0S', 0],
        ])('parses %s to %d ms', (input, expected) => {
            expect(getMillisecondsFromIso8601String(input)).toBe(expected);
        });

        test('returns undefined for empty/nullish values', () => {
            expect(getMillisecondsFromIso8601String('')).toBeUndefined();
            expect(getMillisecondsFromIso8601String(undefined)).toBeUndefined();
            expect(getMillisecondsFromIso8601String(null)).toBeUndefined();
        });

        test.each(['garbage', 'PT', 'P', '1H', 'PT1X', 'P1H', '   '])('returns undefined for invalid input %p', (input) => {
            expect(getMillisecondsFromIso8601String(input)).toBeUndefined();
        });

        test('orders durations correctly', () => {
            const drift = getMillisecondsFromIso8601String('PT0.5S')!;
            const accuracy = getMillisecondsFromIso8601String('PT1S')!;
            expect(drift).toBeLessThan(accuracy);
        });
    });
});
