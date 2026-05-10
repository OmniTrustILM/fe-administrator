import type { AttributeRequestModel, AttributeResponseModel } from './attributes';
import type {
    CmpProfileDetailDto as CmpProfileDetailDtoOpenApi,
    CmpProfileDto as CmpProfileDtoOpenApi,
    CmpProfileEditRequestDto as CmpProfileEditRequestDtoOpenApi,
    CmpProfileRequestDto as CmpProfileRequestDtoOpenApi,
} from './openapi';

export type CmpProfileRequestDto = CmpProfileRequestDtoOpenApi;
export type CmpProfileRequestModel = Omit<
    CmpProfileRequestDto,
    'issueCertificateAttributes | revokeCertificateAttributes | customAttributes'
> & {
    issueCertificateAttributes?: Array<AttributeRequestModel>;
    revokeCertificateAttributes?: Array<AttributeRequestModel>;
    customAttributes?: Array<AttributeRequestModel>;
};

export type CmpProfileEditRequestDto = CmpProfileEditRequestDtoOpenApi;
export type CmpProfileEditRequestModel = Omit<
    CmpProfileEditRequestDto,
    'issueCertificateAttributes | revokeCertificateAttributes | customAttributes'
> & {
    issueCertificateAttributes?: Array<AttributeRequestModel>;
    revokeCertificateAttributes?: Array<AttributeRequestModel>;
    customAttributes?: Array<AttributeRequestModel>;
};

export type CmpProfileDetailDto = CmpProfileDetailDtoOpenApi;
export type CmpProfileDetailModel = Omit<
    CmpProfileDetailDto,
    'issueCertificateAttributes | revokeCertificateAttributes | customAttributes'
> & {
    issueCertificateAttributes?: Array<AttributeResponseModel>;
    revokeCertificateAttributes?: Array<AttributeResponseModel>;
    customAttributes?: Array<AttributeResponseModel>;
};

export type CmpProfileDto = CmpProfileDtoOpenApi;
export type CmpProfileModel = CmpProfileDto;
