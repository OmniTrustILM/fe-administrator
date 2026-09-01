import { act } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import Widget from './index';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const useDispatchMock = vi.fn();
const useSelectorMock = vi.fn();

let mockState: any;
let mockPathname = '/certificates';

vi.mock('react-redux', () => ({
    useDispatch: () => useDispatchMock(),
    useSelector: (selector: any) => useSelectorMock(selector),
}));

vi.mock('react-router', () => ({
    useLocation: () => ({ pathname: mockPathname }),
    Link: ({ to, children }: any) => <a href={to}>{children}</a>,
}));

const resettableState = (pathname: string) => ({
    userInterface: { widgetLocks: [] },
    tablePagination: { byKey: { [`custom-table-pagination:${pathname}:certs-table`]: { page: 3, pageSize: 10 } } },
});

const pristineState = () => ({
    userInterface: { widgetLocks: [] },
    tablePagination: { byKey: {} },
});

const renderInto = async (root: Root, element: React.ReactElement) => {
    await act(async () => {
        root.render(element);
    });
};

/** Registers the mount/unmount lifecycle shared by the describes that need no dispatch spy of their own. */
function useWidgetHarness() {
    const harness = { container: null as unknown as HTMLDivElement, root: null as unknown as Root };

    beforeEach(() => {
        harness.container = document.createElement('div');
        document.body.appendChild(harness.container);
        harness.root = createRoot(harness.container);

        mockPathname = '/certificates';
        mockState = pristineState();
        useDispatchMock.mockReturnValue(vi.fn());
        useSelectorMock.mockImplementation((selector: any) => selector(mockState));
    });

    afterEach(async () => {
        await act(async () => {
            harness.root.unmount();
        });
        harness.container.remove();
        vi.clearAllMocks();
    });

    return harness;
}

describe('Widget reset-view action', () => {
    let container: HTMLDivElement;
    let root: Root;
    let dispatch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);

        dispatch = vi.fn();
        mockPathname = '/certificates';
        mockState = pristineState();
        useDispatchMock.mockReturnValue(dispatch);
        useSelectorMock.mockImplementation((selector: any) => selector(mockState));
    });

    afterEach(async () => {
        await act(async () => {
            root.unmount();
        });
        container.remove();
        vi.clearAllMocks();
    });

    const resetButton = () => container.querySelector('[data-testid="reset-view-icon"]') as HTMLButtonElement | null;

    it('renders an explicit reset-view action and invokes it on click', async () => {
        const resetViewAction = vi.fn();
        await renderInto(root, <Widget title="Explicit" resetViewAction={resetViewAction} />);

        const button = resetButton();
        expect(button).toBeTruthy();

        await act(async () => {
            button!.click();
        });

        expect(resetViewAction).toHaveBeenCalledTimes(1);
    });

    it('does not render a reset-view action without a refresh action or resettable state', async () => {
        await renderInto(root, <Widget title="Plain" />);
        expect(resetButton()).toBeNull();
    });

    it('does not derive a reset-view action when the route has no resettable table state', async () => {
        await renderInto(root, <Widget title="No state" refreshAction={() => {}} />);
        expect(resetButton()).toBeNull();
    });

    it('derives a reset-view action from refreshAction when the route has resettable table state', async () => {
        mockState = resettableState('/certificates');
        await renderInto(root, <Widget title="Derived" refreshAction={() => {}} />);

        const button = resetButton();
        expect(button).toBeTruthy();

        await act(async () => {
            button!.click();
        });

        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'tablePagination/clearPaginationByPath', payload: { pathname: '/certificates' } }),
        );
    });

    it('prefers an explicit reset-view action over the derived one', async () => {
        mockState = resettableState('/certificates');
        const resetViewAction = vi.fn();
        await renderInto(root, <Widget title="Both" refreshAction={() => {}} resetViewAction={resetViewAction} />);

        await act(async () => {
            resetButton()!.click();
        });

        expect(resetViewAction).toHaveBeenCalledTimes(1);
        expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'tablePagination/clearPaginationByPath' }));
    });
});

describe('Widget refresh action disabled state', () => {
    const harness = useWidgetHarness();

    const refreshButton = () => harness.container.querySelector('[data-testid="refresh-icon"]') as HTMLButtonElement | null;

    it('enables the refresh button when neither busy nor disableRefresh is set', async () => {
        await renderInto(harness.root, <Widget title="Idle" refreshAction={() => {}} />);
        expect(refreshButton()!.disabled).toBe(false);
    });

    it('disables the refresh button via disableRefresh even when busy is false', async () => {
        await renderInto(harness.root, <Widget title="Fetching" refreshAction={() => {}} busy={false} disableRefresh />);
        expect(refreshButton()!.disabled).toBe(true);
    });

    it('disables the refresh button while busy', async () => {
        await renderInto(harness.root, <Widget title="Busy" refreshAction={() => {}} busy />);
        expect(refreshButton()!.disabled).toBe(true);
    });
});

describe('Widget caller-owned lock', () => {
    const harness = useWidgetHarness();

    it('renders the widget lock passed by the caller instead of the children', async () => {
        await renderInto(
            harness.root,
            <Widget title="Locked" widgetLock={{ lockTitle: 'Access Denied', lockText: 'Denied', lockType: 2 }}>
                <span data-testid="child">child</span>
            </Widget>,
        );

        expect(harness.container.querySelector('[data-testid="widget-lock"]')?.textContent).toContain('Access Denied');
        expect(harness.container.querySelector('[data-testid="child"]')).toBeNull();
    });

    it('keeps the refresh button live under a caller-owned lock, so it can be retried', async () => {
        const refresh = vi.fn();
        await renderInto(
            harness.root,
            <Widget title="Locked" refreshAction={refresh} widgetLock={{ lockTitle: 'Comments unavailable', lockText: 'x', lockType: 3 }}>
                <span data-testid="child">child</span>
            </Widget>,
        );

        const button = harness.container.querySelector('[data-testid="refresh-icon"]') as HTMLButtonElement;
        expect(button.disabled).toBe(false);
        await act(async () => {
            button.click();
        });
        expect(refresh).toHaveBeenCalledTimes(1);
    });

    it('disables the refresh button under a lock registered in the store, which refreshing cannot clear', async () => {
        mockState = {
            userInterface: { widgetLocks: [{ widgetName: 'certificateDetails', lockTitle: 'Access Denied', lockText: 'x', lockType: 2 }] },
            tablePagination: { byKey: {} },
        };

        await renderInto(harness.root, <Widget title="Locked" refreshAction={() => {}} widgetLockName={'certificateDetails' as never} />);

        expect((harness.container.querySelector('[data-testid="refresh-icon"]') as HTMLButtonElement).disabled).toBe(true);
    });

    it('renders the children when no lock is passed and none is registered globally', async () => {
        await renderInto(
            harness.root,
            <Widget title="Open">
                <span data-testid="child">child</span>
            </Widget>,
        );

        expect(harness.container.querySelector('[data-testid="widget-lock"]')).toBeNull();
        expect(harness.container.querySelector('[data-testid="child"]')).toBeTruthy();
    });
});
