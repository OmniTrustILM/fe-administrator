import { describe, expect, test } from 'vitest';
import { transformAuditLogDtoToModel, transformAuditLogItemDtoToModel } from './auditLogs';

describe('auditLogs transforms', () => {
    test('transformAuditLogItemDtoToModel copies fields', () => {
        const dto = { id: 1, message: 'test', module: 'AUTH' } as any;
        const result = transformAuditLogItemDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformAuditLogDtoToModel maps items array', () => {
        const itemDto = { id: 1, message: 'item-1', module: 'AUTH' } as any;
        const dto = { totalPages: 1, items: [itemDto] } as any;
        const result = transformAuditLogDtoToModel(dto);
        expect(result.items).toHaveLength(1);
        expect(result.items[0]).toEqual(itemDto);
        expect(result.items[0]).not.toBe(itemDto);
    });
});
