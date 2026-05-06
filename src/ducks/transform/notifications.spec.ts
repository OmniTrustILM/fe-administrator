import { describe, expect, test } from 'vitest';

import {
    transformNotificationDtoToModel,
    transformNotificationInstanceDtoToModel,
    transformNotificationInstanceModelToDto,
} from './notifications';

const attrItem = { uuid: 'a1', name: 'attr', label: 'Attr', type: 'STRING', contentType: 'STRING', version: 'V2', content: [] } as any;
const mappingItem = { fromAttribute: 'from', toAttribute: 'to' } as any;

describe('notification transform helpers', () => {
    test('transformNotificationDtoToModel returns shallow clone', () => {
        const input = { uuid: 'n1', message: 'hello' } as any;
        const result = transformNotificationDtoToModel(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });

    test('transformNotificationInstanceDtoToModel with no attributes and no attributeMappings returns both as undefined', () => {
        const input = { uuid: 'ni-1', attributes: undefined, attributeMappings: undefined } as any;
        const result = transformNotificationInstanceDtoToModel(input);
        expect(result.attributes).toBeUndefined();
        expect(result.attributeMappings).toBeUndefined();
    });

    test('transformNotificationInstanceDtoToModel with attributes present maps each attribute', () => {
        const input = { uuid: 'ni-2', attributes: [attrItem], attributeMappings: undefined } as any;
        const result = transformNotificationInstanceDtoToModel(input);
        expect(result.attributes).toHaveLength(1);
        expect(result.attributeMappings).toBeUndefined();
    });

    test('transformNotificationInstanceDtoToModel with attributeMappings present maps each mapping', () => {
        const input = { uuid: 'ni-3', attributes: undefined, attributeMappings: [mappingItem] } as any;
        const result = transformNotificationInstanceDtoToModel(input);
        expect(result.attributes).toBeUndefined();
        expect(result.attributeMappings).toHaveLength(1);
        expect(result.attributeMappings![0]).toEqual(mappingItem);
    });

    test('transformNotificationInstanceModelToDto with no attributes and no attributeMappings returns both as undefined', () => {
        const input = { uuid: 'ni-4', attributes: undefined, attributeMappings: undefined } as any;
        const result = transformNotificationInstanceModelToDto(input);
        expect(result.attributes).toBeUndefined();
        expect(result.attributeMappings).toBeUndefined();
    });

    test('transformNotificationInstanceModelToDto with attributes and attributeMappings present maps both', () => {
        const input = { uuid: 'ni-5', attributes: [attrItem], attributeMappings: [mappingItem] } as any;
        const result = transformNotificationInstanceModelToDto(input);
        expect(result.attributes).toHaveLength(1);
        expect(result.attributeMappings).toHaveLength(1);
        expect(result.attributeMappings![0]).toEqual(mappingItem);
    });
});
