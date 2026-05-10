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

function spreadCopy<TIn extends object, TOut>(input: TIn): TOut {
    return { ...input } as unknown as TOut;
}

export function transformCryptographicKeyResponseDtoToModel(keyResponse: CryptographicKeyResponseDto): CryptographicKeyResponseModel {
    return spreadCopy(keyResponse);
}

export function transformCryptographicKeyPairResponseDtoToModel(
    keyResponse: CryptographicKeyPairResponseDto,
): CryptographicKeyPairResponseModel {
    return spreadCopy(keyResponse);
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
    return spreadCopy(keyResponse);
}

export function transformCryptographicKeyItemDtoToModel(keyResponse: CryptographicKeyItemDto): CryptographicKeyItemModel {
    return spreadCopy(keyResponse);
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
    return spreadCopy(keyItemEditReq);
}

export function transformCryptographicKeyKeyUsageRequestModelToDto(
    keyUsageRequest: CryptographicKeyKeyUsageUpdateRequestModel,
): CryptographicKeyKeyUsageUpdateRequestDto {
    return spreadCopy(keyUsageRequest);
}

export function transformCryptographicKeyBulkKeyUsageRequestModelToDto(
    keyUsageRequest: CryptographicKeyKeyUsageBulkUpdateRequestModel,
): CryptographicKeyKeyUsageBulkUpdateRequestDto {
    return spreadCopy(keyUsageRequest);
}

export function transformCryptographicKeyCompromiseModelToDto(
    request: CryptographicKeyCompromiseRequestModel,
): CryptographicKeyCompromiseRequestDto {
    return spreadCopy(request);
}

export function transformCryptographicKeyBulkCompromiseModelToDto(
    request: CryptographicKeyBulkCompromiseRequestModel,
): CryptographicKeyBulkCompromiseRequestDto {
    return spreadCopy(request);
}

export function transformCryptographicKeyItemBulkCompromiseModelToDto(
    request: CryptographicKeyItemBulkCompromiseRequestModel,
): CryptographicKeyItemBulkCompromiseRequestDto {
    return spreadCopy(request);
}

export function transformKeyHistoryDtoToModel(history: CryptographicKeyHistoryDto): CryptographicKeyHistoryModel {
    return spreadCopy(history);
}
