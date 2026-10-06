import { CbomAssetSyncState, type CbomDto } from 'types/openapi';
import { describe, expect, test } from 'vitest';
import {
    buildAssetUuidByBomRef,
    type ContributedAssets,
    describeCbomInventoryState,
    findContributionHolder,
    isStorableBomRef,
    resolveComponentAssetLink,
} from './cbom-asset-links';

const version = (overrides: Partial<CbomDto>): CbomDto => ({ uuid: 'v', version: 1, ...overrides }) as CbomDto;

describe('isStorableBomRef', () => {
    test('accepts an ordinary ref and one of exactly 1024 code points', () => {
        expect(isStorableBomRef('crypto/algorithm/rsa-2048')).toBe(true);
        expect(isStorableBomRef('a'.repeat(1024))).toBe(true);
    });

    test('counts the limit in code points, so 1024 astral characters still fit', () => {
        const astral = '\u{1F512}';
        expect(astral.length).toBe(2);
        expect(isStorableBomRef(astral.repeat(1024))).toBe(true);
        expect(isStorableBomRef(astral.repeat(1025))).toBe(false);
    });

    test.each([
        ['an empty string', ''],
        ['a ref over 1024 code points', 'a'.repeat(1025)],
        ['a ref with a NUL character', 'ref\0one'],
        ['a lone high surrogate', 'ref\uD83D'],
        ['a lone low surrogate', '\uDD12ref'],
        ['a number', 42],
        ['null', null],
        ['an object', { ref: 'a' }],
    ])('rejects %s', (_label, value) => {
        expect(isStorableBomRef(value)).toBe(false);
    });
});

describe('resolveComponentAssetLink', () => {
    const assetUuidByBomRef = buildAssetUuidByBomRef([
        { assetUuid: 'asset-rsa', bomRefs: ['rsa-a', 'rsa-b', 'constructor'] },
        { assetUuid: 'asset-aes', bomRefs: ['aes', 'rsa-a'] },
        { assetUuid: 'asset-no-refs', bomRefs: [] },
    ]);

    test('links a row whose bom-ref an asset carries', () => {
        expect(resolveComponentAssetLink({ 'bom-ref': 'aes' }, assetUuidByBomRef)).toEqual({ assetUuid: 'asset-aes' });
    });

    test('links every row that folded into one asset to that same asset', () => {
        expect(resolveComponentAssetLink({ 'bom-ref': 'rsa-a' }, assetUuidByBomRef)).toEqual({ assetUuid: 'asset-rsa' });
        expect(resolveComponentAssetLink({ 'bom-ref': 'rsa-b' }, assetUuidByBomRef)).toEqual({ assetUuid: 'asset-rsa' });
    });

    test('treats a ref as data, not as a property name', () => {
        expect(resolveComponentAssetLink({ 'bom-ref': 'constructor' }, assetUuidByBomRef)).toEqual({ assetUuid: 'asset-rsa' });
        expect(resolveComponentAssetLink({ 'bom-ref': 'toString' }, assetUuidByBomRef)).toEqual({ unlinked: 'noInventoryAsset' });
        expect(resolveComponentAssetLink({ 'bom-ref': '__proto__' }, assetUuidByBomRef)).toEqual({ unlinked: 'noInventoryAsset' });
    });

    test('names a missing bom-ref', () => {
        expect(resolveComponentAssetLink({ name: 'RSA' }, assetUuidByBomRef)).toEqual({ unlinked: 'missingBomRef' });
        expect(resolveComponentAssetLink(undefined, assetUuidByBomRef)).toEqual({ unlinked: 'missingBomRef' });
    });

    test('names a bom-ref that cannot be stored, and does not read the camel-case spelling as one', () => {
        expect(resolveComponentAssetLink({ 'bom-ref': '' }, assetUuidByBomRef)).toEqual({ unlinked: 'unstorableBomRef' });
        expect(resolveComponentAssetLink({ 'bom-ref': null }, assetUuidByBomRef)).toEqual({ unlinked: 'unstorableBomRef' });
        expect(resolveComponentAssetLink({ 'bom-ref': 7 }, assetUuidByBomRef)).toEqual({ unlinked: 'unstorableBomRef' });
        expect(resolveComponentAssetLink({ bomRef: 'aes' }, assetUuidByBomRef)).toEqual({ unlinked: 'missingBomRef' });
    });

    test('gives a storable ref no asset carries the shared reason', () => {
        expect(resolveComponentAssetLink({ 'bom-ref': 'unknown' }, assetUuidByBomRef)).toEqual({ unlinked: 'noInventoryAsset' });
    });
});

describe('findContributionHolder', () => {
    const synced = CbomAssetSyncState.Synced;

    test('picks the highest later version that carries its own sync stamp', () => {
        const versions = [
            version({ uuid: 'v1', version: 1, assetSyncState: synced, assetSyncedAt: '2026-09-22T10:00:00Z' }),
            version({ uuid: 'v3', version: 3, assetSyncState: synced, assetSyncedAt: '2026-09-22T10:00:00Z' }),
            version({ uuid: 'v5', version: 5, assetSyncState: synced }),
            version({ uuid: 'v7', version: 7, assetSyncState: synced, assetSyncedAt: '2026-09-30T08:00:00Z' }),
            version({ uuid: 'v8', version: 8, assetSyncState: CbomAssetSyncState.Failed }),
        ];

        expect(findContributionHolder({ version: 3 }, versions)?.uuid).toBe('v7');
    });

    test('falls back to the highest later synced version when none carries a stamp', () => {
        const versions = [
            version({ uuid: 'v2', version: 2, assetSyncState: synced }),
            version({ uuid: 'v4', version: 4, assetSyncState: synced }),
        ];

        expect(findContributionHolder({ version: 1 }, versions)?.uuid).toBe('v4');
    });

    test('finds none among earlier versions, the record itself, or later versions that have not synced', () => {
        const versions = [
            version({ uuid: 'v1', version: 1, assetSyncState: synced, assetSyncedAt: '2026-09-22T10:00:00Z' }),
            version({ uuid: 'v2', version: 2, assetSyncState: synced, assetSyncedAt: '2026-09-22T10:00:00Z' }),
            version({ uuid: 'v3', version: 3, assetSyncState: CbomAssetSyncState.Pending }),
        ];

        expect(findContributionHolder({ version: 2 }, versions)).toBeUndefined();
    });
});

describe('describeCbomInventoryState', () => {
    const record = { uuid: 'cbom-1', version: 2, assetSyncState: CbomAssetSyncState.Synced };
    const idle: ContributedAssets = { status: 'idle', assets: [] };
    const loaded = (assets: ContributedAssets['assets']): ContributedAssets => ({ cbomUuid: 'cbom-1', status: 'loaded', assets });
    const describeState = (overrides: Partial<Parameters<typeof describeCbomInventoryState>[0]> = {}) =>
        describeCbomInventoryState({
            record,
            versions: [],
            isFetchingVersions: false,
            canListCryptoAssets: true,
            contributed: idle,
            ...overrides,
        });

    test('says nothing for a record the platform reports no asset sync for', () => {
        expect(describeState({ record: undefined })).toEqual({ kind: 'unavailable' });
        expect(describeState({ record: { ...record, assetSyncState: undefined } })).toEqual({ kind: 'unavailable' });
    });

    test.each([CbomAssetSyncState.Pending, CbomAssetSyncState.InProgress])('reports a %s sync as not there yet', (syncState) => {
        expect(describeState({ record: { ...record, assetSyncState: syncState }, contributed: loaded([]) })).toEqual({
            kind: 'syncPending',
            syncState,
        });
    });

    test('reports a failed sync with its error, ahead of a missing permission', () => {
        expect(
            describeState({
                record: { ...record, assetSyncState: CbomAssetSyncState.Failed, assetSyncError: 'The document repeats a bom-ref' },
                canListCryptoAssets: false,
            }),
        ).toEqual({ kind: 'syncFailed', error: 'The document repeats a bom-ref' });
    });

    test('reports a missing permission from the profile, and from a refused listing', () => {
        expect(describeState({ canListCryptoAssets: false })).toEqual({ kind: 'noPermission' });
        expect(describeState({ contributed: { cbomUuid: 'cbom-1', status: 'failed', assets: [], errorStatusCode: 403 } })).toEqual({
            kind: 'noPermission',
        });
    });

    test('is loading until the listing of this very record has settled', () => {
        expect(describeState()).toEqual({ kind: 'loading' });
        expect(describeState({ contributed: { cbomUuid: 'cbom-1', status: 'fetching', assets: [] } })).toEqual({ kind: 'loading' });
        expect(
            describeState({ contributed: { cbomUuid: 'another', status: 'loaded', assets: [{ assetUuid: 'a', bomRefs: ['r'] }] } }),
        ).toEqual({ kind: 'loading' });
    });

    test('reports any other failed listing as a failed load, carrying its message', () => {
        expect(
            describeState({
                contributed: { cbomUuid: 'cbom-1', status: 'failed', assets: [], error: 'Service unavailable', errorStatusCode: 500 },
            }),
        ).toEqual({ kind: 'loadFailed', error: 'Service unavailable' });
        expect(describeState({ contributed: { cbomUuid: 'cbom-1', status: 'failed', assets: [] } })).toEqual({ kind: 'loadFailed' });
    });

    test('is contributing as soon as the listing holds an asset, even one with no refs', () => {
        const state = describeState({ contributed: loaded([{ assetUuid: 'asset-1', bomRefs: [] }]) });

        expect(state.kind).toBe('contributing');
    });

    test('maps the refs of a contributing record to their assets', () => {
        const state = describeState({ contributed: loaded([{ assetUuid: 'asset-1', bomRefs: ['ref-1', 'ref-2'] }]) });

        expect(state.kind === 'contributing' && [...state.assetUuidByBomRef]).toEqual([
            ['ref-1', 'asset-1'],
            ['ref-2', 'asset-1'],
        ]);
    });

    test('reads an empty listing as superseded when a later version has synced', () => {
        const holder = version({
            uuid: 'cbom-3',
            version: 3,
            assetSyncState: CbomAssetSyncState.Synced,
            assetSyncedAt: '2026-09-30T08:00:00Z',
        });

        expect(describeState({ contributed: loaded([]), versions: [version({ uuid: 'cbom-1', version: 2 }), holder] })).toEqual({
            kind: 'superseded',
            holder,
        });
    });

    test('waits for the versions before it reads an empty listing', () => {
        expect(describeState({ contributed: loaded([]), isFetchingVersions: true })).toEqual({ kind: 'loading' });
    });

    test('reads an empty listing with no later synced version as no contribution', () => {
        expect(describeState({ contributed: loaded([]), versions: [version({ uuid: 'cbom-1', version: 2 })] })).toEqual({
            kind: 'noContribution',
        });
    });
});
