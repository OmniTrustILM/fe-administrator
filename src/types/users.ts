import type { AttributeRequestModel } from './attributes';
import type { AddUserRequestDto } from './openapi';

export type { UserDto as UserResponseDto, UserDto as UserResponseModel } from './openapi';

export type { AddUserRequestDto as UserAddRequestDto } from './openapi';
export type UserAddRequestModel = Omit<AddUserRequestDto, 'customAttributes'> & { customAttributes?: Array<AttributeRequestModel> };
