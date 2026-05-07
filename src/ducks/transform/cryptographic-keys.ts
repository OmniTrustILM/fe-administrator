import type {
    CryptographicKeyAddRequestDto,
    CryptographicKeyAddRequestModel,
    CryptographicKeyBulkCompromiseRequestDto,
    CryptographicKeyBulkCompromiseRequestModel,
    CryptographicKeyCompromiseRequestDto,
    CryptographicKeyCompromiseRequestModel,
    CryptographicKeyDetailResponseDto,
    CryptographicKeyDetailResponseModel,
    CryptographicKeyEditRequestDto,
    CryptographicKeyEditRequestModel,
    CryptographicKeyHistoryDto,
    CryptographicKeyHistoryModel,
    CryptographicKeyItemBulkCompromiseRequestDto,
    CryptographicKeyItemBulkCompromiseRequestModel,
    CryptographicKeyItemDetailResponseDto,
    CryptographicKeyItemDetailResponseModel,
    CryptographicKeyItemDto,
    CryptographicKeyItemEditRequestDto,
    CryptographicKeyItemModel,
    CryptographicKeyKeyUsageBulkUpdateRequestDto,
    CryptographicKeyKeyUsageBulkUpdateRequestModel,
    CryptographicKeyKeyUsageUpdateRequestDto,
    CryptographicKeyKeyUsageUpdateRequestModel,
    CryptographicKeyPairResponseDto,
    CryptographicKeyPairResponseModel,
    CryptographicKeyResponseDto,
    CryptographicKeyResponseModel,
} from 'types/cryptographic-keys';
import { transformAttributeRequestModelToDto, transformAttributeResponseDtoToModel } from './attributes';

export function transformCryptographicKeyResponseDtoToModel(keyResponse: CryptographicKeyResponseDto): CryptographicKeyResponseModel {
    return {
        ...keyResponse,
    };
}

export function transformCryptographicKeyPairResponseDtoToModel(
    keyResponse: CryptographicKeyPairResponseDto,
): CryptographicKeyPairResponseModel {
    return {
        ...keyResponse,
    };
}

export function transformCryptographicKeyDetailResponseDtoToModel(
    keyResponse: CryptographicKeyDetailResponseDto,
): CryptographicKeyDetailResponseModel {
    return {
        ...keyResponse,
        items: keyResponse.items.map(transformCryptographicKeyItemResponseDtoToModel),
        attributes: keyResponse.attributes?.map(transformAttributeResponseDtoToModel),
        customAttributes: keyResponse.customAttributes?.map(transformAttributeResponseDtoToModel),
    };
}

export function transformCryptographicKeyItemResponseDtoToModel(
    keyResponse: CryptographicKeyItemDetailResponseDto,
): CryptographicKeyItemDetailResponseModel {
    return {
        ...keyResponse,
    };
}

export function transformCryptographicKeyItemDtoToModel(keyResponse: CryptographicKeyItemDto): CryptographicKeyItemModel {
    return {
        ...keyResponse,
    };
}

export function transformCryptographicKeyAddRequestModelToDto(keyAddReq: CryptographicKeyAddRequestModel): CryptographicKeyAddRequestDto {
    return {
        ...keyAddReq,
        attributes: keyAddReq.attributes.map(transformAttributeRequestModelToDto),
        customAttributes: keyAddReq.customAttributes?.map(transformAttributeRequestModelToDto),
    };
}

export function transformCryptographicKeyEditRequestModelToDto(
    keyEditReq: CryptographicKeyEditRequestModel,
): CryptographicKeyEditRequestDto {
    return {
        ...keyEditReq,
        customAttributes: keyEditReq.customAttributes?.map(transformAttributeRequestModelToDto),
    };
}

export function transformCryptographicKeyItemEditRequestModelToDto(
    keyItemEditReq: CryptographicKeyItemEditRequestDto,
): CryptographicKeyItemEditRequestDto {
    return {
        ...keyItemEditReq,
    };
}

export function transformCryptographicKeyKeyUsageRequestModelToDto(
    keyUsageRequest: CryptographicKeyKeyUsageUpdateRequestModel,
): CryptographicKeyKeyUsageUpdateRequestDto {
    return {
        ...keyUsageRequest,
    };
}

export function transformCryptographicKeyBulkKeyUsageRequestModelToDto(
    keyUsageRequest: CryptographicKeyKeyUsageBulkUpdateRequestModel,
): CryptographicKeyKeyUsageBulkUpdateRequestDto {
    return {
        ...keyUsageRequest,
    };
}

export function transformCryptographicKeyCompromiseModelToDto(
    request: CryptographicKeyCompromiseRequestModel,
): CryptographicKeyCompromiseRequestDto {
    return {
        ...request,
    };
}

export function transformCryptographicKeyBulkCompromiseModelToDto(
    request: CryptographicKeyBulkCompromiseRequestModel,
): CryptographicKeyBulkCompromiseRequestDto {
    return {
        ...request,
    };
}

export function transformCryptographicKeyItemBulkCompromiseModelToDto(
    request: CryptographicKeyItemBulkCompromiseRequestModel,
): CryptographicKeyItemBulkCompromiseRequestDto {
    return {
        ...request,
    };
}

export function transformKeyHistoryDtoToModel(history: CryptographicKeyHistoryDto): CryptographicKeyHistoryModel {
    return { ...history };
}
