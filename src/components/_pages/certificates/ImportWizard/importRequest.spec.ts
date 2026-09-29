import { describe, expect, test } from 'vitest';
import { InspectedEntryKind, KeyAlgorithm, type InspectedEntryDto } from 'types/openapi';
import {
    buildImportRequest,
    defaultKeyName,
    entryTitle,
    hasCertificate,
    importableCodes,
    isSelectable,
    isSupported,
    kindLabel,
    supportedKeys,
    unselectableReason,
} from './importRequest';

const keyPair: InspectedEntryDto = {
    entryReference: 'a'.repeat(64),
    kind: InspectedEntryKind.KeyPairWithChain,
    keyAlgorithm: KeyAlgorithm.Rsa,
    alias: 'web-server-01',
    subjectDn: 'CN=web-server-01.example.com, O=Example',
};
const ecKey: InspectedEntryDto = { entryReference: 'b'.repeat(64), kind: InspectedEntryKind.PrivateKey, keyAlgorithm: KeyAlgorithm.Ecdsa };
const certificate: InspectedEntryDto = {
    entryReference: 'c'.repeat(64),
    kind: InspectedEntryKind.Certificate,
    subjectDn: 'O=Example, CN=Root CA',
};
const request: InspectedEntryDto = { entryReference: 'd'.repeat(64), kind: InspectedEntryKind.SigningRequest };

describe('importRequest', () => {
    test('importableCodes names each selected key once', () => {
        expect(importableCodes([keyPair, ecKey, certificate, keyPair])).toEqual(['keyPair:RSA', 'keyPair:ECDSA']);
    });
    test('a signing request, an unknown algorithm and a refused entry cannot be selected', () => {
        expect(isSelectable(request)).toBe(false);
        expect(isSelectable({ ...ecKey, keyAlgorithm: KeyAlgorithm.Unknown })).toBe(false);
        expect(isSelectable({ ...keyPair, importable: false })).toBe(false);
        expect(isSelectable(certificate)).toBe(true);
    });
    test('supports an entry the token profile refused, but not one the platform cannot import', () => {
        expect(isSupported({ ...keyPair, importable: false })).toBe(true);
        expect(isSupported(certificate)).toBe(true);
        expect(isSupported(request)).toBe(false);
        expect(isSupported({ ...ecKey, keyAlgorithm: KeyAlgorithm.Unknown })).toBe(false);
    });
    test('says why an entry cannot be selected, the platform before the token profile', () => {
        expect(unselectableReason(request)).toBe('Certificate requests are not imported');
        expect(unselectableReason({ ...ecKey, keyAlgorithm: KeyAlgorithm.Unknown })).toBe(
            "The platform does not support this key's algorithm",
        );
        expect(unselectableReason({ ...ecKey, keyAlgorithm: undefined })).toBe("The platform does not support this key's algorithm");
        expect(unselectableReason({ ...ecKey, keyAlgorithm: KeyAlgorithm.Unknown, importable: false })).toBe(
            "The platform does not support this key's algorithm",
        );
        expect(unselectableReason({ ...keyPair, importable: false, notImportableReason: 'The provider holds no RSA keys.' })).toBe(
            'The provider holds no RSA keys.',
        );
        expect(unselectableReason({ ...keyPair, importable: false })).toBe('Not supported by the chosen token profile');
        expect(unselectableReason({ ...keyPair, importable: true })).toBeUndefined();
        expect(unselectableReason(certificate)).toBeUndefined();
    });
    test('refuses an entry carrying key material without the key import permission, but not a certificate', () => {
        const refusal = 'Importing keys needs the key import permission.';
        expect(unselectableReason(keyPair, false)).toBe(refusal);
        expect(unselectableReason(ecKey, false)).toBe(refusal);
        expect(isSelectable(keyPair, false)).toBe(false);
        expect(unselectableReason(certificate, false)).toBeUndefined();
        expect(isSelectable(certificate, false)).toBe(true);
    });
    test('says the key import permission is missing after the platform and before the token profile', () => {
        expect(unselectableReason({ ...ecKey, keyAlgorithm: KeyAlgorithm.Unknown }, false)).toBe(
            "The platform does not support this key's algorithm",
        );
        expect(unselectableReason({ ...keyPair, importable: false }, false)).toBe('Importing keys needs the key import permission.');
    });
    test('lists the keys the platform supports, whatever the token profile answered', () => {
        const refused = { ...keyPair, importable: false };
        expect(supportedKeys([refused, { ...ecKey, keyAlgorithm: KeyAlgorithm.Unknown }, certificate, request, ecKey])).toEqual([
            refused,
            ecKey,
        ]);
    });
    test('tells the entries that carry a certificate', () => {
        expect([keyPair, certificate, ecKey, request].map(hasCertificate)).toEqual([true, true, false, false]);
    });
    test('labels each kind', () => {
        expect(Object.values(InspectedEntryKind).map(kindLabel)).toEqual([
            'Key pair',
            'Certificate',
            'Private key',
            'Secret key',
            'Signing request',
        ]);
    });
    test('names an entry by its alias, then its common name, then its kind', () => {
        expect(entryTitle(keyPair)).toBe('web-server-01');
        expect(entryTitle(certificate)).toBe('Root CA');
        expect(entryTitle(ecKey)).toBe('Private key');
        expect(entryTitle(request)).toBe('Signing request');
        expect(defaultKeyName({ ...keyPair, alias: undefined })).toBe('web-server-01.example.com');
        expect(defaultKeyName(ecKey)).toBe('');
    });
    test.each([
        ['CN=Doe, John, O=Example', 'Doe, John'],
        ['O=Example, CN=web.example.com', 'web.example.com'],
        ['CN=a+UID=b, O=Example', 'a'],
        ['UID=b+CN=a, O=Example', 'a'],
        ['CN=Say "hello", O=Example', 'Say "hello"'],
        ['O=Example', ''],
        ['CN=  , O=Example', ''],
    ])("reads the common name of %s, as Core writes a DN, as '%s'", (subjectDn, name) => {
        expect(defaultKeyName({ entryReference: 'e'.repeat(64), kind: InspectedEntryKind.Certificate, subjectDn })).toBe(name);
    });
    test("keeps an entry's importId while its terms are unchanged, and gives it a new one once they change", () => {
        const importIds: Record<string, string> = {};
        const importIdFor = (terms: string) => {
            importIds[terms] ??= crypto.randomUUID();
            return importIds[terms];
        };
        const destination = { tokenProfileUuid: 'tp', exportable: false, keyNames: { [keyPair.entryReference]: 'web-01' } };
        const input = { file: 'ZmlsZQ==', selected: [keyPair, certificate], importIdFor, destination };
        const importIdsOf = (request: ReturnType<typeof buildImportRequest>) => request.entries.map((entry) => entry.importId);

        const first = importIdsOf(buildImportRequest(input));
        const retry = importIdsOf(buildImportRequest(input));
        const renamed = importIdsOf(
            buildImportRequest({ ...input, destination: { ...destination, keyNames: { [keyPair.entryReference]: 'web-02' } } }),
        );
        const withCustomAttributes = importIdsOf(buildImportRequest({ ...input, customAttributes: [{ name: 'department' } as never] }));

        expect(retry).toEqual(first);
        expect(renamed[0]).not.toBe(first[0]);
        expect(renamed[1]).toBe(first[1]);
        expect(withCustomAttributes[0]).not.toBe(first[0]);
        expect(withCustomAttributes[1]).not.toBe(first[1]);
        expect(new Set([...first, ...renamed, ...withCustomAttributes]).size).toBe(5);
    });
    test('gives only key entries a destination, not exportable by default, and sends an empty name as absent', () => {
        const request = buildImportRequest({
            file: 'ZmlsZQ==',
            selected: [keyPair, certificate],
            importIdFor: () => crypto.randomUUID(),
            destination: { tokenProfileUuid: 'tp', exportable: false, keyNames: { [keyPair.entryReference]: '' } },
        });
        expect(request.entries[0].keyDestination).toEqual({
            tokenProfileUuid: 'tp',
            exportable: false,
            keyName: undefined,
            importAttributes: undefined,
        });
        expect(request.entries[1].keyDestination).toBeUndefined();
    });
});
