import { deepEqual } from 'utils/deep-equal';
import {
    AcmeIdentifierAuthorizationMode,
    AcmeIdentifierMatchType,
    AcmeIdentifierType,
    type AcmePreauthorizedIdentifierDto,
} from 'types/openapi';

// These checks mirror core's AcmeIdentifierPolicy, which refuses an entry that could never match anything.

const WILDCARD_PREFIX = '*.';
const LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const HEXTET = /^[0-9a-fA-F]{1,4}$/;
const MAX_NAME_LENGTH = 253;
const MAX_ADDRESS_LENGTH = 45;
const IPV6_BYTES = 16;

export const IDENTIFIER_TYPE_LABELS: Record<AcmeIdentifierType, string> = {
    [AcmeIdentifierType.Dns]: 'DNS name',
    [AcmeIdentifierType.Ip]: 'IP address',
};

export const MATCH_TYPE_HELP =
    'Exact covers that name only. Subdomain covers every name below it at any depth but not the name itself, so covering example.com and its subdomains takes two entries. An IP address is always matched exactly.';

export const WILDCARD_HELP = 'Wildcard also pre-authorizes *.name for a subdomain entry; an exact entry never covers a wildcard.';

export const MODE_DESCRIPTIONS: Record<AcmeIdentifierAuthorizationMode, string> = {
    [AcmeIdentifierAuthorizationMode.PreauthorizedOrChallenge]:
        'Identifiers the list does not cover go through the usual http-01 or dns-01 challenge.',
    [AcmeIdentifierAuthorizationMode.PreauthorizedOnly]: 'Orders for identifiers the list does not cover are refused.',
};

export const PREAUTHORIZED_ONLY_NEEDS_ENTRY =
    'Pre-authorized only needs at least one identifier. To stop the profile accepting orders, disable new orders instead.';

export function newPreauthorizedIdentifier(): AcmePreauthorizedIdentifierDto {
    return { type: AcmeIdentifierType.Dns, value: '', matchType: AcmeIdentifierMatchType.Exact, allowWildcard: false };
}

function isAscii(value: string): boolean {
    return [...value].every((char) => char.charCodeAt(0) <= 0x7f);
}

export function isDnsName(value: string): boolean {
    if (!isAscii(value)) return false;
    const lower = value.toLowerCase();
    const name = lower.endsWith('.') ? lower.slice(0, -1) : lower;
    if (name.length === 0 || name.length > MAX_NAME_LENGTH) return false;
    return name.split('.').every((label) => LABEL.test(label));
}

function isIpv4(value: string): boolean {
    const match = IPV4.exec(value);
    // Refused rather than interpreted: a leading zero reads as octal to some parsers and decimal to others.
    return !!match && match.slice(1).every((octet) => !(octet.length > 1 && octet.startsWith('0')) && Number(octet) <= 255);
}

function hextetBytes(text: string, quadAllowed: boolean): number | undefined {
    if (text === '') return 0;
    const parts = text.split(':');
    let bytes = 0;
    for (const [index, part] of parts.entries()) {
        if (part.includes('.')) {
            if (!quadAllowed || index !== parts.length - 1 || !isIpv4(part)) return undefined;
            bytes += 4;
        } else if (HEXTET.test(part)) {
            bytes += 2;
        } else {
            return undefined;
        }
    }
    return bytes > IPV6_BYTES ? undefined : bytes;
}

export function isIpAddress(value: string): boolean {
    if (value.length > MAX_ADDRESS_LENGTH) return false;
    if (!value.includes(':')) return isIpv4(value);
    if (value.includes('%') || value.indexOf('::') !== value.lastIndexOf('::')) return false;
    const compression = value.indexOf('::');
    if (compression < 0) return hextetBytes(value, true) === IPV6_BYTES;
    const head = hextetBytes(value.slice(0, compression), false);
    const tail = hextetBytes(value.slice(compression + 2), true);
    // The elision must stand for at least one group, or the address would be writable without it.
    return head !== undefined && tail !== undefined && head + tail < IPV6_BYTES;
}

export function entryProblem(entry: AcmePreauthorizedIdentifierDto): string | undefined {
    const value = entry.value.trim();
    if (value === '') return 'Enter a value';
    if (entry.type === AcmeIdentifierType.Ip) {
        return isIpAddress(value) ? undefined : 'Not a valid IPv4 or IPv6 address';
    }
    if (value.startsWith(WILDCARD_PREFIX)) return "Enter the name without '*.' and allow wildcards on a subdomain entry instead";
    return isDnsName(value) ? undefined : 'Not a valid DNS name';
}

// Holds the entry to what core can act on: an address is matched exactly, and only a subdomain entry covers wildcards.
export function normalizeEntry(entry: AcmePreauthorizedIdentifierDto): AcmePreauthorizedIdentifierDto {
    const isIp = entry.type === AcmeIdentifierType.Ip;
    const matchType = isIp ? AcmeIdentifierMatchType.Exact : entry.matchType;
    return {
        type: entry.type,
        value: entry.value.trim(),
        matchType,
        allowWildcard: matchType === AcmeIdentifierMatchType.Subdomain && !!entry.allowWildcard,
    };
}

export function samePolicy(
    a: readonly AcmePreauthorizedIdentifierDto[] | undefined,
    b: readonly AcmePreauthorizedIdentifierDto[] | undefined,
): boolean {
    return deepEqual((a ?? []).map(normalizeEntry), (b ?? []).map(normalizeEntry));
}

export function effectiveMode(mode: AcmeIdentifierAuthorizationMode | undefined): AcmeIdentifierAuthorizationMode {
    return mode ?? AcmeIdentifierAuthorizationMode.PreauthorizedOrChallenge;
}

export type IdentifierPolicyFormValues = {
    preauthorizedIdentifiers: AcmePreauthorizedIdentifierDto[];
    identifierAuthorizationMode: AcmeIdentifierAuthorizationMode;
};

// Seeds the form from a profile, or with the defaults on create. Normalizing here keeps an optional key the server
// omits from making an untouched form compare as changed.
export function policyFormValues(profile: Partial<IdentifierPolicyFormValues> | undefined): IdentifierPolicyFormValues {
    return {
        preauthorizedIdentifiers: (profile?.preauthorizedIdentifiers ?? []).map(normalizeEntry),
        identifierAuthorizationMode: effectiveMode(profile?.identifierAuthorizationMode),
    };
}

type PolicyRequest = {
    preauthorizedIdentifiers?: AcmePreauthorizedIdentifierDto[];
    identifierAuthorizationMode?: AcmeIdentifierAuthorizationMode;
};

// Omitting either field keeps what the profile has, so each is sent only when the operator changed it.
export function policyRequestFields(
    values: IdentifierPolicyFormValues,
    current: Partial<IdentifierPolicyFormValues> | undefined,
): PolicyRequest {
    const request: PolicyRequest = {};
    if (!samePolicy(values.preauthorizedIdentifiers, current?.preauthorizedIdentifiers)) {
        request.preauthorizedIdentifiers = values.preauthorizedIdentifiers.map(normalizeEntry);
    }
    if (values.identifierAuthorizationMode !== effectiveMode(current?.identifierAuthorizationMode)) {
        request.identifierAuthorizationMode = values.identifierAuthorizationMode;
    }
    return request;
}
