import type { AttributeRequestModel, AttributeResponseModel } from './attributes';
import type { CmpProfileDetailDto, CmpProfileEditRequestDto, CmpProfileRequestDto } from './openapi';
import type { ProtocolChallengeSource } from './protocol-challenge-source';

export type {
    CmpProfileRequestDto,
    CmpProfileEditRequestDto,
    CmpProfileDetailDto,
    CmpProfileDto,
    CmpProfileDto as CmpProfileModel,
} from './openapi';

export type CmpProfileRequestModel = Omit<
    CmpProfileRequestDto,
    'issueCertificateAttributes | revokeCertificateAttributes | customAttributes'
> & {
    issueCertificateAttributes?: Array<AttributeRequestModel>;
    revokeCertificateAttributes?: Array<AttributeRequestModel>;
    customAttributes?: Array<AttributeRequestModel>;
    challengeSource?: ProtocolChallengeSource;
};

export type CmpProfileEditRequestModel = Omit<
    CmpProfileEditRequestDto,
    'issueCertificateAttributes | revokeCertificateAttributes | customAttributes'
> & {
    issueCertificateAttributes?: Array<AttributeRequestModel>;
    revokeCertificateAttributes?: Array<AttributeRequestModel>;
    customAttributes?: Array<AttributeRequestModel>;
    challengeSource?: ProtocolChallengeSource;
};

export type CmpProfileDetailModel = Omit<
    CmpProfileDetailDto,
    'issueCertificateAttributes | revokeCertificateAttributes | customAttributes'
> & {
    issueCertificateAttributes?: Array<AttributeResponseModel>;
    revokeCertificateAttributes?: Array<AttributeResponseModel>;
    customAttributes?: Array<AttributeResponseModel>;
    challengeSource?: ProtocolChallengeSource;
};
