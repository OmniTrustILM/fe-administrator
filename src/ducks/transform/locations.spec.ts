import { describe, expect, test } from 'vitest';

import {
    transformNameAndUuidDtoToModel,
    transformMetadataItemDtoToModel,
    transformMetadataDtoToModel,
    transformLocationCertificateDtoToModel,
    transformLocationResponseDtoToModel,
    transformLocationAddRequestModelToDto,
    transformLocationEditRequestModelToDto,
    transformLocationPushRequestModelToDto,
    transformLocationIssueRequestModelToDto,
} from './locations';

const attrItem = { uuid: 'a1', name: 'attr', label: 'Attr', type: 'STRING', contentType: 'STRING', version: 'V2', content: [] } as any;

describe('location transform helpers', () => {
    test('transformNameAndUuidDtoToModel returns shallow clone', () => {
        const input = { uuid: 'u1', name: 'n1' } as any;
        const result = transformNameAndUuidDtoToModel(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });

    test('transformMetadataItemDtoToModel with no sourceObjects returns undefined sourceObjects', () => {
        const input = { connectorUuid: 'c1', sourceObjects: undefined } as any;
        const result = transformMetadataItemDtoToModel(input);
        expect(result.sourceObjects).toBeUndefined();
    });

    test('transformMetadataItemDtoToModel with sourceObjects maps each item', () => {
        const input = { connectorUuid: 'c1', sourceObjects: [{ uuid: 's1', name: 'src' }] } as any;
        const result = transformMetadataItemDtoToModel(input);
        expect(result.sourceObjects).toHaveLength(1);
        expect(result.sourceObjects?.[0]).toEqual({ uuid: 's1', name: 'src' });
    });

    test('transformMetadataDtoToModel maps items', () => {
        const input = { connectorUuid: 'c1', items: [{ connectorUuid: 'c2', sourceObjects: undefined }] } as any;
        const result = transformMetadataDtoToModel(input);
        expect(result.items).toHaveLength(1);
        expect(result.items[0].sourceObjects).toBeUndefined();
    });

    test('transformLocationCertificateDtoToModel with no optional fields returns undefined for metadata, pushAttributes, csrAttributes', () => {
        const input = { uuid: 'cert-1', metadata: undefined, pushAttributes: undefined, csrAttributes: undefined } as any;
        const result = transformLocationCertificateDtoToModel(input);
        expect(result.metadata).toBeUndefined();
        expect(result.pushAttributes).toBeUndefined();
        expect(result.csrAttributes).toBeUndefined();
    });

    test('transformLocationCertificateDtoToModel with metadata present maps items', () => {
        const input = {
            uuid: 'cert-1',
            metadata: [{ items: [{ uuid: 'm1' }] }],
            pushAttributes: undefined,
            csrAttributes: undefined,
        } as any;
        const result = transformLocationCertificateDtoToModel(input);
        expect(result.metadata).toHaveLength(1);
        expect(result.metadata![0].items).toHaveLength(1);
    });

    test('transformLocationResponseDtoToModel maps attributes, certificates, and leaves absent optional fields undefined', () => {
        const input = {
            uuid: 'loc-1',
            name: 'loc',
            attributes: [attrItem],
            certificates: [{ uuid: 'cert-1' } as any],
            metadata: undefined,
            customAttributes: undefined,
        } as any;
        const result = transformLocationResponseDtoToModel(input);
        expect(result.attributes).toHaveLength(1);
        expect(result.certificates).toHaveLength(1);
        expect(result.metadata).toBeUndefined();
        expect(result.customAttributes).toBeUndefined();
    });

    test('transformLocationAddRequestModelToDto maps attributes and leaves absent customAttributes undefined', () => {
        const input = {
            name: 'loc',
            attributes: [attrItem],
            customAttributes: undefined,
        } as any;
        const result = transformLocationAddRequestModelToDto(input);
        expect(result.attributes).toHaveLength(1);
        expect(result.customAttributes).toBeUndefined();
    });

    test('transformLocationEditRequestModelToDto maps attributes and maps present customAttributes', () => {
        const input = {
            name: 'loc',
            attributes: [attrItem],
            customAttributes: [attrItem],
        } as any;
        const result = transformLocationEditRequestModelToDto(input);
        expect(result.attributes).toHaveLength(1);
        expect(result.customAttributes).toHaveLength(1);
    });

    test('transformLocationPushRequestModelToDto maps attributes', () => {
        const input = {
            attributes: [attrItem],
        } as any;
        const result = transformLocationPushRequestModelToDto(input);
        expect(result.attributes).toHaveLength(1);
    });

    test('transformLocationIssueRequestModelToDto maps csrAttributes, issueAttributes, and leaves absent customAttributes undefined', () => {
        const input = {
            csrAttributes: [attrItem],
            issueAttributes: [attrItem],
            customAttributes: undefined,
        } as any;
        const result = transformLocationIssueRequestModelToDto(input);
        expect(result.csrAttributes).toHaveLength(1);
        expect(result.issueAttributes).toHaveLength(1);
        expect(result.customAttributes).toBeUndefined();
    });
});
