import { describe, expect, test } from 'vitest';
import {
    transformParseCertificateResponseDtoToCertificateResponseDetailModel,
    transformParseCertificateResponseDtoToAsn1String,
} from './utilsCertificate';
import { emptyCertificate } from '../../utils/certificate.tsx';

describe('transformParseCertificateResponseDtoToCertificateResponseDetailModel', () => {
    test('returns populated model when data satisfies isX509CertificateBasicData', () => {
        const validFrom = '2023-01-01T00:00:00Z';
        const validTo = '2024-01-01T00:00:00Z';
        const input = {
            data: {
                subject: 'CN=test',
                serialNumber: 'deadbeef',
                issuer: 'CN=issuer',
                validFrom,
                validTo,
            },
        } as any;

        const result = transformParseCertificateResponseDtoToCertificateResponseDetailModel(input);

        expect(result.notBefore).toBe(new Date(validFrom).toISOString());
        expect(result.notAfter).toBe(new Date(validTo).toISOString());
        expect(result.issuerDn).toBe('CN=issuer');
        expect(result.subjectDn).toBe('CN=test');
        expect(result.serialNumber).toBe('deadbeef');
    });

    test('returns emptyCertificate when data does not satisfy isX509CertificateBasicData', () => {
        const input = {
            data: {
                asn1dump: 'some-asn1',
            },
        } as any;

        const result = transformParseCertificateResponseDtoToCertificateResponseDetailModel(input);

        expect(result).toBe(emptyCertificate);
    });

    test('returns emptyCertificate when data is missing required fields', () => {
        const input = {
            data: {
                subject: 'CN=test',
            },
        } as any;

        const result = transformParseCertificateResponseDtoToCertificateResponseDetailModel(input);

        expect(result).toBe(emptyCertificate);
    });

    test('result is a new object (not the same reference) when basic data branch fires', () => {
        const input = {
            data: {
                subject: 'CN=test',
                serialNumber: 'abc',
                issuer: 'CN=issuer',
                validFrom: '2023-01-01T00:00:00Z',
                validTo: '2024-01-01T00:00:00Z',
            },
        } as any;

        const result = transformParseCertificateResponseDtoToCertificateResponseDetailModel(input);

        expect(result).not.toBe(emptyCertificate);
    });
});

describe('transformParseCertificateResponseDtoToAsn1String', () => {
    test('returns asn1dump when data satisfies isX509CertificateAsn1Data', () => {
        const input = {
            data: {
                asn1dump: 'asn1-content-here',
            },
        } as any;

        const result = transformParseCertificateResponseDtoToAsn1String(input);

        expect(result).toBe('asn1-content-here');
    });

    test('returns undefined when data does not have asn1dump', () => {
        const input = {
            data: {
                subject: 'CN=test',
                serialNumber: 'abc',
                issuer: 'CN=issuer',
                validFrom: '2023-01-01T00:00:00Z',
                validTo: '2024-01-01T00:00:00Z',
            },
        } as any;

        const result = transformParseCertificateResponseDtoToAsn1String(input);

        expect(result).toBeUndefined();
    });

    test('returns undefined when data is empty object', () => {
        const input = { data: {} } as any;

        const result = transformParseCertificateResponseDtoToAsn1String(input);

        expect(result).toBeUndefined();
    });
});
