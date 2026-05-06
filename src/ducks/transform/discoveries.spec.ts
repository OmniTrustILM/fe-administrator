import { describe, expect, test } from 'vitest';
import {
    transformDiscoveryCertificateDtoToModel,
    transformDiscoveryCertificateListDtoToModel,
    transformDiscoveryRequestModelToDto,
    transformDiscoveryResponseDetailDtoToModel,
    transformDiscoveryResponseDtoToModel,
} from './discoveries';

const attrItem = { uuid: 'a1', name: 'attr', label: 'Attr', type: 'STRING', contentType: 'STRING', version: 'V2', content: [] } as any;

describe('transformDiscoveryResponseDtoToModel', () => {
    test('returns a spread of the input', () => {
        const input = { uuid: 'd1', name: 'disc', status: 'IN_PROGRESS' } as any;
        const result = transformDiscoveryResponseDtoToModel(input);
        expect(result).toEqual(input);
    });
});

describe('transformDiscoveryResponseDetailDtoToModel', () => {
    test('maps attributes and leaves metadata and customAttributes undefined when absent', () => {
        const input = { uuid: 'd2', name: 'disc', attributes: [attrItem] } as any;
        const result = transformDiscoveryResponseDetailDtoToModel(input);
        expect(result.attributes).toHaveLength(1);
        expect(result.metadata).toBeUndefined();
        expect(result.customAttributes).toBeUndefined();
    });

    test('maps metadata when present', () => {
        const input = {
            uuid: 'd3',
            name: 'disc',
            attributes: [],
            metadata: [{ items: [] }],
        } as any;
        const result = transformDiscoveryResponseDetailDtoToModel(input);
        expect(result.metadata).toHaveLength(1);
    });
});

describe('transformDiscoveryRequestModelToDto', () => {
    test('maps attributes and leaves customAttributes undefined when absent', () => {
        const input = { name: 'disc', connectorUuid: 'con1', kind: 'KIND', attributes: [attrItem] } as any;
        const result = transformDiscoveryRequestModelToDto(input);
        expect(result.attributes).toHaveLength(1);
        expect(result.customAttributes).toBeUndefined();
    });
});

describe('transformDiscoveryCertificateDtoToModel', () => {
    test('returns a spread of the input', () => {
        const input = { uuid: 'cert1', commonName: 'test.example.com' } as any;
        const result = transformDiscoveryCertificateDtoToModel(input);
        expect(result).toEqual(input);
    });
});

describe('transformDiscoveryCertificateListDtoToModel', () => {
    test('maps certificates array', () => {
        const input = { totalItems: 1, certificates: [{ uuid: 'cert1', commonName: 'test.example.com' }] } as any;
        const result = transformDiscoveryCertificateListDtoToModel(input);
        expect(result.certificates).toHaveLength(1);
    });
});
