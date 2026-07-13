import { describe, expect, test, it } from 'vitest';
import {
    transformSearchFilterModelToDto,
    transformSearchRequestModelToDto,
    transformRaProfileSimplifiedDtoToModel,
    transformCertificateComplianceResponseDtoToModel,
    transformCertificateDetailResponseDtoToModel,
    transformCertificateResponseDtoToModel,
    transformCertificateListResponseDtoToModel,
    transformCertificateContentResponseDtoToModel,
    transformCertificateSignRequestModelToDto,
    transformCertificateRevokeRequestModelToDto,
    transformCertificateRenewRequestModelToDto,
    transformCertificateRekeyRequestModelToDto,
    transformSearchFieldDtoToModel,
    transformSearchFieldListDtoToModel,
    transformCertificateHistoryDtoToModel,
    transformCertificateObjectModelToDto,
    transformCertificateBulkObjectModelToDto,
    transformCertificateBulkDeleteRequestModelToDto,
    transformCertificateBulkDeleteResponseDtoToModel,
    transformCertificateUploadModelToDto,
    transformCertificateComplianceCheckModelToDto,
    transformCertificateChainDownloadResponseDtoToCertificateChainResponseModel,
    transformCertificateRegistrationRequestModelToDto,
} from './certificates';
import { AttributeContentType, AttributeType } from 'types/openapi';

const attrRequestModel = { uuid: 'a1', name: 'attr', contentType: 'STRING', content: [] } as any;
const attrResponseDto = {
    uuid: 'a2',
    name: 'attr',
    label: 'Attr',
    type: 'STRING',
    contentType: 'STRING',
    version: 'V2',
    content: [],
} as any;

describe('transformSearchFilterModelToDto', () => {
    test('returns shallow clone of input', () => {
        const input = { fieldSource: 'PROPERTY', fieldIdentifier: 'commonName', condition: 'EQUALS', value: 'test' } as any;
        const result = transformSearchFilterModelToDto(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });
});

describe('transformSearchRequestModelToDto', () => {
    test('returns dto with undefined filters when filters absent', () => {
        const input = { filters: undefined } as any;
        const result = transformSearchRequestModelToDto(input);
        expect(result.filters).toBeUndefined();
    });

    test('maps each filter when filters present', () => {
        const filter = { fieldSource: 'PROPERTY', fieldIdentifier: 'commonName', condition: 'EQUALS', value: 'test' } as any;
        const input = { filters: [filter] } as any;
        const result = transformSearchRequestModelToDto(input);
        expect(result.filters).toHaveLength(1);
        expect(result.filters![0]).toEqual(filter);
    });
});

describe('transformRaProfileSimplifiedDtoToModel', () => {
    test('returns shallow clone of input', () => {
        const input = { uuid: 'rp1', name: 'rp', enabled: true } as any;
        const result = transformRaProfileSimplifiedDtoToModel(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });
});

describe('transformCertificateComplianceResponseDtoToModel', () => {
    test('returns model with undefined attributes when attributes absent', () => {
        const input = { uuid: 'cr1', attributes: undefined } as any;
        const result = transformCertificateComplianceResponseDtoToModel(input);
        expect(result.attributes).toBeUndefined();
    });

    test('maps attributes when present', () => {
        const input = { uuid: 'cr1', attributes: [attrResponseDto] } as any;
        const result = transformCertificateComplianceResponseDtoToModel(input);
        expect(result.attributes).toHaveLength(1);
    });
});

describe('transformCertificateDetailResponseDtoToModel', () => {
    test('spreads all optional map fields as undefined when absent', () => {
        const input = {
            uuid: 'cert1',
            metadata: undefined,
            raProfile: undefined,
            locations: undefined,
            groups: undefined,
            nonCompliantRules: undefined,
            customAttributes: undefined,
        } as any;
        const result = transformCertificateDetailResponseDtoToModel(input);
        expect(result.metadata).toBeUndefined();
        expect(result.raProfile).toBeUndefined();
        expect(result.locations).toBeUndefined();
        expect(result.groups).toBeUndefined();
        expect(result.nonCompliantRules).toBeUndefined();
        expect(result.customAttributes).toBeUndefined();
    });

    test('maps metadata, raProfile, locations, nonCompliantRules, customAttributes when present', () => {
        const input = {
            uuid: 'cert1',
            metadata: [{ connectorUuid: 'c1', items: [] }],
            raProfile: { uuid: 'rp1', name: 'rp', enabled: true },
            locations: [{ uuid: 'loc1', name: 'loc', enabled: true, attributes: [], certificates: [] }],
            groups: [{ uuid: 'g1', name: 'group' }],
            nonCompliantRules: [{ uuid: 'ncr1', attributes: [] }],
            customAttributes: [attrResponseDto],
        } as any;
        const result = transformCertificateDetailResponseDtoToModel(input);
        expect(result.metadata).toHaveLength(1);
        expect(result.raProfile).toBeDefined();
        expect(result.locations).toHaveLength(1);
        expect(result.groups).toHaveLength(1);
        expect(result.nonCompliantRules).toHaveLength(1);
        expect(result.customAttributes).toHaveLength(1);
    });

    test('sets groups to undefined when groups is empty array', () => {
        const input = {
            uuid: 'cert1',
            groups: [],
        } as any;
        const result = transformCertificateDetailResponseDtoToModel(input);
        expect(result.groups).toBeUndefined();
    });
});

describe('transformCertificateResponseDtoToModel', () => {
    test('sets raProfile to undefined when absent', () => {
        const input = { uuid: 'cert1', raProfile: undefined, groups: undefined } as any;
        const result = transformCertificateResponseDtoToModel(input);
        expect(result.raProfile).toBeUndefined();
    });

    test('maps raProfile when present', () => {
        const input = { uuid: 'cert1', raProfile: { uuid: 'rp1', name: 'rp' }, groups: undefined } as any;
        const result = transformCertificateResponseDtoToModel(input);
        expect(result.raProfile).toBeDefined();
        expect(result.raProfile!.uuid).toBe('rp1');
    });

    test('sets groups to undefined when absent', () => {
        const input = { uuid: 'cert1', raProfile: undefined, groups: undefined } as any;
        const result = transformCertificateResponseDtoToModel(input);
        expect(result.groups).toBeUndefined();
    });

    test('sets groups to undefined when empty array', () => {
        const input = { uuid: 'cert1', raProfile: undefined, groups: [] } as any;
        const result = transformCertificateResponseDtoToModel(input);
        expect(result.groups).toBeUndefined();
    });

    test('maps groups when non-empty', () => {
        const input = { uuid: 'cert1', raProfile: undefined, groups: [{ uuid: 'g1', name: 'group' }] } as any;
        const result = transformCertificateResponseDtoToModel(input);
        expect(result.groups).toHaveLength(1);
    });
});

describe('transformCertificateListResponseDtoToModel', () => {
    test('returns shallow clone of input', () => {
        const input = { uuid: 'cert1', commonName: 'test' } as any;
        const result = transformCertificateListResponseDtoToModel(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });
});

describe('transformCertificateContentResponseDtoToModel', () => {
    test('returns shallow clone of input', () => {
        const input = { uuid: 'cert1', certificateContent: 'abc' } as any;
        const result = transformCertificateContentResponseDtoToModel(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });
});

describe('transformCertificateSignRequestModelToDto', () => {
    test('maps attributes and leaves customAttributes undefined when absent', () => {
        const input = { attributes: [attrRequestModel], customAttributes: undefined } as any;
        const result = transformCertificateSignRequestModelToDto(input);
        expect(result.attributes).toHaveLength(1);
        expect(result.customAttributes).toBeUndefined();
    });

    test('maps both attributes and customAttributes when present', () => {
        const input = { attributes: [attrRequestModel], customAttributes: [attrRequestModel] } as any;
        const result = transformCertificateSignRequestModelToDto(input);
        expect(result.attributes).toHaveLength(1);
        expect(result.customAttributes).toHaveLength(1);
    });
});

describe('transformCertificateRevokeRequestModelToDto', () => {
    test('maps attributes', () => {
        const input = { reason: 'UNSPECIFIED', attributes: [attrRequestModel] } as any;
        const result = transformCertificateRevokeRequestModelToDto(input);
        expect(result.attributes).toHaveLength(1);
    });
});

describe('transformCertificateRenewRequestModelToDto', () => {
    test('returns shallow clone of input', () => {
        const input = { pkcs10: 'csr-content' } as any;
        const result = transformCertificateRenewRequestModelToDto(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });
});

describe('transformCertificateRekeyRequestModelToDto', () => {
    test('returns shallow clone of input', () => {
        const input = { pkcs10: 'csr-content' } as any;
        const result = transformCertificateRekeyRequestModelToDto(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });
});

describe('transformSearchFieldDtoToModel', () => {
    test('returns shallow clone of input', () => {
        const input = { fieldSource: 'PROPERTY', fieldIdentifier: 'commonName', label: 'Common Name', type: 'STRING' } as any;
        const result = transformSearchFieldDtoToModel(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });
});

describe('transformSearchFieldListDtoToModel', () => {
    test('returns model with undefined searchFieldData when absent', () => {
        const input = { searchFieldData: undefined } as any;
        const result = transformSearchFieldListDtoToModel(input);
        expect(result.searchFieldData).toBeUndefined();
    });

    test('maps searchFieldData when present', () => {
        const field = { fieldSource: 'PROPERTY', fieldIdentifier: 'commonName', label: 'Common Name', type: 'STRING' } as any;
        const input = { searchFieldData: [field] } as any;
        const result = transformSearchFieldListDtoToModel(input);
        expect(result.searchFieldData).toHaveLength(1);
        expect(result.searchFieldData![0]).toEqual(field);
    });
});

describe('transformCertificateHistoryDtoToModel', () => {
    test('returns shallow clone of input', () => {
        const input = { uuid: 'h1', created: '2023-01-01', status: 'SUCCESS', event: 'ISSUE', message: 'ok' } as any;
        const result = transformCertificateHistoryDtoToModel(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });
});

describe('transformCertificateObjectModelToDto', () => {
    test('returns shallow clone of input', () => {
        const input = { uuid: 'cert1' } as any;
        const result = transformCertificateObjectModelToDto(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });
});

describe('transformCertificateBulkObjectModelToDto', () => {
    test('returns dto with undefined filters when filters absent', () => {
        const input = { uuids: ['cert1'], filters: undefined } as any;
        const result = transformCertificateBulkObjectModelToDto(input);
        expect(result.filters).toBeUndefined();
    });

    test('maps filters when present', () => {
        const filter = { fieldSource: 'PROPERTY', fieldIdentifier: 'commonName', condition: 'EQUALS', value: 'test' } as any;
        const input = { uuids: ['cert1'], filters: [filter] } as any;
        const result = transformCertificateBulkObjectModelToDto(input);
        expect(result.filters).toHaveLength(1);
    });
});

describe('transformCertificateBulkDeleteRequestModelToDto', () => {
    test('returns dto with undefined filters when filters absent', () => {
        const input = { uuids: ['cert1'], filters: undefined } as any;
        const result = transformCertificateBulkDeleteRequestModelToDto(input);
        expect(result.filters).toBeUndefined();
    });

    test('maps filters when present', () => {
        const filter = { fieldSource: 'PROPERTY', fieldIdentifier: 'commonName', condition: 'EQUALS', value: 'test' } as any;
        const input = { uuids: ['cert1'], filters: [filter] } as any;
        const result = transformCertificateBulkDeleteRequestModelToDto(input);
        expect(result.filters).toHaveLength(1);
    });
});

describe('transformCertificateBulkDeleteResponseDtoToModel', () => {
    test('returns shallow clone of input', () => {
        const input = { deletedCount: 3, failedCount: 0 } as any;
        const result = transformCertificateBulkDeleteResponseDtoToModel(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });
});

describe('transformCertificateUploadModelToDto', () => {
    test('maps customAttributes', () => {
        const input = { certificate: 'pem-content', customAttributes: [attrRequestModel] } as any;
        const result = transformCertificateUploadModelToDto(input);
        expect(result.customAttributes).toHaveLength(1);
    });
});

describe('transformCertificateComplianceCheckModelToDto', () => {
    test('returns shallow clone of input', () => {
        const input = { uuids: ['cert1'] } as any;
        const result = transformCertificateComplianceCheckModelToDto(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });
});

describe('transformCertificateChainDownloadResponseDtoToCertificateChainResponseModel', () => {
    test('returns model with undefined certificates when certificates absent', () => {
        const input = { completeChain: true, certificates: undefined } as any;
        const result = transformCertificateChainDownloadResponseDtoToCertificateChainResponseModel(input);
        expect(result.certificates).toBeUndefined();
        expect(result.completeChain).toBe(true);
    });

    test('maps certificates when present', () => {
        const certDto = {
            uuid: 'c1',
            metadata: undefined,
            raProfile: undefined,
            locations: undefined,
            groups: undefined,
            nonCompliantRules: undefined,
            customAttributes: undefined,
        } as any;
        const input = { completeChain: false, certificates: [certDto] } as any;
        const result = transformCertificateChainDownloadResponseDtoToCertificateChainResponseModel(input);
        expect(result.certificates).toHaveLength(1);
    });
});

describe('transformCertificateRegistrationRequestModelToDto', () => {
    it('maps attribute arrays and passes through scalar fields', () => {
        const dto = transformCertificateRegistrationRequestModelToDto({
            authorizationSecret: 'super-secret-1',
            expiresAt: '2026-08-01T00:00:00Z',
            attributes: [],
            csrAttributes: [
                {
                    name: 'commonName',
                    contentType: AttributeContentType.String,
                    type: AttributeType.Data,
                    content: [{ data: 'example.com' }],
                },
            ],
            customAttributes: [],
        });
        expect(dto.authorizationSecret).toBe('super-secret-1');
        expect(dto.expiresAt).toBe('2026-08-01T00:00:00Z');
        expect(dto.csrAttributes).toHaveLength(1);
        expect(dto.attributes).toEqual([]);
    });
});
