import { describe, expect, test } from 'vitest';
import { OidCategory, ExtensionValueEncoding, type CustomOidEntryDetailResponseDtoAdditionalProperties } from 'types/openapi';
import {
    isCertificateExtensionCategory,
    isRdnAttributeTypeCategory,
    getExtensionValueEncodingOptions,
    isExtensionValueEncoding,
    buildOidAdditionalProperties,
    isCertificateExtensionProperties,
    isRdnProperties,
} from './oid';

describe('oid utils', () => {
    describe('isCertificateExtensionCategory', () => {
        test('true for the certificate extension category', () => {
            expect(isCertificateExtensionCategory(OidCategory.CertificateExtension)).toBe(true);
        });
        test('false for other / empty', () => {
            expect(isCertificateExtensionCategory(OidCategory.RdnAttributeType)).toBe(false);
            expect(isCertificateExtensionCategory(undefined)).toBe(false);
            expect(isCertificateExtensionCategory('')).toBe(false);
        });
    });

    describe('isRdnAttributeTypeCategory', () => {
        test('true only for the RDN category', () => {
            expect(isRdnAttributeTypeCategory(OidCategory.RdnAttributeType)).toBe(true);
            expect(isRdnAttributeTypeCategory(OidCategory.CertificateExtension)).toBe(false);
            expect(isRdnAttributeTypeCategory(undefined)).toBe(false);
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
            expect(isExtensionValueEncoding(undefined)).toBe(false);
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
            expect(isCertificateExtensionProperties(undefined)).toBe(false);
        });
        test('isRdnProperties', () => {
            expect(isRdnProperties(rdn)).toBe(true);
            expect(isRdnProperties(ext)).toBe(false);
            expect(isRdnProperties(undefined)).toBe(false);
        });
    });
});
