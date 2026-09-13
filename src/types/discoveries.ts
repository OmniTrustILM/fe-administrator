import type { AttributeRequestModel, AttributeResponseModel } from './attributes';
import type { MetadataModel } from './locations';
import type {
    DiscoveryCertificateDto,
    DiscoveryCertificateResponseDto,
    DiscoveryDto,
    DiscoveryDetailDto,
    PaginationResponseDtoDiscoveryItemDto,
    PaginationResponseDtoDiscoveryMessageDto,
} from './openapi';

export type {
    DiscoveryListDto as DiscoveryResponseDto,
    DiscoveryListDto as DiscoveryResponseModel,
    DiscoveryDetailDto as DiscoveryResponseDetailDto,
    DiscoveryDto as DiscoveryRequestDto,
    DiscoveryCertificateDto,
    DiscoveryCertificateDto as DiscoveryCertificateModel,
    DiscoveryCertificateResponseDto as DiscoveryCertificateListDto,
    DiscoveryItemDto,
    DiscoveryItemDto as DiscoveryItemModel,
    DiscoveryMessageDto,
    DiscoveryMessageDto as DiscoveryMessageModel,
    PaginationResponseDtoDiscoveryItemDto as DiscoveryItemListDto,
    PaginationResponseDtoDiscoveryMessageDto as DiscoveryMessageListDto,
} from './openapi';

export type DiscoveryResponseDetailModel = Omit<DiscoveryDetailDto, 'attributes | metadata | customAttributes'> & {
    attributes: Array<AttributeResponseModel>;
    metadata?: Array<MetadataModel>;
    customAttributes?: Array<AttributeResponseModel>;
};

export type DiscoveryRequestModel = Omit<DiscoveryDto, 'attributes' | 'customAttributes' | 'resourceAttributes'> & {
    attributes: Array<AttributeRequestModel>;
    customAttributes?: Array<AttributeRequestModel>;
    // Keyed by resource wire code, exactly as the request carries it.
    resourceAttributes?: { [resource: string]: Array<AttributeRequestModel> };
};

export type DiscoveryCertificateListModel = Omit<DiscoveryCertificateResponseDto, 'certificates'> & {
    certificates: Array<DiscoveryCertificateDto>;
};

export type DiscoveryItemListModel = PaginationResponseDtoDiscoveryItemDto;

export type DiscoveryMessageListModel = PaginationResponseDtoDiscoveryMessageDto;
