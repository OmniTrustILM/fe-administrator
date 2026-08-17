import type { BaseAttributeContentModel } from './attributes';
import type {
    CustomAttributeCreateRequestDto,
    CustomAttributeDefinitionDetailDto,
    CustomAttributeDefinitionDto,
    CustomAttributeUpdateRequestDto,
} from './openapi';

export type {
    CustomAttributeDefinitionDto as CustomAttributeResponseDto,
    CustomAttributeDefinitionDetailDto as CustomAttributeDetailResponseDto,
    CustomAttributeCreateRequestDto,
    CustomAttributeUpdateRequestDto,
} from './openapi';

// OpenAPI list DTO omits `required` (core#2011), but the backend returns it.
// Drop this override once the spec is regenerated.
export type CustomAttributeResponseModel = CustomAttributeDefinitionDto & { required?: boolean };

export type CustomAttributeDetailResponseModel = Omit<CustomAttributeDefinitionDetailDto, 'content'> & {
    content?: Array<BaseAttributeContentModel>;
};

export type CustomAttributeCreateRequestModel = Omit<CustomAttributeCreateRequestDto, 'content'> & {
    content?: Array<BaseAttributeContentModel>;
};

export type CustomAttributeUpdateRequestModel = Omit<CustomAttributeUpdateRequestDto, 'content'> & {
    content?: Array<BaseAttributeContentModel>;
};
