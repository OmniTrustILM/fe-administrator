import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import DiscoveryRunMessages, { severityBadge } from './DiscoveryRunMessages';
import { DiscoveryMessageSeverity } from 'types/openapi';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { useDispatchMock, useSelectorMock } from '../../test-utils/reactReduxMockModule';

setupReactActEnvironment();

vi.mock('react-redux', async () => await import('../../test-utils/reactReduxMockModule'));

vi.mock('components/Widget', async () => {
    const { widgetMockModule } = await import('../../test-utils/mockModules');
    return widgetMockModule();
});

vi.mock('components/CustomTable/PagedCustomTable', () => ({
    default: ({ data, onReloadData }: any) => (
        <div>
            {data.map((row: any) => (
                <div key={row.id} data-testid={`row-${row.id}`} data-row>
                    {row.columns.map((column: any, index: number) => (
                        <div key={`${row.id}-${index}`}>{column}</div>
                    ))}
                </div>
            ))}
            <button type="button" data-testid="reload" onClick={() => onReloadData(25, 2)}>
                reload
            </button>
        </div>
    ),
}));

const message = (over: Record<string, unknown> = {}) => ({
    severity: DiscoveryMessageSeverity.Warning,
    code: 'certificateUnparseable',
    message: 'The certificate at 10.0.0.7:443 could not be parsed.',
    occurrences: 12,
    firstSeenAt: '2026-09-13T12:00:00.000Z',
    lastSeenAt: '2026-09-13T12:32:07.000Z',
    ...over,
});

function buildState(items: unknown[]) {
    return {
        discoveries: {
            discoveryMessages: { items, totalItems: items.length, pageNumber: 1, itemsPerPage: 10, totalPages: 1 },
            isFetchingDiscoveryMessages: false,
        },
    };
}

describe('severityBadge', () => {
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

    it('labels each severity of the discovery-scoped enum', async () => {
        for (const [severity, text] of [
            [DiscoveryMessageSeverity.Info, 'Info'],
            [DiscoveryMessageSeverity.Warning, 'Warning'],
            [DiscoveryMessageSeverity.Error, 'Error'],
        ] as const) {
            await act(async () => root.render(severityBadge(severity)));
            expect(container.querySelector(`[data-testid="severity-${severity}"]`)?.textContent).toBe(text);
        }
    });
});

describe('DiscoveryRunMessages', () => {
    let container: HTMLDivElement;
    let root: Root;
    const dispatch = vi.fn();

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        dispatch.mockReset();
        useDispatchMock.mockReturnValue(dispatch);
    });

    afterEach(async () => {
        await act(async () => root.unmount());
        container.remove();
        vi.clearAllMocks();
    });

    async function render(state: any) {
        useSelectorMock.mockImplementation((selector: any) => selector(state));
        await act(async () => {
            root.render(<DiscoveryRunMessages discoveryUuid="disc-1" />);
        });
    }

    it('shows one row per aggregated entry with its severity, code, text and occurrence count', async () => {
        await render(buildState([message()]));

        const row = container.querySelector('[data-row]');
        expect(row?.querySelector('[data-testid="severity-warning"]')).not.toBeNull();
        expect(row?.textContent).toContain('certificateUnparseable');
        expect(row?.textContent).toContain('could not be parsed');
        expect(row?.textContent).toContain('12');
    });

    it('keeps two entries apart when they share a code, since aggregation is by code together with text', async () => {
        await render(
            buildState([
                message({ message: 'first text', firstSeenAt: '2026-09-13T12:00:00.000Z' }),
                message({ message: 'second text', firstSeenAt: '2026-09-13T12:05:00.000Z' }),
            ]),
        );

        const rows = container.querySelectorAll('[data-row]');
        expect(rows).toHaveLength(2);
        expect(rows[0].getAttribute('data-testid')).not.toBe(rows[1].getAttribute('data-testid'));
    });

    it('reloads the page it was asked for', async () => {
        await render(buildState([]));

        await act(async () => container.querySelector<HTMLButtonElement>('[data-testid="reload"]')?.click());

        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'discoveries/getDiscoveryMessages',
                payload: { uuid: 'disc-1', itemsPerPage: 25, pageNumber: 2 },
            }),
        );
    });
});
