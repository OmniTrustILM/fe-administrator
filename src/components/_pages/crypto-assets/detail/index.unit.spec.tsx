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
    PQC_READINESS_TAB: 'pqc-readiness',
    CryptoAssetIdentity: ({ typeLabel }: { typeLabel: string }) => <div data-testid="crypto-asset-identity">{typeLabel}</div>,
    CryptoAssetVerdict: () => <div />,
    CryptoAssetSources: () => <div />,
    CryptoAssetPayloads: () => <div />,
    CryptoAssetPqcExplanation: () => <div data-testid="pqc-explanation" />,
    CryptoAssetEvaluatedProperties: () => <div data-testid="pqc-explanation-inputs" />,
}));

type CryptoAssetsState = {
    assetDetail?: unknown;
    assetDetailError?: string;
    assetDetailErrorStatusCode?: number;
    pqcExplanation?: unknown;
    pqcExplanationLock?: unknown;
    isFetchingPqcExplanation?: boolean;
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

    const render = async (store: ReturnType<typeof createMockStore>, search = '') => {
        await act(async () => {
            root.render(
                <Provider store={store}>
                    <MemoryRouter initialEntries={[`/cryptoassets/detail/asset-1${search}`]}>
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

    const one = (selector: string) => container.querySelector(selector);
    const widgetTitles = () => Array.from(container.querySelectorAll('h5')).map((title) => title.textContent);
    const click = async (element: Element | null | undefined) => {
        await act(async () => {
            (element as HTMLElement).click();
        });
    };

    const READINESS = '?tab=pqc-readiness';
    const explanationWidget = '[data-testid="crypto-asset-pqc-explanation"]';
    const lock = { lockTitle: 'Not Found', lockText: 'Gone', lockType: LockTypeEnum.GENERIC };
    const loadedExplanation = { uuid: 'asset-1', inputs: {} };

    test('an asset without a type shows Untyped as its type', async () => {
        await render(storeWith({ assetDetail: { uuid: 'asset-1', name: 'RSA-2048', pqcVerdict: 'notReady' } }));

        expect(one('[data-testid="crypto-asset-identity"]')?.textContent).toBe('Untyped');
    });

    test('a loaded asset heads the page with its name and opens on its details', async () => {
        await render(storeWith({ assetDetail: loadedAsset, pqcExplanation: loadedExplanation }));

        expect(one('h1')?.textContent).toBe('RSA-2048');
        expect(widgetTitles()).toEqual(['Identity', 'PQC readiness', 'Source CBOMs', 'Crypto properties']);
        expect(one(explanationWidget)).toBeNull();
    });

    test('the PQC readiness tab shows the rules beside the properties they evaluated', async () => {
        await render(storeWith({ assetDetail: loadedAsset, pqcExplanation: loadedExplanation }));

        await click(Array.from(container.querySelectorAll('[role="tab"]')).find((tab) => tab.textContent === 'PQC readiness'));

        expect(widgetTitles()).toEqual(['PQC readiness evaluation', 'Evaluated properties']);
        expect(one(`${explanationWidget} [data-testid="pqc-explanation"]`)).not.toBeNull();
        expect(one('[data-testid="crypto-asset-evaluated-properties"] [data-testid="pqc-explanation-inputs"]')).not.toBeNull();
    });

    // A link from another asset's rules lands here, on the readiness it was followed for.
    test('a link naming the PQC readiness tab opens on it', async () => {
        await render(storeWith({ assetDetail: loadedAsset, pqcExplanation: loadedExplanation }), READINESS);

        expect(one(explanationWidget)).not.toBeNull();
        expect(one('[data-testid="crypto-asset-identity"]')).toBeNull();
    });

    test('a failed explanation locks its own widget, shows no properties and leaves the page rendered', async () => {
        await render(storeWith({ assetDetail: loadedAsset, pqcExplanationLock: lock }), READINESS);

        expect(one(`${explanationWidget} [data-testid="widget-lock"]`)?.textContent).toContain('Gone');
        expect(container.querySelectorAll('[data-testid="widget-lock"]')).toHaveLength(1);
        expect(one('[data-testid="crypto-asset-evaluated-properties"]')).toBeNull();
        expect(one('h1')?.textContent).toBe('RSA-2048');
    });

    // Core re-runs the whole rule set for an explanation, so only the tab that shows it asks for one.
    test('loading the page asks for the detail of the routed asset, and not for its explanation', async () => {
        const store = storeWith({ assetDetail: loadedAsset });
        const dispatch = vi.spyOn(store, 'dispatch');

        await render(store);

        expect(dispatch.mock.calls).toEqual([[actions.getCryptoAssetDetail({ uuid: 'asset-1' })]]);
    });

    test('opening the PQC readiness tab asks for the explanation of the loaded asset', async () => {
        const store = storeWith({ assetDetail: loadedAsset });
        const dispatch = vi.spyOn(store, 'dispatch');
        await render(store);
        dispatch.mockClear();

        await click(Array.from(container.querySelectorAll('[role="tab"]')).find((tab) => tab.textContent === 'PQC readiness'));

        expect(dispatch.mock.calls).toEqual([[actions.getCryptoAssetPqcExplanation({ uuid: 'asset-1' })]]);
    });

    test.each([
        ['the asset has not loaded', { assetDetail: undefined, assetDetailErrorStatusCode: 404, assetDetailError: 'Not Found' }],
        ['an explanation is already held', { assetDetail: loadedAsset, pqcExplanation: loadedExplanation }],
        ['the explanation is locked', { assetDetail: loadedAsset, pqcExplanationLock: lock }],
        ['the explanation is in flight', { assetDetail: loadedAsset, isFetchingPqcExplanation: true }],
    ])('the PQC readiness tab asks for no explanation while %s', async (_, state) => {
        const store = storeWith(state);
        const dispatch = vi.spyOn(store, 'dispatch');

        await render(store, READINESS);

        expect(dispatch.mock.calls.map(([action]) => action)).not.toContainEqual(actions.getCryptoAssetPqcExplanation({ uuid: 'asset-1' }));
    });

    const refreshed = async (state: CryptoAssetsState, search: string, widget: string) => {
        const store = storeWith({ assetDetail: loadedAsset, ...state });
        const dispatch = vi.spyOn(store, 'dispatch');
        await render(store, search);
        dispatch.mockClear();

        const refresh = one(`${widget} [data-testid="refresh-icon"]`) as HTMLButtonElement;
        expect(refresh.disabled).toBe(false);
        await click(refresh);
        return dispatch.mock.calls;
    };

    // A lock held in the slice leaves the widget's Refresh live, so it is also the retry.
    test.each([
        ['a loaded explanation', { pqcExplanation: loadedExplanation }],
        ['a locked explanation', { pqcExplanationLock: lock }],
    ])("%s is re-fetched by the widget's own Refresh, without reloading the asset", async (_, explanationState) => {
        expect(await refreshed(explanationState, READINESS, explanationWidget)).toEqual([
            [actions.getCryptoAssetPqcExplanation({ uuid: 'asset-1' })],
        ]);
    });

    test('the Refresh on the details reloads the asset', async () => {
        expect(await refreshed({}, '', '[data-testid="tab-layout"]')).toEqual([[actions.getCryptoAssetDetail({ uuid: 'asset-1' })]]);
    });
});
