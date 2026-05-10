import type {
    CredentialCreateRequestDto,
    CredentialCreateRequestModel,
    CredentialEditRequestDto,
    CredentialEditRequestModel,
    CredentialResponseDto,
    CredentialResponseModel,
} from 'types/credentials';
import { transformAttributeRequestModelToDto, transformAttributeResponseDtoToModel } from './attributes';

export function transformCredentialResponseDtoToModel(credential: CredentialResponseDto): CredentialResponseModel {
    return {
        ...credential,
        attributes: credential.attributes.map(transformAttributeResponseDtoToModel),
        customAttributes: credential.customAttributes?.map(transformAttributeResponseDtoToModel),
    };
}

function mapCredentialRequestPayload<T extends CredentialCreateRequestModel | CredentialEditRequestModel>(credential: T) {
    return {
        ...credential,
        attributes: credential.attributes.map(transformAttributeRequestModelToDto),
        customAttributes: credential.customAttributes?.map(transformAttributeRequestModelToDto),
    };
}

export function transformCredentialCreateRequestModelToDto(credential: CredentialCreateRequestModel): CredentialCreateRequestDto {
    return mapCredentialRequestPayload(credential);
}

export function transformCredentialEditRequestModelToDto(credential: CredentialEditRequestModel): CredentialEditRequestDto {
    return mapCredentialRequestPayload(credential);
}
