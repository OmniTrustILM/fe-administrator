import { describe, expect, test } from 'vitest';
import type { CustomAttributeModel, DataAttributeModel } from 'types/attributes';
import type { AddNewAttributeType } from 'types/user-interface';
import { AttributeContentType, AttributeResource, AttributeValueTarget, SecretType } from 'types/openapi';
import { allowedSecretTypes, findAddNewAttribute } from './secretPicker';

const descriptor = (overrides: Partial<DataAttributeModel> & { resource?: AttributeResource } = {}): DataAttributeModel => {
    const { resource, ...rest } = overrides;
    return {
        uuid: 'u',
        name: 'secret',
        type: 'data',
        contentType: AttributeContentType.Resource,
        properties: { label: 'Secret', required: false, readOnly: false, visible: true, list: false, multiSelect: false, resource },
        ...rest,
    } as DataAttributeModel;
};

const withMappings = (mappings: unknown[]): DataAttributeModel =>
    descriptor({
        resource: AttributeResource.Secrets,
        attributeCallback: { callbackContext: '/c', callbackMethod: 'GET', mappings },
    } as never);

const filter = (operator: string, value: unknown, targets = [AttributeValueTarget.Filter]) => ({
    to: `SECRET_TYPE.${operator}`,
    targets,
    value,
});

describe('allowedSecretTypes', () => {
    const all = Object.values(SecretType);

    test('equalsAllowsItsValues', () => {
        expect(allowedSecretTypes(withMappings([filter('EQUALS', ['apiKey', 'basicAuth', 'bogus'])]))).toEqual([
            SecretType.BasicAuth,
            SecretType.ApiKey,
        ]);
        expect(allowedSecretTypes(withMappings([filter('EQUALS', 'privateKey')]))).toEqual([SecretType.PrivateKey]);
    });

    test('notEqualsExcludesItsValues', () => {
        const allowed = allowedSecretTypes(withMappings([filter('NOT_EQUALS', 'privateKey')]));
        expect(allowed).toEqual(all.filter((type) => type !== SecretType.PrivateKey));
    });

    test('otherOperatorsDoNotRestrict', () => {
        expect(allowedSecretTypes(withMappings([filter('CONTAINS', 'apiKey')]))).toEqual(all);
        expect(allowedSecretTypes(withMappings([filter('a', 'apiKey')]))).toEqual(all);
    });

    test('mappingsIntersect', () => {
        expect(allowedSecretTypes(withMappings([filter('EQUALS', ['apiKey', 'basicAuth']), filter('NOT_EQUALS', 'basicAuth')]))).toEqual([
            SecretType.ApiKey,
        ]);
    });

    test('ignoresNonFilterAndOtherMappings', () => {
        expect(
            allowedSecretTypes(
                withMappings([
                    filter('EQUALS', 'generic', [AttributeValueTarget.Body]),
                    { to: 'other', targets: [AttributeValueTarget.Filter], value: 'keyStore' },
                ]),
            ),
        ).toEqual(all);
        expect(allowedSecretTypes(withMappings([]))).toEqual(all);
        expect(allowedSecretTypes(descriptor())).toEqual(all);
    });

    test('isEmpty_whenNoTypeSatisfiesFilters', () => {
        expect(allowedSecretTypes(withMappings([filter('EQUALS', 'apiKey'), filter('NOT_EQUALS', 'apiKey')]))).toEqual([]);
        expect(allowedSecretTypes(withMappings([filter('EQUALS', 'bogus')]))).toEqual([]);
    });
});

describe('findAddNewAttribute', () => {
    const credential: AddNewAttributeType = { name: 'Credential', contentType: AttributeContentType.Credential, content: null };
    const secret: AddNewAttributeType = {
        name: 'Secret',
        contentType: AttributeContentType.Resource,
        resource: AttributeResource.Secrets,
        content: () => null,
    };
    const list = [credential, secret];

    test('findsSecretsEntry_forSecretsResource', () => {
        expect(findAddNewAttribute(descriptor({ resource: AttributeResource.Secrets }), list)).toBe(secret);
    });

    test('keepsCredentialLookup', () => {
        expect(findAddNewAttribute(descriptor({ contentType: AttributeContentType.Credential }), list)).toBe(credential);
    });

    test('keepsCredentialLookup_forCustomAttribute', () => {
        expect(
            findAddNewAttribute(
                {
                    uuid: 'c',
                    name: 'c',
                    type: 'custom',
                    contentType: AttributeContentType.Credential,
                    properties: { label: 'c' },
                } as CustomAttributeModel,
                list,
            ),
        ).toBe(credential);
    });

    test('offersNoSecretCreation_whenNoTypeSatisfiesFilters', () => {
        expect(findAddNewAttribute(withMappings([filter('EQUALS', 'apiKey'), filter('NOT_EQUALS', 'apiKey')]), list)).toBeUndefined();
        expect(findAddNewAttribute(withMappings([filter('NOT_EQUALS', 'apiKey')]), list)).toBe(secret);
    });

    test('ignoresOtherResources', () => {
        expect(findAddNewAttribute(descriptor({ resource: AttributeResource.Certificates }), list)).toBeUndefined();
        expect(findAddNewAttribute(descriptor(), list)).toBeUndefined();
    });
});
