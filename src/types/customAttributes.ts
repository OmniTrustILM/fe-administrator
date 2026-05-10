import type { BaseAttributeContentModel } from './attributes';
import type { CustomAttributeCreateRequestDto, CustomAttributeDefinitionDetailDto, CustomAttributeUpdateRequestDto } from './openapi';

export type {
    CustomAttributeDefinitionDto as CustomAttributeResponseDto,
    CustomAttributeDefinitionDto as CustomAttributeResponseModel,
    CustomAttributeDefinitionDetailDto as CustomAttributeDetailResponseDto,
    CustomAttributeCreateRequestDto,
    CustomAttributeUpdateRequestDto,
} from './openapi';

export type CustomAttributeDetailResponseModel = Omit<CustomAttributeDefinitionDetailDto, 'content'> & {
    content?: Array<BaseAttributeContentModel>;
};

export type CustomAttributeCreateRequestModel = Omit<CustomAttributeCreateRequestDto, 'content'> & {
    content?: Array<BaseAttributeContentModel>;
};

export type CustomAttributeUpdateRequestModel = Omit<CustomAttributeUpdateRequestDto, 'content'> & {
    content?: Array<BaseAttributeContentModel>;
};
