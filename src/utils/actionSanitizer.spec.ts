import { describe, expect, test } from 'vitest';
import { AjaxError } from 'rxjs/ajax';
import { AttributeContentType } from 'types/openapi';
import { MASKED, sanitizeAction } from './actionSanitizer';

const providerPin = {
    uuid: '6b1f2a3c-4d5e-4f60-8a7b-9c0d1e2f3a4b',
    name: 'providerPin',
    contentType: AttributeContentType.Secret,
    content: [{ data: { secret: '1234' } }],
};
const wrappingKey = {
    uuid: '0d9e8f7a-6b5c-4d3e-8f2a-1b0c9d8e7f6a',
    name: 'wrappingKey',
    contentType: AttributeContentType.File,
    content: [{ data: { content: 'a2V5IG1hdGVyaWFs', fileName: 'wrapping.key', mimeType: 'application/octet-stream' } }],
};
const withContentMasked = (attribute: object) => ({ ...attribute, content: MASKED });

describe('sanitizeAction', () => {
    test('masks passphrases and files wherever they are in a payload', () => {
        const action = {
            type: 'certificates/importCertificates',
            payload: {
                certificateImportRequestDto: {
                    file: 'ZmlsZQ==',
                    passphrase: 'correct horse battery',
                    entries: [{ entryReference: 'a'.repeat(64), keyDestination: { inputPassphrase: 'key password' } }],
                },
                form: { passphrase: 'correct horse battery', passphraseConfirmation: 'correct horse battery' },
            },
        };

        expect(sanitizeAction(action)).toEqual({
            type: 'certificates/importCertificates',
            payload: {
                certificateImportRequestDto: {
                    file: MASKED,
                    passphrase: MASKED,
                    entries: [{ entryReference: 'a'.repeat(64), keyDestination: { inputPassphrase: MASKED } }],
                },
                form: { passphrase: MASKED, passphraseConfirmation: MASKED },
            },
        });
        expect(action.payload.certificateImportRequestDto.passphrase).toBe('correct horse battery');
    });

    test('masks the content of a secret or a file attribute wherever it is in a payload, and keeps its other fields', () => {
        const exportAction = {
            type: 'cryptographicKeys/exportKey',
            payload: {
                uuid: 'key-1',
                keyItemUuid: 'item-1',
                keyExportRequestDto: { passphrase: 'correct horse battery', exportAttributes: [providerPin, wrappingKey] },
                fallbackName: 'key',
            },
        };
        const importAction = {
            type: 'certificates/importCertificates',
            payload: {
                certificateImportRequestDto: {
                    file: 'ZmlsZQ==',
                    entries: [
                        {
                            entryReference: 'a'.repeat(64),
                            keyDestination: { tokenProfileUuid: 'profile-1', importAttributes: [providerPin, wrappingKey] },
                        },
                    ],
                },
            },
        };

        expect(sanitizeAction(exportAction).payload).toEqual({
            uuid: 'key-1',
            keyItemUuid: 'item-1',
            keyExportRequestDto: { passphrase: MASKED, exportAttributes: [withContentMasked(providerPin), withContentMasked(wrappingKey)] },
            fallbackName: 'key',
        });
        expect(sanitizeAction(importAction).payload).toEqual({
            certificateImportRequestDto: {
                file: MASKED,
                entries: [
                    {
                        entryReference: 'a'.repeat(64),
                        keyDestination: {
                            tokenProfileUuid: 'profile-1',
                            importAttributes: [withContentMasked(providerPin), withContentMasked(wrappingKey)],
                        },
                    },
                ],
            },
        });
        expect(providerPin.content).toEqual([{ data: { secret: '1234' } }]);
    });

    test('leaves the content of an attribute of any other content type as it is', () => {
        const attributes = Object.values(AttributeContentType)
            .filter((contentType) => contentType !== AttributeContentType.Secret && contentType !== AttributeContentType.File)
            .map((contentType) => ({ name: contentType, contentType, content: [{ reference: 'kept', data: 'kept' }] }));
        const action = {
            type: 'cryptographicKeys/exportKey',
            payload: { uuid: 'key-1', keyItemUuid: 'item-1', keyExportRequestDto: { exportAttributes: attributes } },
        };

        expect(attributes.map((attribute) => attribute.contentType)).toContain(AttributeContentType.Credential);
        expect(sanitizeAction(action)).toEqual(action);
    });

    test("masks a secret's content wherever it is in a payload, and keeps the rest of its request", () => {
        const action = {
            type: 'secrets/createSecret',
            payload: {
                vaultUuid: 'vault-1',
                vaultProfileUuid: 'profile-1',
                request: { name: 'database', description: 'Primary', secret: { username: 'admin', password: 'correct horse battery' } },
            },
        };

        expect(sanitizeAction(action)).toEqual({
            type: 'secrets/createSecret',
            payload: {
                vaultUuid: 'vault-1',
                vaultProfileUuid: 'profile-1',
                request: { name: 'database', description: 'Primary', secret: MASKED },
            },
        });
    });

    test('masks the request body of an error, and keeps the rest of it', () => {
        const request = { url: '/api/v1/keys/key-1/items/item-1/export', method: 'POST', body: { passphrase: 'correct horse battery' } };
        const error = new AjaxError('ajax error 422', { status: 422, response: ['refused'] } as never, request as never);

        const sanitized = sanitizeAction({ type: 'appRedirect/fetchError', payload: { error, message: 'Failed to export the key' } });

        expect(sanitized.payload).toEqual({
            error: expect.objectContaining({ status: 422, response: ['refused'], request: { ...request, body: MASKED } }),
            message: 'Failed to export the key',
        });
        expect(error.request.body).toEqual({ passphrase: 'correct horse battery' });
    });

    test('leaves an action without a payload, and a payload with nothing to mask, as it is', () => {
        const withoutPayload = { type: 'inspections/resetInspection' };
        const withPayload = { type: 'certificates/listCertificates', payload: { itemsPerPage: 10, filters: [{ fieldIdentifier: 'CN' }] } };

        expect(sanitizeAction(withoutPayload)).toBe(withoutPayload);
        expect(sanitizeAction(withPayload)).toEqual(withPayload);
    });
});
