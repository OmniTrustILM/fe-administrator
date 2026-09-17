import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import DiscoveryDetail from './index';
import { DiscoveryStatus, PlatformEnum, Resource, ResourceAction } from 'types/openapi';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { useDispatchMock, useSelectorMock } from '../../test-utils/reactReduxMockModule';

setupReactActEnvironment();

vi.mock('react-redux', async () => await import('../../test-utils/reactReduxMockModule'));

vi.mock('react-router', () => ({
    useParams: () => ({ id: 'disc-1' }),
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/discoveries/detail/disc-1' }),
    useSearchParams: () => [new URLSearchParams(), () => undefined],
    Link: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('components/Container', async () => {
    const { containerMockModule } = await import('../../test-utils/mockModules');
    return containerMockModule();
});

vi.mock('components/Widget', async () => {
    const { widgetMockModule } = await import('../../test-utils/mockModules');
    return widgetMockModule();
});

vi.mock('components/CustomTable', async () => {
    const { customTableMockModule } = await import('../../test-utils/mockModules');
    return customTableMockModule();
});

vi.mock('components/Dialog', async () => {
    const { dialogMockModule } = await import('../../test-utils/mockModules');
    return dialogMockModule();
});

// Every tab's content is rendered so the Details, Results and Run Messages tabs can all be asserted in one mount.
vi.mock('components/Layout/TabLayout', () => ({
    default: ({ tabs }: any) => (
        <div>
            {tabs.map((t: any, i: number) => (
                <section key={t.tabKey ?? (typeof t.title === 'string' ? t.title : i)} data-testid={`tab-${t.tabKey ?? t.title}`}>
                    <h2>{t.title}</h2>
                    {t.content}
                </section>
            ))}
        </div>
    ),
}));

vi.mock('components/Breadcrumb', () => ({ default: ({ items }: any) => <div>{items?.[1]?.label}</div> }));
vi.mock('components/Label', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('components/DetailPageSkeleton', () => ({ default: () => <div data-testid="skeleton">skeleton</div> }));
vi.mock('components/Attributes/AttributeViewer', () => ({
    default: () => <div data-testid="attributes">attributes</div>,
    ATTRIBUTE_VIEWER_TYPE: { METADATA: 'metadata' },
}));
vi.mock('components/Attributes/CustomAttributeWidget', () => ({ default: () => <div data-testid="custom-attributes" /> }));
vi.mock('components/EnumDescription', () => ({ EnumColumnDescription: () => <span /> }));
vi.mock('components/ConnectorLink', () => ({ default: ({ name }: any) => <span>{name}</span> }));
vi.mock('components/_pages/notifications/events-settings/ObjectEventHistoryWidget', () => ({ default: () => <div /> }));
vi.mock('components/CommentPanel', () => ({ default: () => <div /> }));
vi.mock('./DiscoveryCertificates', () => ({ default: () => <div data-testid="discovery-certificates">certificates view</div> }));
vi.mock('./DiscoveryItemsTable', () => ({
    default: ({ resource }: any) => <div data-testid={`discovery-items-${resource}`}>items view</div>,
}));
vi.mock('./DiscoveryRunMessages', () => ({ default: () => <div data-testid="run-messages">run messages</div> }));
vi.mock('utils/widget', () => ({ createWidgetDetailHeaders: () => [] }));

const v1Run = {
    uuid: 'disc-1',
    name: 'nightly-scan',
    kind: 'IP-HostName',
    status: DiscoveryStatus.Completed,
    connectorStatus: DiscoveryStatus.Completed,
    connectorUuid: 'conn-1',
    connectorName: 'network-discovery',
    totalCertificatesDiscovered: 4,
    connectorTotalCertificatesDiscovered: 4,
    attributes: [],
    customAttributes: [],
    triggers: [],
    resources: [Resource.Certificates],
    runMessageCount: 0,
    stoppable: false,
    itemsNewlyDiscovered: 0,
    itemsProcessed: 0,
    itemsFailed: 0,
};

const v2Run = {
    ...v1Run,
    status: DiscoveryStatus.InProgress,
    connectorStatus: DiscoveryStatus.InProgress,
    connectorInterface: { uuid: 'iface-1', code: 'discovery', version: 'v2' },
    resources: [Resource.Certificates, Resource.Keys],
    runMessageCount: 3,
    stoppable: true,
    itemsDiscovered: 52,
    itemsNewlyDiscovered: 7,
    itemsProcessed: 5,
    itemsFailed: 1,
    totalCertificatesDiscovered: 48,
    connectorTotalCertificatesDiscovered: 48,
    progress: {
        targetsProcessed: 12,
        targetsTotal: 30,
        targetsFailed: 3,
        phase: 'scanning',
        byResource: { certificates: { produced: 48, totalEstimate: 120, phase: 'collecting' }, keys: { produced: 4 } },
        updatedAt: '2026-09-13T12:32:07.000Z',
    },
};

const allDiscoveryActions = [ResourceAction.Stop, ResourceAction.Resume, ResourceAction.Cancel, ResourceAction.Delete];

function buildState(discovery: any, allowedActions: ResourceAction[] = allDiscoveryActions, messages?: any) {
    return {
        discoveries: {
            discovery,
            discoveryMessages: messages,
            isFetchingDetail: false,
            isDeleting: false,
            isStopping: false,
            isResuming: false,
            isCancelling: false,
        },
        auth: {
            profile: {
                permissions: { allowedListings: [], allowedActions: [{ resource: Resource.Discoveries, actions: allowedActions }] },
            },
        },
        rules: {
            triggerHistorySummary: undefined,
            isFetchingTriggerHistorySummary: false,
            isFetchingTriggerHistories: false,
        },
        enums: {
            platformEnums: {
                [PlatformEnum.Resource]: {
                    [Resource.Discoveries]: { label: 'Discoveries' },
                    [Resource.Certificates]: { label: 'Certificates' },
                    [Resource.Keys]: { label: 'Keys' },
                },
                [PlatformEnum.TriggerType]: {},
                [PlatformEnum.ResourceEvent]: {},
            },
        },
    };
}

describe('DiscoveryDetail', () => {
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
            root.render(<DiscoveryDetail />);
        });
    }

    const headerButtons = () =>
        Array.from(container.querySelectorAll<HTMLButtonElement>('[data-testid="widget-Discovery Details"] > button')).map((b) => b.title);

    const rowText = (id: string) => container.querySelector(`[data-testid="row-${id}"]`)?.textContent;

    describe('a run against a v1 Discovery Provider renders as before', () => {
        it('carries exactly the delete button, no interface row, no progress widget', async () => {
            await render(buildState(v1Run));

            expect(headerButtons()).toEqual(['Delete']);
            expect(rowText('kind')).toBe('KindIP-HostName');
            expect(container.querySelector('[data-testid="row-connectorInterface"]')).toBeNull();
            expect(container.querySelector('[data-testid="widget-Progress"]')).toBeNull();
            expect(container.querySelector('[data-testid="discovery-certificates"]')).not.toBeNull();
            expect(container.querySelector('[data-testid^="discovery-items-"]')).toBeNull();
        });

        it('reports zero on every import count rather than an empty bar, and a dash where a v1 run has no figure', async () => {
            await render(buildState(v1Run));

            expect(rowText('itemsDiscovered')).toContain('—');
            expect(rowText('itemsNewlyDiscovered')).toBe('New to the inventory0');
            expect(rowText('itemsProcessed')).toBe('Imported0');
            expect(rowText('itemsFailed')).toBe('Failed to import0');
            expect(rowText('totalCertificatesDiscovered')).toBe('Distinct certificates saved4');
            expect(rowText('connectorTotalCertificatesDiscovered')).toContain('4');
            expect(container.querySelector('[data-testid^="certificate-note-"]')).toBeNull();
        });

        it('no longer shows the two mislabelled certificate rows on the details table', async () => {
            await render(buildState(v1Run));

            expect(container.querySelector('[data-testid="row-totalCertificatesDownloaded"]')).toBeNull();
            expect(container.textContent).not.toContain('Total Certificates Downloaded');
        });
    });

    describe('lifecycle controls: stoppable × status × permission', () => {
        it('offers stop and cancel while a stoppable run is in progress', async () => {
            await render(buildState(v2Run));

            expect(headerButtons()).toEqual(['Stop', 'Cancel', 'Delete']);
        });

        it('offers resume and cancel while stopped', async () => {
            await render(buildState({ ...v2Run, status: DiscoveryStatus.Stopped }));

            expect(headerButtons()).toEqual(['Resume', 'Cancel', 'Delete']);
        });

        it('offers nothing once the platform is processing', async () => {
            await render(buildState({ ...v2Run, status: DiscoveryStatus.Processing }));

            expect(headerButtons()).toEqual(['Delete']);
        });

        it('hides a control the user lacks permission for rather than disabling it', async () => {
            await render(buildState(v2Run, [ResourceAction.Cancel]));

            expect(headerButtons()).toEqual(['Cancel', 'Delete']);
        });

        it('disables delete while a lifecycle call is in flight, so two mutations never race', async () => {
            const state = buildState(v2Run);
            state.discoveries.isStopping = true;
            await render(state);

            const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-testid="widget-Discovery Details"] > button'));
            expect(buttons.map((b) => [b.title, b.disabled])).toEqual([
                ['Stop', true],
                ['Cancel', true],
                ['Delete', true],
            ]);
        });

        it('stops immediately, but confirms a cancel in words that say what is lost', async () => {
            await render(buildState(v2Run));

            await act(async () => {
                container.querySelector<HTMLButtonElement>('[data-testid="widget-Discovery Details"] > button[title="Stop"]')?.click();
            });
            expect(dispatch).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'discoveries/stopDiscovery', payload: { uuid: 'disc-1' } }),
            );

            await act(async () => {
                container.querySelector<HTMLButtonElement>('[data-testid="widget-Discovery Details"] > button[title="Cancel"]')?.click();
            });
            const dialog = container.querySelector('[data-testid="dialog"]');
            expect(dialog?.textContent).toContain('never imported');
            expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'discoveries/cancelDiscovery' }));

            await act(async () => {
                Array.from(dialog?.querySelectorAll('button') ?? [])
                    .find((b) => b.textContent === 'Cancel discovery')
                    ?.click();
            });
            expect(dispatch).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'discoveries/cancelDiscovery', payload: { uuid: 'disc-1' } }),
            );
        });
    });

    describe('progress', () => {
        it('draws a determinate Provider bar with its caption, phase and failures', async () => {
            await render(buildState(v2Run));

            const bar = container.querySelector('[data-testid="provider-progress-bar"] [role="progressbar"]');
            expect(bar?.getAttribute('aria-valuenow')).toBe('12');
            expect(bar?.getAttribute('aria-valuemax')).toBe('30');
            expect(container.querySelector('[data-testid="targets-caption"]')?.textContent).toBe('12 / 30 targets');
            expect(container.querySelector('[data-testid="progress-phase"]')?.textContent).toBe('Phase: scanning');
            expect(container.querySelector('[data-testid="progress-recorded"]')?.textContent).toMatch(/^as of \d{4}-/);
            expect(container.querySelector('[data-testid="targets-failed"]')?.textContent).toBe('3 targets failed');
        });

        it('renders an indeterminate bar when the Provider sent no total, never a computed percentage', async () => {
            const progress = { ...v2Run.progress, targetsTotal: undefined };
            await render(buildState({ ...v2Run, progress }));

            const bar = container.querySelector('[data-testid="provider-progress-bar"] [role="progressbar"]');
            expect(bar?.getAttribute('data-indeterminate')).toBe('true');
            expect(bar?.hasAttribute('aria-valuenow')).toBe(false);
            expect(container.querySelector('[data-testid="targets-caption"]')?.textContent).toBe('12 targets');
        });

        it('adds the platform import bar only while processing, counted in items', async () => {
            await render(buildState(v2Run));
            expect(container.querySelector('[data-testid="import-progress"]')).toBeNull();

            await render(buildState({ ...v2Run, status: DiscoveryStatus.Processing }));
            const bar = container.querySelector('[data-testid="import-progress-bar"] [role="progressbar"]');
            expect(bar?.getAttribute('aria-valuenow')).toBe('5');
            expect(bar?.getAttribute('aria-valuemax')).toBe('7');
            expect(container.querySelector('[data-testid="import-progress"]')?.textContent).toContain('1 waiting, 1 failed');
        });

        it('says one target failed without a plural', async () => {
            await render(buildState({ ...v2Run, progress: { ...v2Run.progress, targetsFailed: 1 } }));

            expect(container.querySelector('[data-testid="targets-failed"]')?.textContent).toBe('1 target failed');
        });

        it('draws a full bar when there is nothing to import, never an indeterminate one', async () => {
            await render(
                buildState({ ...v2Run, status: DiscoveryStatus.Processing, itemsNewlyDiscovered: 0, itemsProcessed: 0, itemsFailed: 0 }),
            );

            const bar = container.querySelector('[data-testid="import-progress-bar"] [role="progressbar"]');
            expect(bar?.hasAttribute('data-indeterminate')).toBe(false);
            expect(container.querySelector('[data-testid="import-progress"]')?.textContent).toContain('Nothing to import');
        });

        it('lists the per-resource breakdown by resource label', async () => {
            await render(buildState(v2Run));

            expect(rowText('certificates')).toBe('Certificates48~120collecting');
            expect(rowText('keys')).toBe('Keys4——');
        });
    });

    describe('results', () => {
        it('groups the counts and flags a failed import', async () => {
            await render(buildState(v2Run));

            expect(rowText('itemsDiscovered')).toBe('Items received52');
            expect(rowText('itemsNewlyDiscovered')).toBe('New to the inventory7');
            expect(container.querySelector('[data-testid="items-failed"]')?.textContent).toBe('1');
            expect(container.querySelector('[data-testid="widget-Results"]')?.textContent).toContain('All resources');
            expect(container.querySelector('[data-testid="widget-Results"]')?.textContent).toContain('Certificates only');
        });

        it('explains a provider figure above the saved one as repeats on a completed certificates-only run', async () => {
            await render(
                buildState({
                    ...v2Run,
                    status: DiscoveryStatus.Completed,
                    resources: [Resource.Certificates],
                    itemsDiscovered: 12,
                    totalCertificatesDiscovered: 8,
                    connectorTotalCertificatesDiscovered: 12,
                }),
            );

            expect(container.querySelector('[data-testid="certificate-note-repeats"]')?.textContent).toBe(
                '4 repeated a certificate already received in this run',
            );
            expect(container.querySelector('[data-testid="certificate-note-notHandedOver"]')).toBeNull();
        });

        it('says what was never handed over when a run ended before its provider finished', async () => {
            await render(
                buildState({
                    ...v2Run,
                    status: DiscoveryStatus.Cancelled,
                    resources: [Resource.Certificates],
                    itemsDiscovered: 9,
                    totalCertificatesDiscovered: 8,
                    connectorTotalCertificatesDiscovered: 12,
                }),
            );

            expect(container.querySelector('[data-testid="certificate-note-notHandedOver"]')?.textContent).toContain('3 reported');
        });

        it('holds the never-handed-over note while a certificates-only run is still live', async () => {
            await render(
                buildState({
                    ...v2Run,
                    status: DiscoveryStatus.InProgress,
                    resources: [Resource.Certificates],
                    itemsDiscovered: 9,
                    totalCertificatesDiscovered: 8,
                    connectorTotalCertificatesDiscovered: 12,
                }),
            );

            expect(container.querySelector('[data-testid="certificate-note-notHandedOver"]')).toBeNull();
            expect(container.querySelector('[data-testid="certificate-note-repeats"]')).not.toBeNull();
        });

        it('omits the certificate counters for a run that never targeted certificates', async () => {
            await render(buildState({ ...v2Run, resources: [Resource.Keys] }));

            expect(container.querySelector('[data-testid="widget-Results"]')?.textContent).toContain('All resources');
            expect(container.querySelector('[data-testid="widget-Results"]')?.textContent).not.toContain('Certificates only');
        });

        it('names the ending in words rather than the wire code', async () => {
            await render(buildState({ ...v2Run, status: DiscoveryStatus.Cancelled }));
            expect(container.querySelector('[data-testid="not-processed-banner"]')?.textContent).toContain('This run was cancelled');

            await render(buildState({ ...v2Run, status: DiscoveryStatus.Failed }));
            expect(container.querySelector('[data-testid="not-processed-banner"]')?.textContent).toContain('This run failed');
            expect(container.querySelector('[data-testid="not-processed-banner"]')?.textContent).not.toContain('ended failed');
        });

        it('derives one Results view per run resource, certificates keeping their own view', async () => {
            await render(buildState(v2Run));

            expect(container.querySelector('[data-testid="discovery-certificates"]')).not.toBeNull();
            expect(container.querySelector('[data-testid="discovery-items-keys"]')).not.toBeNull();
        });

        it.each([DiscoveryStatus.Cancelled, DiscoveryStatus.Failed])('shows the not-processed banner for a %s run', async (status) => {
            await render(buildState({ ...v2Run, status }));

            expect(container.querySelector('[data-testid="not-processed-banner"]')).not.toBeNull();
        });

        it('shows no banner for a run that completed', async () => {
            await render(buildState(v1Run));

            expect(container.querySelector('[data-testid="not-processed-banner"]')).toBeNull();
        });
    });

    describe('refreshing', () => {
        it('keeps the page while a refresh is in flight and shows the skeleton only before the first load', async () => {
            const refreshing = buildState(v2Run);
            refreshing.discoveries.isFetchingDetail = true;
            await render(refreshing);
            expect(container.querySelector('[data-testid="skeleton"]')).toBeNull();
            expect(container.querySelector('[data-testid="widget-Discovery Details"]')).not.toBeNull();

            const firstLoad = buildState(undefined);
            firstLoad.discoveries.isFetchingDetail = true;
            await render(firstLoad);
            expect(container.querySelector('[data-testid="skeleton"]')).not.toBeNull();
        });
    });

    describe('run messages', () => {
        it('badges the tab from the detail count without fetching the log', async () => {
            await render(buildState(v2Run));

            expect(container.querySelector('[data-testid="run-message-count"]')?.textContent).toBe('3');
            expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'discoveries/getDiscoveryMessages' }));
        });

        it('shows the interface the run is driven through, and no kind, which a v2 provider does not have', async () => {
            await render(buildState(v2Run));

            expect(rowText('connectorInterface')).toBe('Connector InterfaceDiscovery (v2)');
            expect(container.querySelector('[data-testid="row-kind"]')).toBeNull();
        });

        it('says when a v2 provider has reported no run metadata, and stays quiet for a v1 run', async () => {
            await render(buildState(v2Run));
            expect(container.querySelector('[data-testid="no-run-metadata"]')).not.toBeNull();

            await render(buildState({ ...v2Run, metadata: [{ connectorUuid: 'conn-1', connectorName: 'x', items: [] }] }));
            expect(container.querySelector('[data-testid="no-run-metadata"]')).toBeNull();

            await render(buildState(v1Run));
            expect(container.querySelector('[data-testid="no-run-metadata"]')).toBeNull();
        });

        it('titles the tab Messages', async () => {
            await render(buildState(v2Run));

            expect(container.querySelector('[data-testid="tab-messages"] h2')?.textContent).toBe('Messages3');
        });

        it('says when a reading carries no time rather than leaving the caption blank', async () => {
            await render(buildState({ ...v2Run, progress: { ...v2Run.progress, updatedAt: undefined } }));

            expect(container.querySelector('[data-testid="progress-recorded"]')?.textContent).toBe('time of this reading not recorded');
        });
    });
});
