import type { BadgeColor } from 'components/Badge';
import { PqcVerdict } from 'types/openapi';

export const PQC_READINESS_TAB = 'pqc-readiness';

export function cryptoAssetDetailPath(uuid: string, tab?: string): string {
    const path = `/cryptoassets/detail/${uuid}`;
    return tab ? `${path}?tab=${tab}` : path;
}

// `unknown` is amber, not neutral: the rule set could not classify the asset, which is a call to fix the producer's data.
// A verdict this build does not know takes the same amber, so a value core adds later never reads as settled.
export function getPqcVerdictBadgeColor(verdict: PqcVerdict): BadgeColor {
    switch (verdict) {
        case PqcVerdict.Ready:
            return 'success';

        case PqcVerdict.NotReady:
            return 'danger';

        case PqcVerdict.NotApplicable:
            return 'secondary';

        default:
            return 'warning';
    }
}

// The `-solid` tokens are indicator colours: safe for a dot, not for text, so the badge body never wears them.
export function getPqcVerdictDotClass(verdict: PqcVerdict): string {
    switch (verdict) {
        case PqcVerdict.Ready:
            return 'bg-success-solid';

        case PqcVerdict.NotReady:
            return 'bg-danger-solid';

        case PqcVerdict.NotApplicable:
            return 'bg-outline';

        default:
            return 'bg-warning-solid';
    }
}

export type PayloadDifferenceKind = 'changed' | 'notRecorded' | 'onlyInSource';

export type PayloadDifference = {
    path: string;
    kind: PayloadDifferenceKind;
};

type JsonObject = Record<string, unknown>;

const isJsonObject = (value: unknown): value is JsonObject => typeof value === 'object' && value !== null && !Array.isArray(value);

// Dotted paths from the payload root; arrays compare whole, because producers do not key their entries.
export function diffPayloads(elected: unknown, source: unknown, path = ''): PayloadDifference[] {
    // One difference for the whole array, but its entries still compare by keys, not by the order a producer wrote them.
    if (Array.isArray(elected) && Array.isArray(source)) {
        const same = elected.length === source.length && elected.every((entry, index) => diffPayloads(entry, source[index]).length === 0);
        return same ? [] : [{ path, kind: 'changed' }];
    }
    if (isJsonObject(elected) && isJsonObject(source)) {
        const keys = [...new Set([...Object.keys(elected), ...Object.keys(source)])].sort((a, b) => a.localeCompare(b));
        return keys.flatMap((key): PayloadDifference[] => {
            const childPath = path ? `${path}.${key}` : key;
            if (!(key in source)) return [{ path: childPath, kind: 'notRecorded' }];
            if (!(key in elected)) return [{ path: childPath, kind: 'onlyInSource' }];
            return diffPayloads(elected[key], source[key], childPath);
        });
    }
    return JSON.stringify(elected) === JSON.stringify(source) ? [] : [{ path, kind: 'changed' }];
}

// The elected payload is one source's payload served verbatim, so the electing source is the one it equals.
export function isSamePayload(elected: unknown, source: unknown): boolean {
    return diffPayloads(elected, source).length === 0;
}

// What a source recorded about where it found the asset: nothing, all of it, or the sample Core kept of a larger total.
export function describeLocationCoverage(shown: number, total: number): string {
    if (total <= 0) return 'none recorded';
    if (shown >= total) return total.toLocaleString();
    return `${shown.toLocaleString()} of ${total.toLocaleString()}`;
}

const FIELD_LABELS = new Map<string, string>([
    ['assetType', 'Asset type'],
    ['algorithmFamily', 'Algorithm family'],
    ['primitive', 'Primitive'],
    ['parameterSet', 'Parameter set'],
    ['curve', 'Elliptic curve'],
    ['mode', 'Mode'],
    ['padding', 'Padding'],
    ['variant', 'Variant'],
    ['name', 'Name'],
    ['hybridComponents', 'Hybrid components'],
    ['materialType', 'Material type'],
    ['materialSize', 'Material size'],
    ['nistQuantumSecurityLevel', 'NIST quantum security level'],
    ['subjectPublicKeyRef', 'Subject public key reference'],
    ['signatureAlgorithmRef', 'Signature algorithm reference'],
    ['cipherSuites', 'Cipher suites'],
    ['cipherSuiteAlgorithmRefs', 'Cipher suite algorithm references'],
    ['unresolvedRefs', 'Unresolved references'],
    ['cipherSuite', 'Cipher suite'],
    ['cipherSuiteAlgorithmRef', 'Cipher suite algorithm reference'],
    ['referencedRuleId', 'Rule of the referenced asset'],
]);

// Core serves raw property keys, so a key it adds later shows under its own name until it is labelled here.
export function getCryptoAssetFieldLabel(key: string): string {
    return FIELD_LABELS.get(key) ?? key;
}

// Undefined for a value with nothing to show, so the caller paints its own empty marker.
export function formatPqcFieldValue(value: unknown): string | undefined {
    if (Array.isArray(value)) {
        const items = value.map(formatPqcFieldValue).filter((item) => item !== undefined);
        return items.length === 0 ? 'none' : items.join(', ');
    }
    if (typeof value === 'string') return value || undefined;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value === null || value === undefined) return undefined;
    return JSON.stringify(value);
}
