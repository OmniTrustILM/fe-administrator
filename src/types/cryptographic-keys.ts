import type { AttributeRequestModel, AttributeResponseModel } from './attributes';
import type { CertificateGroupResponseModel } from './certificateGroups';
import type { MetadataModel } from './locations';
import type {
    BulkCompromiseKeyItemRequestDto,
    BulkCompromiseKeyRequestDto,
    BulkKeyUsageRequestDto,
    CompromiseKeyRequestDto,
    EditKeyItemDto,
    EditKeyRequestDto,
    KeyDetailDto,
    KeyDto,
    KeyEventHistoryDto,
    KeyFormat,
    KeyItemDetailDto,
    KeyItemDto,
    KeyRequestDto,
    UpdateKeyUsageRequestDto,
} from './openapi';

export type CryptographicKeyAddRequestDto = KeyRequestDto;
export type CryptographicKeyAddRequestModel = Omit<CryptographicKeyAddRequestDto, 'attributes | customAttributes'> & {
    attributes: Array<AttributeRequestModel>;
    customAttributes?: Array<AttributeRequestModel>;
};

export type CryptographicKeyEditRequestDto = EditKeyRequestDto;
export type CryptographicKeyEditRequestModel = Omit<CryptographicKeyEditRequestDto, 'customAttributes'> & {
    customAttributes?: Array<AttributeRequestModel>;
};

export type CryptographicKeyItemEditRequestDto = EditKeyItemDto;

export type CryptographicKeyResponseDto = KeyItemDto;
export type CryptographicKeyResponseModel = CryptographicKeyResponseDto;

export type CryptographicKeyPairResponseDto = KeyDto;
export type CryptographicKeyPairResponseModel = CryptographicKeyPairResponseDto;

export type CryptographicKeyDetailResponseDto = KeyDetailDto;
export type CryptographicKeyDetailResponseModel = Omit<CryptographicKeyDetailResponseDto, 'attributes | customAttributes | group'> & {
    attributes?: Array<AttributeResponseModel>;
    customAttributes?: Array<AttributeResponseModel>;
    groups?: Array<CertificateGroupResponseModel>;
};

export type CryptographicKeyItemDetailResponseDto = KeyItemDetailDto;
export type CryptographicKeyItemDetailResponseModel = Omit<CryptographicKeyItemDetailResponseDto, 'metadata | format'> & {
    metadata?: Array<MetadataModel>;
    format?: KeyFormat;
};

export type CryptographicKeyItemDto = KeyItemDto;
export type CryptographicKeyItemModel = Omit<CryptographicKeyItemDto, 'format'> & { format?: KeyFormat };

export type CryptographicKeyKeyUsageUpdateRequestDto = UpdateKeyUsageRequestDto;
export type CryptographicKeyKeyUsageUpdateRequestModel = CryptographicKeyKeyUsageUpdateRequestDto;

export type CryptographicKeyKeyUsageBulkUpdateRequestDto = BulkKeyUsageRequestDto;
export type CryptographicKeyKeyUsageBulkUpdateRequestModel = CryptographicKeyKeyUsageBulkUpdateRequestDto;

export type CryptographicKeyHistoryDto = KeyEventHistoryDto;
export type CryptographicKeyHistoryModel = CryptographicKeyHistoryDto;

export type CryptographicKeyCompromiseRequestDto = CompromiseKeyRequestDto;
export type CryptographicKeyCompromiseRequestModel = CryptographicKeyCompromiseRequestDto;

export type CryptographicKeyBulkCompromiseRequestDto = BulkCompromiseKeyRequestDto;
export type CryptographicKeyBulkCompromiseRequestModel = CryptographicKeyBulkCompromiseRequestDto;

export type CryptographicKeyItemBulkCompromiseRequestDto = BulkCompromiseKeyItemRequestDto;
export type CryptographicKeyItemBulkCompromiseRequestModel = CryptographicKeyItemBulkCompromiseRequestDto;
