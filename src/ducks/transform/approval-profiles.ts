import type {
    ApprovalStepRequestModel,
    ProfileApprovalDetailDto,
    ProfileApprovalDetailModel,
    ProfileApprovalDto,
    ProfileApprovalModel,
    ProfileApprovalRequestDto,
    ProfileApprovalRequestModel,
    ProfileApprovalResponseDto,
    ProfileApprovalResponseModel,
    ProfileApprovalStepDto,
    ProfileApprovalStepModel,
    ProfileApprovalUpdateRequestDto,
    ProfileApprovalUpdateRequestModel,
} from 'types/approval-profiles';
import type { ApprovalStepRequestDto } from 'types/openapi';

export function transformProfileApprovalStepDtoToModel(profileApprovalStep: ProfileApprovalStepDto): ProfileApprovalStepModel {
    return { ...profileApprovalStep };
}

export function transformApprovalStepRequestDtoToModel(approvalStepRequest: ApprovalStepRequestDto): ApprovalStepRequestModel {
    return { ...approvalStepRequest };
}

export function transformProfileApprovalDetailDtoToModel(profileApprovalDetail: ProfileApprovalDetailDto): ProfileApprovalDetailModel {
    return {
        ...profileApprovalDetail,
        approvalSteps: profileApprovalDetail.approvalSteps?.map(transformProfileApprovalStepDtoToModel) || [],
    };
}

export function transformProfileApprovalDtoToModel(profileApproval: ProfileApprovalDto): ProfileApprovalModel {
    return { ...profileApproval };
}

export function transformProfileApprovalRequestDtoToModel(profileApprovalRequest: ProfileApprovalRequestDto): ProfileApprovalRequestModel {
    return {
        ...profileApprovalRequest,
        approvalSteps: profileApprovalRequest.approvalSteps?.map(transformApprovalStepRequestDtoToModel) || [],
    };
}

export function transformProfileApprovalResponseDtoToModel(
    profileApprovalResponse: ProfileApprovalResponseDto,
): ProfileApprovalResponseModel {
    return {
        ...profileApprovalResponse,
        approvalProfiles: profileApprovalResponse.approvalProfiles?.map(transformProfileApprovalDtoToModel) || [],
    };
}

export function transformProfileApprovalUpdateRequestDtoToModel(
    profileApprovalUpdateRequest: ProfileApprovalUpdateRequestDto,
): ProfileApprovalUpdateRequestModel {
    return {
        ...profileApprovalUpdateRequest,
        approvalSteps: profileApprovalUpdateRequest.approvalSteps?.map(transformApprovalStepRequestDtoToModel) || [],
    };
}
