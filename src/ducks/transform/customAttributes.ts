import type {
    CustomAttributeCreateRequestDto,
    CustomAttributeCreateRequestModel,
    CustomAttributeDetailResponseDto,
    CustomAttributeDetailResponseModel,
    CustomAttributeResponseDto,
    CustomAttributeResponseModel,
    CustomAttributeUpdateRequestDto,
    CustomAttributeUpdateRequestModel,
} from 'types/customAttributes';

export function transformCustomAttributeResponseDtoToModel(customAttribute: CustomAttributeResponseDto): CustomAttributeResponseModel {
    return { ...customAttribute };
}

function cloneCustomAttributePayload<T extends { content?: unknown }>(input: T): T {
    return {
        ...input,
        content: input.content ? structuredClone(input.content) : undefined,
    };
}

export function transformCustomAttributeDetailResponseDtoToModel(
    customAttribute: CustomAttributeDetailResponseDto,
): CustomAttributeDetailResponseModel {
    return cloneCustomAttributePayload(customAttribute);
}

export function transformCustomAttributeCreateRequestModelToDto(
    customAttribute: CustomAttributeCreateRequestModel,
): CustomAttributeCreateRequestDto {
    return cloneCustomAttributePayload(customAttribute);
}

export function transformCustomAttributeUpdateRequestModelToDto(
    customAttribute: CustomAttributeUpdateRequestModel,
): CustomAttributeUpdateRequestDto {
    return cloneCustomAttributePayload(customAttribute);
}
