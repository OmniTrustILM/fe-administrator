import type { AttributeRequestModel, AttributeResponseModel } from './attributes';
import type { MetadataModel } from './locations';
import type { DiscoveryCertificateDto, DiscoveryCertificateResponseDto, DiscoveryDto, DiscoveryHistoryDetailDto } from './openapi';

export type {
    DiscoveryHistoryDto as DiscoveryResponseDto,
    DiscoveryHistoryDto as DiscoveryResponseModel,
    DiscoveryHistoryDetailDto as DiscoveryResponseDetailDto,
    DiscoveryDto as DiscoveryRequestDto,
    DiscoveryCertificateDto,
    DiscoveryCertificateDto as DiscoveryCertificateModel,
    DiscoveryCertificateResponseDto as DiscoveryCertificateListDto,
} from './openapi';

export type DiscoveryResponseDetailModel = Omit<DiscoveryHistoryDetailDto, 'attributes | metadata | customAttributes'> & {
    attributes: Array<AttributeResponseModel>;
    metadata?: Array<MetadataModel>;
    customAttributes?: Array<AttributeResponseModel>;
};

export type DiscoveryRequestModel = Omit<DiscoveryDto, 'attributes | customAttributes'> & {
    attributes: Array<AttributeRequestModel>;
    customAttributes?: Array<AttributeRequestModel>;
};

export type DiscoveryCertificateListModel = Omit<DiscoveryCertificateResponseDto, 'certificates'> & {
    certificates: Array<DiscoveryCertificateDto>;
};
