import type { TokenInstanceStatusDetailDto } from 'types/openapi';
import type {
    TokenDetailResponseModel,
    TokenDetailResponseDto,
    TokenInstanceStatusComponentResponseDto,
    TokenInstanceStatusComponentResponseModel,
    TokenInstanceStatusResponseModel,
    TokenRequestDto,
    TokenRequestModel,
    TokenResponseDto,
    TokenResponseModel,
} from 'types/tokens';
import { transformAttributeRequestModelToDto, transformAttributeResponseDtoToModel } from './attributes';
import { transformMetadataDtoToModel } from './locations';

export function transformTokenResponseDtoToModel(tokenResponseDto: TokenResponseDto): TokenResponseModel {
    return {
        ...tokenResponseDto,
    };
}

export function transformTokenDetailResponseDtoToModel(tokenResponseDto: TokenDetailResponseDto): TokenDetailResponseModel {
    return {
        ...tokenResponseDto,
        attributes: tokenResponseDto.attributes.map(transformAttributeResponseDtoToModel),
        customAttributes: tokenResponseDto.customAttributes?.map(transformAttributeResponseDtoToModel),
        metadata: tokenResponseDto.metadata?.map(transformMetadataDtoToModel),
        status: transformTokenInstanceStatusDtoToModel(tokenResponseDto.status),
    };
}

export function transformTokenRequestModelToDto(token: TokenRequestModel): TokenRequestDto {
    return {
        ...token,
        attributes: token.attributes.map(transformAttributeRequestModelToDto),
        customAttributes: token.customAttributes?.map(transformAttributeRequestModelToDto),
    };
}

export function transformTokenInstanceStatusDtoToModel(status: TokenInstanceStatusDetailDto): TokenInstanceStatusResponseModel {
    return {
        ...status,
        components: status.components ? transformTokenInstanceStatusComponentDtoToModel(status.components) : undefined,
    };
}

export function transformTokenInstanceStatusComponentDtoToModel(
    components: TokenInstanceStatusComponentResponseDto,
): TokenInstanceStatusComponentResponseModel {
    return {
        ...components,
    };
}
