import type { AttributeRequestModel } from './attributes';
import type { RandomDataRequestDto, SignatureRequestData, SignDataRequestDto, VerifyDataRequestDto } from './openapi';

export type {
    SignDataRequestDto as CryptographicKeySignDataRequestDto,
    SignatureRequestData as CryptographicKeySignatureRequestDataDto,
    SignatureRequestData as CryptographicKeySignatureRequestDataModel,
    SignDataResponseDto as CryptographicKeySignResponseDto,
    SignDataResponseDto as CryptographicKeySignResponseModel,
    SignatureResponseData as CryptographicKeySignResponseDataDto,
    SignatureResponseData as CryptographicKeySignResponseDataModel,
    VerifyDataRequestDto as CryptographicKeyVerifyDataRequestDto,
    VerifyDataResponseDto as CryptographicKeyVerifyResponseDto,
    VerifyDataResponseDto as CryptographicKeyVerifyResponseModel,
    SignatureResponseData as CryptographicKeyVerificationResponseDataDto,
    SignatureResponseData as CryptographicKeyVerificationResponseDataModel,
    RandomDataRequestDto as CryptographicKeyRandomDataRequestDto,
    RandomDataResponseDto as CryptographicKeyRandomDataResponseDto,
    RandomDataResponseDto as CryptographicKeyRandomDataResponseModel,
} from './openapi';

export type CryptographicKeySignDataRequestModel = Omit<SignDataRequestDto, 'data'> & {
    data: Array<SignatureRequestData>;
};

export type CryptographicKeyVerifyDataRequestModel = Omit<VerifyDataRequestDto, 'data'> & {
    data: Array<SignatureRequestData>;
};

export type CryptographicKeyRandomDataRequestModel = Omit<RandomDataRequestDto, 'attributes'> & {
    attributes?: Array<AttributeRequestModel>;
};
