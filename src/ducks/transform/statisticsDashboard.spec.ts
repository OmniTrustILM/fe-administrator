import { describe, expect, test } from 'vitest';
import { transformStatisticsDashboardDtoToModel } from './statisticsDashboard';

describe('statisticsDashboard transforms', () => {
    test('transformStatisticsDashboardDtoToModel copies fields', () => {
        const dto = { totalCertificates: 42, expiringSoon: 5, expired: 2 } as any;
        const result = transformStatisticsDashboardDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });
});
