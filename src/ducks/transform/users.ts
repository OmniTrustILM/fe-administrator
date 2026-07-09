import type { UserAddRequestDto, UserAddRequestModel, UserResponseDto, UserResponseModel } from 'types/users';
import { transformAttributeRequestModelToDto } from './attributes';

export function transformUserResponseDtoToModel(user: UserResponseDto): UserResponseModel {
    return { ...user };
}

export function transformUserAddRequestModelToDto(user: UserAddRequestModel): UserAddRequestDto {
    return {
        ...user,
        customAttributes: user.customAttributes?.map(transformAttributeRequestModelToDto),
        certificateCustomAttributes: user.certificateCustomAttributes?.map(transformAttributeRequestModelToDto),
    };
}
