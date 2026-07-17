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

describe('Widget reset-view action', () => {
    let container: HTMLDivElement;
    let root: Root;
    let dispatch: ReturnType<typeof vi.fn>;

    const render = async (element: React.ReactElement) => {
        await act(async () => {
            root.render(element);
        });
    };

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
        await render(<Widget title="Explicit" resetViewAction={resetViewAction} />);

        const button = resetButton();
        expect(button).toBeTruthy();

        await act(async () => {
            button!.click();
        });

        expect(resetViewAction).toHaveBeenCalledTimes(1);
    });

    it('does not render a reset-view action without a refresh action or resettable state', async () => {
        await render(<Widget title="Plain" />);
        expect(resetButton()).toBeNull();
    });

    it('does not derive a reset-view action when the route has no resettable table state', async () => {
        await render(<Widget title="No state" refreshAction={() => {}} />);
        expect(resetButton()).toBeNull();
    });

    it('derives a reset-view action from refreshAction when the route has resettable table state', async () => {
        mockState = resettableState('/certificates');
        await render(<Widget title="Derived" refreshAction={() => {}} />);

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
        await render(<Widget title="Both" refreshAction={() => {}} resetViewAction={resetViewAction} />);

        await act(async () => {
            resetButton()!.click();
        });

        expect(resetViewAction).toHaveBeenCalledTimes(1);
        expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'tablePagination/clearPaginationByPath' }));
    });
});

describe('Widget refresh action disabled state', () => {
    let container: HTMLDivElement;
    let root: Root;

    const render = async (element: React.ReactElement) => {
        await act(async () => {
            root.render(element);
        });
    };

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);

        mockPathname = '/certificates';
        mockState = pristineState();
        useDispatchMock.mockReturnValue(vi.fn());
        useSelectorMock.mockImplementation((selector: any) => selector(mockState));
    });

    afterEach(async () => {
        await act(async () => {
            root.unmount();
        });
        container.remove();
        vi.clearAllMocks();
    });

    const refreshButton = () => container.querySelector('[data-testid="refresh-icon"]') as HTMLButtonElement | null;

    it('enables the refresh button when neither busy nor disableRefresh is set', async () => {
        await render(<Widget title="Idle" refreshAction={() => {}} />);
        expect(refreshButton()!.disabled).toBe(false);
    });

    it('disables the refresh button via disableRefresh even when busy is false', async () => {
        await render(<Widget title="Fetching" refreshAction={() => {}} busy={false} disableRefresh />);
        expect(refreshButton()!.disabled).toBe(true);
    });

    it('disables the refresh button while busy', async () => {
        await render(<Widget title="Busy" refreshAction={() => {}} busy />);
        expect(refreshButton()!.disabled).toBe(true);
    });
});
