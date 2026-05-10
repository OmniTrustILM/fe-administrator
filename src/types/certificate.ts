import type { AttributeRequestModel, AttributeResponseModel } from './attributes';
import type { CertificateGroupResponseModel } from './certificateGroups';
import type { LocationResponseModel, MetadataModel } from './locations';
import type {
    CertificateChainResponseDto,
    CertificateComplianceResultDto,
    CertificateDetailDto,
    CertificateSearchRequestDto,
    CertificateValidationCheck,
    CertificateValidationCheckDto,
    CertificateValidationResultDto,
    CertificateValidationStatus,
    ClientCertificateRevocationDto,
    ClientCertificateSignRequestDto,
    MultipleCertificateObjectUpdateDto,
    RemoveCertificateDto,
    SearchFieldDataByGroupDto,
    SearchFilterRequestDto,
} from './openapi';

export type {
    CertificateValidationCheckDto as ValidationCertificateCheckDto,
    CertificateValidationResultDto as ValidationCertificateResultDto,
    SearchFilterRequestDto as SearchFilterDto,
    SearchFilterRequestDto as SearchFilterModel,
    CertificateSearchRequestDto as SearchRequestDto,
    SimplifiedRaProfileDto as RaProfileSimplifiedDto,
    SimplifiedRaProfileDto as RaProfileSimplifiedModel,
    CertificateComplianceResultDto as CertificateComplianceResponseDto,
    CertificateDetailDto as CertificateDetailResponseDto,
    CertificateDto as CertificateListResponseDto,
    CertificateDto as CertificateListResponseModel,
    ClientCertificateSignRequestDto as CertificateSignRequestDto,
    ClientCertificateRevocationDto as CertificateRevokeRequestDto,
    ClientCertificateRenewRequestDto as CertificateRenewRequestDto,
    ClientCertificateRenewRequestDto as CertificateRenewRequestModel,
    ClientCertificateRekeyRequestDto as CertificateRekeyRequestDto,
    ClientCertificateRekeyRequestDto as CertificateRekeyRequestModel,
    SearchFieldDataDto as SearchFieldDto,
    SearchFieldDataDto as SearchFieldModel,
    SearchFieldDataByGroupDto as SearchFieldListDto,
    CertificateEventHistoryDto as CertificateHistoryDto,
    CertificateEventHistoryDto as CertificateHistoryModel,
    CertificateUpdateObjectsDto as CertificateObjectDto,
    CertificateUpdateObjectsDto as CertificateObjectModel,
    MultipleCertificateObjectUpdateDto as CertificateBulkObjectDto,
    RemoveCertificateDto as CertificateBulkDeleteRequestDto,
    BulkOperationResponse as CertificateBulkDeleteResponseDto,
    BulkOperationResponse as CertificateBulkDeleteResponseModel,
    UploadCertificateRequestDto as CertificateUploadDto,
    UploadCertificateRequestDto as CertificateUploadModel,
    CertificateComplianceCheckDto as CertificateCheckComplianceDto,
    CertificateComplianceCheckDto as CertificateComplianceCheckModel,
    CertificateContentDto as CertificateContentResponseDto,
    CertificateContentDto as CertificateContentResponseModel,
    CertificateChainResponseDto as ChainCertificateResponseDto,
    CertificateChainDownloadResponseDto as DownloadChainCertificateResponseDto,
    CertificateChainDownloadResponseDto as DownloadCertificateChainResponseModel,
    CertificateDownloadResponseDto as DownloadCertificateResponseDto,
    CertificateDownloadResponseDto as DownloadCertificateResponseModel,
} from './openapi';

export type ValidationCertificateCheckModel = Omit<CertificateValidationCheckDto, 'validationCheck | status | message'> & {
    validationCheck: CertificateValidationCheck;
    status: CertificateValidationStatus;
    message?: string;
};

export type ValidationCertificateResultModel = Omit<CertificateValidationResultDto, 'resultStatus' | 'validationCheckResults'> & {
    resultStatus: CertificateValidationStatus;
    validationCheckResults?: Array<ValidationCertificateCheckModel>;
};

export type SearchRequestModel = Omit<CertificateSearchRequestDto, 'filters'> & { filters?: Array<SearchFilterRequestDto> };

export type CertificateComplianceResponseModel = Omit<CertificateComplianceResultDto, 'attributes'> & {
    attributes?: Array<AttributeResponseModel>;
};

export type CertificateDetailResponseModel = Omit<
    CertificateDetailDto,
    'metadata | raProfile | locations | group | nonCompliantRules | customAttributes'
> & {
    metadata?: Array<MetadataModel>;
    raProfile?: import('./openapi').SimplifiedRaProfileDto;
    locations?: Array<LocationResponseModel>;
    groups?: Array<CertificateGroupResponseModel>;
    nonCompliantRules?: Array<CertificateComplianceResponseModel>;
    customAttributes?: Array<AttributeResponseModel>;
};

export type CertificateSignRequestModel = Omit<
    ClientCertificateSignRequestDto,
    'attributes | customAttributes | csrAttributes | signatureAttributes'
> & {
    attributes: Array<AttributeRequestModel>;
    customAttributes?: Array<AttributeRequestModel>;
    csrAttributes?: Array<AttributeRequestModel>;
    signatureAttributes?: Array<AttributeRequestModel>;
    altSignatureAttributes?: Array<AttributeRequestModel>;
};

export type CertificateRevokeRequestModel = Omit<ClientCertificateRevocationDto, 'attributes'> & {
    attributes: Array<AttributeRequestModel>;
};

export type SearchFieldListModel = Omit<SearchFieldDataByGroupDto, 'searchFieldData'> & {
    searchFieldData?: Array<import('./openapi').SearchFieldDataDto>;
};

export type CertificateBulkObjectModel = Omit<MultipleCertificateObjectUpdateDto, 'filters'> & {
    filters?: Array<SearchFilterRequestDto>;
};

export type CertificateBulkDeleteRequestModel = Omit<RemoveCertificateDto, 'filters'> & { filters?: Array<SearchFilterRequestDto> };

export type CertificateChainResponseModel = Omit<CertificateChainResponseDto, 'certificates'> & {
    certificates?: Array<CertificateDetailResponseModel>;
};
