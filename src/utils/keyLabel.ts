import type { KeyAlgorithm } from 'types/openapi';

type KeyDescription = Readonly<{ algorithm?: KeyAlgorithm; parameterSet?: string | null; length?: number | null }>;

/**
 * A key's parameter set after its algorithm, as "ECDSA P-384", else its algorithm and size, as "RSA 2048".
 * A parameter set that begins with the algorithm's code, as "ML-DSA-65" does, stands alone.
 */
export function keyLabel(key: KeyDescription, algorithmLabel: (algorithm: KeyAlgorithm) => string): string {
    if (key.algorithm === undefined) return '';
    if (key.parameterSet?.startsWith(key.algorithm)) return key.parameterSet;
    const algorithmName = algorithmLabel(key.algorithm);
    if (key.parameterSet) return `${algorithmName} ${key.parameterSet}`;
    return key.length == null ? algorithmName : `${algorithmName} ${key.length}`;
}

/** A key's parameter set and size, as "P-256 · 256 bits", for a view that names the algorithm on its own. */
export function parameterSetAndSize(key: Pick<KeyDescription, 'parameterSet' | 'length'>): string {
    const size = key.length == null ? undefined : `${key.length} bits`;
    return [key.parameterSet, size].filter(Boolean).join(' · ');
}
