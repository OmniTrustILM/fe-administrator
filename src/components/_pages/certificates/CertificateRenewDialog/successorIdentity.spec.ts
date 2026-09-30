import { describe, expect, test } from 'vitest';
import type { CertificateDetailResponseModel } from 'types/certificate';
import { AttributeContentType, AttributeType, AttributeVersion } from 'types/openapi';
import { replaySourceIdentity, toRequestAttributes } from './successorIdentity';

const source = (overrides: Partial<CertificateDetailResponseModel>): CertificateDetailResponseModel =>
    ({ uuid: 'source-uuid', subjectDn: 'CN=app.example,O=Example', ...overrides }) as CertificateDetailResponseModel;

const commonNameAttribute = {
    uuid: 'cn-uuid',
    name: 'commonName',
    label: 'Common Name',
    type: AttributeType.Data,
    contentType: AttributeContentType.String,
    version: AttributeVersion.V3,
    content: [{ data: 'app.example', contentType: AttributeContentType.String }],
};

describe('toRequestAttributes', () => {
    test('keeps what a request needs and drops the response-only fields', () => {
        expect(toRequestAttributes([commonNameAttribute])).toEqual([
            {
                uuid: 'cn-uuid',
                name: 'commonName',
                contentType: AttributeContentType.String,
                version: AttributeVersion.V3,
                content: [{ data: 'app.example', contentType: AttributeContentType.String }],
            },
        ]);
        expect(toRequestAttributes(undefined)).toEqual([]);
    });
});

describe('replaySourceIdentity', () => {
    test('replays the CSR attributes of the source as csrAttributes and sends no flat fields', () => {
        const identity = replaySourceIdentity(
            source({ certificateRequest: { attributes: [commonNameAttribute] } as CertificateDetailResponseModel['certificateRequest'] }),
        );

        expect(identity.kind).toBe('csrAttributes');
        expect(identity.request).toEqual({
            csrAttributes: [
                {
                    uuid: 'cn-uuid',
                    name: 'commonName',
                    contentType: AttributeContentType.String,
                    version: AttributeVersion.V3,
                    content: [{ data: 'app.example', contentType: AttributeContentType.String }],
                },
            ],
        });
    });

    test('falls back to the subject DN and SANs when the source has no CSR attributes', () => {
        const identity = replaySourceIdentity(
            source({
                certificateRequest: { attributes: [] } as unknown as CertificateDetailResponseModel['certificateRequest'],
                subjectAlternativeNames: {
                    dNSName: ['app.example', 'www.app.example'],
                    iPAddress: ['10.0.0.1'],
                    rfc822Name: ['ops@example.com'],
                    uniformResourceIdentifier: ['https://app.example/id'],
                    directoryName: ['CN=Alt,O=Example'],
                    registeredID: ['1.2.3.4'],
                },
            }),
        );

        expect(identity.kind).toBe('flat');
        expect(identity.request).toEqual({
            subjectDn: 'CN=app.example,O=Example',
            subjectAltName:
                'DNS:app.example,DNS:www.app.example,IP:10.0.0.1,email:ops@example.com,URI:https://app.example/id,dirName:CN=Alt,O=Example,RID:1.2.3.4',
        });
    });

    test('renders an otherName SAN in the UTF8 form Core parses', () => {
        const identity = replaySourceIdentity(source({ subjectAlternativeNames: { otherName: ['1.3.6.1.4.1.311.20.2.3=user@corp'] } }));

        expect(identity.request.subjectAltName).toBe('otherName:1.3.6.1.4.1.311.20.2.3;UTF8:user@corp');
    });

    test('does not replay an otherName whose value is not plain text', () => {
        const identity = replaySourceIdentity(
            source({
                subjectAlternativeNames: {
                    dNSName: ['app.example'],
                    otherName: ['1.3.6.1.5.5.7.8.4=[1.2.3, #0401ff]', '1.3.6.1.4.1.311.25.1=#04106f', 'no-separator'],
                },
            }),
        );

        expect(identity.request.subjectAltName).toBe('DNS:app.example');
        expect(identity.kind === 'flat' && identity.omittedSanTypes).toEqual(['otherName']);
    });

    test('reports SAN types the flat form cannot carry instead of sending them', () => {
        const identity = replaySourceIdentity(
            source({ subjectAlternativeNames: { dNSName: ['app.example'], x400Address: ['x400'], ediPartyName: ['edi'] } }),
        );

        expect(identity.request.subjectAltName).toBe('DNS:app.example');
        expect(identity.kind === 'flat' && identity.omittedSanTypes).toEqual(['x400Address', 'ediPartyName']);
    });

    test('omits empty flat fields rather than sending blank strings', () => {
        const identity = replaySourceIdentity(
            source({ subjectDn: '', subjectAlternativeNames: { dNSName: ['app.example'], iPAddress: [] } }),
        );

        expect(identity.request).toEqual({ subjectAltName: 'DNS:app.example' });
    });
});
