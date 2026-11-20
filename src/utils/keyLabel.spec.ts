import { describe, expect, it } from 'vitest';

import { KeyAlgorithm } from 'types/openapi';
import { keyLabel, parameterSetAndSize } from './keyLabel';

const algorithmCode = (algorithm: KeyAlgorithm) => algorithm;

describe('keyLabel', () => {
    it.each([
        ['an RSA key by its size', { algorithm: KeyAlgorithm.Rsa, length: 2048 }, 'RSA 2048'],
        ['an ECDSA key by its curve', { algorithm: KeyAlgorithm.Ecdsa, parameterSet: 'P-384', length: 384 }, 'ECDSA P-384'],
        [
            'a Brainpool curve after its algorithm',
            { algorithm: KeyAlgorithm.Ecdsa, parameterSet: 'brainpoolP256r1' },
            'ECDSA brainpoolP256r1',
        ],
        [
            'an ML-DSA key by its parameter set alone',
            { algorithm: KeyAlgorithm.MlDsa, parameterSet: 'ML-DSA-65', length: 15616 },
            'ML-DSA-65',
        ],
        [
            'an SLH-DSA key by its parameter set alone',
            { algorithm: KeyAlgorithm.SlhDsa, parameterSet: 'SLH-DSA-SHA2-128S' },
            'SLH-DSA-SHA2-128S',
        ],
        ['an ML-KEM key by its parameter set alone', { algorithm: KeyAlgorithm.MlKem, parameterSet: 'ML-KEM-768' }, 'ML-KEM-768'],
        ['a Falcon key by its parameter set alone', { algorithm: KeyAlgorithm.Falcon, parameterSet: 'FALCON-512' }, 'FALCON-512'],
        ['an AES key by its size', { algorithm: KeyAlgorithm.Aes, length: 256 }, 'AES 256'],
        ['an ECDSA key on an unnamed curve by its size', { algorithm: KeyAlgorithm.Ecdsa, length: 320 }, 'ECDSA 320'],
        ['an unknown algorithm by its size', { algorithm: KeyAlgorithm.Unknown, length: 256 }, 'Unknown 256'],
        ['an unsized key by its algorithm alone', { algorithm: KeyAlgorithm.MlDsa }, 'ML-DSA'],
        ['a key with a null size by its algorithm alone', { algorithm: KeyAlgorithm.Rsa, length: null }, 'RSA'],
        [
            'a key with a null parameter set by its algorithm and size',
            { algorithm: KeyAlgorithm.Rsa, parameterSet: null, length: 3072 },
            'RSA 3072',
        ],
        ['a key with only a size as an empty label', { length: 2048 }, ''],
    ])('names %s', (_case, key, expected) => {
        // when
        const label = keyLabel(key, algorithmCode);

        // then
        expect(label).toBe(expected);
    });

    it('names the algorithm by the given label and tests the parameter set against its code', () => {
        // given
        const spelledOut = (algorithm: KeyAlgorithm) => (algorithm === KeyAlgorithm.MlDsa ? 'Module-Lattice DSA' : algorithm);

        // when
        const pqc = keyLabel({ algorithm: KeyAlgorithm.MlDsa, parameterSet: 'ML-DSA-44' }, spelledOut);
        const unnamed = keyLabel({ algorithm: KeyAlgorithm.MlDsa, length: 10496 }, spelledOut);

        // then
        expect(pqc).toBe('ML-DSA-44');
        expect(unnamed).toBe('Module-Lattice DSA 10496');
    });
});

describe('parameterSetAndSize', () => {
    it.each([
        ['an ECDSA key by its curve and size', { parameterSet: 'P-256', length: 256 }, 'P-256 · 256 bits'],
        ['an RSA key by its size alone', { length: 2048 }, '2048 bits'],
        ['an unsized key by its parameter set alone', { parameterSet: 'ML-DSA-65', length: null }, 'ML-DSA-65'],
        ['a key with neither as an empty text', { parameterSet: null }, ''],
    ])('names %s', (_case, key, expected) => {
        // when
        const text = parameterSetAndSize(key);

        // then
        expect(text).toBe(expected);
    });
});
