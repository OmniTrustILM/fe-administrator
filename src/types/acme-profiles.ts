import type { AttributeRequestModel, AttributeResponseModel } from './attributes';
import type { AcmeProfileDto, AcmeProfileEditRequestDto, AcmeProfileRequestDto } from './openapi';
import type { RaProfileSimplifiedModel } from './ra-profiles';

export type {
    AcmeProfileRequestDto as AcmeProfileAddRequestDto,
    AcmeProfileEditRequestDto,
    AcmeProfileDto as AcmeProfileResponseDto,
    AcmeProfileListDto as AcmeProfileListResponseDto,
    AcmeProfileListDto as AcmeProfileListResponseModel,
} from './openapi';

export type AcmeProfileAddRequestModel = Omit<
    AcmeProfileRequestDto,
    'issueCertificateAttributes | revokeCertificateAttributes | customAttributes'
> & {
    issueCertificateAttributes: Array<AttributeRequestModel>;
    revokeCertificateAttributes: Array<AttributeRequestModel>;
    customAttributes?: Array<AttributeRequestModel>;
};

export type AcmeProfileEditRequestModel = Omit<
    AcmeProfileEditRequestDto,
    'issueCertificateAttributes | revokeCertificateAttributes | customAttributes'
> & {
    issueCertificateAttributes: Array<AttributeRequestModel>;
    revokeCertificateAttributes: Array<AttributeRequestModel>;
    customAttributes?: Array<AttributeRequestModel>;
};

export type AcmeProfileResponseModel = Omit<
    AcmeProfileDto,
    'raProfile | issueCertificateAttributes | revokeCertificateAttributes | customAttributes '
> & {
    raProfile?: RaProfileSimplifiedModel;
    issueCertificateAttributes?: Array<AttributeResponseModel>;
    revokeCertificateAttributes?: Array<AttributeResponseModel>;
    customAttributes?: Array<AttributeResponseModel>;
};
