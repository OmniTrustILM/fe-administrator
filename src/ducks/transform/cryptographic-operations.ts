import type {
    CryptographicKeyRandomDataRequestDto,
    CryptographicKeyRandomDataRequestModel,
    CryptographicKeyRandomDataResponseDto,
    CryptographicKeyRandomDataResponseModel,
    CryptographicKeySignDataRequestDto,
    CryptographicKeySignDataRequestModel,
    CryptographicKeySignResponseDto,
    CryptographicKeySignResponseModel,
    CryptographicKeyVerifyDataRequestDto,
    CryptographicKeyVerifyDataRequestModel,
    CryptographicKeyVerifyResponseDto,
    CryptographicKeyVerifyResponseModel,
} from 'types/cryptographic-operations';

function spreadCopy<TIn extends object, TOut>(input: TIn): TOut {
    return { ...input } as unknown as TOut;
}

export function transformCryptographicKeySignDataResponseDtoToModel(
    keyResponse: CryptographicKeySignResponseDto,
): CryptographicKeySignResponseModel {
    return spreadCopy(keyResponse);
}

export function transformCryptographicKeyVerifyDataResponseDtoToModel(
    keyResponse: CryptographicKeyVerifyResponseDto,
): CryptographicKeyVerifyResponseModel {
    return spreadCopy(keyResponse);
}

export function transformCryptographicKeyRandomDataResponseDtoToModel(
    keyResponse: CryptographicKeyRandomDataResponseDto,
): CryptographicKeyRandomDataResponseModel {
    return spreadCopy(keyResponse);
}

export function transformCryptographicKeyRandomDataRequestModelToDto(
    randomDataRequest: CryptographicKeyRandomDataRequestModel,
): CryptographicKeyRandomDataRequestDto {
    return spreadCopy(randomDataRequest);
}

export function transformCryptographicKeySignRequestModelToDto(
    signRequest: CryptographicKeySignDataRequestModel,
): CryptographicKeySignDataRequestDto {
    return spreadCopy(signRequest);
}

export function transformCryptographicKeyVerifyRequestModelToDto(
    verifyRequest: CryptographicKeyVerifyDataRequestModel,
): CryptographicKeyVerifyDataRequestDto {
    return spreadCopy(verifyRequest);
}
