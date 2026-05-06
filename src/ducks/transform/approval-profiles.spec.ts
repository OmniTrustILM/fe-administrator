import { describe, expect, test } from 'vitest';
import {
    transformApprovalStepRequestDtoToModel,
    transformProfileApprovalDetailDtoToModel,
    transformProfileApprovalDtoToModel,
    transformProfileApprovalRequestDtoToModel,
    transformProfileApprovalResponseDtoToModel,
    transformProfileApprovalStepDtoToModel,
    transformProfileApprovalUpdateRequestDtoToModel,
} from './approval-profiles';

describe('approval-profiles transforms', () => {
    test('transformProfileApprovalStepDtoToModel copies fields', () => {
        const dto = { uuid: 'step-1', order: 1 } as any;
        const result = transformProfileApprovalStepDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformApprovalStepRequestDtoToModel copies fields', () => {
        const dto = { order: 2, requiredApprovals: 1 } as any;
        const result = transformApprovalStepRequestDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformProfileApprovalDetailDtoToModel maps approvalSteps to empty array when missing', () => {
        const dto = { uuid: 'detail-1' } as any;
        const result = transformProfileApprovalDetailDtoToModel(dto);
        expect(result.approvalSteps).toEqual([]);
    });

    test('transformProfileApprovalDetailDtoToModel maps approvalSteps when present', () => {
        const dto = {
            uuid: 'detail-1',
            approvalSteps: [
                { uuid: 'step-1', order: 1 },
                { uuid: 'step-2', order: 2 },
            ],
        } as any;
        const result = transformProfileApprovalDetailDtoToModel(dto);
        expect(result.approvalSteps).toHaveLength(2);
    });

    test('transformProfileApprovalDtoToModel copies fields', () => {
        const dto = { uuid: 'profile-1', name: 'Test Profile' } as any;
        const result = transformProfileApprovalDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformProfileApprovalRequestDtoToModel maps approvalSteps to empty array when missing', () => {
        const dto = { uuid: 'req-1' } as any;
        const result = transformProfileApprovalRequestDtoToModel(dto);
        expect(result.approvalSteps).toEqual([]);
    });

    test('transformProfileApprovalRequestDtoToModel maps approvalSteps when present', () => {
        const dto = { uuid: 'req-1', approvalSteps: [{ order: 1, requiredApprovals: 1 }] } as any;
        const result = transformProfileApprovalRequestDtoToModel(dto);
        expect(result.approvalSteps).toHaveLength(1);
    });

    test('transformProfileApprovalResponseDtoToModel maps approvalProfiles to empty array when missing', () => {
        const dto = { pageNumber: 1, pageSize: 10, totalPages: 1 } as any;
        const result = transformProfileApprovalResponseDtoToModel(dto);
        expect(result.approvalProfiles).toEqual([]);
    });

    test('transformProfileApprovalResponseDtoToModel maps approvalProfiles when present', () => {
        const dto = {
            pageNumber: 1,
            pageSize: 10,
            totalPages: 1,
            approvalProfiles: [
                { uuid: 'p-1', name: 'Profile 1' },
                { uuid: 'p-2', name: 'Profile 2' },
            ],
        } as any;
        const result = transformProfileApprovalResponseDtoToModel(dto);
        expect(result.approvalProfiles).toHaveLength(2);
    });

    test('transformProfileApprovalUpdateRequestDtoToModel maps approvalSteps to empty array when missing', () => {
        const dto = { uuid: 'upd-1' } as any;
        const result = transformProfileApprovalUpdateRequestDtoToModel(dto);
        expect(result.approvalSteps).toEqual([]);
    });
});
