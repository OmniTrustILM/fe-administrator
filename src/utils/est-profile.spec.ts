import {
    CertificateSubjectType,
    type EstProfileDetailDto,
    EstAuthenticationPolicy,
    FilterConditionOperator,
    FilterFieldSource,
    KeyAlgorithm,
    SecretState,
    SecretType,
} from 'types/openapi';
import { describe, expect, test } from 'vitest';
import {
    EST_TRUSTED_CA_FILTERS,
    type EstProfileFormValues,
    buildEstProfileCreateRequest,
    buildEstProfileEditRequest,
    canExportKeyPair,
    estProfileFormValues,
    hasCustomResponseTiming,
    isEstBasicAuthSecret,
    isReservedEstLabel,
    responseTimingSummary,
    showsBasicCredentialSecrets,
    showsTrustedCaCertificates,
    validateEstProfile,
} from './est-profile';

const values = (overrides: Partial<EstProfileFormValues> = {}): EstProfileFormValues => ({
    ...estProfileFormValues(),
    name: 'est-devices',
    authenticationPolicy: EstAuthenticationPolicy.CertificateRegistration,
    ...overrides,
});

describe('field visibility', () => {
    test('basic credential secrets show only for raBasic', () => {
        expect(showsBasicCredentialSecrets(EstAuthenticationPolicy.RaBasic)).toBe(true);
        expect(showsBasicCredentialSecrets(EstAuthenticationPolicy.RaMtls)).toBe(false);
        expect(showsBasicCredentialSecrets(undefined)).toBe(false);
    });

    test('trusted CA certificates show only for the certificate policies', () => {
        expect(showsTrustedCaCertificates(EstAuthenticationPolicy.VendorMtls)).toBe(true);
        expect(showsTrustedCaCertificates(EstAuthenticationPolicy.RaMtls)).toBe(true);
        expect(showsTrustedCaCertificates(EstAuthenticationPolicy.RaBasic)).toBe(false);
        expect(showsTrustedCaCertificates(undefined)).toBe(false);
    });
});

describe('isReservedEstLabel', () => {
    test.each(['cacerts', 'csrattrs', 'simpleenroll', 'simplereenroll', 'serverkeygen', 'fullcmc', '.', '..'])('reserves %s', (label) => {
        expect(isReservedEstLabel(label)).toBe(true);
    });

    test('compares operation names ignoring case', () => {
        expect(isReservedEstLabel('CaCerts')).toBe(true);
    });

    test('allows other labels, including a dot segment with other characters', () => {
        expect(isReservedEstLabel('est-devices')).toBe(false);
        expect(isReservedEstLabel('...')).toBe(false);
        expect(isReservedEstLabel('')).toBe(false);
    });
});

describe('validateEstProfile', () => {
    test('accepts a complete profile', () => {
        expect(validateEstProfile(values(), { creating: true })).toEqual({});
    });

    test('rejects a reserved name on create only', () => {
        expect(validateEstProfile(values({ name: 'simpleenroll' }), { creating: true }).name).toBeDefined();
        expect(validateEstProfile(values({ name: 'simpleenroll' }), { creating: false }).name).toBeUndefined();
    });

    test('requires an authentication policy', () => {
        expect(validateEstProfile(values({ authenticationPolicy: undefined }), { creating: false }).authenticationPolicy).toBeDefined();
    });

    test('raBasic requires secrets', () => {
        const raBasic = { authenticationPolicy: EstAuthenticationPolicy.RaBasic };
        expect(validateEstProfile(values(raBasic), { creating: false }).basicCredentialSecretUuids).toBeDefined();
        expect(validateEstProfile(values({ ...raBasic, basicCredentialSecretUuids: ['s-1'] }), { creating: false })).toEqual({});
    });

    test.each([EstAuthenticationPolicy.VendorMtls, EstAuthenticationPolicy.RaMtls])('%s requires trusted CAs', (authenticationPolicy) => {
        expect(validateEstProfile(values({ authenticationPolicy }), { creating: false }).trustedCaCertificateUuids).toBeDefined();
        expect(validateEstProfile(values({ authenticationPolicy, trustedCaCertificateUuids: ['c-1'] }), { creating: false })).toEqual({});
    });

    test('key recovery requires a token profile once server key generation is on', () => {
        const recovery = { serverKeyGeneration: true, keyRecovery: true };
        expect(validateEstProfile(values(recovery), { creating: false }).keyRecoveryTokenProfileUuid).toBeDefined();
        expect(validateEstProfile(values({ ...recovery, keyRecoveryTokenProfileUuid: 't-1' }), { creating: false })).toEqual({});
    });

    test('key recovery without server key generation is ignored, as the request drops it', () => {
        expect(validateEstProfile(values({ keyRecovery: true }), { creating: false })).toEqual({});
    });

    test('a renewal threshold must be a whole number of 0 or more when set', () => {
        const error = (renewalThreshold: string) => validateEstProfile(values({ renewalThreshold }), { creating: false }).renewalThreshold;
        expect(error('')).toBeUndefined();
        expect(error('  ')).toBeUndefined();
        expect(error('0')).toBeUndefined();
        expect(error('30')).toBeUndefined();
        expect(error('-1')).toBeDefined();
        expect(error('1.5')).toBeDefined();
        expect(error('abc')).toBeDefined();
    });

    test('response timing values must be whole seconds at or above their minimum', () => {
        const errors = (overrides: Partial<EstProfileFormValues>) => validateEstProfile(values(overrides), { creating: false });
        expect(errors({ issueWaitTimeout: '0', retryAfter: '1', serverKeyGenerationTimeout: '1' })).toEqual({});
        expect(errors({ issueWaitTimeout: ' 600 ' })).toEqual({});
        expect(errors({ issueWaitTimeout: '' }).issueWaitTimeout).toBe('Enter a whole number of seconds, 0 or more.');
        expect(errors({ issueWaitTimeout: '-1' }).issueWaitTimeout).toBeDefined();
        expect(errors({ retryAfter: '0' }).retryAfter).toBe('Enter a whole number of seconds, 1 or more.');
        expect(errors({ retryAfter: '1.5' }).retryAfter).toBeDefined();
        expect(errors({ serverKeyGenerationTimeout: 'abc' }).serverKeyGenerationTimeout).toBeDefined();
    });
});

describe('response timing', () => {
    test('defaults are not custom; any changed value is', () => {
        expect(hasCustomResponseTiming(values())).toBe(false);
        expect(hasCustomResponseTiming(values({ issueWaitTimeout: '0' }))).toBe(true);
        expect(hasCustomResponseTiming(values({ retryAfter: '60' }))).toBe(true);
        expect(hasCustomResponseTiming(values({ serverKeyGenerationTimeout: '31' }))).toBe(true);
    });

    test('the summary line shows the current values', () => {
        expect(responseTimingSummary(values({ issueWaitTimeout: '5' }))).toBe(
            'Response timing: wait 5 s · Retry-After 30 s · key generation wait 30 s',
        );
    });
});

describe('request building', () => {
    test('create sends the name and the visible values', () => {
        const request = buildEstProfileCreateRequest(
            values({
                description: 'Devices',
                raProfileUuid: 'ra-1',
                systemDefault: true,
                authenticationPolicy: EstAuthenticationPolicy.RaBasic,
                basicCredentialSecretUuids: ['s-1'],
                trustedCaCertificateUuids: ['c-1'],
                renewalThreshold: '14',
            }),
        );
        expect(request).toMatchObject({
            name: 'est-devices',
            description: 'Devices',
            raProfileUuid: 'ra-1',
            systemDefault: true,
            authenticationPolicy: EstAuthenticationPolicy.RaBasic,
            basicCredentialSecretUuids: ['s-1'],
            trustedCaCertificateUuids: [],
            allowRenewal: true,
            allowRekey: true,
            renewalThreshold: 14,
            issueWaitTimeout: 10,
            retryAfter: 30,
            serverKeyGenerationTimeout: 30,
        });
    });

    test('create and edit send the response timing as numbers', () => {
        const timing = { issueWaitTimeout: '0', retryAfter: '7', serverKeyGenerationTimeout: '45' };
        const expected = { issueWaitTimeout: 0, retryAfter: 7, serverKeyGenerationTimeout: 45 };
        expect(buildEstProfileCreateRequest(values(timing))).toMatchObject(expected);
        expect(buildEstProfileEditRequest(values(timing))).toMatchObject(expected);
    });

    test('mTLS policies keep CAs and drop secrets', () => {
        const request = buildEstProfileCreateRequest(
            values({
                authenticationPolicy: EstAuthenticationPolicy.VendorMtls,
                basicCredentialSecretUuids: ['s-1'],
                trustedCaCertificateUuids: ['c-1'],
            }),
        );
        expect(request.basicCredentialSecretUuids).toEqual([]);
        expect(request.trustedCaCertificateUuids).toEqual(['c-1']);
    });

    test('an empty RA profile and a blank threshold are sent as undefined', () => {
        const request = buildEstProfileCreateRequest(values({ raProfileUuid: '', renewalThreshold: ' ' }));
        expect(request.raProfileUuid).toBeUndefined();
        expect(request.renewalThreshold).toBeUndefined();
    });

    test('a threshold of 0 is sent', () => {
        expect(buildEstProfileCreateRequest(values({ renewalThreshold: '0' })).renewalThreshold).toBe(0);
    });

    test('key recovery keeps its token profile and key attributes', () => {
        const keyRecoveryKeyAttributes = [{ uuid: 'a-1', name: 'alg', content: [] }] as never;
        const request = buildEstProfileCreateRequest(
            values({ serverKeyGeneration: true, keyRecovery: true, keyRecoveryTokenProfileUuid: 't-1' }),
            { keyRecoveryKeyAttributes },
        );
        expect(request).toMatchObject({ keyRecovery: true, keyRecoveryTokenProfileUuid: 't-1', keyRecoveryKeyAttributes });
    });

    test('key recovery without attributes sends an empty list, and without a token profile sends none', () => {
        const request = buildEstProfileCreateRequest(values({ serverKeyGeneration: true, keyRecovery: true }));
        expect(request.keyRecoveryKeyAttributes).toEqual([]);
        expect(request.keyRecoveryTokenProfileUuid).toBeUndefined();
    });

    test('key recovery off drops the token profile and key attributes', () => {
        const request = buildEstProfileCreateRequest(
            values({ serverKeyGeneration: true, keyRecovery: false, keyRecoveryTokenProfileUuid: 't-1' }),
            { keyRecoveryKeyAttributes: [{ uuid: 'a-1', name: 'alg', content: [] }] as never },
        );
        expect(request).toMatchObject({ keyRecovery: false, keyRecoveryKeyAttributes: [] });
        expect(request.keyRecoveryTokenProfileUuid).toBeUndefined();
    });

    test('key recovery is forced off when server key generation is off', () => {
        const request = buildEstProfileCreateRequest(
            values({ serverKeyGeneration: false, keyRecovery: true, keyRecoveryTokenProfileUuid: 't-1' }),
        );
        expect(request.keyRecovery).toBe(false);
        expect(request.keyRecoveryTokenProfileUuid).toBeUndefined();
    });

    test('attributes and associations are passed through', () => {
        const issueCertificateAttributes = [{ uuid: 'i-1', name: 'issue', content: [] }] as never;
        const customAttributes = [{ uuid: 'c-1', name: 'custom', content: [] }] as never;
        const certificateAssociations = { ownerUuid: 'u-1' };
        const request = buildEstProfileCreateRequest(values(), { issueCertificateAttributes, customAttributes, certificateAssociations });
        expect(request).toMatchObject({ issueCertificateAttributes, customAttributes, certificateAssociations });
    });

    test('attributes default to empty lists', () => {
        expect(buildEstProfileCreateRequest(values())).toMatchObject({
            issueCertificateAttributes: [],
            customAttributes: [],
            keyRecoveryKeyAttributes: [],
        });
    });

    test('edit has no name', () => {
        const request = buildEstProfileEditRequest(values());
        expect(request).not.toHaveProperty('name');
        expect(request.authenticationPolicy).toBe(EstAuthenticationPolicy.CertificateRegistration);
    });
});

describe('estProfileFormValues', () => {
    test('create defaults allow renewal and rekey and leave the policy open', () => {
        expect(estProfileFormValues()).toEqual({
            name: '',
            description: '',
            raProfileUuid: '',
            systemDefault: false,
            authenticationPolicy: undefined,
            basicCredentialSecretUuids: [],
            trustedCaCertificateUuids: [],
            allowRenewal: true,
            allowRekey: true,
            renewalThreshold: '',
            serverKeyGeneration: false,
            keyRecovery: false,
            keyRecoveryTokenProfileUuid: '',
            issueWaitTimeout: '10',
            retryAfter: '30',
            serverKeyGenerationTimeout: '30',
        });
    });

    test('fills every value from a profile', () => {
        const profile: EstProfileDetailDto = {
            uuid: 'p-1',
            name: 'est-devices',
            enabled: true,
            description: 'Devices',
            systemDefault: true,
            authenticationPolicy: EstAuthenticationPolicy.RaBasic,
            raProfile: { uuid: 'ra-1', name: 'RA' } as never,
            serverKeyGeneration: true,
            keyRecovery: true,
            basicCredentialSecrets: [{ uuid: 's-1', name: 'Secret' }],
            trustedCaCertificates: [{ uuid: 'c-1', name: 'CA' }],
            allowRenewal: false,
            allowRekey: false,
            renewalThreshold: 0,
            keyRecoveryTokenProfile: { uuid: 't-1', name: 'Token' },
            issueWaitTimeout: 0,
            retryAfter: 120,
            serverKeyGenerationTimeout: 45,
        };
        expect(estProfileFormValues(profile)).toEqual({
            name: 'est-devices',
            description: 'Devices',
            raProfileUuid: 'ra-1',
            systemDefault: true,
            authenticationPolicy: EstAuthenticationPolicy.RaBasic,
            basicCredentialSecretUuids: ['s-1'],
            trustedCaCertificateUuids: ['c-1'],
            allowRenewal: false,
            allowRekey: false,
            renewalThreshold: '0',
            serverKeyGeneration: true,
            keyRecovery: true,
            keyRecoveryTokenProfileUuid: 't-1',
            issueWaitTimeout: '0',
            retryAfter: '120',
            serverKeyGenerationTimeout: '45',
        });
    });
});

describe('isEstBasicAuthSecret', () => {
    test('accepts an enabled, readable basicAuth secret', () => {
        expect(isEstBasicAuthSecret({ type: SecretType.BasicAuth, enabled: true, state: SecretState.Active })).toBe(true);
    });

    test('rejects other types and disabled secrets', () => {
        expect(isEstBasicAuthSecret({ type: SecretType.Generic, enabled: true, state: SecretState.Active })).toBe(false);
        expect(isEstBasicAuthSecret({ type: SecretType.BasicAuth, enabled: false, state: SecretState.Active })).toBe(false);
    });

    test.each([SecretState.Failed, SecretState.PendingApproval, SecretState.Rejected])(
        'rejects a secret core cannot read (%s)',
        (state) => {
            expect(isEstBasicAuthSecret({ type: SecretType.BasicAuth, enabled: true, state })).toBe(false);
        },
    );
});

describe('EST_TRUSTED_CA_FILTERS', () => {
    test('selects root and intermediate CA certificates by subject type', () => {
        expect(EST_TRUSTED_CA_FILTERS).toEqual([
            {
                fieldSource: FilterFieldSource.Property,
                fieldIdentifier: 'SUBJECT_TYPE',
                condition: FilterConditionOperator.Equals,
                value: [CertificateSubjectType.RootCa, CertificateSubjectType.IntermediateCa],
            },
        ]);
    });
});

describe('canExportKeyPair', () => {
    const transfer = (exportableKeyTypes?: Record<string, KeyAlgorithm[]>) => ({
        keyTransfer: { importAvailable: false, exportAvailable: true, exportableKeyTypes },
    });

    test('is true when a key pair can be exported', () => {
        expect(canExportKeyPair(transfer({ keyPair: [KeyAlgorithm.Rsa] }))).toBe(true);
    });

    test('is false without key pair algorithms', () => {
        expect(canExportKeyPair(transfer({ keyPair: [] }))).toBe(false);
        expect(canExportKeyPair(transfer({ secret: [KeyAlgorithm.Aes] }))).toBe(false);
        expect(canExportKeyPair(transfer())).toBe(false);
        expect(canExportKeyPair({})).toBe(false);
    });
});
