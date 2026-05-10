import type { AttributeRequestModel, AttributeResponseModel } from './attributes';
import type {
    ObjectPermissionsDto,
    ObjectPermissionsRequestDto,
    ResourcePermissionsDto,
    ResourcePermissionsRequestDto,
    RoleDetailDto,
    RolePermissionsRequestDto,
    RoleRequestDto,
    SubjectPermissionsDto,
} from './openapi';
import type { UserResponseModel } from './users';

export type {
    RoleDetailDto,
    RoleRequestDto,
    ObjectPermissionsRequestDto,
    ObjectPermissionsRequestDto as ObjectPermissionsRequestModel,
    ObjectPermissionsDto as ObjectPermissionsResponseDto,
    ObjectPermissionsDto as ObjectPermissionsResponseModel,
    ResourcePermissionsRequestDto,
    ResourcePermissionsDto as ResourcePermissionsResponseDto,
    SubjectPermissionsDto,
    RolePermissionsRequestDto as RolePermissionsDto,
} from './openapi';

export type RoleDetailModel = Omit<RoleDetailDto, 'users | customAttributes'> & {
    users: Array<UserResponseModel>;
    customAttributes?: Array<AttributeResponseModel>;
};

export type RoleRequestModel = Omit<RoleRequestDto, 'customAttributes'> & { customAttributes?: Array<AttributeRequestModel> };

export type ResourcePermissionsRequestModel = Omit<ResourcePermissionsRequestDto, 'objects'> & {
    objects?: Array<ObjectPermissionsRequestDto>;
};

export type ResourcePermissionsResponseModel = Omit<ResourcePermissionsDto, 'objects'> & {
    objects: Array<ObjectPermissionsDto>;
};

export type SubjectPermissionsModel = Omit<SubjectPermissionsDto, 'resources'> & { resources: Array<ResourcePermissionsResponseModel> };

export type RolePermissionsModel = Omit<RolePermissionsRequestDto, 'resources'> & { resources?: Array<ResourcePermissionsRequestModel> };
