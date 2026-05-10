import type { AttributeRequestModel, AttributeResponseModel } from './attributes';
import type { CertificateListResponseModel } from './certificate';
import type { ScepProfileDetailDto, ScepProfileEditRequestDto, ScepProfileRequestDto } from './openapi';
import type { RaProfileSimplifiedModel } from './ra-profiles';

export type {
    ScepProfileRequestDto as ScepProfileAddRequestDto,
    ScepProfileEditRequestDto,
    ScepProfileDetailDto as ScepProfileResponseDto,
    ScepProfileDto as ScepProfileListResponseDto,
    ScepProfileDto as ScepProfileListResponseModel,
} from './openapi';

export type ScepProfileAddRequestModel = Omit<ScepProfileRequestDto, 'issueCertificateAttributes | customAttributes'> & {
    issueCertificateAttributes: Array<AttributeRequestModel>;
    customAttributes?: Array<AttributeRequestModel>;
};

export type ScepProfileEditRequestModel = Omit<ScepProfileEditRequestDto, 'issueCertificateAttributes | customAttributes'> & {
    issueCertificateAttributes: Array<AttributeRequestModel>;
    customAttributes?: Array<AttributeRequestModel>;
};

export type ScepProfileResponseModel = Omit<
    ScepProfileDetailDto,
    'raProfile | issueCertificateAttributes | customAttributes | caCertificate'
> & {
    raProfile?: RaProfileSimplifiedModel;
    issueCertificateAttributes?: Array<AttributeResponseModel>;
    customAttributes?: Array<AttributeResponseModel>;
    caCertificate?: CertificateListResponseModel;
};
