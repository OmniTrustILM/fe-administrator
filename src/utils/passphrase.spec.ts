import { describe, expect, test } from 'vitest';
import { passphraseProblem } from './passphrase';

describe('passphraseProblem', () => {
    test('accepts twelve code points', () => {
        expect(passphraseProblem('correct horse')).toBeUndefined();
    });
    test('counts code points, not UTF-16 units', () => {
        expect(passphraseProblem('🔑'.repeat(11))).toBe('Use at least 12 characters');
    });
    test('refuses a blank passphrase', () => {
        expect(passphraseProblem('            ')).toBe('Use at least 12 characters');
    });
    test('refuses a passphrase not in NFC', () => {
        expect(passphraseProblem('café is too long here')).toBe('Use a passphrase in its composed form (NFC)');
    });
});
