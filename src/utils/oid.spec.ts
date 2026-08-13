import { describe, expect, it, test } from 'vitest';
import { OidCategory, ExtensionValueEncoding, type CustomOidEntryDetailResponseDtoAdditionalProperties } from 'types/openapi';
import type { OIDResponseModel } from 'types/oids';
import {
    isCertificateExtensionCategory,
    isRdnAttributeTypeCategory,
    getExtensionValueEncodingOptions,
    isExtensionValueEncoding,
    buildOidAdditionalProperties,
    isCertificateExtensionProperties,
    isRdnProperties,
    toOidSelectOptions,
    toMergedOidSelectOptions,
    rdnCodeClarification,
    buildRdnCodeByOid,
} from './oid';

describe('oid utils', () => {
    describe('isCertificateExtensionCategory', () => {
        test('true for the certificate extension category', () => {
            expect(isCertificateExtensionCategory(OidCategory.CertificateExtension)).toBe(true);
        });
        test('false for other / empty', () => {
            expect(isCertificateExtensionCategory(OidCategory.RdnAttributeType)).toBe(false);
            expect(isCertificateExtensionCategory()).toBe(false);
            expect(isCertificateExtensionCategory('')).toBe(false);
        });
    });

    describe('isRdnAttributeTypeCategory', () => {
        test('true only for the RDN category', () => {
            expect(isRdnAttributeTypeCategory(OidCategory.RdnAttributeType)).toBe(true);
            expect(isRdnAttributeTypeCategory(OidCategory.CertificateExtension)).toBe(false);
            expect(isRdnAttributeTypeCategory()).toBe(false);
        });
    });

    describe('getExtensionValueEncodingOptions', () => {
        test('derives one option per enum member, value === label', () => {
            const options = getExtensionValueEncodingOptions();
            expect(options).toEqual(Object.values(ExtensionValueEncoding).map((v) => ({ value: v, label: v })));
            expect(options).toContainEqual({ value: ExtensionValueEncoding.Der, label: 'DER' });
            expect(options).toHaveLength(Object.values(ExtensionValueEncoding).length);
        });
    });

    describe('isExtensionValueEncoding', () => {
        test('true only for real enum members', () => {
            expect(isExtensionValueEncoding(ExtensionValueEncoding.Der)).toBe(true);
            expect(isExtensionValueEncoding('DER')).toBe(true);
            expect(isExtensionValueEncoding('not-an-encoding')).toBe(false);
            expect(isExtensionValueEncoding('')).toBe(false);
            expect(isExtensionValueEncoding()).toBe(false);
        });
    });

    describe('buildOidAdditionalProperties', () => {
        test('RDN → code + altCodes', () => {
            expect(buildOidAdditionalProperties(OidCategory.RdnAttributeType, { code: 'CN', alternativeCode: ['commonName'] })).toEqual({
                code: 'CN',
                altCodes: ['commonName'],
            });
        });
        test('RDN with no alternative codes → altCodes undefined', () => {
            expect(buildOidAdditionalProperties(OidCategory.RdnAttributeType, { code: 'CN' })).toEqual({
                code: 'CN',
                altCodes: undefined,
            });
        });
        test('Certificate Extension → defaultCritical + valueEncoding', () => {
            expect(
                buildOidAdditionalProperties(OidCategory.CertificateExtension, {
                    defaultCritical: true,
                    valueEncoding: ExtensionValueEncoding.Der,
                }),
            ).toEqual({ defaultCritical: true, valueEncoding: ExtensionValueEncoding.Der });
        });
        test('Certificate Extension defaults defaultCritical to false', () => {
            expect(
                buildOidAdditionalProperties(OidCategory.CertificateExtension, { valueEncoding: ExtensionValueEncoding.OctetString }),
            ).toEqual({ defaultCritical: false, valueEncoding: ExtensionValueEncoding.OctetString });
        });
        test('Certificate Extension with missing valueEncoding → undefined (no invalid payload)', () => {
            expect(buildOidAdditionalProperties(OidCategory.CertificateExtension, { defaultCritical: true })).toBeUndefined();
        });
        test('Certificate Extension with a non-enum valueEncoding → undefined', () => {
            expect(buildOidAdditionalProperties(OidCategory.CertificateExtension, { valueEncoding: 'not-an-encoding' })).toBeUndefined();
        });
        test('unknown category → undefined', () => {
            expect(buildOidAdditionalProperties('somethingElse', { code: 'CN' })).toBeUndefined();
            expect(buildOidAdditionalProperties('', {})).toBeUndefined();
        });
    });

    describe('union type-guards', () => {
        const ext: CustomOidEntryDetailResponseDtoAdditionalProperties = {
            defaultCritical: true,
            valueEncoding: ExtensionValueEncoding.Der,
        };
        const rdn: CustomOidEntryDetailResponseDtoAdditionalProperties = { code: 'CN', altCodes: ['commonName'] };

        test('isCertificateExtensionProperties', () => {
            expect(isCertificateExtensionProperties(ext)).toBe(true);
            expect(isCertificateExtensionProperties(rdn)).toBe(false);
            expect(isCertificateExtensionProperties()).toBe(false);
        });
        test('isRdnProperties', () => {
            expect(isRdnProperties(rdn)).toBe(true);
            expect(isRdnProperties(ext)).toBe(false);
            expect(isRdnProperties()).toBe(false);
        });
    });

    describe('toOidSelectOptions', () => {
        test('maps oid/displayName/description to value/label/description', () => {
            const entries: OIDResponseModel[] = [
                { oid: '2.5.4.3', displayName: 'commonName', description: 'Common Name', category: OidCategory.RdnAttributeType },
                { oid: '2.5.29.17', displayName: '', category: OidCategory.CertificateExtension },
            ];
            expect(toOidSelectOptions(entries)).toEqual([
                { value: '2.5.4.3', label: 'commonName', description: 'Common Name' },
                { value: '2.5.29.17', label: '2.5.29.17', description: undefined },
            ]);
        });
        test('empty list → empty options', () => {
            expect(toOidSelectOptions([])).toEqual([]);
        });
        test('whitespace-only displayName falls back to the OID', () => {
            const entries: OIDResponseModel[] = [{ oid: '2.5.4.3', displayName: '   ', category: OidCategory.RdnAttributeType }];
            expect(toOidSelectOptions(entries)).toEqual([{ value: '2.5.4.3', label: '2.5.4.3', description: undefined }]);
        });
        test('RDN entries expose code + altCodes as aliases; other categories have none', () => {
            const entries: OIDResponseModel[] = [
                {
                    oid: '2.5.4.3',
                    displayName: 'Common Name',
                    category: OidCategory.RdnAttributeType,
                    additionalProperties: { code: 'CN', altCodes: ['commonName'] },
                },
                {
                    oid: '2.5.29.17',
                    displayName: 'SAN',
                    category: OidCategory.CertificateExtension,
                    additionalProperties: { defaultCritical: false, valueEncoding: ExtensionValueEncoding.Der },
                },
            ];
            const options = toOidSelectOptions(entries);
            expect(options[0].aliases).toEqual(['CN', 'commonName']);
            expect(options[1].aliases).toBeUndefined();
        });
    });

    describe('toOidSelectOptions RDN code label', () => {
        test('appends the RDN code in brackets and exposes it as `code`', () => {
            const [opt] = toOidSelectOptions([
                {
                    oid: '2.5.4.3',
                    displayName: 'Common Name',
                    additionalProperties: { code: 'CN' },
                } as any,
            ]);
            expect(opt.label).toBe('Common Name (CN)');
            expect(opt.code).toBe('CN');
        });

        test('leaves non-RDN (extension) options without a code and unbracketed', () => {
            const [opt] = toOidSelectOptions([
                {
                    oid: '2.5.29.19',
                    displayName: 'Basic Constraints',
                    additionalProperties: { valueEncoding: 'BASE64' },
                } as any,
            ]);
            expect(opt.label).toBe('Basic Constraints');
            expect(opt.code).toBeUndefined();
        });
    });

    describe('toMergedOidSelectOptions', () => {
        const system: OIDResponseModel[] = [
            { oid: '2.5.29.37', displayName: 'Extended Key Usage', category: OidCategory.CertificateExtension },
        ];
        const custom: OIDResponseModel[] = [
            { oid: '1.3.6.1.4.1.99999.2', displayName: 'Internal Marker', category: OidCategory.CertificateExtension },
        ];

        test('a system-only list still produces options (the fresh-install case)', () => {
            expect(toMergedOidSelectOptions(system, [])).toEqual([
                { value: '2.5.29.37', label: 'Extended Key Usage', description: undefined },
            ]);
        });

        test('a custom-only list produces options', () => {
            expect(toMergedOidSelectOptions([], custom)).toEqual([
                { value: '1.3.6.1.4.1.99999.2', label: 'Internal Marker', description: undefined },
            ]);
        });

        test('system entries are ordered before custom ones', () => {
            expect(toMergedOidSelectOptions(system, custom).map((o) => o.value)).toEqual(['2.5.29.37', '1.3.6.1.4.1.99999.2']);
        });

        test('undefined inputs produce an empty list', () => {
            expect(toMergedOidSelectOptions()).toEqual([]);
        });
    });

    describe('confusable RDN code clarifications', () => {
        const rdnEntry = (code: string, displayName: string, description?: string): OIDResponseModel =>
            ({
                oid: '2.5.4.4',
                displayName,
                description,
                category: OidCategory.RdnAttributeType,
                additionalProperties: { code },
            }) as OIDResponseModel;

        test('SN is described as surname and warns against the serial-number reading', () => {
            const [opt] = toOidSelectOptions([rdnEntry('SN', 'Surname')]);
            expect(opt.label).toBe('Surname (SN)');
            expect(opt.description).toBe('Surname (family name). Not a serial number — use SERIALNUMBER for that.');
        });

        test('SERIALNUMBER is described as the subject serial number, not the certificate serial', () => {
            const [opt] = toOidSelectOptions([rdnEntry('SERIALNUMBER', 'Serial Number')]);
            expect(opt.description).toBe(
                "Subject serial number, e.g. a device serial. Not the certificate's serial number, and not SN (surname).",
            );
        });

        test('the clarification wins over a backend-supplied description', () => {
            const [opt] = toOidSelectOptions([rdnEntry('SN', 'Surname', 'X.520 surname attribute')]);
            expect(opt.description).toContain('Not a serial number');
        });

        test('codes are matched case-insensitively', () => {
            const [opt] = toOidSelectOptions([rdnEntry('sn', 'Surname')]);
            expect(opt.description).toContain('Surname (family name)');
        });

        test('every other RDN code keeps its backend description', () => {
            const [opt] = toOidSelectOptions([rdnEntry('CN', 'Common Name', 'X.520 common name')]);
            expect(opt.description).toBe('X.520 common name');
        });

        test('rdnCodeClarification returns undefined for an unknown or missing code', () => {
            expect(rdnCodeClarification('CN')).toBeUndefined();
            expect(rdnCodeClarification()).toBeUndefined();
        });
    });
});

describe('buildRdnCodeByOid', () => {
    it('maps RDN OIDs to their codes and skips non-RDN entries', () => {
        const map = buildRdnCodeByOid([
            { oid: '2.5.4.3', additionalProperties: { code: 'CN' } } as any,
            { oid: '2.5.29.19', additionalProperties: { valueEncoding: 'BASE64' } } as any,
        ]);
        expect(map).toEqual({ '2.5.4.3': 'CN' });
    });
});
