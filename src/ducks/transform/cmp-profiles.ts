import type {
    CmpProfileDetailDto,
    CmpProfileDetailModel,
    CmpProfileDto,
    CmpProfileEditRequestDto,
    CmpProfileEditRequestModel,
    CmpProfileModel,
    CmpProfileRequestDto,
    CmpProfileRequestModel,
} from 'types/cmp-profiles';
import { transformAttributeRequestModelToDto, transformAttributeResponseDtoToModel } from './attributes';

export function transformCmpProfileDtoToModel(cmp: CmpProfileDto): CmpProfileModel {
    return { ...cmp };
}

export function transformCmpProfileDetailDtoToModel(cmp: CmpProfileDetailDto): CmpProfileDetailModel {
    return {
        ...cmp,
        issueCertificateAttributes: cmp.issueCertificateAttributes?.map(transformAttributeResponseDtoToModel),
        revokeCertificateAttributes: cmp.revokeCertificateAttributes?.map(transformAttributeResponseDtoToModel),
        customAttributes: cmp.customAttributes?.map(transformAttributeResponseDtoToModel),
    };
}

function mapCmpAttributePayload<T extends CmpProfileEditRequestModel | CmpProfileRequestModel>(cmp: T) {
    return {
        ...cmp,
        issueCertificateAttributes: cmp.issueCertificateAttributes?.map(transformAttributeRequestModelToDto),
        revokeCertificateAttributes: cmp.revokeCertificateAttributes?.map(transformAttributeRequestModelToDto),
        customAttributes: cmp.customAttributes?.map(transformAttributeRequestModelToDto),
    };
}

export function transformCmpProfileEditRequestModelToDto(cmp: CmpProfileEditRequestModel): CmpProfileEditRequestDto {
    return mapCmpAttributePayload(cmp);
}

export function transformCmpProfileRequestModelToDto(cmp: CmpProfileRequestModel): CmpProfileRequestDto {
    return mapCmpAttributePayload(cmp);
}
