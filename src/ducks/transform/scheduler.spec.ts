import { describe, expect, test } from 'vitest';
import {
    transformSchedulerJobDetailDtoToModel,
    transformSchedulerJobDtoToModel,
    transformSchedulerJobHistoryDtoToModel,
} from './scheduler';

describe('scheduler transforms', () => {
    test('transformSchedulerJobDtoToModel copies fields', () => {
        const dto = { uuid: 'id-1', jobName: 'job-1', enabled: true } as any;
        const result = transformSchedulerJobDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformSchedulerJobHistoryDtoToModel copies fields', () => {
        const dto = { uuid: 'id-2', jobName: 'job-1', status: 'SUCCESS' } as any;
        const result = transformSchedulerJobHistoryDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformSchedulerJobDetailDtoToModel copies fields', () => {
        const dto = { uuid: 'id-3', jobName: 'job-3', cronExpression: '0 * * * *', enabled: true } as any;
        const result = transformSchedulerJobDetailDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });
});
