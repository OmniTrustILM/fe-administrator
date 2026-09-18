import { act } from 'react';
import { Provider } from 'react-redux';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import { LockTypeEnum, LockWidgetNameEnum } from 'types/user-interface';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createMockStore } from 'utils/test-helpers';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import CryptoAssetDetail from './index';

setupReactActEnvironment();

vi.mock('./CryptoAssetDetailSections', () => ({
    CryptoAssetSummary: () => <div data-testid="crypto-asset-summary" />,
    CryptoAssetIdentity: () => <div />,
    CryptoAssetVerdict: () => <div />,
    CryptoAssetSources: () => <div />,
    CryptoAssetPayloads: () => <div />,
}));

// The epic locks this widget name on every failure, so the failed page has to be tested with the lock in the store.
const detailLock = {
    widgetName: LockWidgetNameEnum.CryptoAssetDetail,
    lockTitle: 'Not Found',
    lockText: 'The requested resource does not exist',
    lockType: LockTypeEnum.GENERIC,
};

type CryptoAssetsState = { assetDetail?: unknown; assetDetailError?: string; assetDetailErrorStatusCode?: number };

const storeWith = (cryptoAssets: CryptoAssetsState, widgetLocks: unknown[] = [detailLock]) =>
    createMockStore({
        cryptoAssets: { cryptoAssets: [], isFetchingList: false, isFetchingDetail: false, ...cryptoAssets } as never,
        userInterface: { widgetLocks } as never,
    });

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

    test('a loaded asset heads the page with its name and shows the summary', async () => {
        await render(storeWith({ assetDetail: { uuid: 'asset-1', name: 'RSA-2048', type: 'algorithm', pqcVerdict: 'notReady' } }, []));

        expect(container.querySelector('h1')?.textContent).toBe('RSA-2048');
        expect(container.querySelector('[data-testid="crypto-asset-summary"]')).not.toBeNull();
    });
});
