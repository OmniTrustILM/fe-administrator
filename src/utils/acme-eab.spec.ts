import { SecretState, SecretType } from 'types/openapi';
import { describe, expect, test } from 'vitest';
import { isEabSecret, sameUuidSet, secretLabel } from './acme-eab';

describe('isEabSecret', () => {
    test('accepts enabled secretKey and generic secrets', () => {
        expect(isEabSecret({ type: SecretType.SecretKey, enabled: true, state: SecretState.Active })).toBe(true);
        expect(isEabSecret({ type: SecretType.Generic, enabled: true, state: SecretState.Active })).toBe(true);
    });

    test('rejects other types and disabled secrets', () => {
        expect(isEabSecret({ type: SecretType.BasicAuth, enabled: true, state: SecretState.Active })).toBe(false);
        expect(isEabSecret({ type: SecretType.SecretKey, enabled: false, state: SecretState.Active })).toBe(false);
    });

    test.each([SecretState.Failed, SecretState.PendingApproval, SecretState.Rejected])(
        'rejects a secret core cannot read (%s)',
        (state) => {
            expect(isEabSecret({ type: SecretType.SecretKey, enabled: true, state })).toBe(false);
        },
    );
});

describe('sameUuidSet', () => {
    test('ignores order and duplicates', () => {
        expect(sameUuidSet(['a', 'b'], ['b', 'a', 'a'])).toBe(true);
    });

    test('treats undefined as empty', () => {
        expect(sameUuidSet(undefined, [])).toBe(true);
        expect(sameUuidSet(undefined, ['a'])).toBe(false);
    });

    test('differs on a missing or extra uuid', () => {
        expect(sameUuidSet(['a'], ['a', 'b'])).toBe(false);
        expect(sameUuidSet(['a', 'b'], ['a'])).toBe(false);
    });
});

describe('secretLabel', () => {
    test('uses the secret name when known, else the uuid', () => {
        const secrets = [{ uuid: 's-1', name: 'EAB key one' }];
        expect(secretLabel('s-1', secrets)).toBe('EAB key one');
        expect(secretLabel('s-2', secrets)).toBe('s-2');
    });
});
