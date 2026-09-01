import type { AttributeRequestModel, AttributeResponseModel } from './attributes';
import type { MetadataModel } from './locations';
import type { DiscoveryCertificateDto, DiscoveryCertificateResponseDto, DiscoveryDto, DiscoveryDetailDto } from './openapi';

export type {
    DiscoveryListDto as DiscoveryResponseDto,
    DiscoveryListDto as DiscoveryResponseModel,
    DiscoveryDetailDto as DiscoveryResponseDetailDto,
    DiscoveryDto as DiscoveryRequestDto,
    DiscoveryCertificateDto,
    DiscoveryCertificateDto as DiscoveryCertificateModel,
    DiscoveryCertificateResponseDto as DiscoveryCertificateListDto,
} from './openapi';

export type DiscoveryResponseDetailModel = Omit<DiscoveryDetailDto, 'attributes | metadata | customAttributes'> & {
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
