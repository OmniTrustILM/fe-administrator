import type { AttributeRequestModel, AttributeResponseModel } from './attributes';
import type { CertificateGroupResponseModel } from './certificateGroups';
import type { LocationResponseModel, MetadataModel } from './locations';
import type {
    BulkOperationResponse,
    CertificateChainDownloadResponseDto,
    CertificateChainResponseDto,
    CertificateComplianceCheckDto,
    CertificateComplianceResultDto,
    CertificateContentDto,
    CertificateDetailDto as CertificateDetailResponseDtoOpenApi,
    CertificateDownloadResponseDto,
    CertificateDto,
    CertificateEventHistoryDto,
    CertificateSearchRequestDto,
    CertificateUpdateObjectsDto,
    CertificateValidationCheck,
    CertificateValidationCheckDto,
    CertificateValidationResultDto,
    CertificateValidationStatus,
    ClientCertificateRekeyRequestDto,
    ClientCertificateRenewRequestDto,
    ClientCertificateRevocationDto,
    ClientCertificateSignRequestDto,
    MultipleCertificateObjectUpdateDto,
    RemoveCertificateDto,
    SearchFieldDataByGroupDto,
    SearchFieldDataDto,
    SearchFilterRequestDto,
    SimplifiedRaProfileDto,
    UploadCertificateRequestDto,
} from './openapi';

export type ValidationCertificateCheckDto = CertificateValidationCheckDto;
export type ValidationCertificateCheckModel = Omit<CertificateValidationCheckDto, 'validationCheck | status | message'> & {
    validationCheck: CertificateValidationCheck;
    status: CertificateValidationStatus;
    message?: string;
};

export type ValidationCertificateResultDto = CertificateValidationResultDto;

export type ValidationCertificateResultModel = Omit<ValidationCertificateResultDto, 'resultStatus' | 'validationCheckResults'> & {
    resultStatus: CertificateValidationStatus;
    validationCheckResults?: Array<ValidationCertificateCheckModel>;
};
export type SearchFilterDto = SearchFilterRequestDto;
export type SearchFilterModel = SearchFilterDto;

export type SearchRequestDto = CertificateSearchRequestDto;
export type SearchRequestModel = Omit<SearchRequestDto, 'filters'> & { filters?: Array<SearchFilterModel> };

export type RaProfileSimplifiedDto = SimplifiedRaProfileDto;
export type RaProfileSimplifiedModel = RaProfileSimplifiedDto;

export type CertificateComplianceResponseDto = CertificateComplianceResultDto;
export type CertificateComplianceResponseModel = Omit<CertificateComplianceResponseDto, 'attributes'> & {
    attributes?: Array<AttributeResponseModel>;
};

export type CertificateDetailResponseDto = CertificateDetailResponseDtoOpenApi;
export type CertificateDetailResponseModel = Omit<
    CertificateDetailResponseDto,
    'metadata | raProfile | locations | group | nonCompliantRules | customAttributes'
> & {
    metadata?: Array<MetadataModel>;
    raProfile?: RaProfileSimplifiedModel;
    locations?: Array<LocationResponseModel>;
    groups?: Array<CertificateGroupResponseModel>;
    nonCompliantRules?: Array<CertificateComplianceResponseModel>;
    customAttributes?: Array<AttributeResponseModel>;
};

export type CertificateListResponseDto = CertificateDto;
export type CertificateListResponseModel = CertificateListResponseDto;

export type CertificateSignRequestDto = ClientCertificateSignRequestDto;
export type CertificateSignRequestModel = Omit<
    CertificateSignRequestDto,
    'attributes | customAttributes | csrAttributes | signatureAttributes'
> & {
    attributes: Array<AttributeRequestModel>;
    customAttributes?: Array<AttributeRequestModel>;
    csrAttributes?: Array<AttributeRequestModel>;
    signatureAttributes?: Array<AttributeRequestModel>;
    altSignatureAttributes?: Array<AttributeRequestModel>;
};

export type CertificateRevokeRequestDto = ClientCertificateRevocationDto;
export type CertificateRevokeRequestModel = Omit<CertificateRevokeRequestDto, 'attributes'> & { attributes: Array<AttributeRequestModel> };

export type CertificateRenewRequestDto = ClientCertificateRenewRequestDto;
export type CertificateRenewRequestModel = CertificateRenewRequestDto;

export type CertificateRekeyRequestDto = ClientCertificateRekeyRequestDto;
export type CertificateRekeyRequestModel = CertificateRekeyRequestDto;

export type SearchFieldDto = SearchFieldDataDto;
export type SearchFieldModel = SearchFieldDto;

export type SearchFieldListDto = SearchFieldDataByGroupDto;
export type SearchFieldListModel = Omit<SearchFieldListDto, 'searchFieldData'> & { searchFieldData?: Array<SearchFieldModel> };

export type CertificateHistoryDto = CertificateEventHistoryDto;
export type CertificateHistoryModel = CertificateHistoryDto;

export type CertificateObjectDto = CertificateUpdateObjectsDto;
export type CertificateObjectModel = CertificateObjectDto;

export type CertificateBulkObjectDto = MultipleCertificateObjectUpdateDto;
export type CertificateBulkObjectModel = Omit<CertificateBulkObjectDto, 'filters'> & { filters?: Array<SearchFilterModel> };

export type CertificateBulkDeleteRequestDto = RemoveCertificateDto;
export type CertificateBulkDeleteRequestModel = Omit<CertificateBulkDeleteRequestDto, 'filters'> & { filters?: Array<SearchFilterModel> };

export type CertificateBulkDeleteResponseDto = BulkOperationResponse;
export type CertificateBulkDeleteResponseModel = CertificateBulkDeleteResponseDto;

export type CertificateUploadDto = UploadCertificateRequestDto;
export type CertificateUploadModel = CertificateUploadDto;

export type CertificateCheckComplianceDto = CertificateComplianceCheckDto;
export type CertificateComplianceCheckModel = CertificateComplianceCheckDto;

export type CertificateContentResponseDto = CertificateContentDto;
export type CertificateContentResponseModel = CertificateContentResponseDto;

export type ChainCertificateResponseDto = CertificateChainResponseDto;
export type CertificateChainResponseModel = Omit<ChainCertificateResponseDto, 'certificates'> & {
    certificates?: Array<CertificateDetailResponseModel>;
};

export type DownloadChainCertificateResponseDto = CertificateChainDownloadResponseDto;
export type DownloadCertificateChainResponseModel = DownloadChainCertificateResponseDto;

export type DownloadCertificateResponseDto = CertificateDownloadResponseDto;
export type DownloadCertificateResponseModel = DownloadCertificateResponseDto;
