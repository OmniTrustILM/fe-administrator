import type {
    ComplianceProfileSimplifiedDto,
    ComplianceProfileSimplifiedModel,
    RaProfileAcmeDetailResponseDto,
    RaProfileAcmeDetailResponseModel,
    RaProfileActivateAcmeRequestDto,
    RaProfileActivateAcmeRequestModel,
    RaProfileActivateCmpRequestDto,
    RaProfileActivateCmpRequestModel,
    RaProfileActivateEstRequestDto,
    RaProfileActivateEstRequestModel,
    RaProfileActivateScepRequestDto,
    RaProfileActivateScepRequestModel,
    RaProfileAddRequestDto,
    RaProfileAddRequestModel,
    RaProfileCertificateValidationSettingsUpdateDto,
    RaProfileCertificateValidationSettingsUpdateModel,
    RaProfileCmpDetailResponseDto,
    RaProfileCmpDetailResponseModel,
    RaProfileEditRequestDto,
    RaProfileEditRequestModel,
    RaProfileEstDetailResponseDto,
    RaProfileEstDetailResponseModel,
    RaProfileResponseDto,
    RaProfileResponseModel,
    RaProfileScepDetailResponseDto,
    RaProfileScepDetailResponseModel,
    RaProfileSimplifiedDto,
    RaProfileSimplifiedModel,
} from 'types/ra-profiles';
import { transformAttributeRequestModelToDto, transformAttributeResponseDtoToModel } from './attributes';

export function transformRaProfileSimplifiedDtoToModel(raProfile: RaProfileSimplifiedDto): RaProfileSimplifiedModel {
    return { ...raProfile };
}

export function transformRaProfileCertificateValidationSettingsDtoToModel(
    validationSettings?: RaProfileCertificateValidationSettingsUpdateDto,
): RaProfileCertificateValidationSettingsUpdateModel {
    return {
        ...validationSettings,
        usePlatformSettings: validationSettings?.enabled === undefined,
        enabled: !!validationSettings?.enabled,
    };
}

export function transformRaProfileResponseDtoToModel(raResponse: RaProfileResponseDto): RaProfileResponseModel {
    return {
        ...raResponse,
        certificateValidationSettings: transformRaProfileCertificateValidationSettingsDtoToModel(raResponse.certificateValidationSettings),
        attributes: raResponse?.attributes?.length ? raResponse.attributes.map(transformAttributeResponseDtoToModel) : [],
        customAttributes: raResponse.customAttributes?.map(transformAttributeResponseDtoToModel),
    };
}

export function transformRaProfileCertificateValidationSettingsUpdateModelToDto(
    raProfile: RaProfileCertificateValidationSettingsUpdateModel,
): RaProfileCertificateValidationSettingsUpdateDto {
    return {
        enabled: raProfile.usePlatformSettings ? undefined : raProfile.enabled,
        frequency: raProfile.frequency,
        expiringThreshold: raProfile.expiringThreshold,
    };
}

export function transformRaProfileActivateAcmeRequestModelToDto(
    raAcmeRequest: RaProfileActivateAcmeRequestModel,
): RaProfileActivateAcmeRequestDto {
    return {
        ...raAcmeRequest,
        issueCertificateAttributes: raAcmeRequest.issueCertificateAttributes.map(transformAttributeRequestModelToDto),
        revokeCertificateAttributes: raAcmeRequest.revokeCertificateAttributes.map(transformAttributeRequestModelToDto),
    };
}

export function transformRaProfileAcmeDetailResponseDtoToModel(
    raAcmeResponse: RaProfileAcmeDetailResponseDto,
): RaProfileAcmeDetailResponseModel {
    return {
        ...raAcmeResponse,
        issueCertificateAttributes: raAcmeResponse.issueCertificateAttributes?.map(transformAttributeResponseDtoToModel),
        revokeCertificateAttributes: raAcmeResponse.revokeCertificateAttributes?.map(transformAttributeResponseDtoToModel),
    };
}

export function transformRaProfileActivateCmpRequestModelToDto(
    raCmpRequest: RaProfileActivateCmpRequestModel,
): RaProfileActivateCmpRequestDto {
    return {
        ...raCmpRequest,
        issueCertificateAttributes: raCmpRequest.issueCertificateAttributes.map(transformAttributeRequestModelToDto),
        revokeCertificateAttributes: raCmpRequest.revokeCertificateAttributes.map(transformAttributeRequestModelToDto),
    };
}

export function transformRaProfileCmpDetailResponseDtoToModel(
    raCmpResponse: RaProfileCmpDetailResponseDto,
): RaProfileCmpDetailResponseModel {
    return {
        ...raCmpResponse,
        issueCertificateAttributes: raCmpResponse.issueCertificateAttributes?.map(transformAttributeResponseDtoToModel),
        revokeCertificateAttributes: raCmpResponse.revokeCertificateAttributes?.map(transformAttributeResponseDtoToModel),
    };
}

export function transformRaProfileActivateScepRequestModelToDto(
    raScepRequest: RaProfileActivateScepRequestModel,
): RaProfileActivateScepRequestDto {
    return {
        ...raScepRequest,
        issueCertificateAttributes: raScepRequest.issueCertificateAttributes.map(transformAttributeRequestModelToDto),
    };
}

export function transformRaProfileScepDetailResponseDtoToModel(
    raScepResponse: RaProfileScepDetailResponseDto,
): RaProfileScepDetailResponseModel {
    return {
        ...raScepResponse,
        issueCertificateAttributes: raScepResponse.issueCertificateAttributes?.map(transformAttributeResponseDtoToModel),
    };
}

export function transformRaProfileActivateEstRequestModelToDto(
    raEstRequest: RaProfileActivateEstRequestModel,
): RaProfileActivateEstRequestDto {
    return {
        ...raEstRequest,
        issueCertificateAttributes: raEstRequest.issueCertificateAttributes.map(transformAttributeRequestModelToDto),
    };
}

export function transformRaProfileEstDetailResponseDtoToModel(
    raEstResponse: RaProfileEstDetailResponseDto,
): RaProfileEstDetailResponseModel {
    return {
        ...raEstResponse,
        issueCertificateAttributes: raEstResponse.issueCertificateAttributes?.map(transformAttributeResponseDtoToModel),
    };
}

export function transformRaProfileAddRequestModelToDto(raAddReq: RaProfileAddRequestModel): RaProfileAddRequestDto {
    return {
        ...raAddReq,
        attributes: raAddReq.attributes.map(transformAttributeRequestModelToDto),
        customAttributes: raAddReq.customAttributes?.map(transformAttributeRequestModelToDto),
    };
}

export function transformRaProfileEditRequestModelToDto(raEditReq: RaProfileEditRequestModel): RaProfileEditRequestDto {
    return {
        ...raEditReq,
        attributes: raEditReq.attributes.map(transformAttributeRequestModelToDto),
        customAttributes: raEditReq.customAttributes?.map(transformAttributeRequestModelToDto),
    };
}

export function transformComplianceProfileSimplifiedDtoToModel(
    complianceProfile: ComplianceProfileSimplifiedDto,
): ComplianceProfileSimplifiedModel {
    return { ...complianceProfile };
}
