import Button from 'components/Button';
import type { TableHeader } from 'components/CustomTable';
import { getEnumLabel } from 'ducks/enums';
import { Copy, Eye } from 'lucide-react';
import type { ReactNode } from 'react';
import type { DiscoveryItemModel } from 'types/discoveries';
import type { EnumItemModel } from 'types/enums';
import { type DiscoveredKeyDto, Resource } from 'types/openapi';

type PlatformEnumMap = { [key: string]: EnumItemModel } | undefined;

/** The three enums a key row names by label; the platform's own words, never the wire code. */
export type KeyColumnEnums = Readonly<{ type: PlatformEnumMap; algorithm: PlatformEnumMap; format: PlatformEnumMap }>;

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
];

/** Not part of KEY_HEADERS: it is an action rather than a value, and it sits with the row's other actions. */
export const PUBLIC_KEY_HEADER: TableHeader = { id: 'keyPublic', content: 'Public key', align: 'center', width: '5%' };

/**
 * The key payload of a staged item, or nothing. `resource` is the discriminator the contract puts on every payload,
 * and an item whose stored payload could no longer be decoded carries none at all — both cases leave the key
 * columns empty rather than the row unlisted.
 */
export function discoveredKey(item: Pick<DiscoveryItemModel, 'payload'>): DiscoveredKeyDto | undefined {
    return item.payload?.resource === Resource.Keys ? (item.payload as DiscoveredKeyDto) : undefined;
}

/**
 * One cell per header in `KEY_HEADERS`. A PRIVATE_KEY, SECRET_KEY or SPLIT_KEY report omits both `publicKey` and
 * `publicKeyFormat` by contract — discovery never carries private key material — so the format cell is empty by
 * design, and {@link publicKeyCell} offers nothing to open.
 */
export function keyCells(item: Pick<DiscoveryItemModel, 'uuid' | 'payload'>, enums: KeyColumnEnums): ReactNode[] {
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
    ];
}

/**
 * The action that opens the key, for the column {@link PUBLIC_KEY_HEADER} heads. Absent for a key whose material is
 * never reported: there is nothing to open, and a disabled control would suggest otherwise.
 */
export function publicKeyCell(
    item: Pick<DiscoveryItemModel, 'uuid' | 'payload'>,
    onShowPublicKey: (discoveredKey: DiscoveredKeyDto) => void,
): ReactNode {
    const key = discoveredKey(item);
    if (!key?.publicKey) {
        return '';
    }
    return (
        <Button
            key="keyPublic"
            variant="transparent"
            color="primary"
            title="Show public key"
            aria-label="Show public key"
            className="p-1"
            onClick={() => onShowPublicKey(key)}
            data-testid={`show-public-key-${item.uuid}`}
        >
            <Eye size={16} />
        </Button>
    );
}

/**
 * The key itself, for the dialog the column's action opens. A base64 blob is unreadable in fragments, so nothing
 * here abbreviates it, and the copy action hands over exactly what was reported.
 */
export function PublicKeyDetails({
    discoveredKey: key,
    enums,
    onCopy,
}: Readonly<{ discoveredKey: DiscoveredKeyDto; enums: KeyColumnEnums; onCopy: (publicKey: string) => void }>) {
    const { publicKey } = key;
    return (
        <div className="flex flex-col gap-3">
            <div className="text-sm">
                <span className="text-muted">Format: </span>
                <span data-testid="public-key-format">{key.publicKeyFormat ? getEnumLabel(enums.format, key.publicKeyFormat) : ''}</span>
            </div>
            <div className="flex items-start gap-2">
                <span data-testid="public-key-value" className="font-mono text-sm break-all">
                    {publicKey}
                </span>
                {publicKey ? (
                    <Button
                        variant="transparent"
                        color="primary"
                        title="Copy public key"
                        aria-label="Copy public key"
                        className="p-1 shrink-0"
                        onClick={() => onCopy(publicKey)}
                        data-testid="copy-public-key"
                    >
                        <Copy size={16} />
                    </Button>
                ) : null}
            </div>
        </div>
    );
}
