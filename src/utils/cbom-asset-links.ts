import { CbomAssetSyncState, type CbomDto } from 'types/openapi';

// The limit Core applies before it stores a bom-ref, counted in code points rather than UTF-16 units.
const MAX_STORED_BOM_REF_CODE_POINTS = 1024;

export type ContributedAssetRefs = {
    assetUuid: string;
    bomRefs: string[];
};

export type ContributedAssetsStatus = 'idle' | 'fetching' | 'loaded' | 'failed';

export type ContributedAssets = {
    cbomUuid?: string;
    status: ContributedAssetsStatus;
    assets: ContributedAssetRefs[];
    error?: string;
    errorStatusCode?: number;
};

export type UnlinkedReason = 'missingBomRef' | 'unstorableBomRef' | 'noInventoryAsset';

export type ComponentAssetLink = { assetUuid: string } | { unlinked: UnlinkedReason };

export const UNLINKED_REASON_TEXT: Record<UnlinkedReason, string> = {
    missingBomRef: 'Not linked: this component has no bom-ref in the document.',
    unstorableBomRef: 'Not linked: the bom-ref of this component cannot be stored as written.',
    noInventoryAsset: 'Not linked: no crypto asset you can list holds the bom-ref of this component.',
};

const isSurrogate = (codeUnit: number): boolean => codeUnit >= 0xd800 && codeUnit <= 0xdfff;

// Iterating a string yields whole code points, so a single unit in the surrogate range is one without its pair.
const isWellFormedWithinLimit = (value: string): boolean => {
    let codePoints = 0;
    for (const codePoint of value) {
        if (codePoint.length === 1 && isSurrogate(codePoint.charCodeAt(0))) return false;
        codePoints += 1;
        if (codePoints > MAX_STORED_BOM_REF_CODE_POINTS) return false;
    }
    return true;
};

export function isStorableBomRef(bomRef: unknown): bomRef is string {
    return typeof bomRef === 'string' && bomRef.length > 0 && !bomRef.includes('\0') && isWellFormedWithinLimit(bomRef);
}

// A Map, because a bom-ref is document text and may read `constructor` or `__proto__`.
export function buildAssetUuidByBomRef(assets: ContributedAssetRefs[]): Map<string, string> {
    const assetUuidByBomRef = new Map<string, string>();
    for (const asset of assets) {
        for (const bomRef of asset.bomRefs) {
            if (!assetUuidByBomRef.has(bomRef)) assetUuidByBomRef.set(bomRef, asset.assetUuid);
        }
    }
    return assetUuidByBomRef;
}

export function resolveComponentAssetLink(component: unknown, assetUuidByBomRef: Map<string, string>): ComponentAssetLink {
    const bomRef = typeof component === 'object' && component !== null ? (component as Record<string, unknown>)['bom-ref'] : undefined;
    if (bomRef === undefined) return { unlinked: 'missingBomRef' };
    if (!isStorableBomRef(bomRef)) return { unlinked: 'unstorableBomRef' };

    const assetUuid = assetUuidByBomRef.get(bomRef);
    return assetUuid === undefined ? { unlinked: 'noInventoryAsset' } : { assetUuid };
}

type InventoryRecord = Pick<CbomDto, 'uuid' | 'version' | 'assetSyncState' | 'assetSyncError'>;

export type CbomInventoryState =
    /** The platform reports no asset sync for this record, so the page has nothing to say about the inventory. */
    | { kind: 'unavailable' }
    | { kind: 'syncPending'; syncState: CbomAssetSyncState }
    | { kind: 'syncFailed'; error?: string }
    | { kind: 'noPermission' }
    | { kind: 'loading' }
    | { kind: 'loadFailed'; error?: string }
    | { kind: 'superseded'; holder: CbomDto }
    | { kind: 'noContribution' }
    | { kind: 'contributing'; assetUuidByBomRef: Map<string, string> };

/**
 * The version a superseded record's contributions moved to. Core withdraws an earlier version's links once a later
 * one has synced, and settles a version that arrives already superseded as synced without stamping `assetSyncedAt`,
 * so the stamp is what tells the version that ingested from the ones that were only written off.
 */
export function findContributionHolder(record: Pick<CbomDto, 'version'>, versions: CbomDto[]): CbomDto | undefined {
    const laterSynced = versions
        .filter((version) => version.version > record.version && version.assetSyncState === CbomAssetSyncState.Synced)
        .sort((a, b) => b.version - a.version);

    return laterSynced.find((version) => Boolean(version.assetSyncedAt)) ?? laterSynced[0];
}

export function describeCbomInventoryState({
    record,
    versions,
    isFetchingVersions,
    canListCryptoAssets,
    contributed,
}: {
    record: InventoryRecord | undefined;
    versions: CbomDto[];
    isFetchingVersions: boolean;
    canListCryptoAssets: boolean;
    contributed: ContributedAssets;
}): CbomInventoryState {
    if (!record?.assetSyncState) return { kind: 'unavailable' };

    if (record.assetSyncState === CbomAssetSyncState.Failed) return { kind: 'syncFailed', error: record.assetSyncError };
    if (record.assetSyncState !== CbomAssetSyncState.Synced) return { kind: 'syncPending', syncState: record.assetSyncState };

    if (!canListCryptoAssets) return { kind: 'noPermission' };

    if (contributed.cbomUuid !== record.uuid || contributed.status === 'idle' || contributed.status === 'fetching') {
        return { kind: 'loading' };
    }
    if (contributed.status === 'failed') {
        return contributed.errorStatusCode === 403 ? { kind: 'noPermission' } : { kind: 'loadFailed', error: contributed.error };
    }

    if (contributed.assets.length > 0) {
        return { kind: 'contributing', assetUuidByBomRef: buildAssetUuidByBomRef(contributed.assets) };
    }

    // An empty listing is read against the versions, so it waits for them rather than naming a cause it may take back.
    if (isFetchingVersions) return { kind: 'loading' };

    const holder = findContributionHolder(record, versions);
    return holder ? { kind: 'superseded', holder } : { kind: 'noContribution' };
}
