import type { AttributeRequestModel, AttributeResponseModel } from './attributes';
import type { CertificateGroupResponseModel } from './certificateGroups';
import type { MetadataModel } from './locations';
import type { EditKeyRequestDto, KeyDetailDto, KeyFormat, KeyItemDetailDto, KeyItemDto, KeyRequestDto } from './openapi';

export type {
    KeyRequestDto as CryptographicKeyAddRequestDto,
    EditKeyRequestDto as CryptographicKeyEditRequestDto,
    EditKeyItemDto as CryptographicKeyItemEditRequestDto,
    KeyItemDto as CryptographicKeyResponseDto,
    KeyItemDto as CryptographicKeyResponseModel,
    KeyDto as CryptographicKeyPairResponseDto,
    KeyDto as CryptographicKeyPairResponseModel,
    KeyDetailDto as CryptographicKeyDetailResponseDto,
    KeyItemDetailDto as CryptographicKeyItemDetailResponseDto,
    KeyItemDto as CryptographicKeyItemDto,
    UpdateKeyUsageRequestDto as CryptographicKeyKeyUsageUpdateRequestDto,
    UpdateKeyUsageRequestDto as CryptographicKeyKeyUsageUpdateRequestModel,
    BulkKeyUsageRequestDto as CryptographicKeyKeyUsageBulkUpdateRequestDto,
    BulkKeyUsageRequestDto as CryptographicKeyKeyUsageBulkUpdateRequestModel,
    KeyEventHistoryDto as CryptographicKeyHistoryDto,
    KeyEventHistoryDto as CryptographicKeyHistoryModel,
    CompromiseKeyRequestDto as CryptographicKeyCompromiseRequestDto,
    CompromiseKeyRequestDto as CryptographicKeyCompromiseRequestModel,
    BulkCompromiseKeyRequestDto as CryptographicKeyBulkCompromiseRequestDto,
    BulkCompromiseKeyRequestDto as CryptographicKeyBulkCompromiseRequestModel,
    BulkCompromiseKeyItemRequestDto as CryptographicKeyItemBulkCompromiseRequestDto,
    BulkCompromiseKeyItemRequestDto as CryptographicKeyItemBulkCompromiseRequestModel,
} from './openapi';

export type CryptographicKeyAddRequestModel = Omit<KeyRequestDto, 'attributes | customAttributes'> & {
    attributes: Array<AttributeRequestModel>;
    customAttributes?: Array<AttributeRequestModel>;
};

export type CryptographicKeyEditRequestModel = Omit<EditKeyRequestDto, 'customAttributes'> & {
    customAttributes?: Array<AttributeRequestModel>;
};

export type CryptographicKeyDetailResponseModel = Omit<KeyDetailDto, 'attributes | customAttributes | group'> & {
    attributes?: Array<AttributeResponseModel>;
    customAttributes?: Array<AttributeResponseModel>;
    groups?: Array<CertificateGroupResponseModel>;
};

export type CryptographicKeyItemDetailResponseModel = Omit<KeyItemDetailDto, 'metadata | format'> & {
    metadata?: Array<MetadataModel>;
    format?: KeyFormat;
};

export type CryptographicKeyItemModel = Omit<KeyItemDto, 'format'> & { format?: KeyFormat };
