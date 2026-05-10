import type {
    TokenProfileAddRequestDto,
    TokenProfileAddRequestModel,
    TokenProfileDetailResponseDto,
    TokenProfileDetailResponseModel,
    TokenProfileEditRequestDto,
    TokenProfileEditRequestModel,
    TokenProfileKeyUsageBulkUpdateRequestDto,
    TokenProfileKeyUsageBulkUpdateRequestModel,
    TokenProfileKeyUsageUpdateRequestDto,
    TokenProfileKeyUsageUpdateRequestModel,
    TokenProfileResponseDto,
    TokenProfileResponseModel,
} from 'types/token-profiles';
import { transformAttributeRequestModelToDto, transformAttributeResponseDtoToModel } from './attributes';

export function transformTokenProfileResponseDtoToModel(tokenResponse: TokenProfileResponseDto): TokenProfileResponseModel {
    return {
        ...tokenResponse,
    };
}

export function transformTokenProfileDetailResponseDtoToModel(
    tokenResponse: TokenProfileDetailResponseDto,
): TokenProfileDetailResponseModel {
    return {
        ...tokenResponse,
        attributes: tokenResponse.attributes.map(transformAttributeResponseDtoToModel),
        customAttributes: tokenResponse.customAttributes?.map(transformAttributeResponseDtoToModel),
    };
}

export function transformTokenProfileAddRequestModelToDto(tokenAddReq: TokenProfileAddRequestModel): TokenProfileAddRequestDto {
    return {
        ...tokenAddReq,
        attributes: tokenAddReq.attributes.map(transformAttributeRequestModelToDto),
        customAttributes: tokenAddReq.customAttributes?.map(transformAttributeRequestModelToDto),
    };
}

export function transformTokenProfileEditRequestModelToDto(tokenEditReq: TokenProfileEditRequestModel): TokenProfileEditRequestDto {
    return {
        ...tokenEditReq,
        attributes: tokenEditReq.attributes.map(transformAttributeRequestModelToDto),
        customAttributes: tokenEditReq.customAttributes?.map(transformAttributeRequestModelToDto),
    };
}

function spreadCopy<TIn extends object, TOut>(input: TIn): TOut {
    return { ...input } as unknown as TOut;
}

export function transformTokenProfileKeyUsageRequestModelToDto(
    keyUsageRequest: TokenProfileKeyUsageUpdateRequestModel,
): TokenProfileKeyUsageUpdateRequestDto {
    return spreadCopy(keyUsageRequest);
}

export function transformTokenProfileBulkKeyUsageRequestModelToDto(
    keyUsageRequest: TokenProfileKeyUsageBulkUpdateRequestModel,
): TokenProfileKeyUsageBulkUpdateRequestDto {
    return spreadCopy(keyUsageRequest);
}
