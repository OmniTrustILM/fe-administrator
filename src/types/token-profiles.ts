import type { AttributeRequestModel, AttributeResponseModel } from './attributes';
import type { AddTokenProfileRequestDto, EditTokenProfileRequestDto, TokenProfileDetailDto } from './openapi';

export type {
    AddTokenProfileRequestDto as TokenProfileAddRequestDto,
    EditTokenProfileRequestDto as TokenProfileEditRequestDto,
    TokenProfileDto as TokenProfileResponseDto,
    TokenProfileDto as TokenProfileResponseModel,
    TokenProfileDetailDto as TokenProfileDetailResponseDto,
    TokenProfileKeyUsageRequestDto as TokenProfileKeyUsageUpdateRequestDto,
    TokenProfileKeyUsageRequestDto as TokenProfileKeyUsageUpdateRequestModel,
    BulkTokenProfileKeyUsageRequestDto as TokenProfileKeyUsageBulkUpdateRequestDto,
    BulkTokenProfileKeyUsageRequestDto as TokenProfileKeyUsageBulkUpdateRequestModel,
} from './openapi';

export type TokenProfileAddRequestModel = Omit<AddTokenProfileRequestDto, 'attributes | customAttributes'> & {
    attributes: Array<AttributeRequestModel>;
    customAttributes?: Array<AttributeRequestModel>;
};

export type TokenProfileEditRequestModel = Omit<EditTokenProfileRequestDto, 'attributes | customAttributes'> & {
    attributes: Array<AttributeRequestModel>;
    customAttributes?: Array<AttributeRequestModel>;
};

export type TokenProfileDetailResponseModel = Omit<TokenProfileDetailDto, 'attributes | customAttributes'> & {
    attributes: Array<AttributeResponseModel>;
    customAttributes?: Array<AttributeResponseModel>;
};
