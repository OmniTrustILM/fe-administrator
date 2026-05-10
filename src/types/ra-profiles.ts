import type { AttributeRequestModel, AttributeResponseModel } from './attributes';
import type {
    ActivateAcmeForRaProfileRequestDto,
    ActivateCmpForRaProfileRequestDto,
    ActivateScepForRaProfileRequestDto,
    AddRaProfileRequestDto,
    EditRaProfileRequestDto,
    RaProfileAcmeDetailResponseDto,
    RaProfileCertificateValidationSettingsDto,
    RaProfileCertificateValidationSettingsUpdateDto,
    RaProfileCmpDetailResponseDto,
    RaProfileDto,
    RaProfileScepDetailResponseDto,
} from './openapi';

export type {
    ActivateAcmeForRaProfileRequestDto as RaProfileActivateAcmeRequestDto,
    RaProfileAcmeDetailResponseDto,
    ActivateCmpForRaProfileRequestDto as RaProfileActivateCmpRequestDto,
    RaProfileCmpDetailResponseDto,
    ActivateScepForRaProfileRequestDto as RaProfileActivateScepRequestDto,
    RaProfileScepDetailResponseDto,
    AddRaProfileRequestDto as RaProfileAddRequestDto,
    EditRaProfileRequestDto as RaProfileEditRequestDto,
    RaProfileCertificateValidationSettingsUpdateDto,
    SimplifiedRaProfileDto as RaProfileSimplifiedDto,
    SimplifiedRaProfileDto as RaProfileSimplifiedModel,
    RaProfileCertificateValidationSettingsDto,
    RaProfileDto as RaProfileResponseDto,
    SimplifiedComplianceProfileDto as ComplianceProfileSimplifiedDto,
    SimplifiedComplianceProfileDto as ComplianceProfileSimplifiedModel,
} from './openapi';

export type RaProfileActivateAcmeRequestModel = Omit<
    ActivateAcmeForRaProfileRequestDto,
    'issueCertificateAttributes | revokeCertificateAttributes'
> & { issueCertificateAttributes: Array<AttributeRequestModel>; revokeCertificateAttributes: Array<AttributeRequestModel> };

export type RaProfileAcmeDetailResponseModel = Omit<
    RaProfileAcmeDetailResponseDto,
    'issueCertificateAttributes | revokeCertificateAttributes'
> & { issueCertificateAttributes?: Array<AttributeResponseModel>; revokeCertificateAttributes?: Array<AttributeResponseModel> };

export type RaProfileActivateCmpRequestModel = Omit<
    ActivateCmpForRaProfileRequestDto,
    'issueCertificateAttributes | revokeCertificateAttributes'
> & {
    issueCertificateAttributes: Array<AttributeRequestModel>;
    revokeCertificateAttributes: Array<AttributeRequestModel>;
};

export type RaProfileCmpDetailResponseModel = Omit<
    RaProfileCmpDetailResponseDto,
    'issueCertificateAttributes | revokeCertificateAttributes'
> & {
    issueCertificateAttributes?: Array<AttributeResponseModel>;
    revokeCertificateAttributes?: Array<AttributeResponseModel>;
};

export type RaProfileActivateScepRequestModel = Omit<ActivateScepForRaProfileRequestDto, 'issueCertificateAttributes'> & {
    issueCertificateAttributes: Array<AttributeRequestModel>;
};

export type RaProfileScepDetailResponseModel = Omit<RaProfileScepDetailResponseDto, 'issueCertificateAttributes'> & {
    issueCertificateAttributes?: Array<AttributeResponseModel>;
};

export type RaProfileAddRequestModel = Omit<AddRaProfileRequestDto, 'attributes | customAttributes'> & {
    attributes: Array<AttributeRequestModel>;
    customAttributes?: Array<AttributeRequestModel>;
};

export type RaProfileEditRequestModel = Omit<EditRaProfileRequestDto, 'attributes | customAttributes'> & {
    attributes: Array<AttributeRequestModel>;
    customAttributes?: Array<AttributeRequestModel>;
};

export type RaProfileCertificateValidationSettingsUpdateModel = Omit<RaProfileCertificateValidationSettingsUpdateDto, 'enabled'> & {
    usePlatformSettings: boolean;
    enabled: boolean;
};

export type RaProfileCertificateValidationSettingsModel = Omit<RaProfileCertificateValidationSettingsDto, 'enabled'> & {
    usePlatformSettings: boolean;
    enabled: boolean;
};

export type RaProfileResponseModel = Omit<RaProfileDto, 'attributes' | 'customAttributes' | 'certificateValidationSettings'> & {
    attributes: Array<AttributeResponseModel>;
    customAttributes?: Array<AttributeResponseModel>;
    certificateValidationSettings: RaProfileCertificateValidationSettingsModel;
};
