import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import DiscoveryItemsTable, { itemStateBadge } from './DiscoveryItemsTable';
import { PlatformEnum, Resource } from 'types/openapi';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { useDispatchMock, useSelectorMock } from '../../test-utils/reactReduxMockModule';

setupReactActEnvironment();

vi.mock('react-redux', async () => await import('../../test-utils/reactReduxMockModule'));

// The filter tab comes from the URL; the spec sets it per test.
let searchParams = new URLSearchParams();

vi.mock('react-router', () => ({
    useLocation: () => ({ pathname: '/discoveries/detail/disc-1' }),
    useSearchParams: () => [searchParams, () => undefined],
    Link: ({ to, children }: any) => <a href={to}>{children}</a>,
}));

vi.mock('components/Widget', async () => {
    const { widgetMockModule } = await import('../../test-utils/mockModules');
    return widgetMockModule();
});

vi.mock('components/Dialog', async () => {
    const { dialogMockModule } = await import('../../test-utils/mockModules');
    return dialogMockModule();
});

// Every filter tab renders the same table, so one copy is enough to assert on.
vi.mock('components/Layout/TabLayout', () => ({ default: ({ tabs }: any) => <div>{tabs[0].content}</div> }));

vi.mock('components/CustomTable/PagedCustomTable', () => ({
    default: ({ headers, data, onReloadData }: any) => (
        <div>
            <div>
                {headers.map((header: any) => (
                    <span key={header.id} data-testid={`header-${header.id}`}>
                        {header.content}
                    </span>
                ))}
            </div>
            {data.map((row: any) => (
                <div key={row.id} data-testid={`row-${row.id}`}>
                    {row.columns.map((column: any, index: number) => (
                        <div key={`${row.id}-${index}`}>{column}</div>
                    ))}
                </div>
            ))}
            <button type="button" data-testid="reload" onClick={() => onReloadData(10, 1)}>
                reload
            </button>
        </div>
    ),
}));

vi.mock('components/JsonViewer', () => ({ default: ({ value }: any) => <pre data-testid="json">{value}</pre> }));
vi.mock('components/Button', () => ({
    default: ({ children, onClick, title, 'data-testid': testId }: any) => (
        <button type="button" onClick={onClick} title={title} data-testid={testId}>
            {children}
        </button>
    ),
}));

const item = (over: Record<string, unknown> = {}) => ({
    uuid: 'item-1',
    resource: Resource.Certificates,
    sequence: 7,
    uniqueRef: 'sha256:abc',
    discoveredAt: '2026-09-13T12:32:07.000Z',
    newlyDiscovered: true,
    processed: false,
    payload: { fingerprint: 'abc' },
    ...over,
});

function buildState(items: unknown[]) {
    return {
        discoveries: {
            discoveryItems: { items, totalItems: items.length, pageNumber: 1, itemsPerPage: 10, totalPages: 1 },
            isFetchingDiscoveryItems: false,
        },
        enums: {
            platformEnums: {
                [PlatformEnum.Resource]: {
                    [Resource.Certificates]: { label: 'Certificates' },
                    [Resource.Keys]: { label: 'Keys' },
                },
            },
        },
    };
}

describe('itemStateBadge', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(async () => {
        await act(async () => root.unmount());
        container.remove();
    });

    const badge = async (state: { processed: boolean; processedError?: string }) => {
        await act(async () => root.render(itemStateBadge(state)));
        return container.querySelector('[data-testid^="item-state-"]')?.getAttribute('data-testid');
    };

    it('lets a recorded reason win, even over a processed flag and an inventory object', async () => {
        expect(await badge({ processed: true, processedError: 'unparseable' })).toBe('item-state-failed');
        expect(await badge({ processed: false, processedError: 'never attempted: run cancelled' })).toBe('item-state-failed');
    });

    it('reads processed as imported and everything else as waiting, whatever inventoryUuid says', async () => {
        expect(await badge({ processed: true })).toBe('item-state-imported');
        expect(await badge({ processed: false })).toBe('item-state-waiting');
    });
});

describe('DiscoveryItemsTable', () => {
    let container: HTMLDivElement;
    let root: Root;
    const dispatch = vi.fn();

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        dispatch.mockReset();
        useDispatchMock.mockReturnValue(dispatch);
        searchParams = new URLSearchParams();
    });

    afterEach(async () => {
        await act(async () => root.unmount());
        container.remove();
        vi.clearAllMocks();
    });

    async function render(state: any, resource: Resource = Resource.Certificates) {
        useSelectorMock.mockImplementation((selector: any) => selector(state));
        await act(async () => {
            root.render(<DiscoveryItemsTable discoveryUuid="disc-1" resource={resource} />);
        });
    }

    it('lists each staged item with its reference, state and a link to the inventory object it became', async () => {
        await render(buildState([item({ processed: true, inventoryUuid: 'cert-9' })]));

        const row = container.querySelector('[data-testid="row-item-1"]');
        expect(row?.textContent).toContain('sha256:abc');
        expect(row?.querySelector('[data-testid="item-state-imported"]')).not.toBeNull();
        expect(row?.querySelector('a')?.getAttribute('href')).toBe('../../certificates/detail/cert-9');
    });

    it('shows an inventory link on a waiting certificate, because the object can exist from an earlier run', async () => {
        await render(buildState([item({ processed: false, inventoryUuid: 'cert-9' })]));

        const row = container.querySelector('[data-testid="row-item-1"]');
        expect(row?.querySelector('[data-testid="item-state-waiting"]')).not.toBeNull();
        expect(row?.querySelector('a')).not.toBeNull();
    });

    it('names the details column for assistive technology even though it is visually hidden', async () => {
        await render(buildState([]));

        expect(container.querySelector('[data-testid="header-details"]')?.textContent).toBe('Details');
    });

    it('opens the item with its recorded reason first and its payload beneath', async () => {
        await render(buildState([item({ processedError: 'certificate could not be parsed' })]));

        await act(async () => {
            container.querySelector<HTMLButtonElement>('[data-testid="show-item-item-1"]')?.click();
        });

        const dialog = container.querySelector('[data-testid="dialog"]');
        expect(dialog?.querySelector('[role="alert"]')?.textContent).toBe('certificate could not be parsed');
        expect(dialog?.querySelector('[data-testid="json"]')?.textContent).toContain('"fingerprint": "abc"');
    });

    it('reloads the page it was asked for, filtered by the tab in the URL', async () => {
        await render(buildState([]), Resource.Keys);
        await act(async () => container.querySelector<HTMLButtonElement>('[data-testid="reload"]')?.click());
        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'discoveries/getDiscoveryItems',
                payload: { uuid: 'disc-1', resource: Resource.Keys, newlyDiscovered: undefined, itemsPerPage: 10, pageNumber: 1 },
            }),
        );

        searchParams = new URLSearchParams('discoveredItems=new');
        await render(buildState([]), Resource.Keys);
        await act(async () => container.querySelector<HTMLButtonElement>('[data-testid="reload"]')?.click());
        expect(dispatch).toHaveBeenLastCalledWith(expect.objectContaining({ payload: expect.objectContaining({ newlyDiscovered: true }) }));
    });
});
