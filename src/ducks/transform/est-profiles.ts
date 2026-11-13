import type {
    EstProfileDetailDto,
    EstProfileDetailModel,
    EstProfileDto,
    EstProfileEditRequestDto,
    EstProfileEditRequestModel,
    EstProfileModel,
    EstProfileRequestDto,
    EstProfileRequestModel,
} from 'types/est-profiles';
import { transformAttributeRequestModelToDto, transformAttributeResponseDtoToModel } from './attributes';

export function transformEstProfileDtoToModel(est: EstProfileDto): EstProfileModel {
    return { ...est };
}

export function transformEstProfileDetailDtoToModel(est: EstProfileDetailDto): EstProfileDetailModel {
    return {
        ...est,
        keyRecoveryKeyAttributes: est.keyRecoveryKeyAttributes?.map(transformAttributeResponseDtoToModel),
        issueCertificateAttributes: est.issueCertificateAttributes?.map(transformAttributeResponseDtoToModel),
        customAttributes: est.customAttributes?.map(transformAttributeResponseDtoToModel),
    };
}

function mapEstAttributePayload<T extends EstProfileEditRequestModel | EstProfileRequestModel>(est: T) {
    return {
        ...est,
        keyRecoveryKeyAttributes: est.keyRecoveryKeyAttributes?.map(transformAttributeRequestModelToDto),
        issueCertificateAttributes: est.issueCertificateAttributes?.map(transformAttributeRequestModelToDto),
        customAttributes: est.customAttributes?.map(transformAttributeRequestModelToDto),
    };
}

export function transformEstProfileEditRequestModelToDto(est: EstProfileEditRequestModel): EstProfileEditRequestDto {
    return mapEstAttributePayload(est);
}

export function transformEstProfileRequestModelToDto(est: EstProfileRequestModel): EstProfileRequestDto {
    return mapEstAttributePayload(est);
}
