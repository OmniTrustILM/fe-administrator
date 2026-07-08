import { describe, expect, test } from 'vitest';

import {
    transformBulkActionDtoToModel,
    transformConnectorDetailV2ToModel,
    transformConnectorDtoV2ToModel,
    transformConnectorRequestModelToDto,
    transformConnectorResponseDtoToModel,
    transformConnectorUpdateRequestModelToDto,
    transformConnectInfoDtoToFunctionGroups,
    transformEndpointDtoToModel,
    transformFunctionGroupDtoToModel,
} from './connectors';
import { AuthType } from 'types/openapi';

describe('connector transform helpers', () => {
    test('transformBulkActionDtoToModel returns shallow clone', () => {
        const input = { code: 'error-1', message: 'failed' } as any;

        const result = transformBulkActionDtoToModel(input);

        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });

    test('transformEndpointDtoToModel returns shallow clone', () => {
        const input = { uuid: 'e-1', context: '/v1/health' } as any;

        const result = transformEndpointDtoToModel(input);

        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });

    test('transformFunctionGroupDtoToModel maps endpoints and normalizes kinds', () => {
        const endpoint = { uuid: 'e-1', context: '/v1/info' } as any;
        const input = {
            functionGroupCode: 'FG',
            kinds: undefined,
            endPoints: [endpoint],
        } as any;

        const result = transformFunctionGroupDtoToModel(input);

        expect(result.functionGroupCode).toBe('FG');
        expect(result.kinds).toEqual([]);
        expect(result.endPoints).toHaveLength(1);
        expect(result.endPoints[0]).toEqual(endpoint);
        expect(result.endPoints[0]).not.toBe(endpoint);
    });

    test('transformConnectorDetailV2ToModel maps core fields, function groups and attributes', () => {
        const connectorDetail = {
            uuid: 'conn-1',
            name: 'Test connector',
            url: 'https://example.com',
            status: 'Connected',
            version: 'V2',
            authType: AuthType.None,
            interfaces: [{ uuid: 'iface-1' }],
            functionGroups: [
                {
                    code: 'FG',
                    kinds: ['kind'],
                    endPoints: [{ uuid: 'e-1', context: '/v1/info' }],
                },
            ],
            authAttributes: [],
            customAttributes: [],
        } as any;

        const result = transformConnectorDetailV2ToModel(connectorDetail);

        expect(result.uuid).toBe('conn-1');
        expect(result.name).toBe('Test connector');
        expect(result.url).toBe('https://example.com');
        expect(result.status).toBe('Connected');
        expect(result.version).toBe('V2');
        expect(result.authType).toBe(AuthType.None);
        expect(result.functionGroups).toHaveLength(1);
        expect(result.functionGroups[0].endPoints).toHaveLength(1);
        expect(result.functionGroups[0].endPoints[0]).toEqual(connectorDetail.functionGroups[0].endPoints[0]);
    });

    test('transformConnectorDtoV2ToModel populates required fields with safe defaults', () => {
        const dtoV2 = {
            uuid: 'conn-2',
            name: 'Connector V2',
            url: 'https://example.com/v2',
            status: 'Connected',
            version: 'V2',
        } as any;

        const result = transformConnectorDtoV2ToModel(dtoV2);

        expect(result.uuid).toBe('conn-2');
        expect(result.name).toBe('Connector V2');
        expect(result.url).toBe('https://example.com/v2');
        expect(result.status).toBe('Connected');
        expect(result.version).toBe('V2');
        expect(result.authType).toBe(AuthType.None);
        expect(result.functionGroups).toEqual([]);
        expect(result.authAttributes).toEqual([]);
        expect(result.customAttributes).toEqual([]);
    });

    test('transformConnectorDtoV2ToModel maps function groups when present (v1 connectors in the list)', () => {
        const dtoV2 = {
            uuid: 'conn-v1',
            name: 'Connector V1',
            url: 'https://example.com/v1',
            status: 'Connected',
            version: 'v1',
            functionGroups: [
                { uuid: 'fg-1', name: 'authorityProvider', functionGroupCode: 'authorityProvider', kinds: ['EJBCA'], endPoints: [] },
            ],
        } as any;

        const result = transformConnectorDtoV2ToModel(dtoV2);

        expect(result.functionGroups).toHaveLength(1);
        expect(result.functionGroups[0].functionGroupCode).toBe('authorityProvider');
        expect(result.functionGroups[0].kinds).toEqual(['EJBCA']);
    });

    test('transformConnectInfoDtoToFunctionGroups returns transformed groups for v1 shape', () => {
        const functionGroup = {
            functionGroupCode: 'FG',
            kinds: ['kind'],
            endPoints: [{ uuid: 'e-1', context: '/v1/info' }],
        } as any;

        const infoV1 = {
            functionGroups: [functionGroup],
        } as any;

        const result = transformConnectInfoDtoToFunctionGroups(infoV1);

        expect(result).toHaveLength(1);
        expect((result[0] as any).functionGroupCode).toBe('FG');
        expect(result[0].endPoints).toHaveLength(1);
    });

    test('transformConnectInfoDtoToFunctionGroups returns empty array for v2 shape without functionGroups', () => {
        const infoV2 = {
            interfaces: [{ code: 'IFACE', version: 'V2' }],
        } as any;

        const result = transformConnectInfoDtoToFunctionGroups(infoV2);

        expect(result).toEqual([]);
    });

    test('transformConnectorResponseDtoToModel maps function groups and attributes', () => {
        const connectorDto = {
            uuid: 'conn-3',
            name: 'Connector v1',
            url: 'https://example.com/v1',
            authType: AuthType.None,
            status: 'Connected',
            functionGroups: [
                {
                    code: 'FG',
                    kinds: ['kind'],
                    endPoints: [{ uuid: 'e-1', context: '/v1/info' }],
                },
            ],
            authAttributes: [],
            customAttributes: [],
        } as any;

        const result = transformConnectorResponseDtoToModel(connectorDto);

        expect(result.uuid).toBe('conn-3');
        expect(result.functionGroups).toHaveLength(1);
        expect(result.functionGroups[0].endPoints).toHaveLength(1);
        expect(result.authAttributes).toEqual([]);
        expect(result.customAttributes).toEqual([]);
    });

    test('transformConnectorRequestModelToDto transforms attribute arrays', () => {
        const attribute = { content: [{ some: 'data' }] } as any;
        const model = {
            name: 'Connector',
            url: 'https://example.com',
            authAttributes: [attribute],
            customAttributes: [attribute],
        } as any;

        const dto = transformConnectorRequestModelToDto(model);

        expect(dto.name).toBe('Connector');
        expect(dto.url).toBe('https://example.com');
        expect(dto.authAttributes).toHaveLength(1);
        expect(dto.customAttributes).toHaveLength(1);
        expect(dto.authAttributes![0]).not.toBe(attribute);
        expect(dto.customAttributes![0]).not.toBe(attribute);
    });

    test('transformConnectorUpdateRequestModelToDto transforms attribute arrays', () => {
        const attribute = { content: [{ some: 'data' }] } as any;
        const model = {
            authAttributes: [attribute],
            customAttributes: [attribute],
        } as any;

        const dto = transformConnectorUpdateRequestModelToDto(model);

        expect(dto.authAttributes).toHaveLength(1);
        expect(dto.customAttributes).toHaveLength(1);
        expect(dto.authAttributes![0]).not.toBe(attribute);
        expect(dto.customAttributes![0]).not.toBe(attribute);
    });
});
