import { describe, expect, test } from 'vitest';
import {
    transformApprovalDtoToModel,
    transformApprovalStepRecipientDtoToModel,
    transformDetailApprovalDtoToModel,
    transformDetailApprovalStepDtoToModel,
    transformResponseApprovalDtoToModel,
} from './approvals';

describe('approvals transforms', () => {
    test('transformApprovalDtoToModel copies fields', () => {
        const dto = { uuid: 'approval-1', status: 'PENDING' } as any;
        const result = transformApprovalDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformApprovalStepRecipientDtoToModel copies fields', () => {
        const dto = { uuid: 'recipient-1', approvalStepRecipientUuid: 'step-rec-1' } as any;
        const result = transformApprovalStepRecipientDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformDetailApprovalStepDtoToModel maps approvalStepRecipients to empty array when missing', () => {
        const dto = { uuid: 'step-1' } as any;
        const result = transformDetailApprovalStepDtoToModel(dto);
        expect(result.approvalStepRecipients).toEqual([]);
    });

    test('transformDetailApprovalStepDtoToModel maps approvalStepRecipients when present', () => {
        const dto = {
            uuid: 'step-1',
            approvalStepRecipients: [{ uuid: 'rec-1' }, { uuid: 'rec-2' }],
        } as any;
        const result = transformDetailApprovalStepDtoToModel(dto);
        expect(result.approvalStepRecipients).toHaveLength(2);
    });

    test('transformDetailApprovalDtoToModel maps approvalSteps to empty array when missing', () => {
        const dto = { uuid: 'detail-1' } as any;
        const result = transformDetailApprovalDtoToModel(dto);
        expect(result.approvalSteps).toEqual([]);
    });

    test('transformDetailApprovalDtoToModel maps approvalSteps when present including nested recipients', () => {
        const dto = {
            uuid: 'detail-1',
            approvalSteps: [{ uuid: 'step-1', approvalStepRecipients: [{ uuid: 'rec-1' }] }, { uuid: 'step-2' }],
        } as any;
        const result = transformDetailApprovalDtoToModel(dto);
        expect(result.approvalSteps).toHaveLength(2);
        expect(result.approvalSteps[0].approvalStepRecipients).toHaveLength(1);
        expect(result.approvalSteps[1].approvalStepRecipients).toEqual([]);
    });

    test('transformResponseApprovalDtoToModel maps approvals to empty array when missing', () => {
        const dto = { pageNumber: 1, pageSize: 10, totalPages: 1 } as any;
        const result = transformResponseApprovalDtoToModel(dto);
        expect(result.approvals).toEqual([]);
    });

    test('transformResponseApprovalDtoToModel maps approvals when present', () => {
        const dto = {
            pageNumber: 1,
            pageSize: 10,
            totalPages: 1,
            approvals: [
                { uuid: 'a-1', status: 'PENDING' },
                { uuid: 'a-2', status: 'APPROVED' },
            ],
        } as any;
        const result = transformResponseApprovalDtoToModel(dto);
        expect(result.approvals).toHaveLength(2);
    });
});
