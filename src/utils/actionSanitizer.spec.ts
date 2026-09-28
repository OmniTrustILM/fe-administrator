import { describe, expect, test } from 'vitest';
import { AjaxError } from 'rxjs/ajax';
import { MASKED, sanitizeAction } from './actionSanitizer';

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
