import type { AttributeRequestModel, AttributeResponseModel } from './attributes';
import type { EstProfileDetailDto, EstProfileEditRequestDto, EstProfileRequestDto } from './openapi';

export type {
    EstProfileRequestDto,
    EstProfileEditRequestDto,
    EstProfileDetailDto,
    EstProfileDto,
    EstProfileDto as EstProfileModel,
} from './openapi';

type EstRequestAttributeKeys = 'keyRecoveryKeyAttributes' | 'issueCertificateAttributes' | 'customAttributes';

export type EstProfileRequestModel = Omit<EstProfileRequestDto, EstRequestAttributeKeys> & {
    keyRecoveryKeyAttributes?: Array<AttributeRequestModel>;
    issueCertificateAttributes?: Array<AttributeRequestModel>;
    customAttributes?: Array<AttributeRequestModel>;
};

export type EstProfileEditRequestModel = Omit<EstProfileEditRequestDto, EstRequestAttributeKeys> & {
    keyRecoveryKeyAttributes?: Array<AttributeRequestModel>;
    issueCertificateAttributes?: Array<AttributeRequestModel>;
    customAttributes?: Array<AttributeRequestModel>;
};

export type EstProfileDetailModel = Omit<EstProfileDetailDto, EstRequestAttributeKeys> & {
    keyRecoveryKeyAttributes?: Array<AttributeResponseModel>;
    issueCertificateAttributes?: Array<AttributeResponseModel>;
    customAttributes?: Array<AttributeResponseModel>;
};
