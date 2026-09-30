import type { AttributeRequestModel, AttributeResponseModel } from 'types/attributes';
import type { CertificateDetailResponseModel, CertificateRegistrationRequestModel } from 'types/certificate';

type IdentityRequest = Pick<CertificateRegistrationRequestModel, 'csrAttributes' | 'subjectDn' | 'subjectAltName'>;

/**
 * The source certificate's identity, replayed for a successor registration. Core classifies the completed
 * successor against its source by subject DN, issuer and key, so the identity has to be the source's own or the
 * lineage degrades to a replacement. Core takes the identity as csrAttributes or as flat fields, never both.
 */
export type ReplayedIdentity =
    | { kind: 'csrAttributes'; attributes: AttributeResponseModel[]; request: IdentityRequest }
    | { kind: 'flat'; subjectDn?: string; subjectAltName?: string; omittedSanTypes: string[]; request: IdentityRequest };

// Certificate detail SAN keys mapped to the prefixes of Core's textual subjectAltName (OpenSSL convention).
// x400Address and ediPartyName have no textual form there.
const sanPrefixes: Record<string, string> = {
    dNSName: 'DNS',
    iPAddress: 'IP',
    rfc822Name: 'email',
    uniformResourceIdentifier: 'URI',
    directoryName: 'dirName',
    registeredID: 'RID',
    otherName: 'otherName',
};

// The detail renders an otherName as "<oid>=<value>"; the flat form wants "<oid>;UTF8:<value>". Only a plain-text
// value can make that trip: the detail shows a structured or binary value as "[...]" or "#<hex>", which would come
// back as a UTF8String holding that text.
function formatSan(type: string, value: string) {
    if (type !== 'otherName') return `${sanPrefixes[type]}:${value}`;
    const separator = value.indexOf('=');
    const text = value.slice(separator + 1);
    if (separator <= 0 || text.startsWith('[') || text.startsWith('#')) return undefined;
    return `otherName:${value.slice(0, separator)};UTF8:${text}`;
}

export function toRequestAttributes(attributes: AttributeResponseModel[] | undefined): AttributeRequestModel[] {
    return (attributes ?? []).map(
        ({ uuid, name, contentType, content, version }) => ({ uuid, name, contentType, content, version }) as AttributeRequestModel,
    );
}

export function replaySourceIdentity(source: CertificateDetailResponseModel): ReplayedIdentity {
    const attributes = (source.certificateRequest?.attributes ?? []) as AttributeResponseModel[];
    if (attributes.length > 0) {
        return { kind: 'csrAttributes', attributes, request: { csrAttributes: toRequestAttributes(attributes) } };
    }

    const sans: string[] = [];
    const omittedSanTypes = new Set<string>();
    for (const [type, values] of Object.entries(source.subjectAlternativeNames ?? {})) {
        for (const value of values ?? []) {
            const san = sanPrefixes[type] ? formatSan(type, value) : undefined;
            if (san) sans.push(san);
            else omittedSanTypes.add(type);
        }
    }

    const subjectDn = source.subjectDn || undefined;
    const subjectAltName = sans.length > 0 ? sans.join(',') : undefined;
    return {
        kind: 'flat',
        subjectDn,
        subjectAltName,
        omittedSanTypes: [...omittedSanTypes],
        request: { ...(subjectDn ? { subjectDn } : {}), ...(subjectAltName ? { subjectAltName } : {}) },
    };
}
