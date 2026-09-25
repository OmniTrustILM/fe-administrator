import {
    AcmeIdentifierAuthorizationMode,
    AcmeIdentifierMatchType,
    AcmeIdentifierType,
    type AcmePreauthorizedIdentifierDto,
} from 'types/openapi';
import { describe, expect, test } from 'vitest';
import {
    entryProblem,
    isDnsName,
    isIpAddress,
    normalizeEntry,
    policyFormValues,
    policyRequestFields,
    samePolicy,
} from './acme-identifier-policy';

const dns = (value: string, overrides: Partial<AcmePreauthorizedIdentifierDto> = {}): AcmePreauthorizedIdentifierDto => ({
    type: AcmeIdentifierType.Dns,
    value,
    matchType: AcmeIdentifierMatchType.Exact,
    allowWildcard: false,
    ...overrides,
});
const ip = (value: string, overrides: Partial<AcmePreauthorizedIdentifierDto> = {}) =>
    dns(value, { type: AcmeIdentifierType.Ip, ...overrides });

describe('isDnsName', () => {
    test.each(['example.com', 'apps.example.com', 'Example.COM', 'example.com.', 'a', 'xn--bcher-kva.example'])('accepts %s', (value) => {
        expect(isDnsName(value)).toBe(true);
    });

    test.each(['', '.', 'exa mple.com', '-bad.example.com', 'bad-.example.com', 'a..b', 'bücher.example', `${'a'.repeat(64)}.com`])(
        'refuses %s',
        (value) => {
            expect(isDnsName(value)).toBe(false);
        },
    );

    test('refuses a name longer than 253 characters', () => {
        expect(isDnsName(`${'a.'.repeat(127)}a`)).toBe(false);
    });
});

describe('isIpAddress', () => {
    test.each(['192.0.2.1', '0.0.0.0', '255.255.255.255', '::1', '2001:db8::1', '2001:db8:0:0:0:0:0:1', '::ffff:192.0.2.1', '::'])(
        'accepts %s',
        (value) => {
            expect(isIpAddress(value)).toBe(true);
        },
    );

    test.each([
        '192.0.2.01',
        '256.0.0.1',
        '192.0.2',
        '1::2::3',
        'fe80::1%eth0',
        '2001:db8:0:0:0:0:0:0:1',
        '1:2:3:4:5:6:7::8',
        'example.com',
    ])('refuses %s', (value) => {
        expect(isIpAddress(value)).toBe(false);
    });
});

describe('entryProblem', () => {
    test('an empty value asks for one', () => {
        expect(entryProblem(dns('  '))).toBe('Enter a value');
    });

    test('a wildcard written as the value points to the wildcard flag', () => {
        expect(entryProblem(dns('*.example.com', { matchType: AcmeIdentifierMatchType.Subdomain }))).toContain('allow wildcards');
    });

    test('a value is checked against its own type', () => {
        expect(entryProblem(dns('192.0.2.1.'))).toBeUndefined();
        expect(entryProblem(ip('example.com'))).toBe('Not a valid IPv4 or IPv6 address');
        expect(entryProblem(dns('bad_name.example'))).toBe('Not a valid DNS name');
        expect(entryProblem(ip(' 192.0.2.1 '))).toBeUndefined();
    });
});

describe('normalizeEntry', () => {
    test('an address is exact and never covers wildcards', () => {
        expect(normalizeEntry(ip('192.0.2.1', { matchType: AcmeIdentifierMatchType.Subdomain, allowWildcard: true }))).toEqual(
            ip('192.0.2.1'),
        );
    });

    test('only a subdomain entry keeps the wildcard flag', () => {
        expect(normalizeEntry(dns('example.com', { allowWildcard: true })).allowWildcard).toBe(false);
        expect(
            normalizeEntry(dns('example.com', { matchType: AcmeIdentifierMatchType.Subdomain, allowWildcard: true })).allowWildcard,
        ).toBe(true);
    });

    test('trims the value', () => {
        expect(normalizeEntry(dns(' example.com ')).value).toBe('example.com');
    });
});

describe('samePolicy', () => {
    test('treats a missing list as empty and ignores what normalization drops', () => {
        expect(samePolicy(undefined, [])).toBe(true);
        expect(
            samePolicy(
                [dns('example.com')],
                [{ type: AcmeIdentifierType.Dns, value: 'example.com', matchType: AcmeIdentifierMatchType.Exact }],
            ),
        ).toBe(true);
    });

    test('differs on any entry change', () => {
        expect(samePolicy([dns('example.com')], [dns('example.org')])).toBe(false);
        expect(samePolicy([dns('example.com')], [dns('example.com', { matchType: AcmeIdentifierMatchType.Subdomain })])).toBe(false);
        expect(samePolicy([dns('example.com')], [])).toBe(false);
    });
});

describe('policyFormValues', () => {
    test('seeds the defaults when there is no profile', () => {
        expect(policyFormValues(undefined)).toEqual({
            preauthorizedIdentifiers: [],
            identifierAuthorizationMode: AcmeIdentifierAuthorizationMode.PreauthorizedOrChallenge,
        });
    });

    test('fills in the optional wildcard flag, so an untouched form compares equal to itself after an edit and revert', () => {
        const seeded = policyFormValues({
            preauthorizedIdentifiers: [{ type: AcmeIdentifierType.Dns, value: 'example.com', matchType: AcmeIdentifierMatchType.Exact }],
            identifierAuthorizationMode: AcmeIdentifierAuthorizationMode.PreauthorizedOnly,
        });
        expect(seeded.preauthorizedIdentifiers).toEqual([dns('example.com')]);
        expect(seeded.identifierAuthorizationMode).toBe(AcmeIdentifierAuthorizationMode.PreauthorizedOnly);
    });
});

describe('policyRequestFields', () => {
    const current = {
        preauthorizedIdentifiers: [dns('example.com')],
        identifierAuthorizationMode: AcmeIdentifierAuthorizationMode.PreauthorizedOrChallenge,
    };

    test('sends nothing when neither the list nor the mode changed', () => {
        expect(policyRequestFields(current, current)).toEqual({});
    });

    test('sends only the list when only the list changed', () => {
        expect(policyRequestFields({ ...current, preauthorizedIdentifiers: [dns(' example.org ')] }, current)).toEqual({
            preauthorizedIdentifiers: [dns('example.org')],
        });
    });

    test('an emptied list is sent as an empty array, which is what clears it', () => {
        expect(policyRequestFields({ ...current, preauthorizedIdentifiers: [] }, current)).toEqual({ preauthorizedIdentifiers: [] });
    });

    test('sends only the mode when only the mode changed', () => {
        expect(
            policyRequestFields({ ...current, identifierAuthorizationMode: AcmeIdentifierAuthorizationMode.PreauthorizedOnly }, current),
        ).toEqual({
            identifierAuthorizationMode: AcmeIdentifierAuthorizationMode.PreauthorizedOnly,
        });
    });

    test('on create, the defaults are left out and anything else is sent', () => {
        const defaults = {
            preauthorizedIdentifiers: [],
            identifierAuthorizationMode: AcmeIdentifierAuthorizationMode.PreauthorizedOrChallenge,
        };
        expect(policyRequestFields(defaults, undefined)).toEqual({});
        expect(
            policyRequestFields(
                {
                    preauthorizedIdentifiers: [dns('example.com')],
                    identifierAuthorizationMode: AcmeIdentifierAuthorizationMode.PreauthorizedOnly,
                },
                undefined,
            ),
        ).toEqual({
            preauthorizedIdentifiers: [dns('example.com')],
            identifierAuthorizationMode: AcmeIdentifierAuthorizationMode.PreauthorizedOnly,
        });
    });
});
