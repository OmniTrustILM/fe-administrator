import { describe, expect, test } from 'vitest';
import {
    transformProxyListDtoToModel,
    transformProxyRequestModelToDto,
    transformProxyResponseDtoToModel,
    transformProxyUpdateRequestModelToDto,
} from './proxies';

describe('proxies transforms', () => {
    test('transformProxyResponseDtoToModel copies fields', () => {
        const dto = { uuid: 'id-1', name: 'proxy-1', enabled: true } as any;
        const result = transformProxyResponseDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformProxyListDtoToModel copies fields', () => {
        const dto = { uuid: 'id-2', name: 'proxy-2', enabled: false } as any;
        const result = transformProxyListDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformProxyRequestModelToDto copies fields', () => {
        const dto = { name: 'proxy-3', host: 'proxy.example.com', port: 8080 } as any;
        const result = transformProxyRequestModelToDto(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformProxyUpdateRequestModelToDto copies fields', () => {
        const dto = { host: 'new.proxy.example.com', port: 3128 } as any;
        const result = transformProxyUpdateRequestModelToDto(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });
});
