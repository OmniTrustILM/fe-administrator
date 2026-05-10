import type {
    AcmeProfileAddRequestDto,
    AcmeProfileAddRequestModel,
    AcmeProfileEditRequestDto,
    AcmeProfileEditRequestModel,
    AcmeProfileListResponseDto,
    AcmeProfileListResponseModel,
    AcmeProfileResponseDto,
    AcmeProfileResponseModel,
} from 'types/acme-profiles';
import { transformAttributeRequestModelToDto, transformAttributeResponseDtoToModel } from './attributes';
import { transformRaProfileSimplifiedDtoToModel } from './ra-profiles';

export function transformAcmeProfileListResponseDtoToModel(acme: AcmeProfileListResponseDto): AcmeProfileListResponseModel {
    return { ...acme };
}

export function transformAcmeProfileResponseDtoToModel(acme: AcmeProfileResponseDto): AcmeProfileResponseModel {
    return {
        ...acme,
        raProfile: acme.raProfile ? transformRaProfileSimplifiedDtoToModel(acme.raProfile) : undefined,
        issueCertificateAttributes: acme.issueCertificateAttributes?.map(transformAttributeResponseDtoToModel),
        revokeCertificateAttributes: acme.revokeCertificateAttributes?.map(transformAttributeResponseDtoToModel),
        customAttributes: acme.customAttributes?.map(transformAttributeResponseDtoToModel),
    };
}

function mapAcmeRequestPayload<T extends AcmeProfileEditRequestModel | AcmeProfileAddRequestModel>(acme: T) {
    return {
        ...acme,
        issueCertificateAttributes: acme.issueCertificateAttributes.map(transformAttributeRequestModelToDto),
        revokeCertificateAttributes: acme.revokeCertificateAttributes.map(transformAttributeRequestModelToDto),
        customAttributes: acme.customAttributes?.map(transformAttributeRequestModelToDto),
    };
}

export function transformAcmeProfileEditRequestModelToDto(acme: AcmeProfileEditRequestModel): AcmeProfileEditRequestDto {
    return mapAcmeRequestPayload(acme);
}

export function transformAcmeProfileAddRequestModelToDto(acme: AcmeProfileAddRequestModel): AcmeProfileAddRequestDto {
    return mapAcmeRequestPayload(acme);
}
