import type {
    ApprovalProfileDetailDto,
    ApprovalProfileRequestDto,
    ApprovalProfileResponseDto,
    ApprovalProfileUpdateRequestDto,
    ApprovalStepDto,
    ApprovalStepRequestDto,
} from './openapi';

export type {
    ApprovalStepDto as ProfileApprovalStepDto,
    ApprovalStepDto as ProfileApprovalStepModel,
    ApprovalStepRequestDto as ApprovalStepRequestModel,
    ApprovalProfileDetailDto as ProfileApprovalDetailDto,
    ApprovalProfileDto as ProfileApprovalDto,
    ApprovalProfileDto as ProfileApprovalModel,
    ApprovalProfileRequestDto as ProfileApprovalRequestDto,
    ApprovalProfileResponseDto as ProfileApprovalResponseDto,
    ApprovalProfileUpdateRequestDto as ProfileApprovalUpdateRequestDto,
} from './openapi';

export type ProfileApprovalDetailModel = Omit<ApprovalProfileDetailDto, 'approvalSteps'> & {
    approvalSteps: Array<ApprovalStepDto>;
};

export type ProfileApprovalRequestModel = Omit<ApprovalProfileRequestDto, 'approvalSteps'> & {
    approvalSteps: Array<ApprovalStepRequestDto>;
};

export type ProfileApprovalResponseModel = Omit<ApprovalProfileResponseDto, 'approvalProfiles'> & {
    approvalProfiles?: Array<import('./openapi').ApprovalProfileDto>;
};

export type ProfileApprovalUpdateRequestModel = Omit<ApprovalProfileUpdateRequestDto, 'approvalSteps'> & {
    approvalSteps: Array<ApprovalStepRequestDto>;
};

export enum ApproverType {
    User = 'User',
    Group = 'Group',
    Role = 'Role',
}
