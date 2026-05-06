import { describe, expect, test } from 'vitest';
import { transformAcmeAccountListResponseDtoToModel, transformAcmeAccountResponseDtoToModel } from './acme-accounts';

describe('acme-accounts transforms', () => {
    test('transformAcmeAccountResponseDtoToModel copies fields', () => {
        const dto = { uuid: 'id-1', accountId: 'acc-1', enabled: true } as any;
        const result = transformAcmeAccountResponseDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformAcmeAccountListResponseDtoToModel copies fields', () => {
        const dto = { uuid: 'id-2', accountId: 'acc-2', enabled: false } as any;
        const result = transformAcmeAccountListResponseDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });
});
