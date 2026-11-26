import { utf8ToBase64 } from './common-utils';

export type KeyAlgorithm = 'EC_P256' | 'EC_P384' | 'RSA_2048' | 'RSA_3072' | 'RSA_4096';

export const KEY_ALGORITHMS: ReadonlyArray<{ value: KeyAlgorithm; label: string }> = [
    { value: 'EC_P256', label: 'EC P-256' },
    { value: 'EC_P384', label: 'EC P-384' },
    { value: 'RSA_2048', label: 'RSA 2048' },
    { value: 'RSA_3072', label: 'RSA 3072' },
    { value: 'RSA_4096', label: 'RSA 4096' },
];

const PEM_LINE_LENGTH = 64;

const keyGenParams = (alg: KeyAlgorithm): EcKeyGenParams | RsaHashedKeyGenParams => {
    switch (alg) {
        case 'EC_P256':
            return { name: 'ECDSA', namedCurve: 'P-256' };
        case 'EC_P384':
            return { name: 'ECDSA', namedCurve: 'P-384' };
        case 'RSA_2048':
            return rsaParams(2048);
        case 'RSA_3072':
            return rsaParams(3072);
        case 'RSA_4096':
            return rsaParams(4096);
    }
};

const rsaParams = (modulusLength: number): RsaHashedKeyGenParams => ({
    name: 'RSASSA-PKCS1-v1_5',
    modulusLength,
    publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
    hash: 'SHA-256',
});

const bytesToBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    for (const byte of bytes) {
        binary += String.fromCodePoint(byte);
    }
    return btoa(binary);
};

export async function generatePrivateKeyPem(alg: KeyAlgorithm, subtle: SubtleCrypto = globalThis.crypto.subtle): Promise<string> {
    const keyPair = await subtle.generateKey(keyGenParams(alg), true, ['sign', 'verify']);
    const pkcs8 = await subtle.exportKey('pkcs8', keyPair.privateKey);
    const base64 = bytesToBase64(new Uint8Array(pkcs8));
    const lines: string[] = [];
    for (let i = 0; i < base64.length; i += PEM_LINE_LENGTH) {
        lines.push(base64.slice(i, i + PEM_LINE_LENGTH));
    }

    return `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----\n`;
}

export function toPrivateKeySecretContent(pem: string): string {
    return utf8ToBase64(pem);
}
