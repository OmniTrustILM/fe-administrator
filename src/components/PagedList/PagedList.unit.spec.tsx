import { act } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import PagedList from './PagedList';
import { EntityType } from 'ducks/filters';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const useDispatchMock = vi.fn();
const useSelectorMock = vi.fn();
const useNavigateMock = vi.fn();

let mockState: any;

vi.mock('react-redux', () => ({
    useDispatch: () => useDispatchMock(),
    useSelector: (selector: any) => useSelectorMock(selector),
}));

vi.mock('react-router', () => ({
    useNavigate: () => useNavigateMock(),
}));

vi.mock('components/FilterWidget', () => ({
    default: ({ title }: any) => <div data-testid="filter-widget">{title}</div>,
}));

vi.mock('components/Widget', () => ({
    default: ({ widgetButtons, refreshAction, hideWidgetButtons, children }: any) => (
        <div>
            <button type="button" data-testid="refresh" onClick={refreshAction}>
                refresh
            </button>
            {!hideWidgetButtons &&
                (widgetButtons || []).map((button: any, index: number) => (
                    <button
                        type="button"
                        key={`${button.icon}-${index}`}
                        data-testid={`widget-btn-${button.icon}-${index}`}
                        disabled={button.disabled}
                        onClick={() => button.onClick({} as any)}
                    >
                        {button.tooltip || button.icon}
                    </button>
                ))}
            {children}
        </div>
    ),
}));

vi.mock('components/CustomTable', () => ({
    default: ({
        onPageChanged,
        onPageSizeChanged,
        onCheckedRowsChanged,
        disablePaginationControls,
        disableSelectionControls,
        disableSearchControls,
    }: any) => (
        <div data-testid="table">
            <div data-testid="table-pagination-disabled">{disablePaginationControls ? 'true' : 'false'}</div>
            <div data-testid="table-selection-disabled">{disableSelectionControls ? 'true' : 'false'}</div>
            <div data-testid="table-search-disabled">{disableSearchControls ? 'true' : 'false'}</div>
            <button type="button" data-testid="table-page-change" onClick={() => onPageChanged?.(3)}>
                page
            </button>
            <button type="button" data-testid="table-size-change" onClick={() => onPageSizeChanged?.(50)}>
                size
            </button>
            <button type="button" data-testid="table-check-change" onClick={() => onCheckedRowsChanged?.(['row-1'])}>
                check
            </button>
        </div>
    ),
}));

vi.mock('components/Dialog', () => ({
    default: ({ isOpen, caption, body, toggle, buttons }: any) =>
        isOpen ? (
            <div data-testid="dialog">
                <div>{caption}</div>
                <div>{body}</div>
                <button type="button" data-testid="dialog-toggle" onClick={toggle}>
                    toggle
                </button>
                <button type="button" data-testid="dialog-cancel" onClick={() => buttons?.[0]?.onClick()}>
                    cancel
                </button>
                <button type="button" data-testid="dialog-confirm" onClick={() => buttons?.[1]?.onClick()}>
                    confirm
                </button>
            </div>
        ) : null,
}));

const headers = [{ id: 'name', content: 'Name', sortable: true }] as any;
const rows = [{ id: 'row-1', columns: ['First row'] }] as any;

describe('PagedList unit coverage', () => {
    let container: HTMLDivElement;
    let root: Root;
    let dispatch: ReturnType<typeof vi.fn>;
    let navigate: ReturnType<typeof vi.fn>;

    const renderPagedList = async (overrides: any = {}) => {
        await act(async () => {
            root.render(
                <PagedList
                    entity={EntityType.CBOM}
                    headers={headers}
                    data={rows}
                    title="CBOMs"
                    filterTitle="Filters"
                    entityNameSingular="CBOM"
                    entityNamePlural="CBOMs"
                    onListCallback={vi.fn()}
                    {...overrides}
                />,
            );
        });
    };

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);

        dispatch = vi.fn();
        navigate = vi.fn();
        useDispatchMock.mockReturnValue(dispatch);
        useNavigateMock.mockReturnValue(navigate);

        mockState = {
            filters: {
                filters: [
                    {
                        entity: EntityType.CBOM,
                        filter: { currentFilters: [], availableFilters: [], preservedFilters: [], isFetchingFilters: false },
                    },
                ],
            },
            pagings: {
                pagings: [
                    {
                        entity: EntityType.CBOM,
                        paging: {
                            totalItems: 20,
                            checkedRows: [],
                            isFetchingList: false,
                            pageNumber: 2,
                            pageSize: 10,
                        },
                    },
                ],
            },
        };

        useSelectorMock.mockImplementation((selector: any) => selector(mockState));
    });

    afterEach(async () => {
        await act(async () => {
            root.unmount();
        });
        container.remove();
        vi.clearAllMocks();
    });

    it('renders filter widget only when filter props are present', async () => {
        await renderPagedList({ getAvailableFiltersApi: vi.fn() });
        expect(container.querySelector('[data-testid="filter-widget"]')?.textContent).toContain('Filters');

        await renderPagedList({ filterTitle: undefined, getAvailableFiltersApi: vi.fn() });
        expect(container.querySelector('[data-testid="filter-widget"]')).toBeNull();
    });

    it('navigates to add form when create button is clicked', async () => {
        await renderPagedList({ addHidden: false });

        const createButton = container.querySelector('[data-testid="widget-btn-plus-0"]') as HTMLButtonElement;
        expect(createButton).toBeTruthy();

        await act(async () => {
            createButton.click();
        });

        expect(navigate).toHaveBeenCalledWith('./add');
    });

    it('dispatches checked row updates and pagination changes from table callbacks', async () => {
        await renderPagedList();

        const checkButton = container.querySelector('[data-testid="table-check-change"]') as HTMLButtonElement;
        const pageButton = container.querySelector('[data-testid="table-page-change"]') as HTMLButtonElement;
        const sizeButton = container.querySelector('[data-testid="table-size-change"]') as HTMLButtonElement;

        await act(async () => {
            checkButton.click();
            pageButton.click();
            sizeButton.click();
        });

        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'pagings/setCheckedRows', payload: { entity: EntityType.CBOM, checkedRows: ['row-1'] } }),
        );
        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'pagings/setPagination', payload: { entity: EntityType.CBOM, pageSize: 10, pageNumber: 3 } }),
        );
        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'pagings/setPagination', payload: { entity: EntityType.CBOM, pageSize: 50, pageNumber: 1 } }),
        );
    });

    it('shows delete button disabled when no rows are selected', async () => {
        await renderPagedList({ addHidden: true, onDeleteCallback: vi.fn() });

        const deleteButton = container.querySelector('[data-testid="widget-btn-trash-0"]') as HTMLButtonElement;
        expect(deleteButton).toBeTruthy();
        expect(deleteButton.disabled).toBe(true);
    });

    it('opens dialog and confirms deletion for selected rows', async () => {
        mockState.pagings.pagings[0].paging.checkedRows = ['row-1', 'row-2'];
        const onDeleteCallback = vi.fn();
        const onListCallback = vi.fn();

        await renderPagedList({ addHidden: true, onDeleteCallback, onListCallback });

        const deleteButton = container.querySelector('[data-testid="widget-btn-trash-0"]') as HTMLButtonElement;
        await act(async () => {
            deleteButton.click();
        });

        expect(container.querySelector('[data-testid="dialog"]')).toBeTruthy();

        const confirmButton = container.querySelector('[data-testid="dialog-confirm"]') as HTMLButtonElement;
        await act(async () => {
            confirmButton.click();
        });

        expect(onDeleteCallback).toHaveBeenCalledWith(['row-1', 'row-2'], []);
        expect(onListCallback).toHaveBeenCalledWith({ itemsPerPage: 10, pageNumber: 2, filters: [] });
    });

    it('resets pagination when current filters change after first render', async () => {
        await renderPagedList();

        const paginationCallsBefore = dispatch.mock.calls.filter((call) => call[0]?.type === 'pagings/setPagination').length;

        mockState.filters.filters[0].filter.currentFilters = [{ fieldIdentifier: 'name', value: ['cbom'], type: 'TEXT' }];

        await renderPagedList();

        const paginationCallsAfter = dispatch.mock.calls.filter((call) => call[0]?.type === 'pagings/setPagination');

        expect(paginationCallsAfter.length).toBeGreaterThan(paginationCallsBefore);
        expect(paginationCallsAfter.at(-1)?.[0]).toEqual(
            expect.objectContaining({
                type: 'pagings/setPagination',
                payload: { entity: EntityType.CBOM, pageSize: 10, pageNumber: 1 },
            }),
        );
    });

    it('hides widget buttons when hideWidgetButtons is true', async () => {
        await renderPagedList({ addHidden: false, onDeleteCallback: vi.fn(), hideWidgetButtons: true });

        expect(container.querySelector('[data-testid^="widget-btn-"]')).toBeNull();
    });

    it.each([
        ['pagination', 'table-pagination-disabled'],
        ['selection', 'table-selection-disabled'],
        ['search', 'table-search-disabled'],
    ])('disables %s controls when busy', async (_controlName, testId) => {
        await renderPagedList({ isBusy: true });

        const disabledState = container.querySelector(`[data-testid="${testId}"]`) as HTMLElement;
        expect(disabledState.textContent).toBe('true');
    });

    it('renders additional buttons alongside built-in buttons', async () => {
        const additionalButtons = [{ icon: 'sync', disabled: false, tooltip: 'Sync', onClick: vi.fn() }];
        await renderPagedList({ addHidden: false, additionalButtons });

        expect(container.querySelector('[data-testid="widget-btn-plus-0"]')).toBeTruthy();
        expect(container.querySelector('[data-testid^="widget-btn-sync-"]')).toBeTruthy();
    });

    it('closes dialog when cancel button is clicked', async () => {
        mockState.pagings.pagings[0].paging.checkedRows = ['row-1'];
        await renderPagedList({ addHidden: true, onDeleteCallback: vi.fn() });

        const deleteButton = container.querySelector('[data-testid="widget-btn-trash-0"]') as HTMLButtonElement;
        await act(async () => {
            deleteButton.click();
        });

        expect(container.querySelector('[data-testid="dialog"]')).toBeTruthy();

        const cancelButton = container.querySelector('[data-testid="dialog-cancel"]') as HTMLButtonElement;
        await act(async () => {
            cancelButton.click();
        });

        expect(container.querySelector('[data-testid="dialog"]')).toBeNull();
    });

    it('closes dialog when toggle is called', async () => {
        mockState.pagings.pagings[0].paging.checkedRows = ['row-1'];
        await renderPagedList({ addHidden: true, onDeleteCallback: vi.fn() });

        const deleteButton = container.querySelector('[data-testid="widget-btn-trash-0"]') as HTMLButtonElement;
        await act(async () => {
            deleteButton.click();
        });

        expect(container.querySelector('[data-testid="dialog"]')).toBeTruthy();

        const toggleButton = container.querySelector('[data-testid="dialog-toggle"]') as HTMLButtonElement;
        await act(async () => {
            toggleButton.click();
        });

        expect(container.querySelector('[data-testid="dialog"]')).toBeNull();
    });

    it('uses singular entity name in dialog when one row is selected', async () => {
        mockState.pagings.pagings[0].paging.checkedRows = ['row-1'];
        await renderPagedList({ addHidden: true, onDeleteCallback: vi.fn() });

        const deleteButton = container.querySelector('[data-testid="widget-btn-trash-0"]') as HTMLButtonElement;
        await act(async () => {
            deleteButton.click();
        });

        const dialog = container.querySelector('[data-testid="dialog"]') as HTMLElement;
        expect(dialog.textContent).toContain('CBOM');
    });

    it('uses plural entity name in dialog when multiple rows are selected', async () => {
        mockState.pagings.pagings[0].paging.checkedRows = ['row-1', 'row-2'];
        await renderPagedList({ addHidden: true, onDeleteCallback: vi.fn() });

        const deleteButton = container.querySelector('[data-testid="widget-btn-trash-0"]') as HTMLButtonElement;
        await act(async () => {
            deleteButton.click();
        });

        const dialog = container.querySelector('[data-testid="dialog"]') as HTMLElement;
        expect(dialog.textContent).toContain('CBOMs');
    });
});
