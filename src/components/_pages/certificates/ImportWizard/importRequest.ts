import {
    InspectedEntryKind,
    KeyAlgorithm,
    KeyRequestType,
    type CertificateImportRequestDto,
    type InspectedEntryDto,
    type RequestAttribute,
} from 'types/openapi';

const KEY_REQUEST_TYPES: Partial<Record<InspectedEntryKind, KeyRequestType>> = {
    [InspectedEntryKind.KeyPairWithChain]: KeyRequestType.KeyPair,
    [InspectedEntryKind.PrivateKey]: KeyRequestType.KeyPair,
    [InspectedEntryKind.SecretKey]: KeyRequestType.Secret,
};

const KIND_LABELS: Record<InspectedEntryKind, string> = {
    [InspectedEntryKind.KeyPairWithChain]: 'Key pair',
    [InspectedEntryKind.Certificate]: 'Certificate',
    [InspectedEntryKind.PrivateKey]: 'Private key',
    [InspectedEntryKind.SecretKey]: 'Secret key',
    [InspectedEntryKind.SigningRequest]: 'Signing request',
};

export function kindLabel(kind: InspectedEntryKind): string {
    return KIND_LABELS[kind];
}

export function keyRequestTypeOf(entry: InspectedEntryDto): KeyRequestType | undefined {
    return KEY_REQUEST_TYPES[entry.kind];
}

export function hasCertificate(entry: InspectedEntryDto): boolean {
    return entry.kind === InspectedEntryKind.Certificate || entry.kind === InspectedEntryKind.KeyPairWithChain;
}

/** Why the platform cannot import the entry, whatever a token profile answers for it. */
function unsupportedReason(entry: InspectedEntryDto): string | undefined {
    if (entry.kind === InspectedEntryKind.SigningRequest) return 'Certificate requests are not imported';
    if (keyRequestTypeOf(entry) && (!entry.keyAlgorithm || entry.keyAlgorithm === KeyAlgorithm.Unknown)) {
        return "The platform does not support this key's algorithm";
    }
    return undefined;
}

/** Whether the platform can import the entry, whatever a token profile answers for it. */
export function isSupported(entry: InspectedEntryDto): boolean {
    return !unsupportedReason(entry);
}

export function unselectableReason(entry: InspectedEntryDto, mayImportKeys = true): string | undefined {
    const unsupported = unsupportedReason(entry);
    if (unsupported) return unsupported;
    if (keyRequestTypeOf(entry) && !mayImportKeys) return 'Importing keys needs the key import permission.';
    if (entry.importable !== false) return undefined;
    return entry.notImportableReason ?? 'Not supported by the chosen token profile';
}

export function isSelectable(entry: InspectedEntryDto, mayImportKeys = true): boolean {
    return !unselectableReason(entry, mayImportKeys);
}

/** The key entries the platform can import, including those the chosen token profile refused. */
export function supportedKeys(entries: InspectedEntryDto[]): InspectedEntryDto[] {
    return entries.filter((entry) => keyRequestTypeOf(entry) && isSupported(entry));
}

// Core writes a DN unescaped, its RDNs joined by ", " and a multi-valued RDN's parts by "+", so a new part starts only
// where an attribute type follows: a value can hold a comma.
const DN_PART_SEPARATOR = /(?:, |\+)(?=[\w.-]+=)/;

function commonName(dn: string | undefined): string | undefined {
    return (
        dn
            ?.split(DN_PART_SEPARATOR)
            .find((part) => part.slice(0, 3).toUpperCase() === 'CN=')
            ?.slice(3)
            .trim() || undefined
    );
}

export function defaultKeyName(entry: InspectedEntryDto): string {
    return entry.alias ?? commonName(entry.subjectDn) ?? '';
}

export function entryTitle(entry: InspectedEntryDto): string {
    return defaultKeyName(entry) || kindLabel(entry.kind);
}

export function importableCodes(entries: InspectedEntryDto[]): string[] {
    const codes = entries.flatMap((entry) => {
        const type = keyRequestTypeOf(entry);
        return type && entry.keyAlgorithm ? [`${type}:${entry.keyAlgorithm}`] : [];
    });
    return [...new Set(codes)];
}

export type ImportDestination = {
    tokenProfileUuid: string;
    exportable: boolean;
    keyNames: Record<string, string>;
    importAttributes?: RequestAttribute[];
    customAttributes?: RequestAttribute[];
};

export type ImportRequestInput = {
    file: string;
    passphrase?: string;
    selected: InspectedEntryDto[];
    /**
     * The importId for an entry's terms, as Core's import digest reads them: the entry, where its key goes and the
     * custom attributes its certificates get. The same terms keep their importId; Core refuses one again with others.
     */
    importIdFor: (terms: string) => string;
    destination?: ImportDestination;
    customAttributes?: RequestAttribute[];
};

export function buildImportRequest(input: ImportRequestInput): CertificateImportRequestDto {
    const { destination, customAttributes } = input;
    return {
        file: input.file,
        passphrase: input.passphrase || undefined,
        customAttributes,
        entries: input.selected.map((entry) => {
            const keyDestination =
                keyRequestTypeOf(entry) && destination
                    ? {
                          tokenProfileUuid: destination.tokenProfileUuid,
                          keyName: destination.keyNames[entry.entryReference] || undefined,
                          exportable: destination.exportable,
                          importAttributes: destination.importAttributes,
                          customAttributes: destination.customAttributes,
                      }
                    : undefined;
            const terms = JSON.stringify([entry.entryReference, keyDestination, customAttributes]);
            return { entryReference: entry.entryReference, importId: input.importIdFor(terms), keyDestination };
        }),
    };
}
