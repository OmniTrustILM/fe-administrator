import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import DiscoveryItemsTable, { itemStateBadge } from './DiscoveryItemsTable';
import { KeyAlgorithm, KeyFormat, KeyType, PlatformEnum, Resource } from 'types/openapi';
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

const copyToClipboard = vi.fn();
vi.mock('utils/common-hooks', () => ({ useCopyToClipboard: () => copyToClipboard }));
vi.mock('components/Button', () => ({
    // Mirrors the real Button: `title` feeds its tooltip and never reaches the element, so only aria-label names it.
    default: ({ children, onClick, 'aria-label': ariaLabel, 'data-testid': testId }: any) => (
        <button type="button" onClick={onClick} aria-label={ariaLabel} data-testid={testId}>
            {children}
        </button>
    ),
}));

const inventoryOf = (uuid: string, name: string) => ({ uuid, name });

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
                [PlatformEnum.KeyType]: { [KeyType.Public]: { label: 'Public key' } },
                [PlatformEnum.KeyAlgorithm]: { [KeyAlgorithm.Rsa]: { label: 'RSA' } },
                [PlatformEnum.KeyFormat]: { [KeyFormat.SubjectPublicKeyInfo]: { label: 'SPKI' } },
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
        expect(await badge({ processed: true, processedError: 'unparseable' })).toBe('item-state-not-imported');
        expect(await badge({ processed: false, processedError: 'never attempted: run cancelled' })).toBe('item-state-not-imported');
        // Not "Failed": a key listed without being onboarded carries a reason and nothing went wrong with it.
        expect(container.querySelector('[data-testid="item-state-not-imported"]')?.textContent).toBe('Not imported');
    });

    it('reads processed as imported and everything else as waiting, whatever inventory says', async () => {
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

    it('leads with the name of the inventory object it became, linked to it', async () => {
        await render(buildState([item({ processed: true, inventory: inventoryOf('cert-9', 'CN=web.example.com') })]));

        expect(container.querySelector('[data-testid="header-inventory"]')?.textContent).toBe('Name');
        const link = container.querySelector('[data-testid="row-item-1"] a');
        expect(link?.textContent).toBe('CN=web.example.com');
        expect(link?.getAttribute('href')).toBe('../../certificates/detail/cert-9');
    });

    it('says nothing in the name column for an item that became nothing', async () => {
        await render(buildState([item({ processed: false })]));

        const row = container.querySelector('[data-testid="row-item-1"]');
        expect(row?.querySelector('a')).toBeNull();
        expect(row?.firstElementChild?.textContent).toBe('');
    });

    it('shows an inventory link on a waiting certificate, because the object can exist from an earlier run', async () => {
        await render(buildState([item({ processed: false, inventory: inventoryOf('cert-9', 'CN=web.example.com') })]));

        const row = container.querySelector('[data-testid="row-item-1"]');
        expect(row?.querySelector('[data-testid="item-state-waiting"]')).not.toBeNull();
        expect(row?.querySelector('a')).not.toBeNull();
    });

    it('names the details column for assistive technology even though it is visually hidden', async () => {
        await render(buildState([item()]));

        expect(container.querySelector('[data-testid="header-details"]')?.textContent).toBe('Details');
        expect(container.querySelector('[data-testid="show-item-item-1"]')?.getAttribute('aria-label')).toBe('Show item');
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

    it('still links an item whose payload could not be decoded, because the resource is stored beside it', async () => {
        // Core lists the item either way so the run's counts hold.
        await render(buildState([item({ payload: undefined, processed: true, inventory: inventoryOf('inv-9', 'CN=orphan') })]));

        const row = container.querySelector('[data-testid="row-item-1"]');
        expect(row?.querySelector('a')?.getAttribute('href')).toBe('../../certificates/detail/inv-9');
        expect(row?.textContent).toContain('CN=orphan');

        await act(async () => {
            container.querySelector<HTMLButtonElement>('[data-testid="show-item-item-1"]')?.click();
        });
        expect(container.querySelector('[data-testid="json"]')?.textContent).toContain('"payload": null');
    });

    it('keeps the run position and the provider reference out of the key row, in the dialog that opens it', async () => {
        const key = item({ uuid: 'key-1', resource: Resource.Keys, sequence: 12, uniqueRef: '10.0.0.7:443#0' });
        await render(buildState([key]), Resource.Keys);

        // Neither value identifies the key; the dialog caption carries both.
        expect(container.querySelector('[data-testid="header-sequence"]')).toBeNull();
        expect(container.querySelector('[data-testid="header-uniqueRef"]')).toBeNull();

        await act(async () => container.querySelector<HTMLButtonElement>('[data-testid="show-item-key-1"]')?.click());
        expect(container.querySelector('[data-testid="dialog"]')?.textContent).toContain('#12');
        expect(container.querySelector('[data-testid="dialog"]')?.textContent).toContain('10.0.0.7:443#0');
    });

    it('shows the key columns for a keys run and the staging columns for any other', async () => {
        const key = item({
            uuid: 'key-1',
            resource: Resource.Keys,
            uniqueRef: 'key-ref-1',
            payload: {
                resource: Resource.Keys,
                type: KeyType.Public,
                algorithm: KeyAlgorithm.Rsa,
                length: 2048,
                fingerprint: 'e3b0c44298fc1c14',
                publicKeyFormat: KeyFormat.SubjectPublicKeyInfo,
                publicKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A',
            },
        });
        await render(buildState([key]), Resource.Keys);

        expect(container.querySelector('[data-testid="header-keyFingerprint"]')?.textContent).toBe('Fingerprint');
        const row = container.querySelector('[data-testid="row-key-1"]');
        expect(row?.querySelector('[data-testid="key-algorithm"]')?.textContent).toBe('RSA');
        expect(row?.querySelector('[data-testid="key-fingerprint"]')?.textContent).toBe('e3b0c44298fc1c14');

        await render(buildState([item()]));
        expect(container.querySelector('[data-testid="key-algorithm"]')).toBeNull();
        expect(Array.from(container.querySelectorAll('[data-testid^="header-"]'), (header) => header.getAttribute('data-testid'))).toEqual([
            'header-inventory',
            'header-sequence',
            'header-uniqueRef',
            'header-discoveredAt',
            'header-state',
            'header-details',
        ]);
    });

    it('opens a key blob nobody would read in a column, and copies it whole', async () => {
        const publicKey = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A';
        await render(buildState([item({ payload: { resource: Resource.Keys, type: KeyType.Public, publicKey } })]), Resource.Keys);

        await act(async () => container.querySelector<HTMLButtonElement>('[data-testid="show-public-key-item-1"]')?.click());
        expect(container.querySelector('[data-testid="public-key-value"]')?.textContent).toBe(publicKey);

        await act(async () => container.querySelector<HTMLButtonElement>('[data-testid="copy-public-key"]')?.click());
        expect(copyToClipboard).toHaveBeenCalledWith(publicKey, expect.any(String), expect.any(String));
    });

    it('lists a key whose payload could not be decoded with its domain columns empty', async () => {
        await render(buildState([item({ resource: Resource.Keys, payload: undefined })]), Resource.Keys);

        const row = container.querySelector('[data-testid="row-item-1"]');
        expect(row).not.toBeNull();
        expect(row?.querySelector('[data-testid="key-algorithm"]')?.textContent).toBe('');
        expect(row?.querySelector('[data-testid="show-public-key-item-1"]')).toBeNull();
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
