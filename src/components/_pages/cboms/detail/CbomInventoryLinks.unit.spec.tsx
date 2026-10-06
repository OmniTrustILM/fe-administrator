import { configureStore, type UnknownAction } from '@reduxjs/toolkit';
import cbomReducer, { actions, initialState, type State } from 'ducks/cbom';
import { EntityType, actions as filterActions } from 'ducks/filters';
import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { CbomAssetSyncState, type CbomDetailDto, type CbomDto, FilterConditionOperator, FilterFieldSource, Resource } from 'types/openapi';
import type { CbomInventoryState } from 'utils/cbom-asset-links';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { clickByTestId, clickByText } from '../../test-utils/domActions';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { CbomAssetName, CbomInventoryStatus, useCbomInventory } from './CbomInventoryLinks';

setupReactActEnvironment();

const makeStore = ({
    allowedListings = [Resource.CryptoAssets],
    cbom = {},
}: {
    allowedListings?: Resource[];
    cbom?: Partial<State>;
} = {}) => {
    const dispatched: UnknownAction[] = [];
    const auth = { profile: { permissions: { allowedListings } } };
    const store = configureStore({
        reducer: { cbom: cbomReducer, auth: () => auth },
        preloadedState: { cbom: { ...initialState, ...cbom } },
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({ serializableCheck: false }).concat(() => (next) => (action) => {
                dispatched.push(action as UnknownAction);
                return next(action);
            }),
    });
    return { store, dispatched };
};

const syncedDetail = (overrides: Partial<CbomDetailDto> = {}): CbomDetailDto =>
    ({
        uuid: 'cbom-1',
        serialNumber: 'urn:uuid:alpha',
        version: 2,
        assetSyncState: CbomAssetSyncState.Synced,
        ...overrides,
    }) as CbomDetailDto;

function InventoryProbe({ detail }: Readonly<{ detail: CbomDetailDto | undefined }>) {
    const { state, reload } = useCbomInventory(detail);
    return (
        <button type="button" onClick={reload}>
            {state.kind}
        </button>
    );
}

describe('CBOM inventory links', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
    });

    const render = async (element: ReactElement, { store } = makeStore()) => {
        await act(async () => {
            root.render(
                <Provider store={store}>
                    <MemoryRouter>{element}</MemoryRouter>
                </Provider>,
            );
        });
    };

    const one = (testId: string) => container.querySelector(`[data-testid="${testId}"]`);

    describe('CbomAssetName', () => {
        test('stands alone while the record has no links to speak of', async () => {
            await render(<CbomAssetName name="RSA-2048" />);

            expect(container.textContent).toBe('RSA-2048');
            expect(container.querySelector('a')).toBeNull();
        });

        test('links to the inventory asset the row resolved to', async () => {
            await render(<CbomAssetName name="RSA-2048" link={{ assetUuid: 'asset-1' }} />);

            expect(container.querySelector('a')?.getAttribute('href')).toBe('/cryptoassets/detail/asset-1');
            expect(container.querySelector('a')?.textContent).toBe('RSA-2048');
            expect(one('cbom-asset-unlinked-reason')).toBeNull();
        });

        test.each([
            ['missingBomRef', 'has no bom-ref in the document'],
            ['unstorableBomRef', 'cannot be stored as written'],
            ['noInventoryAsset', 'no crypto asset you can list holds the bom-ref'],
        ] as const)('stays unlinked and states the reason for %s', async (unlinked, reason) => {
            await render(<CbomAssetName name="RSA-2048" link={{ unlinked }} />);

            expect(container.querySelector('a')).toBeNull();
            expect(container.textContent).toContain('RSA-2048');
            expect(one('cbom-asset-unlinked-reason')?.textContent).toContain(reason);
        });
    });

    describe('CbomInventoryStatus', () => {
        const renderStatus = (state: CbomInventoryState, harness = makeStore(), onRetry = () => {}) =>
            render(<CbomInventoryStatus state={state} serialNumber="urn:uuid:alpha" onRetry={onRetry} />, harness);

        test('says nothing when the platform reports no asset sync', async () => {
            await renderStatus({ kind: 'unavailable' });

            expect(container.textContent).toBe('');
        });

        test.each([
            [CbomAssetSyncState.Pending, 'its asset sync is pending'],
            [CbomAssetSyncState.InProgress, 'its asset sync is in progress'],
        ])('explains a %s sync', async (syncState, text) => {
            await renderStatus({ kind: 'syncPending', syncState });

            expect(one('cbom-inventory-sync-pending')?.textContent).toContain(text);
        });

        test('shows the error of a failed sync', async () => {
            await renderStatus({ kind: 'syncFailed', error: 'The document repeats the bom-ref "aes".' });

            expect(one('cbom-inventory-sync-failed')?.textContent).toContain(
                'its asset sync failed: The document repeats the bom-ref "aes".',
            );
        });

        test('tells a caller without the permission why the rows carry no links', async () => {
            await renderStatus({ kind: 'noPermission' });

            expect(one('cbom-inventory-no-permission')?.textContent).toContain('you do not have permission to list crypto assets');
        });

        test('offers a retry when the links could not be loaded, saying what failed', async () => {
            let retried = 0;
            await renderStatus(
                { kind: 'loadFailed', error: 'Failed to fetch the crypto assets this CBOM contributed. Timeout' },
                makeStore(),
                () => {
                    retried += 1;
                },
            );
            await clickByText(container, 'Retry');

            expect(one('cbom-inventory-load-failed')?.textContent).toContain(
                'Failed to fetch the crypto assets this CBOM contributed. Timeout',
            );
            expect(retried).toBe(1);
        });

        test('points a superseded record at the version that holds the contribution now', async () => {
            await renderStatus({ kind: 'superseded', holder: { uuid: 'cbom-7', version: 7 } as CbomDto });

            const link = one('cbom-inventory-superseded')?.querySelector('a');
            expect(link?.getAttribute('href')).toBe('/cboms/detail/cbom-7');
            expect(link?.textContent).toBe('Open version 7');
        });

        test('says so when nothing the caller can list comes from the record', async () => {
            await renderStatus({ kind: 'noContribution' });

            expect(one('cbom-inventory-no-contribution')?.textContent).toContain('no crypto asset you can list comes from this CBOM');
        });

        test('links a contributing record to the inventory, handing in its serial number as the source filter', async () => {
            const harness = makeStore();
            await renderStatus({ kind: 'contributing', assetUuidByBomRef: new Map() }, harness);

            expect(one('cbom-inventory-link')?.getAttribute('href')).toBe('/cryptoassets');

            await clickByTestId(container, 'cbom-inventory-link');

            expect(harness.dispatched).toEqual([
                filterActions.setDrillDownFilters({
                    entity: EntityType.CRYPTO_ASSET,
                    filters: [
                        {
                            fieldSource: FilterFieldSource.Property,
                            condition: FilterConditionOperator.Equals,
                            fieldIdentifier: 'CBOM_ASSET_SOURCE_CBOM',
                            value: ['urn:uuid:alpha'],
                        },
                    ],
                    path: '/cryptoassets',
                }),
            ]);
        });

        test('offers no inventory link in any other state', async () => {
            await renderStatus({ kind: 'loading' });

            expect(one('cbom-inventory-loading')).not.toBeNull();
            expect(one('cbom-inventory-link')).toBeNull();
        });
    });

    describe('useCbomInventory', () => {
        const listings = (dispatched: UnknownAction[]) => dispatched.filter(actions.listCbomContributedAssets.match);

        test('loads the contributed assets once for a loaded record, however often the page re-renders', async () => {
            const harness = makeStore();
            await render(<InventoryProbe detail={undefined} />, harness);
            expect(listings(harness.dispatched)).toEqual([]);

            const detail = syncedDetail();
            await render(<InventoryProbe detail={detail} />, harness);
            await render(<InventoryProbe detail={detail} />, harness);
            await act(async () => {
                harness.store.dispatch(actions.listCbomVersionsSuccess({ versions: [] }));
            });

            expect(listings(harness.dispatched)).toEqual([actions.listCbomContributedAssets({ uuid: 'cbom-1' })]);
            expect(container.textContent).toBe('loading');
        });

        test('does not load for the record the slice still holds from an earlier visit', async () => {
            const stale = syncedDetail();
            const harness = makeStore();
            await render(<InventoryProbe detail={stale} />, harness);
            await render(<InventoryProbe detail={undefined} />, harness);
            expect(listings(harness.dispatched)).toEqual([]);

            await render(<InventoryProbe detail={syncedDetail()} />, harness);

            expect(listings(harness.dispatched)).toHaveLength(1);
        });

        test('loads again for another version of the record', async () => {
            const harness = makeStore();
            await render(<InventoryProbe detail={undefined} />, harness);
            await render(<InventoryProbe detail={syncedDetail()} />, harness);
            await render(<InventoryProbe detail={syncedDetail({ uuid: 'cbom-2', version: 3 })} />, harness);

            expect(listings(harness.dispatched).map((action) => action.payload.uuid)).toEqual(['cbom-1', 'cbom-2']);
        });

        test.each([CbomAssetSyncState.Pending, CbomAssetSyncState.InProgress, CbomAssetSyncState.Failed, undefined])(
            'does not ask for a record whose sync state is %s',
            async (assetSyncState) => {
                const harness = makeStore();
                await render(<InventoryProbe detail={undefined} />, harness);
                await render(<InventoryProbe detail={syncedDetail({ assetSyncState })} />, harness);

                expect(listings(harness.dispatched)).toEqual([]);
            },
        );

        test('does not ask on behalf of a caller who may not list crypto assets', async () => {
            const harness = makeStore({ allowedListings: [Resource.Cboms] });
            await render(<InventoryProbe detail={undefined} />, harness);
            await render(<InventoryProbe detail={syncedDetail()} />, harness);

            expect(listings(harness.dispatched)).toEqual([]);
            expect(container.textContent).toBe('noPermission');
        });

        test('reads the settled listing, and asks again on reload', async () => {
            const harness = makeStore();
            await render(<InventoryProbe detail={undefined} />, harness);
            await render(<InventoryProbe detail={syncedDetail()} />, harness);

            await act(async () => {
                harness.store.dispatch(
                    actions.listCbomContributedAssetsSuccess({ uuid: 'cbom-1', assets: [{ assetUuid: 'asset-1', bomRefs: ['ref-1'] }] }),
                );
            });
            expect(container.textContent).toBe('contributing');

            await clickByText(container, 'contributing');

            expect(listings(harness.dispatched)).toHaveLength(2);
            expect(container.textContent).toBe('loading');
        });
    });
});
