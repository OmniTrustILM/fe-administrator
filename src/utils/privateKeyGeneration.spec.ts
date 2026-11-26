import { describe, expect, test } from 'vitest';
import { base64ToUtf8 } from './common-utils';
import { generatePrivateKeyPem, KEY_ALGORITHMS, toPrivateKeySecretContent } from './privateKeyGeneration';

const toDer = (pem: string): ArrayBuffer => {
    const body = pem.replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\s+/g, '');
    return new Uint8Array(Buffer.from(body, 'base64')).buffer;
};

describe('generatePrivateKeyPem', () => {
    test('generatesEcP256Pkcs8Pem', async () => {
        const pem = await generatePrivateKeyPem('EC_P256');

        expect(pem.startsWith('-----BEGIN PRIVATE KEY-----\n')).toBe(true);
        expect(pem.trimEnd().endsWith('-----END PRIVATE KEY-----')).toBe(true);

        const key = await globalThis.crypto.subtle.importKey('pkcs8', toDer(pem), { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
        expect((key.algorithm as EcKeyAlgorithm).namedCurve).toBe('P-256');
    });

    test('generatesRsa2048', async () => {
        const pem = await generatePrivateKeyPem('RSA_2048');

        const key = await globalThis.crypto.subtle.importKey('pkcs8', toDer(pem), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, true, [
            'sign',
        ]);
        expect((key.algorithm as RsaHashedKeyAlgorithm).modulusLength).toBe(2048);
    });

    test('wrapsBase64At64Chars', async () => {
        const pem = await generatePrivateKeyPem('EC_P256');
        const lines = pem.trimEnd().split('\n');
        const body = lines.slice(1, -1);

        expect(body.length).toBeGreaterThan(0);
        for (const line of body.slice(0, -1)) {
            expect(line).toHaveLength(64);
        }
        expect(body[body.length - 1].length).toBeLessThanOrEqual(64);
    });
});

describe('toPrivateKeySecretContent', () => {
    test('encodesPemAsBase64Content', () => {
        const pem = '-----BEGIN PRIVATE KEY-----\nQUJD\n-----END PRIVATE KEY-----\n';

        expect(base64ToUtf8(toPrivateKeySecretContent(pem))).toBe(pem);
    });
});

describe('KEY_ALGORITHMS', () => {
    test('lists EC P-256 first', () => {
        expect(KEY_ALGORITHMS[0]).toEqual({ value: 'EC_P256', label: 'EC P-256' });
        expect(KEY_ALGORITHMS.map((a) => a.label)).toEqual(['EC P-256', 'EC P-384', 'RSA 2048', 'RSA 3072', 'RSA 4096']);
    });
});
