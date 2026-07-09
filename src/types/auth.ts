import type { AttributeRequestModel, AttributeResponseModel } from './attributes';
import type {
    AuthActionDto,
    AuthResourceDto,
    RoleDto,
    UpdateUserRequestDto,
    UserCertificateDto,
    UserDetailDto,
    UserProfileDetailDto,
} from './openapi';

export type {
    AuthActionDto,
    AuthActionDto as AuthActionModel,
    AuthResourceDto,
    UserCertificateDto,
    UserCertificateDto as UserCertificateModel,
    RoleDto as RoleResponseDto,
    RoleDto as RoleResponseModel,
    UserDetailDto,
    UserProfileDetailDto,
    UpdateUserRequestDto as UserUpdateRequestDto,
} from './openapi';

export type AuthResourceModel = Omit<AuthResourceDto, 'actions'> & { actions: Array<AuthActionDto> };

export type UserDetailModel = Omit<UserDetailDto, 'certificate' | 'roles' | 'customAttributes'> & {
    certificate?: UserCertificateDto;
    roles: Array<RoleDto>;
    customAttributes?: Array<AttributeResponseModel>;
};

export type UserProfileDetailModel = Omit<UserProfileDetailDto, 'certificate' | 'roles' | 'customAttributes'> & {
    certificate?: UserCertificateDto;
    roles: Array<RoleDto>;
    customAttributes?: Array<AttributeResponseModel>;
};

export type UserUpdateRequestModel = Omit<UpdateUserRequestDto, 'customAttributes' | 'certificateCustomAttributes'> & {
    customAttributes?: Array<AttributeRequestModel>;
    certificateCustomAttributes?: Array<AttributeRequestModel>;
};
