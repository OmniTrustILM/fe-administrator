import { act, useEffect } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import PagedList from './PagedList';
import { EntityType } from 'ducks/filters';
import { FilterFieldSource, Resource } from 'types/openapi';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const useDispatchMock = vi.fn();
const useSelectorMock = vi.fn();
const useNavigateMock = vi.fn();

let mockState: any;
let mockPathname = '/test-list';

vi.mock('react-redux', () => ({
    useDispatch: () => useDispatchMock(),
    useSelector: (selector: any) => useSelectorMock(selector),
    useStore: () => ({
        getState: () => mockState,
    }),
}));

vi.mock('react-router', () => ({
    useNavigate: () => useNavigateMock(),
    useLocation: () => ({ pathname: mockPathname }),
}));

const filterWidget = vi.hoisted(() => ({ mounts: 0 }));

vi.mock('components/FilterWidget', () => ({
    default: ({ title }: any) => {
        useEffect(() => {
            filterWidget.mounts += 1;
        }, []);
        return <div data-testid="filter-widget">{title}</div>;
    },
    FilterWidgetSkeleton: ({ title }: any) => <div data-testid="filter-widget-skeleton">{title}</div>,
}));

vi.mock('components/Widget', () => ({
    default: ({ widgetButtons, refreshAction, resetViewAction, hideWidgetButtons, busy, disableRefresh, children }: any) => (
        <div>
            <button type="button" data-testid="refresh" disabled={Boolean(busy || disableRefresh)} onClick={refreshAction}>
                refresh
            </button>
            {resetViewAction && (
                <button type="button" data-testid="reset-view" onClick={resetViewAction}>
                    reset
                </button>
            )}
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
        mockPathname = '/test-list';
        filterWidget.mounts = 0;
        useDispatchMock.mockReturnValue(dispatch);
        useNavigateMock.mockReturnValue(navigate);

        mockState = {
            filters: {
                filters: [
                    {
                        entity: EntityType.CBOM,
                        filter: {
                            currentFilters: [],
                            availableFilters: [],
                            preservedFilters: [],
                            isFetchingFilters: false,
                            hasLoadedFilters: true,
                        },
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

    it('does not expose a reset-view action when the view is at its defaults', async () => {
        mockState.pagings.pagings[0].paging.pageNumber = 1;
        mockState.pagings.pagings[0].paging.pageSize = 10;
        mockState.filters.filters[0].filter.currentFilters = [];

        await renderPagedList();

        expect(container.querySelector('[data-testid="reset-view"]')).toBeNull();
    });

    it('resets filters and pagination when the reset-view action is triggered', async () => {
        // mockState defaults to pageNumber 2, so the view is non-default and the reset action is exposed
        await renderPagedList();

        const resetButton = container.querySelector('[data-testid="reset-view"]') as HTMLButtonElement;
        expect(resetButton).toBeTruthy();

        await act(async () => {
            resetButton.click();
        });

        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'filters/setCurrentFilters', payload: { entity: EntityType.CBOM, currentFilters: [] } }),
        );
        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'filters/setPreservedFilters', payload: { entity: EntityType.CBOM, preservedFilters: [] } }),
        );
        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'pagings/resetPaging', payload: { entity: EntityType.CBOM } }),
        );
        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'tablePagination/clearPaginationByRootRoute', payload: { rootRoute: 'test-list' } }),
        );
    });

    it('skips the root-route pagination reset when the path has no root segment', async () => {
        mockPathname = '/';

        await renderPagedList();

        const resetButton = container.querySelector('[data-testid="reset-view"]') as HTMLButtonElement;
        await act(async () => {
            resetButton.click();
        });

        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'pagings/resetPaging', payload: { entity: EntityType.CBOM } }),
        );
        expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'tablePagination/clearPaginationByRootRoute' }));
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

    it('uses latest pageSize from store when page changes immediately after size change', async () => {
        await renderPagedList();

        const sizeButton = container.querySelector('[data-testid="table-size-change"]') as HTMLButtonElement;
        const pageButton = container.querySelector('[data-testid="table-page-change"]') as HTMLButtonElement;

        await act(async () => {
            sizeButton.click();
            mockState.pagings.pagings[0].paging.pageSize = 50;
            pageButton.click();
        });

        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'pagings/setPagination', payload: { entity: EntityType.CBOM, pageSize: 50, pageNumber: 3 } }),
        );
    });

    it('steps back onto the last page when the list shrank under the page it is on', async () => {
        mockState.pagings.pagings[0].paging.totalItems = 10;
        mockState.pagings.pagings[0].paging.pageNumber = 2;

        await renderPagedList();

        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'pagings/setPagination', payload: { entity: EntityType.CBOM, pageSize: 10, pageNumber: 1 } }),
        );
    });

    it('leaves the page number alone while the list is in flight, and for a list that is simply empty', async () => {
        mockState.pagings.pagings[0].paging.totalItems = 10;
        mockState.pagings.pagings[0].paging.pageNumber = 2;
        mockState.pagings.pagings[0].paging.isFetchingList = true;

        await renderPagedList();

        expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'pagings/setPagination' }));

        mockState.pagings.pagings[0].paging.isFetchingList = false;
        mockState.pagings.pagings[0].paging.totalItems = 0;

        await renderPagedList();

        expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'pagings/setPagination' }));
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

    it('resets pagination when current filters no longer match the ones the page was listed with', async () => {
        mockState.pagings.pagings[0].paging.filtersSnapshot = '[]';
        mockState.filters.filters[0].filter.currentFilters = [{ fieldIdentifier: 'name', value: ['cbom'], type: 'TEXT' }];

        await renderPagedList();

        const paginationCalls = dispatch.mock.calls.filter((call) => call[0]?.type === 'pagings/setPagination');

        expect(paginationCalls.at(-1)?.[0]).toEqual(
            expect.objectContaining({
                type: 'pagings/setPagination',
                payload: { entity: EntityType.CBOM, pageSize: 10, pageNumber: 1 },
            }),
        );
    });

    it('records the listed filters without resetting pagination when no snapshot is stored yet', async () => {
        mockState.filters.filters[0].filter.currentFilters = [{ fieldIdentifier: 'name', value: ['cbom'], type: 'TEXT' }];

        await renderPagedList();

        expect(dispatch.mock.calls.filter((call) => call[0]?.type === 'pagings/setPagination')).toHaveLength(0);
        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'pagings/setFiltersSnapshot',
                payload: {
                    entity: EntityType.CBOM,
                    filtersSnapshot: JSON.stringify([{ fieldIdentifier: 'name', value: ['cbom'], type: 'TEXT' }]),
                },
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

    it('keeps the refresh button enabled when idle', async () => {
        await renderPagedList();

        const refreshButton = container.querySelector('[data-testid="refresh"]') as HTMLButtonElement;
        expect(refreshButton.disabled).toBe(false);
    });

    it('disables the refresh button while a fetch is in progress with an empty list', async () => {
        // First render with data so hasLoadedOnce becomes true and the skeleton is not shown on refetch
        await renderPagedList({ data: rows });

        mockState.pagings.pagings[0].paging.isFetchingList = true;
        await renderPagedList({ data: [] });

        const refreshButton = container.querySelector('[data-testid="refresh"]') as HTMLButtonElement;
        expect(refreshButton).toBeTruthy();
        expect(refreshButton.disabled).toBe(true);
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

    it('releases the skeleton with no store update behind it, so the flag cannot be a ref', async () => {
        mockState.pagings.pagings[0].paging.totalItems = 0;

        await renderPagedList({ data: [], onListCallback: vi.fn(), getAvailableFiltersApi: vi.fn() });

        expect(container.querySelector('[data-testid="table"]')).toBeTruthy();
        expect(container.querySelector('[data-testid="filter-widget"]')).toBeTruthy();
    });

    it('mounts the filter widget once across a page load, so the catalogue is read once', async () => {
        const paging = mockState.pagings.pagings[0].paging;
        paging.totalItems = 0;

        // Stands in for the listing epic, which dispatches the in-flight marker synchronously with
        // the request. Each render below is one the store would have driven.
        const onListCallback = vi.fn(() => {
            paging.isFetchingList = true;
        });
        const props = { data: [], onListCallback, getAvailableFiltersApi: vi.fn() };

        await renderPagedList(props);
        await renderPagedList(props);

        paging.isFetchingList = false;
        await renderPagedList(props);

        expect(filterWidget.mounts).toBe(1);
    });

    it('keeps the loaded table mounted while an empty list refetches', async () => {
        const paging = mockState.pagings.pagings[0].paging;
        paging.totalItems = 0;
        paging.isFetchingList = true;

        await renderPagedList({ data: [], getAvailableFiltersApi: vi.fn() });
        expect(container.querySelector('[data-testid="table"]')).toBeNull();

        paging.isFetchingList = false;
        await renderPagedList({ data: [], getAvailableFiltersApi: vi.fn() });
        expect(container.querySelector('[data-testid="table"]')).toBeTruthy();

        paging.isFetchingList = true;
        await renderPagedList({ data: [], getAvailableFiltersApi: vi.fn() });

        expect(container.querySelector('[data-testid="table"]')).toBeTruthy();
        expect(container.querySelector('[data-testid="filter-widget"]')).toBeTruthy();
    });

    it('does not list again when the filter catalogue is re-read', async () => {
        const onListCallback = vi.fn();
        const filter = mockState.filters.filters[0].filter;

        await renderPagedList({ onListCallback, getAvailableFiltersApi: vi.fn() });
        expect(onListCallback).toHaveBeenCalledTimes(1);

        filter.availableFilters = [];
        await renderPagedList({ onListCallback, getAvailableFiltersApi: vi.fn() });

        expect(onListCallback).toHaveBeenCalledTimes(1);
    });

    it('does not list again when the catalogue makes a column-driven page sortable', async () => {
        const onListCallback = vi.fn();
        const filter = mockState.filters.filters[0].filter;

        // A page ships its column set without sort flags, exactly as the certificate and key
        // inventories do, so merging the catalogue rebuilds every column object.
        const configurableColumns = {
            resource: Resource.Certificates,
            standardColumns: [{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', catalogueLabel: 'Common Name' }],
            rows: [],
            getRowId: (row: any) => row.uuid,
        };

        await renderPagedList({ onListCallback, configurableColumns, data: undefined, headers: undefined });
        expect(onListCallback).toHaveBeenCalledTimes(1);

        filter.availableFilters = [
            {
                filterFieldSource: FilterFieldSource.Property,
                searchFieldData: [{ fieldIdentifier: 'COMMON_NAME', fieldLabel: 'Common Name', sortable: true, displayable: true }],
            },
        ];
        await renderPagedList({ onListCallback, configurableColumns, data: undefined, headers: undefined });

        expect(onListCallback).toHaveBeenCalledTimes(1);
    });

    it('names the page default ordering in the first listing request', async () => {
        const onListCallback = vi.fn();
        const configurableColumns = {
            resource: Resource.Certificates,
            standardColumns: [{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', catalogueLabel: 'Common Name' }],
            rows: [],
            getRowId: (row: any) => row.uuid,
            defaultSort: { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', direction: 'asc' as const },
        };
        mockState.filters.filters[0].filter.availableFilters = [
            {
                filterFieldSource: FilterFieldSource.Property,
                searchFieldData: [{ fieldIdentifier: 'COMMON_NAME', fieldLabel: 'Common Name', sortable: true, displayable: true }],
            },
        ];

        await renderPagedList({ onListCallback, configurableColumns, data: undefined, headers: undefined });

        expect(onListCallback).toHaveBeenCalledWith(
            expect.objectContaining({
                sort: { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', direction: 'asc' },
            }),
        );
    });

    it('names the page default ordering before the catalogue has been read', async () => {
        const onListCallback = vi.fn();
        const configurableColumns = {
            resource: Resource.Certificates,
            standardColumns: [{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', catalogueLabel: 'Common Name' }],
            rows: [],
            getRowId: (row: any) => row.uuid,
            defaultSort: { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', direction: 'asc' as const },
        };
        const filter = mockState.filters.filters[0].filter;
        filter.hasLoadedFilters = false;
        filter.availableFilters = [];

        await renderPagedList({ onListCallback, configurableColumns, data: undefined, headers: undefined });

        expect(onListCallback).toHaveBeenCalledWith(
            expect.objectContaining({
                sort: { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', direction: 'asc' },
            }),
        );

        // The catalogue agrees, so the request it was already sending stands and no second listing follows.
        filter.hasLoadedFilters = true;
        filter.availableFilters = [
            {
                filterFieldSource: FilterFieldSource.Property,
                searchFieldData: [{ fieldIdentifier: 'COMMON_NAME', fieldLabel: 'Common Name', sortable: true, displayable: true }],
            },
        ];
        await renderPagedList({ onListCallback, configurableColumns, data: undefined, headers: undefined });

        expect(onListCallback).toHaveBeenCalledTimes(1);
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
