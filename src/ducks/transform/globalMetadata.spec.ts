import { describe, expect, test } from 'vitest';
import {
    transformConnectorMetadataResponseDtoToModel,
    transformGlobalMetadataCreateRequestModelToDto,
    transformGlobalMetadataDetailResponseDtoToModel,
    transformGlobalMetadataResponseDtoToModel,
    transformGlobalMetadataUpdateRequestModelToDto,
} from './globalMetadata';

describe('globalMetadata transforms', () => {
    test('transformGlobalMetadataResponseDtoToModel copies fields', () => {
        const dto = { uuid: 'id-1', name: 'meta-1', connectorUuid: 'conn-1' } as any;
        const result = transformGlobalMetadataResponseDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformGlobalMetadataDetailResponseDtoToModel copies fields', () => {
        const dto = { uuid: 'id-2', name: 'meta-2', description: 'detail' } as any;
        const result = transformGlobalMetadataDetailResponseDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformGlobalMetadataCreateRequestModelToDto copies fields', () => {
        const dto = { name: 'meta-3', contentType: 'STRING', label: 'Meta Three' } as any;
        const result = transformGlobalMetadataCreateRequestModelToDto(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformGlobalMetadataUpdateRequestModelToDto copies fields', () => {
        const dto = { description: 'updated', label: 'Updated Label' } as any;
        const result = transformGlobalMetadataUpdateRequestModelToDto(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformConnectorMetadataResponseDtoToModel copies fields', () => {
        const dto = { uuid: 'id-5', name: 'conn-meta', connectorName: 'connector-1' } as any;
        const result = transformConnectorMetadataResponseDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });
});
