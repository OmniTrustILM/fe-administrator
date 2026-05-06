import { describe, expect, test } from 'vitest';
import {
    transformCredentialCreateRequestModelToDto,
    transformCredentialEditRequestModelToDto,
    transformCredentialResponseDtoToModel,
} from './credentials';

const attrItem = { uuid: 'a1', name: 'attr', label: 'Attr', type: 'STRING', contentType: 'STRING', version: 'V2', content: [] } as any;

describe('transformCredentialResponseDtoToModel', () => {
    test('maps attributes and leaves customAttributes undefined when absent', () => {
        const input = { uuid: 'c1', name: 'cred', attributes: [attrItem] } as any;
        const result = transformCredentialResponseDtoToModel(input);
        expect(result.attributes).toHaveLength(1);
        expect(result.customAttributes).toBeUndefined();
    });

    test('maps customAttributes when present', () => {
        const input = { uuid: 'c2', name: 'cred', attributes: [], customAttributes: [attrItem] } as any;
        const result = transformCredentialResponseDtoToModel(input);
        expect(result.customAttributes).toHaveLength(1);
    });
});

describe('transformCredentialCreateRequestModelToDto', () => {
    test('maps attributes and leaves customAttributes undefined when absent', () => {
        const input = { name: 'cred', kind: 'BASIC', connectorUuid: 'con1', attributes: [attrItem] } as any;
        const result = transformCredentialCreateRequestModelToDto(input);
        expect(result.attributes).toHaveLength(1);
        expect(result.customAttributes).toBeUndefined();
    });
});

describe('transformCredentialEditRequestModelToDto', () => {
    test('maps attributes and customAttributes when both present', () => {
        const input = { attributes: [attrItem], customAttributes: [attrItem] } as any;
        const result = transformCredentialEditRequestModelToDto(input);
        expect(result.attributes).toHaveLength(1);
        expect(result.customAttributes).toHaveLength(1);
    });
});
