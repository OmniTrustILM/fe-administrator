import { describe, expect, test } from 'vitest';
import { keystorePassphraseProblem, passphraseProblem } from './passphrase';

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

describe('keystorePassphraseProblem', () => {
    test('accepts a printable-ASCII passphrase, spaces and symbols included', () => {
        expect(keystorePassphraseProblem('correct horse ~!@#')).toBeUndefined();
    });
    test('refuses a character outside printable ASCII', () => {
        expect(keystorePassphraseProblem('correct horse caf\u00e9')).toBe(
            'Use printable ASCII characters only, so every tool, including Java keytool, can open the file',
        );
    });
    test.each(['correct horse \x1F', 'correct horse \x7F'])('refuses a control character: %j', (value) => {
        expect(keystorePassphraseProblem(value)).toBe(
            'Use printable ASCII characters only, so every tool, including Java keytool, can open the file',
        );
    });
    test('refuses a decomposed passphrase as outside printable ASCII, not as not in NFC', () => {
        expect(keystorePassphraseProblem('correct horse cafe\u0301')).toBe(
            'Use printable ASCII characters only, so every tool, including Java keytool, can open the file',
        );
    });
    test('refuses a short passphrase first, whatever its characters', () => {
        expect(keystorePassphraseProblem('caf\u00e9')).toBe('Use at least 12 characters');
    });
});
