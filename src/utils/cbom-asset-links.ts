import { CbomAssetSyncState, type CbomDto } from 'types/openapi';

// The limit Core applies before it stores a bom-ref, counted in code points rather than UTF-16 units.
const MAX_STORED_BOM_REF_CODE_POINTS = 1024;
// How many bom-refs of one document Core keeps on an asset; a component folded in past it links to nothing.
const MAX_STORED_BOM_REFS_PER_ASSET = 256;

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

export type UnlinkedReason = 'missingBomRef' | 'unstorableBomRef' | 'noInventoryAsset' | 'noInventoryAssetAtRefLimit';

export type ComponentAssetLink = { assetUuid: string } | { unlinked: UnlinkedReason };

export const UNLINKED_REASON_TEXT: Record<UnlinkedReason, string> = {
    missingBomRef: 'Not linked: this component has no bom-ref in the document.',
    unstorableBomRef: 'Not linked: the bom-ref of this component cannot be stored as written.',
    noInventoryAsset: 'Not linked: no crypto asset listed for this CBOM carries the bom-ref of this component.',
    noInventoryAssetAtRefLimit: `Not linked: no crypto asset listed for this CBOM carries the bom-ref of this component. An asset keeps at most ${MAX_STORED_BOM_REFS_PER_ASSET} bom-refs per document and one here holds that many, so this component may be past the limit.`,
};

const isSurrogate = (codePoint: number): boolean => codePoint >= 0xd800 && codePoint <= 0xdfff;

// Iterating a string yields whole code points, so a value in the surrogate range is a surrogate without its pair.
const isWellFormedWithinLimit = (value: string): boolean => {
    let codePoints = 0;
    for (const codePoint of value) {
        if (isSurrogate(codePoint.codePointAt(0) ?? 0)) return false;
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

export const hasAssetAtRefLimit = (assets: ContributedAssetRefs[]): boolean =>
    assets.some((asset) => asset.bomRefs.length >= MAX_STORED_BOM_REFS_PER_ASSET);

export function resolveComponentAssetLink(
    component: unknown,
    assetUuidByBomRef: Map<string, string>,
    refLimitReached = false,
): ComponentAssetLink {
    const bomRef = typeof component === 'object' && component !== null ? (component as Record<string, unknown>)['bom-ref'] : undefined;
    if (bomRef === undefined) return { unlinked: 'missingBomRef' };
    if (!isStorableBomRef(bomRef)) return { unlinked: 'unstorableBomRef' };

    const assetUuid = assetUuidByBomRef.get(bomRef);
    if (assetUuid !== undefined) return { assetUuid };
    return { unlinked: refLimitReached ? 'noInventoryAssetAtRefLimit' : 'noInventoryAsset' };
}

type InventoryRecord = Pick<CbomDto, 'uuid' | 'serialNumber' | 'version' | 'assetSyncState' | 'assetSyncedAt' | 'assetSyncError'>;

export type CbomInventoryState =
    /** The platform reports no asset sync for this record, so the page has nothing to say about the inventory. */
    | { kind: 'unavailable' }
    | { kind: 'syncPending'; syncState: CbomAssetSyncState }
    | { kind: 'syncFailed'; error?: string }
    | { kind: 'noPermission' }
    | { kind: 'loading' }
    | { kind: 'loadFailed'; error?: string }
    /** `contributedBefore` tells a version whose assets moved on from one that arrived superseded and never added any. */
    | { kind: 'superseded'; holder: CbomDto; contributedBefore: boolean }
    | { kind: 'noContribution' }
    | { kind: 'contributing'; serialNumber: string; assetUuidByBomRef: Map<string, string>; refLimitReached: boolean };

/**
 * The version a superseded record's contributions moved to. Core withdraws an earlier version's links once a later
 * one has synced, and settles a version that arrives already superseded as synced without stamping `assetSyncedAt`,
 * so the stamp is what tells the version that ingested from the ones that were only written off. A later version
 * without it never held anything, so it is no holder even when it is the only one left.
 */
export function findContributionHolder(record: Pick<CbomDto, 'version'>, versions: CbomDto[]): CbomDto | undefined {
    return versions
        .filter(
            (version) =>
                version.version > record.version && version.assetSyncState === CbomAssetSyncState.Synced && Boolean(version.assetSyncedAt),
        )
        .sort((a, b) => b.version - a.version)[0];
}

function supersededState(record: InventoryRecord, versions: CbomDto[]): CbomInventoryState | undefined {
    const holder = findContributionHolder(record, versions);
    return holder && { kind: 'superseded', holder, contributedBefore: Boolean(record.assetSyncedAt) };
}

export function describeCbomInventoryState({
    record,
    versions,
    isFetchingVersions,
    versionsError,
    canListCryptoAssets,
    contributed,
}: {
    record: InventoryRecord | undefined;
    versions: CbomDto[];
    isFetchingVersions: boolean;
    /** Set when the versions could not be read; nothing that needs them is then decided from the empty list. */
    versionsError?: string;
    canListCryptoAssets: boolean;
    contributed: ContributedAssets;
}): CbomInventoryState {
    if (!record?.assetSyncState) return { kind: 'unavailable' };

    if (record.assetSyncState === CbomAssetSyncState.Failed) return { kind: 'syncFailed', error: record.assetSyncError };

    if (record.assetSyncState !== CbomAssetSyncState.Synced) {
        // Core settles a version a later one has already ingested without reading it, so its sync adds nothing: the
        // versions decide whether waiting for it promises anything.
        if (isFetchingVersions) return { kind: 'loading' };
        if (versionsError !== undefined) return { kind: 'loadFailed', error: versionsError };
        return supersededState(record, versions) ?? { kind: 'syncPending', syncState: record.assetSyncState };
    }

    if (!canListCryptoAssets) return { kind: 'noPermission' };

    if (contributed.cbomUuid !== record.uuid || contributed.status === 'idle' || contributed.status === 'fetching') {
        return { kind: 'loading' };
    }
    if (contributed.status === 'failed') {
        return contributed.errorStatusCode === 403 ? { kind: 'noPermission' } : { kind: 'loadFailed', error: contributed.error };
    }

    if (contributed.assets.length > 0) {
        return {
            kind: 'contributing',
            serialNumber: record.serialNumber,
            assetUuidByBomRef: buildAssetUuidByBomRef(contributed.assets),
            refLimitReached: hasAssetAtRefLimit(contributed.assets),
        };
    }

    // An empty listing is read against the versions, so it waits for them rather than naming a cause it may take back.
    if (isFetchingVersions) return { kind: 'loading' };
    if (versionsError !== undefined) return { kind: 'loadFailed', error: versionsError };

    return supersededState(record, versions) ?? { kind: 'noContribution' };
}
