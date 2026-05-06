import { describe, expect, test } from 'vitest';
import {
    transformParseRequestResponseDtoToCertificateResponseDetailModel,
    transformParseRequestResponseDtoToCertificateResponseDetailModelToAsn1String,
} from './utilsCertificateRequest';
import { emptyCertificate } from '../../utils/certificate.tsx';

describe('transformParseRequestResponseDtoToCertificateResponseDetailModel', () => {
    test('returns model with subjectDn populated when data satisfies isPkcs10RequestBasicData', () => {
        const input = {
            data: {
                subject: 'CN=requestor',
            },
        } as any;

        const result = transformParseRequestResponseDtoToCertificateResponseDetailModel(input);

        expect(result.subjectDn).toBe('CN=requestor');
    });

    test('result is a new object spread from emptyCertificate when basic data branch fires', () => {
        const input = {
            data: {
                subject: 'CN=requestor',
            },
        } as any;

        const result = transformParseRequestResponseDtoToCertificateResponseDetailModel(input);

        expect(result).not.toBe(emptyCertificate);
    });

    test('returns emptyCertificate when data does not have subject', () => {
        const input = {
            data: {
                asn1dump: 'some-asn1',
            },
        } as any;

        const result = transformParseRequestResponseDtoToCertificateResponseDetailModel(input);

        expect(result).toBe(emptyCertificate);
    });

    test('returns emptyCertificate when data is empty object', () => {
        const input = { data: {} } as any;

        const result = transformParseRequestResponseDtoToCertificateResponseDetailModel(input);

        expect(result).toBe(emptyCertificate);
    });
});

describe('transformParseRequestResponseDtoToCertificateResponseDetailModelToAsn1String', () => {
    test('returns asn1dump when data satisfies isX509CertificateRequestAsn1Data', () => {
        const input = {
            data: {
                asn1dump: 'pkcs10-asn1-content',
            },
        } as any;

        const result = transformParseRequestResponseDtoToCertificateResponseDetailModelToAsn1String(input);

        expect(result).toBe('pkcs10-asn1-content');
    });

    test('returns undefined when data does not have asn1dump', () => {
        const input = {
            data: {
                subject: 'CN=requestor',
            },
        } as any;

        const result = transformParseRequestResponseDtoToCertificateResponseDetailModelToAsn1String(input);

        expect(result).toBeUndefined();
    });

    test('returns undefined when data is empty object', () => {
        const input = { data: {} } as any;

        const result = transformParseRequestResponseDtoToCertificateResponseDetailModelToAsn1String(input);

        expect(result).toBeUndefined();
    });
});
