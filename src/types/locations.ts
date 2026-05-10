import type { AttributeRequestModel, AttributeResponseModel } from './attributes';
import type {
    AddLocationRequestDto,
    CertificateInLocationDto,
    EditLocationRequestDto,
    IssueToLocationRequestDto,
    LocationDto,
    MetadataResponseDto,
    NameAndUuidDto,
    PushToLocationRequestDto,
    ResponseMetadataDto,
} from './openapi';

export type {
    AddLocationRequestDto as LocationAddRequestDto,
    EditLocationRequestDto as LocationEditRequestDto,
    PushToLocationRequestDto as LocationPushRequestDto,
    IssueToLocationRequestDto as LocationIssueRequestDto,
    NameAndUuidDto,
    NameAndUuidDto as NameAndUuidModel,
    ResponseMetadataDto as MetadataItemDto,
    MetadataResponseDto as MetadataDto,
    CertificateInLocationDto as LocationCertificateDto,
    LocationDto as LocationResponseDto,
} from './openapi';

export type LocationAddRequestModel = Omit<AddLocationRequestDto, 'attributes | customAttributes'> & {
    attributes: Array<AttributeRequestModel>;
    customAttributes?: Array<AttributeRequestModel>;
};

export type LocationEditRequestModel = Omit<EditLocationRequestDto, 'attributes | customAttributes'> & {
    attributes: Array<AttributeRequestModel>;
    customAttributes?: Array<AttributeRequestModel>;
};

export type LocationPushRequestModel = Omit<PushToLocationRequestDto, 'attributes'> & { attributes: Array<AttributeRequestModel> };

export type LocationIssueRequestModel = Omit<
    IssueToLocationRequestDto,
    'csrAttributes | issueAttributes | customAttributes | certificateCustomAttributes'
> & {
    csrAttributes: Array<AttributeRequestModel>;
    issueAttributes: Array<AttributeRequestModel>;
    customAttributes?: Array<AttributeRequestModel>;
    certificateCustomAttributes?: Array<AttributeRequestModel>;
};

export type MetadataItemModel = Omit<ResponseMetadataDto, 'sourceObjects'> & { sourceObjects: Array<NameAndUuidDto> };

export type MetadataModel = Omit<MetadataResponseDto, 'items'> & { items: Array<MetadataItemModel> };

export type LocationCertificateModel = Omit<CertificateInLocationDto, 'metadata | pushAttributes | csrAttributes'> & {
    metadata?: Array<MetadataModel>;
    pushAttributes?: Array<AttributeResponseModel>;
    csrAttributes?: Array<AttributeResponseModel>;
};

export type LocationResponseModel = Omit<LocationDto, 'attributes | certificates | metadata | customAttributes'> & {
    attributes: Array<AttributeResponseModel>;
    certificates: Array<LocationCertificateModel>;
    metadata?: Array<MetadataModel>;
    customAttributes?: Array<AttributeResponseModel>;
};
