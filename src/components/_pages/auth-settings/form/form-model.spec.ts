import { describe, expect, test } from 'vitest';
import { AuthenticationScheme } from 'utils/oauth2Providers';
import { type FormValues, incompleteSchemes, removedSchemes, storedSchemes, toFormValues, toUpdateModel } from './form-model';

const { JwtBearer, OAuth2Flow, Application } = AuthenticationScheme;

const filled: FormValues = {
    ...toFormValues(),
    schemes: [JwtBearer, OAuth2Flow, Application],
    name: 'provider',
    issuerUrl: 'https://issuer.example',
    clientId: 'ilm-login',
    clientSecret: 'secret',
    authorizationUrl: 'https://issuer.example/auth',
    tokenUrl: 'https://issuer.example/token',
    jwkSetUrl: 'https://issuer.example/jwks',
    scope: ['openid'],
    logoutUrl: 'https://issuer.example/logout',
    postLogoutUrl: 'https://ilm.example',
    allowedDelegates: ['a'],
    delegateClaim: ' azp ',
    skew: '30',
    sessionMaxInactiveInterval: '900',
    applicationsName: ' Example sign-in ',
    applicationsClientId: 'ilm-apps',
    applicationsScopes: ['openid', 'ilm'],
    applicationsResource: 'https://ilm.example/api',
};

describe('toUpdateModel', () => {
    test('sends every field when all schemes are chosen', () => {
        expect(toUpdateModel(filled)).toEqual({
            issuerUrl: 'https://issuer.example',
            clientId: 'ilm-login',
            clientSecret: 'secret',
            authorizationUrl: 'https://issuer.example/auth',
            tokenUrl: 'https://issuer.example/token',
            jwkSetUrl: 'https://issuer.example/jwks',
            jwkSet: undefined,
            scope: ['openid'],
            logoutUrl: 'https://issuer.example/logout',
            postLogoutUrl: 'https://ilm.example',
            userInfoUrl: undefined,
            audiences: undefined,
            usernameClaim: undefined,
            allowedDelegates: ['a'],
            delegateClaim: 'azp',
            skew: 30,
            sessionMaxInactiveInterval: 900,
            applications: {
                enabled: true,
                name: 'Example sign-in',
                clientId: 'ilm-apps',
                scopes: ['openid', 'ilm'],
                resource: 'https://ilm.example/api',
            },
        });
    });

    test('drops the OAuth2 Flow fields without that scheme', () => {
        const model = toUpdateModel({ ...filled, schemes: [JwtBearer] });
        expect(model).toMatchObject({
            clientId: undefined,
            clientSecret: undefined,
            authorizationUrl: undefined,
            tokenUrl: undefined,
            logoutUrl: undefined,
            postLogoutUrl: undefined,
            scope: undefined,
            sessionMaxInactiveInterval: undefined,
        });
    });

    test('drops the JWT Bearer fields without that scheme', () => {
        const model = toUpdateModel({ ...filled, schemes: [OAuth2Flow] });
        expect(model).toMatchObject({ issuerUrl: undefined, allowedDelegates: [], delegateClaim: 'client_id' });
    });

    test('disables applications without that scheme', () => {
        expect(toUpdateModel({ ...filled, schemes: [JwtBearer, OAuth2Flow] }).applications).toEqual({ enabled: false, scopes: [] });
    });

    test('omits an empty client secret', () => {
        expect(toUpdateModel({ ...filled, schemes: [OAuth2Flow], clientSecret: '' }).clientSecret).toBeUndefined();
    });
});

describe('toFormValues', () => {
    test('is empty without a provider', () => {
        expect(toFormValues()).toMatchObject({ schemes: [], name: '', scope: [], applicationsScopes: [], clientSecret: '' });
    });

    test('derives schemes including the required JWT Bearer', () => {
        expect(toFormValues({ name: 'p', issuerUrl: 'https://i', applications: { enabled: true } }).schemes).toEqual([
            JwtBearer,
            Application,
        ]);
        expect(toFormValues({ name: 'p', applications: { enabled: true } }).schemes).toEqual([JwtBearer, Application]);
    });

    test('maps stored values to strings', () => {
        expect(toFormValues({ name: 'p', skew: 30, sessionMaxInactiveInterval: 900 })).toMatchObject({
            name: 'p',
            skew: '30',
            sessionMaxInactiveInterval: '900',
        });
    });
});

describe('removedSchemes', () => {
    test('returns the initial schemes that are no longer chosen', () => {
        expect(removedSchemes([JwtBearer, Application], [JwtBearer])).toEqual([Application]);
    });
});

describe('storedSchemes', () => {
    test('counts disabled applications that still hold settings', () => {
        expect(storedSchemes({ name: 'p', issuerUrl: 'https://i', applications: { enabled: false, clientId: 'x' } })).toEqual([
            JwtBearer,
            Application,
        ]);
    });

    test('ignores disabled applications without settings', () => {
        expect(storedSchemes({ name: 'p', issuerUrl: 'https://i', applications: { enabled: false, scopes: [] } })).toEqual([JwtBearer]);
    });

    test('lists enabled applications once', () => {
        expect(storedSchemes({ name: 'p', issuerUrl: 'https://i', applications: { enabled: true, clientId: 'x' } })).toEqual([
            JwtBearer,
            Application,
        ]);
    });
});

describe('incompleteSchemes', () => {
    test('lists nothing when every required field is filled', () => {
        expect(incompleteSchemes(filled.schemes, { ...filled, clientSecret: '' })).toEqual([]);
    });

    test.each([
        ['issuerUrl', JwtBearer],
        ['clientId', OAuth2Flow],
        ['authorizationUrl', OAuth2Flow],
        ['tokenUrl', OAuth2Flow],
        ['logoutUrl', OAuth2Flow],
        ['postLogoutUrl', OAuth2Flow],
    ] as const)('an empty %s leaves %s incomplete', (field, scheme) => {
        expect(incompleteSchemes(filled.schemes, { ...filled, [field]: '' })).toEqual([scheme]);
    });

    test('ignores the fields of a scheme that is not chosen', () => {
        expect(incompleteSchemes([JwtBearer, Application], { ...filled, clientId: '' })).toEqual([]);
    });
});
