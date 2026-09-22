import Button from 'components/Button';
import type { TableHeader } from 'components/CustomTable';
import { getEnumLabel } from 'ducks/enums';
import { Copy } from 'lucide-react';
import type { ReactNode } from 'react';
import type { DiscoveryItemModel } from 'types/discoveries';
import type { EnumItemModel } from 'types/enums';
import { type DiscoveredKeyDto, Resource } from 'types/openapi';

type PlatformEnumMap = { [key: string]: EnumItemModel } | undefined;

/** The three enums a key row names by label; the platform's own words, never the wire code. */
export type KeyColumnEnums = Readonly<{ type: PlatformEnumMap; algorithm: PlatformEnumMap; format: PlatformEnumMap }>;

/** How much of a key blob a column shows before the copy button takes over. */
const PUBLIC_KEY_PREVIEW_LENGTH = 16;

/**
 * The key domain, in the words the inventory keys list already uses for the same values, so the two tables read
 * alike. Fingerprint gets the width: it is what correlates a key across runs, connectors and certificates, and so
 * the column an operator reads by eye.
 */
export const KEY_HEADERS: TableHeader[] = [
    { id: 'keyType', content: 'Type' },
    { id: 'keyAlgorithm', content: 'Algorithm' },
    { id: 'keyLength', content: 'Size', align: 'right' },
    { id: 'keyFormat', content: 'Format' },
    { id: 'keyFingerprint', content: 'Fingerprint', width: '20%' },
    { id: 'keyPublic', content: 'Public key' },
];

/**
 * The key payload of a staged item, or nothing. `resource` is the discriminator the contract puts on every payload,
 * and an item whose stored payload could no longer be decoded carries none at all — both cases leave the key
 * columns empty rather than the row unlisted.
 */
export function discoveredKey(item: Pick<DiscoveryItemModel, 'payload'>): DiscoveredKeyDto | undefined {
    return item.payload?.resource === Resource.Keys ? (item.payload as DiscoveredKeyDto) : undefined;
}

export function publicKeyPreview(publicKey: string): string {
    return publicKey.length > PUBLIC_KEY_PREVIEW_LENGTH ? `${publicKey.slice(0, PUBLIC_KEY_PREVIEW_LENGTH)}…` : publicKey;
}

/**
 * One cell per header in `KEY_HEADERS`. A PRIVATE_KEY, SECRET_KEY or SPLIT_KEY report omits both `publicKey` and
 * `publicKeyFormat` by contract — discovery never carries private key material — so those cells are empty by design.
 */
export function keyCells(
    item: Pick<DiscoveryItemModel, 'uuid' | 'payload'>,
    enums: KeyColumnEnums,
    onCopyPublicKey: (publicKey: string) => void,
): ReactNode[] {
    const key = discoveredKey(item);
    const label = (platformEnum: PlatformEnumMap, code: string | undefined) => (code ? getEnumLabel(platformEnum, code) : '');

    return [
        <span key="keyType" data-testid="key-type">
            {label(enums.type, key?.type)}
        </span>,
        <span key="keyAlgorithm" data-testid="key-algorithm">
            {label(enums.algorithm, key?.algorithm)}
        </span>,
        <span key="keyLength" data-testid="key-length" className="tabular-nums">
            {key?.length ?? ''}
        </span>,
        <span key="keyFormat" data-testid="key-format">
            {label(enums.format, key?.publicKeyFormat)}
        </span>,
        <span key="keyFingerprint" data-testid="key-fingerprint" className="break-all">
            {key?.fingerprint ?? ''}
        </span>,
        <span key="keyPublic" data-testid="key-public" className="whitespace-nowrap">
            {key?.publicKey ? (
                <>
                    <span className="font-mono">{publicKeyPreview(key.publicKey)}</span>
                    <Button
                        variant="transparent"
                        color="primary"
                        title="Copy public key"
                        className="p-1"
                        onClick={() => onCopyPublicKey(key.publicKey as string)}
                        data-testid={`copy-public-key-${item.uuid}`}
                    >
                        <Copy size={16} />
                    </Button>
                </>
            ) : (
                ''
            )}
        </span>,
    ];
}
