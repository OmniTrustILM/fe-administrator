import { SecretState, SecretType } from 'types/openapi';
import { describe, expect, test } from 'vitest';
import { eabRequestFields, isEabSecret, newEabSecretProblem, sameUuidSet, secretLabel } from './acme-eab';

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

describe('eabRequestFields', () => {
    const filled = { eabSecretUuids: ['s-1', 's-2'] };

    test('an edit that left the list as it was filled, even reordered, omits it', () => {
        expect(eabRequestFields(filled, filled)).toEqual({});
        expect(eabRequestFields({ eabSecretUuids: ['s-2', 's-1'] }, filled)).toEqual({});
    });

    test('an edit that cleared the list sends an empty array, which is what switches EAB off', () => {
        expect(eabRequestFields({ eabSecretUuids: [] }, filled)).toEqual({ eabSecretUuids: [] });
    });

    test('an edit that changed the list sends all of it', () => {
        expect(eabRequestFields({ eabSecretUuids: ['s-1', 's-3'] }, filled)).toEqual({ eabSecretUuids: ['s-1', 's-3'] });
    });

    test('a form that was never filled from the profile reads as unchanged, so it cannot clear the list', () => {
        const seeded = { eabSecretUuids: [] };
        expect(eabRequestFields(seeded, seeded)).toEqual({});
    });

    test('on create, an empty list is left out and a chosen one is sent', () => {
        expect(eabRequestFields({ eabSecretUuids: [] }, undefined)).toEqual({});
        expect(eabRequestFields({ eabSecretUuids: ['s-1'] }, undefined)).toEqual({ eabSecretUuids: ['s-1'] });
    });
});

describe('newEabSecretProblem', () => {
    test('an enabled secret without approval binds right away', () => {
        expect(newEabSecretProblem({ vaultProfileName: 'Vault One', needsApproval: false, enabled: true })).toBeUndefined();
    });

    test('a secret waiting for approval is left out, and enabling is asked for only when it did not happen', () => {
        expect(newEabSecretProblem({ vaultProfileName: 'Vault One', needsApproval: true, enabled: true })).toBe(
            'Not usable yet: vault profile Vault One requires approval of new secrets. Once this one is approved, add it to the profile.',
        );
        expect(newEabSecretProblem({ vaultProfileName: 'Vault One', needsApproval: true, enabled: false })).toContain(
            'Once this one is approved, enable it and add it to the profile.',
        );
    });

    test('a secret that could not be enabled is left out with the reason', () => {
        expect(
            newEabSecretProblem({ vaultProfileName: 'Vault One', needsApproval: false, enabled: false, enableError: 'Access Denied' }),
        ).toBe('Not usable: the secret could not be enabled (Access Denied). Enable it, then add it to the profile.');
        expect(newEabSecretProblem({ vaultProfileName: 'Vault One', needsApproval: false, enabled: false })).toBe(
            'Not usable: the secret could not be enabled. Enable it, then add it to the profile.',
        );
    });
});
