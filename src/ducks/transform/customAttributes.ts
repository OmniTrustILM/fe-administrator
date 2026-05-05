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

export function transformCustomAttributeDetailResponseDtoToModel(
    customAttribute: CustomAttributeDetailResponseDto,
): CustomAttributeDetailResponseModel {
    return {
        ...customAttribute,
        content: customAttribute.content ? structuredClone(customAttribute.content) : undefined,
    };
}

export function transformCustomAttributeCreateRequestModelToDto(
    customAttribute: CustomAttributeCreateRequestModel,
): CustomAttributeCreateRequestDto {
    return {
        ...customAttribute,
        content: customAttribute.content ? structuredClone(customAttribute.content) : undefined,
    };
}

export function transformCustomAttributeUpdateRequestModelToDto(
    customAttribute: CustomAttributeUpdateRequestModel,
): CustomAttributeUpdateRequestDto {
    return {
        ...customAttribute,
        content: customAttribute.content ? structuredClone(customAttribute.content) : undefined,
    };
}
