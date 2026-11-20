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

describe('allowedSecretTypes', () => {
    test('readsSingleAndListFilterValues', () => {
        expect(
            allowedSecretTypes(
                withMappings([
                    { to: 'SECRET_TYPE.a', targets: [AttributeValueTarget.Filter], value: 'apiKey' },
                    { to: 'SECRET_TYPE.b', targets: [AttributeValueTarget.Filter], value: ['basicAuth', 'bogus'] },
                    { to: 'SECRET_TYPE.c', targets: [AttributeValueTarget.Body], value: 'generic' },
                    { to: 'other', targets: [AttributeValueTarget.Filter], value: 'keyStore' },
                ]),
            ),
        ).toEqual([SecretType.ApiKey, SecretType.BasicAuth]);
    });

    test('fallsBackToAllTypes_withoutFilter', () => {
        const all = Object.values(SecretType);
        expect(allowedSecretTypes(withMappings([]))).toEqual(all);
        expect(allowedSecretTypes(descriptor())).toEqual(all);
        expect(allowedSecretTypes(withMappings([{ to: 'SECRET_TYPE.a', targets: [AttributeValueTarget.Filter], value: 'bogus' }]))).toEqual(
            all,
        );
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

    test('ignoresOtherResources', () => {
        expect(findAddNewAttribute(descriptor({ resource: AttributeResource.Certificates }), list)).toBeUndefined();
        expect(findAddNewAttribute(descriptor(), list)).toBeUndefined();
    });
});
