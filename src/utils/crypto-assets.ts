import type { BadgeColor } from 'components/Badge';
import { PqcVerdict } from 'types/openapi';

// `unknown` is amber, not neutral: the rule set could not classify the asset, which is a call to fix the producer's data.
export function getPqcVerdictBadgeColor(verdict: PqcVerdict): BadgeColor {
    switch (verdict) {
        case PqcVerdict.Ready:
            return 'success';

        case PqcVerdict.NotReady:
            return 'danger';

        case PqcVerdict.Unknown:
            return 'warning';

        default:
            return 'secondary';
    }
}

// The `-solid` tokens are indicator colours: safe for a dot, not for text, so the badge body never wears them.
export function getPqcVerdictDotClass(verdict: PqcVerdict): string {
    switch (verdict) {
        case PqcVerdict.Ready:
            return 'bg-success-solid';

        case PqcVerdict.NotReady:
            return 'bg-danger-solid';

        case PqcVerdict.Unknown:
            return 'bg-warning-solid';

        default:
            return 'bg-outline';
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

export function describeEvidenceCoverage(shown: number, total: number): string {
    if (total <= 0) return 'none recorded';
    if (shown >= total) return `all ${total.toLocaleString()}`;
    return `${shown.toLocaleString()} shown of ${total.toLocaleString()} recorded`;
}
