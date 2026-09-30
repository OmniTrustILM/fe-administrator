import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { actions } from 'ducks/oids';
import { setupReactActEnvironment } from '../_pages/test-utils/reactActEnvironment';
import { useDispatchMock, useSelectorMock } from '../_pages/test-utils/reactReduxMockModule';
import { useFetchExtensionOidRegistry } from './useDerExtensionOids';

setupReactActEnvironment();

vi.mock('react-redux', async () => await import('../_pages/test-utils/reactReduxMockModule'));

const MAPPED = ['1.2.3.1', '1.2.3.2', '2.5.29.19'];

function Probe({ mappedOids }: Readonly<{ mappedOids: string[] }>) {
    const { failed, reload } = useFetchExtensionOidRegistry(mappedOids);
    return <button type="button" data-testid="reload" data-failed={String(failed)} onClick={reload} />;
}

describe('useFetchExtensionOidRegistry', () => {
    let container: HTMLDivElement;
    let root: Root;
    let dispatchFn: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        container = document.createElement('div');
        root = createRoot(container);
        dispatchFn = vi.fn();
        useDispatchMock.mockReturnValue(dispatchFn);
        const state = {
            oids: {
                oidsByCategory: {
                    certificateExtension: [
                        { oid: '1.2.3.1', displayName: 'Mapped, not loaded', category: 'certificateExtension' },
                        { oid: '1.2.3.2', displayName: 'Mapped, already requested', category: 'certificateExtension' },
                        { oid: '1.2.3.3', displayName: 'Not mapped', category: 'certificateExtension' },
                    ],
                },
                oidsByCategoryError: {},
                systemOidsError: false,
                extensionOidDetails: {},
                extensionOidDetailsRequested: { '1.2.3.2': true },
                extensionOidDetailsFailed: {},
                systemOids: [],
            },
        };
        useSelectorMock.mockImplementation((selector: any) => selector(state));
    });

    afterEach(() => {
        act(() => root.unmount());
        vi.clearAllMocks();
    });

    const detailRequests = () => dispatchFn.mock.calls.map(([action]) => action).filter(actions.getExtensionOidDetail.match);

    it('reads the detail of each mapped custom extension not asked for yet', async () => {
        await act(async () => root.render(<Probe mappedOids={MAPPED} />));

        expect(detailRequests().map((action) => action.payload.oid)).toEqual(['1.2.3.1']);
    });

    it('does not ask again for the OIDs still loading when a detail arrives for another', async () => {
        await act(async () => root.render(<Probe mappedOids={MAPPED} />));
        expect(detailRequests()).toHaveLength(1);

        const previous = useSelectorMock.getMockImplementation()!;
        const before = previous((s: unknown) => s) as { oids: Record<string, unknown> };
        const after = {
            oids: {
                ...before.oids,
                extensionOidDetailsRequested: { '1.2.3.1': true, '1.2.3.2': true },
                extensionOidDetails: { '1.2.3.2': { oid: '1.2.3.2' } },
            },
        };
        useSelectorMock.mockImplementation((selector: any) => selector(after));
        await act(async () => root.render(<Probe mappedOids={MAPPED} />));

        expect(detailRequests()).toHaveLength(1);
    });

    it('reports a registry list that could not be loaded and loads both lists again on request', async () => {
        const failedState = {
            oids: {
                oidsByCategory: {},
                oidsByCategoryError: { certificateExtension: true },
                systemOidsError: false,
                extensionOidDetails: {},
                extensionOidDetailsRequested: {},
                extensionOidDetailsFailed: {},
                systemOids: [],
            },
        };
        useSelectorMock.mockImplementation((selector: any) => selector(failedState));
        await act(async () => root.render(<Probe mappedOids={MAPPED} />));
        const reload = container.querySelector<HTMLButtonElement>('[data-testid="reload"]');
        expect(reload?.dataset.failed).toBe('true');

        dispatchFn.mockClear();
        await act(async () => reload?.click());
        expect(dispatchFn.mock.calls.map(([action]) => action.type)).toEqual([
            actions.listSystemOids.type,
            actions.listOidsByCategory.type,
        ]);
    });

    it('fetches nothing when no attribute maps to an extension', async () => {
        await act(async () => root.render(<Probe mappedOids={[]} />));

        expect(dispatchFn).not.toHaveBeenCalled();
    });
});
