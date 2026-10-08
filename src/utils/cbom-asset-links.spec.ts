import { CbomAssetSyncState, type CbomDto } from 'types/openapi';
import { describe, expect, test } from 'vitest';
import {
    buildAssetUuidByBomRef,
    type ContributedAssets,
    describeCbomInventoryState,
    findContributionHolder,
    hasAssetAtRefLimit,
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
        expect(astral).toHaveLength(2);
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

    test('adds the ref limit to the shared reason only when an asset of the record has reached it', () => {
        expect(resolveComponentAssetLink({ 'bom-ref': 'unknown' }, assetUuidByBomRef, true)).toEqual({
            unlinked: 'noInventoryAssetAtRefLimit',
        });
        expect(resolveComponentAssetLink({ 'bom-ref': 'aes' }, assetUuidByBomRef, true)).toEqual({ assetUuid: 'asset-aes' });
        expect(resolveComponentAssetLink({ name: 'RSA' }, assetUuidByBomRef, true)).toEqual({ unlinked: 'missingBomRef' });
        expect(resolveComponentAssetLink({ 'bom-ref': '' }, assetUuidByBomRef, true)).toEqual({ unlinked: 'unstorableBomRef' });
    });
});

describe('hasAssetAtRefLimit', () => {
    const refs = (count: number) => Array.from({ length: count }, (_, index) => `ref-${index}`);

    test('is reached once an asset carries 256 bom-refs of the document', () => {
        expect(hasAssetAtRefLimit([{ assetUuid: 'a', bomRefs: refs(255) }])).toBe(false);
        expect(
            hasAssetAtRefLimit([
                { assetUuid: 'a', bomRefs: refs(3) },
                { assetUuid: 'b', bomRefs: refs(256) },
            ]),
        ).toBe(true);
        expect(hasAssetAtRefLimit([])).toBe(false);
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

    test('finds none when no later version carries a stamp: one settled without it never held anything', () => {
        const versions = [
            version({ uuid: 'v2', version: 2, assetSyncState: synced }),
            version({ uuid: 'v4', version: 4, assetSyncState: synced }),
        ];

        expect(findContributionHolder({ version: 1 }, versions)).toBeUndefined();
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
    const record = { uuid: 'cbom-1', serialNumber: 'urn:uuid:alpha', version: 2, assetSyncState: CbomAssetSyncState.Synced };
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

    test('maps the refs of a contributing record to their assets, and carries its serial number for the inventory link', () => {
        const state = describeState({ contributed: loaded([{ assetUuid: 'asset-1', bomRefs: ['ref-1', 'ref-2'] }]) });

        expect(state.kind === 'contributing' && state.serialNumber).toBe('urn:uuid:alpha');

        expect(state.kind === 'contributing' && [...state.assetUuidByBomRef]).toEqual([
            ['ref-1', 'asset-1'],
            ['ref-2', 'asset-1'],
        ]);
        expect(state.kind === 'contributing' && state.refLimitReached).toBe(false);
    });

    test('notes that an asset of a contributing record has reached the ref limit', () => {
        const atLimit = Array.from({ length: 256 }, (_, index) => `ref-${index}`);
        const state = describeState({ contributed: loaded([{ assetUuid: 'asset-1', bomRefs: atLimit }]) });

        expect(state.kind === 'contributing' && state.refLimitReached).toBe(true);
    });

    test('reads an empty listing as superseded when a later version has synced', () => {
        const holder = version({
            uuid: 'cbom-3',
            version: 3,
            assetSyncState: CbomAssetSyncState.Synced,
            assetSyncedAt: '2026-09-30T08:00:00Z',
        });

        const versions = [version({ uuid: 'cbom-1', version: 2 }), holder];

        expect(describeState({ contributed: loaded([]), versions })).toEqual({ kind: 'superseded', holder, contributedBefore: false });
        expect(describeState({ record: { ...record, assetSyncedAt: '2026-09-22T10:00:00Z' }, contributed: loaded([]), versions })).toEqual({
            kind: 'superseded',
            holder,
            contributedBefore: true,
        });
    });

    test('reads a pending record a later version has already ingested as superseded, since its sync will add nothing', () => {
        const holder = version({
            uuid: 'cbom-3',
            version: 3,
            assetSyncState: CbomAssetSyncState.Synced,
            assetSyncedAt: '2026-09-30T08:00:00Z',
        });

        for (const assetSyncState of [CbomAssetSyncState.Pending, CbomAssetSyncState.InProgress]) {
            expect(describeState({ record: { ...record, assetSyncState }, versions: [holder], canListCryptoAssets: false })).toEqual({
                kind: 'superseded',
                holder,
                contributedBefore: false,
            });
        }
    });

    test('waits for the versions before it promises anything about a pending record', () => {
        expect(describeState({ record: { ...record, assetSyncState: CbomAssetSyncState.Pending }, isFetchingVersions: true })).toEqual({
            kind: 'loading',
        });
    });

    test('does not read a later version that was settled without a stamp as the holder', () => {
        const writtenOff = version({ uuid: 'cbom-3', version: 3, assetSyncState: CbomAssetSyncState.Synced });

        expect(describeState({ contributed: loaded([]), versions: [writtenOff] })).toEqual({ kind: 'noContribution' });
        expect(describeState({ record: { ...record, assetSyncState: CbomAssetSyncState.Pending }, versions: [writtenOff] })).toEqual({
            kind: 'syncPending',
            syncState: CbomAssetSyncState.Pending,
        });
    });

    test('waits for the versions before it reads an empty listing', () => {
        expect(describeState({ contributed: loaded([]), isFetchingVersions: true })).toEqual({ kind: 'loading' });
    });

    test('decides nothing from the versions while their read has failed, and names that failure instead', () => {
        const versionsError = 'Failed to fetch CBOM versions. Service unavailable';

        expect(describeState({ contributed: loaded([]), versionsError })).toEqual({ kind: 'loadFailed', error: versionsError });
        expect(describeState({ record: { ...record, assetSyncState: CbomAssetSyncState.Pending }, versionsError })).toEqual({
            kind: 'loadFailed',
            error: versionsError,
        });
        // A listing with assets needs no versions, and a read in flight has already cleared the failure.
        expect(describeState({ contributed: loaded([{ assetUuid: 'asset-1', bomRefs: ['ref-1'] }]), versionsError }).kind).toBe(
            'contributing',
        );
        expect(describeState({ contributed: loaded([]), versionsError, isFetchingVersions: true })).toEqual({ kind: 'loading' });
    });

    test('reads an empty listing with no later synced version as no contribution', () => {
        expect(describeState({ contributed: loaded([]), versions: [version({ uuid: 'cbom-1', version: 2 })] })).toEqual({
            kind: 'noContribution',
        });
    });
});
