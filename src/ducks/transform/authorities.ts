import type {
    AuthorityRequestDto,
    AuthorityRequestModel,
    AuthorityResponseDto,
    AuthorityResponseModel,
    AuthorityUpdateRequestDto,
    AuthorityUpdateRequestModel,
} from 'types/authorities';
import { transformAttributeRequestModelToDto, transformAttributeResponseDtoToModel } from './attributes';

export function transformAuthorityResponseDtoToModel(authorityResponseDto: AuthorityResponseDto): AuthorityResponseModel {
    return {
        ...authorityResponseDto,
        attributes: authorityResponseDto.attributes ?? [],
        customAttributes: authorityResponseDto.customAttributes?.map(transformAttributeResponseDtoToModel),
    };
}

function mapAuthorityRequestPayload<T extends AuthorityRequestModel | AuthorityUpdateRequestModel>(authority: T) {
    return {
        ...authority,
        attributes: authority.attributes.map(transformAttributeRequestModelToDto),
        customAttributes: authority.customAttributes?.map(transformAttributeRequestModelToDto),
    };
}

export function transformAuthorityRequestModelToDto(authority: AuthorityRequestModel): AuthorityRequestDto {
    return mapAuthorityRequestPayload(authority);
}

export function transformAuthorityUpdateRequestModelToDto(authority: AuthorityUpdateRequestModel): AuthorityUpdateRequestDto {
    return mapAuthorityRequestPayload(authority);
}
