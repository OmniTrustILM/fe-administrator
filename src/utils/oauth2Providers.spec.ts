import { describe, expect, test } from 'vitest';
import { AuthenticationScheme, formatSeconds, schemesOfProvider, withRequiredSchemes } from './oauth2Providers';

const { JwtBearer, OAuth2Flow, Application } = AuthenticationScheme;

describe('schemesOfProvider', () => {
    test('returns nothing for a bare provider', () => {
        expect(schemesOfProvider({ name: 'p' })).toEqual([]);
    });

    test('detects JWT Bearer from the issuer', () => {
        expect(schemesOfProvider({ name: 'p', issuerUrl: 'https://i', delegateClaim: 'client_id' })).toEqual([JwtBearer]);
    });

    test('detects JWT Bearer from allowed delegates', () => {
        expect(schemesOfProvider({ name: 'p', allowedDelegates: ['a'] })).toEqual([JwtBearer]);
    });

    test('detects OAuth2 Flow from partial settings', () => {
        expect(schemesOfProvider({ name: 'p', clientId: 'c' })).toEqual([OAuth2Flow]);
    });

    test.each([
        { authorizationUrl: 'https://i/auth' },
        { tokenUrl: 'https://i/token' },
        { logoutUrl: 'https://i/logout' },
        { postLogoutUrl: 'https://ilm' },
        { scope: ['openid'] },
    ])('detects OAuth2 Flow from %o alone', (settings) => {
        expect(schemesOfProvider({ name: 'p', ...settings })).toEqual([OAuth2Flow]);
    });

    test('ignores an empty scope', () => {
        expect(schemesOfProvider({ name: 'p', scope: [] })).toEqual([]);
    });

    test('detects JWT Bearer from a custom delegate claim', () => {
        expect(schemesOfProvider({ name: 'p', sessionMaxInactiveInterval: 900, delegateClaim: 'azp' })).toEqual([JwtBearer]);
        expect(schemesOfProvider({ name: 'p', delegateClaim: 'azp' })).toEqual([JwtBearer]);
    });

    test('ignores the default delegate claim and session interval', () => {
        expect(schemesOfProvider({ name: 'p', sessionMaxInactiveInterval: 900, delegateClaim: 'client_id' })).toEqual([]);
    });

    test('detects OAuth2 Flow from a custom session interval', () => {
        expect(schemesOfProvider({ name: 'p', sessionMaxInactiveInterval: 600 })).toEqual([OAuth2Flow]);
    });

    test('lists every scheme in enum order', () => {
        expect(schemesOfProvider({ name: 'p', issuerUrl: 'https://i', clientId: 'c', applications: { enabled: true } })).toEqual([
            JwtBearer,
            OAuth2Flow,
            Application,
        ]);
    });

    test('ignores disabled applications', () => {
        expect(schemesOfProvider({ name: 'p', applications: { enabled: false, clientId: 'x' } })).toEqual([]);
    });
});

describe('withRequiredSchemes', () => {
    test('adds JWT Bearer when Application is present', () => {
        expect(withRequiredSchemes([Application])).toEqual([JwtBearer, Application]);
    });

    test('leaves other schemes as they are', () => {
        expect(withRequiredSchemes([OAuth2Flow])).toEqual([OAuth2Flow]);
    });
});

describe('formatSeconds', () => {
    test.each([
        [0, '0 s'],
        [30, '30 s'],
        [900, '15 min'],
        [7200, '2 h'],
        [90, '90 s'],
    ])('formats %i as %s', (seconds, expected) => {
        expect(formatSeconds(seconds)).toBe(expected);
    });
});
