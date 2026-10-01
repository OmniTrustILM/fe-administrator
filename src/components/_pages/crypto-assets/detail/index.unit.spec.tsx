import { act } from 'react';
import { Provider } from 'react-redux';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { actions } from 'ducks/crypto-assets';
import { LockTypeEnum } from 'types/user-interface';
import { createMockStore } from 'utils/test-helpers';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import CryptoAssetDetail from './index';

setupReactActEnvironment();

vi.mock('./CryptoAssetDetailSections', () => ({
    CryptoAssetSummary: ({ typeLabel }: { typeLabel: string }) => <div data-testid="crypto-asset-summary">{typeLabel}</div>,
    CryptoAssetIdentity: () => <div />,
    CryptoAssetVerdict: () => <div />,
    CryptoAssetSources: () => <div />,
    CryptoAssetPayloads: () => <div />,
    CryptoAssetPqcExplanation: () => <div data-testid="pqc-explanation" />,
}));

type CryptoAssetsState = {
    assetDetail?: unknown;
    assetDetailError?: string;
    assetDetailErrorStatusCode?: number;
    pqcExplanation?: unknown;
    pqcExplanationLock?: unknown;
};

const storeWith = (cryptoAssets: CryptoAssetsState) =>
    createMockStore({
        cryptoAssets: {
            assetsData: undefined,
            isFetchingList: false,
            isFetchingDetail: false,
            isFetchingPqcExplanation: false,
            ...cryptoAssets,
        } as never,
    });

const loadedAsset = { uuid: 'asset-1', name: 'RSA-2048', type: 'algorithm', pqcVerdict: 'notReady' };

describe('CryptoAssetDetail', () => {
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

    const render = async (store: ReturnType<typeof createMockStore>) => {
        await act(async () => {
            root.render(
                <Provider store={store}>
                    <MemoryRouter initialEntries={['/cryptoassets/detail/asset-1']}>
                        <Routes>
                            <Route path="/cryptoassets/detail/:id" element={<CryptoAssetDetail />} />
                        </Routes>
                    </MemoryRouter>
                </Provider>,
            );
        });
    };

    const buttonLabels = () => Array.from(container.querySelectorAll('button')).map((button) => button.textContent?.trim());

    test('a missing asset says so, and says it through its own copy rather than the generic lock panel', async () => {
        await render(storeWith({ assetDetailErrorStatusCode: 404, assetDetailError: 'Not Found' }));

        expect(container.textContent).toContain('This cryptographic asset is not in the inventory.');
        expect(container.querySelector('[data-testid="widget-lock"]')).toBeNull();
    });

    test('a failed load offers a way back and a way to try again', async () => {
        await render(storeWith({ assetDetailErrorStatusCode: 500, assetDetailError: 'Service unavailable' }));

        expect(container.textContent).toContain('Unable to load the cryptographic asset.');
        expect(container.textContent).toContain('Service unavailable');
        expect(buttonLabels()).toContain('Back to Crypto Assets');
        expect(buttonLabels()).toContain('Retry');
    });

    test('an asset without a type shows Untyped as its type in the summary', async () => {
        await render(storeWith({ assetDetail: { uuid: 'asset-1', name: 'RSA-2048', pqcVerdict: 'notReady' } }));

        expect(container.querySelector('[data-testid="crypto-asset-summary"]')?.textContent).toContain('Untyped');
    });

    test('a loaded asset heads the page with its name and shows the summary', async () => {
        await render(storeWith({ assetDetail: loadedAsset }));

        expect(container.querySelector('h1')?.textContent).toBe('RSA-2048');
        expect(container.querySelector('[data-testid="crypto-asset-summary"]')).not.toBeNull();
    });

    const explanationWidget = '[data-testid="crypto-asset-pqc-explanation"]';

    const lock = { lockTitle: 'Not Found', lockText: 'Gone', lockType: LockTypeEnum.GENERIC };
    const refresh = () => container.querySelector(`${explanationWidget} [data-testid="refresh-icon"]`) as HTMLButtonElement;

    test('a failed explanation locks its own widget and leaves the rest of the page rendered', async () => {
        await render(storeWith({ assetDetail: loadedAsset, pqcExplanationLock: lock }));

        expect(container.querySelector(`${explanationWidget} [data-testid="widget-lock"]`)?.textContent).toContain('Gone');
        expect(container.querySelectorAll('[data-testid="widget-lock"]')).toHaveLength(1);
        expect(container.querySelector('h1')?.textContent).toBe('RSA-2048');
        expect(container.querySelector('[data-testid="crypto-asset-summary"]')).not.toBeNull();
    });

    // The explanation follows from the detail loading, in the epic, so an asset that fails to load never has one computed.
    test('loading the page asks for the detail of the routed asset, and not for its explanation', async () => {
        const store = storeWith({ assetDetail: loadedAsset });
        const dispatch = vi.spyOn(store, 'dispatch');

        await render(store);

        expect(dispatch.mock.calls).toEqual([[actions.getCryptoAssetDetail({ uuid: 'asset-1' })]]);
    });

    // A lock held in the slice leaves the widget's Refresh live, so it is also the retry.
    test.each([
        ['a loaded explanation', { pqcExplanation: { uuid: 'asset-1' } }],
        ['a locked explanation', { pqcExplanationLock: lock }],
    ])("%s is re-fetched by the widget's own Refresh, without reloading the asset", async (_, explanationState) => {
        const store = storeWith({ assetDetail: loadedAsset, ...explanationState });
        const dispatch = vi.spyOn(store, 'dispatch');
        await render(store);
        dispatch.mockClear();

        expect(refresh().disabled).toBe(false);
        await act(async () => {
            refresh().click();
        });

        expect(dispatch.mock.calls).toEqual([[actions.getCryptoAssetPqcExplanation({ uuid: 'asset-1' })]]);
    });
});
