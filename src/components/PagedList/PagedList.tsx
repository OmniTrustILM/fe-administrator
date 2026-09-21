import { type EntityType, actions as filterActions, selectors as filterSelectors } from 'ducks/filters';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { useLocation, useNavigate } from 'react-router';
import { actions as listScopeActions } from 'ducks/list-scopes';
import type { AppState } from 'ducks';

import type { ApiClients } from 'src/api';
import CustomTable, { type SortDirection, type TableDataRow, type TableHeader } from 'components/CustomTable';
import { buildTableRows, type CellRegistry } from 'components/CustomTable/columns';
import Dialog from 'components/Dialog';
import FilterWidget from 'components/FilterWidget';
import ViewTabs from 'components/ViewTabs';
import Widget from 'components/Widget';
import type { ReactNode } from 'react';
import type { ViewSlice } from 'types/listViews';
import type { Resource } from 'types/openapi';
import type { ColumnDefinition } from 'types/tableColumns';
import { type ColumnSort, buildColumnHeaders } from 'utils/tableColumns';
import {
    buildListRequest,
    getRenderableProperties,
    isSameSort,
    toColumnSortFromHeader,
    toDisplayableSort,
    withCatalogueSortability,
    withDeclaredSortability,
} from './columnState';
import PagedListSkeleton from './PagedListSkeleton';
import type { IconName } from 'types/icons';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { actions, selectors } from 'ducks/paging';
import { actions as tablePaginationActions } from 'ducks/table-pagination';
import type { Observable } from 'rxjs';
import type { SearchFieldListModel, SearchFilterModel, SearchRequestModel } from 'types/certificate';
import type { LockWidgetNameEnum } from 'types/user-interface';

/**
 * Opts a page into the column pipeline. The host then owns the applied column set and ordering, and
 * names both in the listing request; a page supplying none of this keeps passing `headers` and `data`.
 */
export interface ConfigurableColumns<TRow extends object> {
    resource: Resource;
    standardColumns: ColumnDefinition[];
    rows: TRow[];
    getRowId: (row: TRow) => string | number;
    /** Also the gate on which property columns the picker offers; see `toCatalogueFields`. */
    registry?: CellRegistry<TRow>;
    rowOptions?: (row: TRow) => TableDataRow['options'];
    headerInfo?: Readonly<Record<string, ReactNode>>;
    resourceLabel?: string;
    /**
     * The ordering the page opens on. A page that sorted client-side before it was column-driven has to name it here,
     * because a column-driven table hands sorting to the server and would otherwise open in API order.
     */
    defaultSort?: ColumnSort;
}

type Props<TRow extends object> = {
    entity: EntityType;
    headers?: TableHeader[];
    data?: TableDataRow[];
    configurableColumns?: ConfigurableColumns<TRow>;
    isBusy?: boolean;
    multiSelect?: boolean;
    onDeleteCallback?: (uuids: string[], filters: SearchFilterModel[]) => void;
    onListCallback: (filters: SearchRequestModel) => void;
    getAvailableFiltersApi?: (apiClients: ApiClients) => Observable<Array<SearchFieldListModel>>;
    title: string;
    filterTitle?: string;
    addHidden?: boolean;
    entityNameSingular?: string;
    entityNamePlural?: string;
    additionalButtons?: WidgetButtonProps[];
    pageWidgetLockName?: LockWidgetNameEnum;
    hideWidgetButtons?: boolean;
    hasCheckboxes?: boolean;
    hasDetails?: boolean;
    columnForDetail?: string;
    extraFilterComponent?: React.ReactNode;
    /**
     * Bumped by the page to make the host re-run its own request. A request the page assembled would
     * omit the applied columns and ordering, blanking every attribute column and ignoring the sort.
     */
    refreshToken?: number;
};

const EMPTY_HEADERS: TableHeader[] = [];
const EMPTY_ROWS: TableDataRow[] = [];
const NO_COLUMNS: ColumnDefinition[] = [];

function PagedList<TRow extends object>({
    headers,
    data,
    configurableColumns,
    filterTitle,
    addHidden,
    entity,
    title,
    isBusy = false,
    multiSelect = true,
    onDeleteCallback,
    getAvailableFiltersApi,
    onListCallback,
    entityNamePlural,
    entityNameSingular,
    additionalButtons,
    pageWidgetLockName,
    hideWidgetButtons = false,
    hasCheckboxes = true,
    hasDetails = false,
    columnForDetail,
    extraFilterComponent,
    refreshToken,
}: Readonly<Props<TRow>>) {
    const dispatch = useDispatch();
    const store = useStore<AppState>();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const segment = location.pathname.split('/')[1] ?? '';
        if (!segment) {
            return;
        }
        dispatch(listScopeActions.registerScope({ entity, prefix: `/${segment}` }));
    }, [dispatch, entity, location.pathname]);

    const currentFilters = useSelector(filterSelectors.currentFilters(entity));

    // `hasLoadedFilters` rather than `!isFetchingFilters`, which is also false before the first read.
    const catalogue = useSelector(filterSelectors.availableFilters(entity));
    const hasLoadedCatalogue = useSelector(filterSelectors.hasLoadedFilters(entity));

    // Taken apart rather than depended on whole: an unmemoised config would rebuild `getFreshData`
    // every render, and the effect watching it would refetch forever.
    const isColumnDriven = configurableColumns !== undefined;
    const {
        resource: columnsResource,
        standardColumns,
        rows: columnsRows,
        getRowId,
        registry,
        rowOptions,
        headerInfo,
        resourceLabel,
        defaultSort,
    } = configurableColumns ?? ({} as Partial<ConfigurableColumns<TRow>>);

    const [columnSelection, setColumnSelection] = useState<ColumnDefinition[]>(NO_COLUMNS);
    const [sortSelection, setSortSelection] = useState<ColumnSort | undefined>(defaultSort);

    const renderableProperties = useMemo(() => getRenderableProperties(registry), [registry]);

    const sortableStandardColumns = useMemo(
        () =>
            hasLoadedCatalogue
                ? withCatalogueSortability(standardColumns ?? NO_COLUMNS, catalogue)
                : withDeclaredSortability(standardColumns ?? NO_COLUMNS, defaultSort),
        [hasLoadedCatalogue, standardColumns, catalogue, defaultSort],
    );

    // Holds only the deviation and falls back, so a config arriving after the first render cannot
    // leave the table with no columns at all.
    const appliedColumns = useMemo(
        () => (columnSelection.length > 0 ? columnSelection : sortableStandardColumns),
        [columnSelection, sortableStandardColumns],
    );

    const appliedSort = useMemo(() => toDisplayableSort(sortSelection, appliedColumns), [sortSelection, appliedColumns]);

    const totalItems = useSelector(selectors.totalItems(entity));
    const checkedRows = useSelector(selectors.checkedRows(entity));
    const isFetchingList = useSelector(selectors.isFetchingList(entity));
    const pageNumber = useSelector(selectors.pageNumber(entity));
    const pageSize = useSelector(selectors.pageSize(entity));
    const listedFiltersSnapshot = useSelector(selectors.filtersSnapshot(entity));

    const currentFiltersSnapshot = useMemo(() => JSON.stringify(currentFilters ?? []), [currentFilters]);

    const isPageStaleForFilters = listedFiltersSnapshot !== undefined && listedFiltersSnapshot !== currentFiltersSnapshot;
    const effectivePageNumber = isPageStaleForFilters ? 1 : pageNumber;

    const [confirmDelete, setConfirmDelete] = useState(false);
    const hasLoadedOnce = useRef(false);
    const hasFetchStarted = useRef(false);
    // State rather than a ref like its neighbours above: releasing the skeleton has to re-render, and
    // a page whose request never reaches the paging duck would otherwise sit on it for good.
    const [hasSentFirstRequest, setHasSentFirstRequest] = useState(false);

    const onCheckedRowsChanged = useCallback(
        (rows: (string | number)[]) => {
            dispatch(actions.setCheckedRows({ entity, checkedRows: rows as string[] }));
        },
        [dispatch, entity],
    );

    const listRequest = useMemo(
        () =>
            buildListRequest(
                { itemsPerPage: pageSize, pageNumber: effectivePageNumber, filters: currentFilters },
                isColumnDriven ? appliedColumns : undefined,
                appliedSort,
            ),
        [currentFilters, pageSize, effectivePageNumber, isColumnDriven, appliedColumns, appliedSort],
    );

    /**
     * The fetch is keyed on the request it will send rather than on the values it was built from.
     * Merging the catalogue's sort capability rebuilds the column objects without changing a byte of
     * the request — `toRequestColumns` carries only the source and identifier — so depending on the
     * columns would list a second time for the same request. `listRequestRef` holds the value the
     * snapshot stands for, and `refreshToken` is read for its identity alone: a change to it means
     * the page asked to send this same request again.
     */
    const listRequestSnapshot = useMemo(() => JSON.stringify(listRequest), [listRequest]);
    const listRequestRef = useRef(listRequest);
    listRequestRef.current = listRequest;

    const getFreshData = useCallback(() => {
        onListCallback(listRequestRef.current);
        onCheckedRowsChanged([]);
    }, [listRequestSnapshot, onListCallback, onCheckedRowsChanged, refreshToken]);

    const onPageSizeChanged = useCallback(
        (pageSize: number) => {
            dispatch(
                actions.setPagination({
                    entity,
                    pageSize,
                    pageNumber: 1,
                }),
            );
        },
        [dispatch, entity],
    );

    const onPageNumberChanged = useCallback(
        (nextPageNumber: number) => {
            const latestPageSize = selectors.pageSize(entity)(store.getState());
            dispatch(
                actions.setPagination({
                    entity,
                    pageSize: latestPageSize,
                    pageNumber: nextPageNumber,
                }),
            );
        },
        [dispatch, entity, store],
    );

    const onDeleteConfirmed = useCallback(() => {
        setConfirmDelete(false);
        onDeleteCallback!(checkedRows, currentFilters);
        onCheckedRowsChanged([]);
        getFreshData();
    }, [checkedRows, onDeleteCallback, currentFilters, onCheckedRowsChanged, getFreshData]);

    /**
     * Applies a view's columns, filters and ordering together. The first application leaves filters
     * already in the duck alone: the strip opens its pinned view after a deep link has put its own
     * filters there, and would replace them a moment after they were asked for.
     */
    const hasAppliedView = useRef(false);
    const onApplyView = useCallback(
        (slice: ViewSlice) => {
            const isInitialApplication = !hasAppliedView.current;

            hasAppliedView.current = true;
            setColumnSelection(slice.columns);
            setSortSelection(slice.sort);

            if (!isInitialApplication || currentFilters.length === 0) {
                dispatch(filterActions.setCurrentFilters({ entity, currentFilters: slice.filters }));
            }

            dispatch(actions.setPagination({ entity, pageSize, pageNumber: 1 }));
            onCheckedRowsChanged([]);
        },
        [dispatch, entity, pageSize, onCheckedRowsChanged, currentFilters.length],
    );

    const onSortChanged = useCallback(
        (key: string, direction: SortDirection) => {
            const next = toColumnSortFromHeader(key, direction, appliedColumns);
            // The table echoes the ordering its headers declare on mount; treating that as a change
            // would refetch, rebuild the headers and echo again.
            if (isSameSort(next, appliedSort)) return;

            setSortSelection(next);
            // Page 2 of one ordering is not page 2 of another.
            dispatch(actions.setPagination({ entity, pageSize, pageNumber: 1 }));
        },
        [appliedColumns, appliedSort, dispatch, entity, pageSize],
    );

    const columnHeaders = useMemo(
        () => (isColumnDriven ? buildColumnHeaders(appliedColumns, { sort: appliedSort, info: headerInfo }) : (headers ?? EMPTY_HEADERS)),
        [isColumnDriven, appliedColumns, appliedSort, headerInfo, headers],
    );

    const columnRows = useMemo(
        () =>
            isColumnDriven && columnsRows && getRowId
                ? buildTableRows(columnsRows, appliedColumns, { getRowId, registry, rowOptions })
                : (data ?? EMPTY_ROWS),
        [isColumnDriven, columnsRows, getRowId, registry, rowOptions, appliedColumns, data],
    );

    if (isFetchingList) hasFetchStarted.current = true;

    // A finished fetch counts as loaded even when it returned nothing: an empty list that fell back to
    // the skeleton on every fetch would unmount the filter widget, whose remount re-reads the
    // catalogue and lists again, and the page would never settle.
    if (!isFetchingList && (columnRows.length > 0 || hasFetchStarted.current)) hasLoadedOnce.current = true;

    useEffect(() => {
        if (listedFiltersSnapshot === currentFiltersSnapshot) return;

        if (listedFiltersSnapshot !== undefined) {
            dispatch(
                actions.setPagination({
                    entity,
                    pageSize,
                    pageNumber: 1,
                }),
            );
        }

        dispatch(actions.setFiltersSnapshot({ entity, filtersSnapshot: currentFiltersSnapshot }));
    }, [currentFiltersSnapshot, listedFiltersSnapshot, dispatch, entity, pageSize]);

    /**
     * A list that shrank under the current page -- a row the action just taken filtered out of the set, a bulk delete
     * taking the last page's only row -- leaves the page number past the end. The server answers such a page with
     * nothing and the pager hides itself once a single page is left, so there would be no way back from it. Settled
     * totals only: a total read mid-fetch still belongs to the previous request, and a total of zero is a list that is
     * genuinely empty rather than a page that ran off the end.
     */
    useEffect(() => {
        if (isFetchingList || totalItems === 0) return;

        const lastPage = Math.ceil(totalItems / pageSize);
        if (effectivePageNumber > lastPage) {
            dispatch(actions.setPagination({ entity, pageSize, pageNumber: lastPage }));
        }
    }, [isFetchingList, totalItems, pageSize, effectivePageNumber, dispatch, entity]);

    useEffect(() => {
        getFreshData();
        setHasSentFirstRequest(true);
    }, [getFreshData]);

    const buttons: WidgetButtonProps[] = useMemo(() => {
        const result = [];
        if (!addHidden) {
            result.push({
                id: 'create',
                icon: 'plus' as IconName,
                disabled: false,
                tooltip: 'Create',
                onClick: () => navigate(`./add`),
            });
        }
        if (onDeleteCallback) {
            result.push({
                id: 'delete',
                icon: 'trash' as IconName,
                disabled: checkedRows.length === 0,
                tooltip: 'Delete',
                onClick: () => setConfirmDelete(true),
            });
        }
        if (additionalButtons) {
            result.push(...additionalButtons);
        }
        return result.sort((a, b) => (a.icon === 'plus' ? -1 : 1));
    }, [checkedRows, additionalButtons, navigate, addHidden, onDeleteCallback]);

    // An ordering the page did not declare counts, or there would be no way back from it. Measured
    // against `defaultSort` rather than against no ordering at all, so a page that opens sorted is not
    // permanently offering to reset itself to the state it is already in.
    const hasNonDefaultViewState = currentFilters.length > 0 || pageNumber > 1 || pageSize !== 10 || !isSameSort(appliedSort, defaultSort);

    const onResetView = useCallback(() => {
        dispatch(filterActions.setCurrentFilters({ entity, currentFilters: [] }));
        dispatch(filterActions.setPreservedFilters({ entity, preservedFilters: [] }));
        dispatch(actions.resetPaging({ entity }));
        // The columns stay: they belong to the tab the strip is on, and the strip offers Revert.
        setSortSelection(defaultSort);
        const rootRoute = location.pathname.split('/')[1] ?? '';
        if (rootRoute) {
            dispatch(tablePaginationActions.clearPaginationByRootRoute({ rootRoute }));
        }
    }, [dispatch, entity, location.pathname, defaultSort]);

    const paginationData = useMemo(
        () => ({
            page: effectivePageNumber,
            totalItems: totalItems,
            pageSize: pageSize,
            loadedPageSize: pageSize,
            totalPages: Math.ceil(totalItems / pageSize),
        }),
        [effectivePageNumber, totalItems, pageSize],
    );

    // Holds the skeleton over the render that precedes the listing effect. Painting the real page
    // there mounts the filter widget, and the request that effect sends unmounts it again — the
    // remount re-read described in the note on `hasLoadedOnce`. Mounting once instead delays the
    // widget's catalogue read and the view strip's `listViews` read by a round trip, accepted at the
    // cost of a pinned view reaching the table a paint after the standard columns.
    const isAwaitingFirstPage = columnRows.length === 0 && !hasLoadedOnce.current && (isFetchingList || !hasSentFirstRequest);

    if (isAwaitingFirstPage) {
        const estimatedButtonCount = (addHidden ? 0 : 1) + (onDeleteCallback ? 1 : 0) + (additionalButtons?.length ?? 0);
        return (
            <PagedListSkeleton
                hasFilter={Boolean(getAvailableFiltersApi) && Boolean(filterTitle)}
                filterTitle={filterTitle}
                buttonsCount={estimatedButtonCount}
                columnsCount={columnHeaders.length}
                hasCheckboxes={hasCheckboxes}
                hasExtraFilter={Boolean(extraFilterComponent)}
            />
        );
    }

    return (
        <div className="flex flex-col gap-4 md:gap-8">
            {/* Above the filter widget: a view carries its own filters, so a tab contains the filter. */}
            {columnsResource && standardColumns && (
                <ViewTabs
                    resource={columnsResource}
                    catalogue={catalogue}
                    isCatalogueLoaded={hasLoadedCatalogue}
                    standardColumns={sortableStandardColumns}
                    standardSort={defaultSort}
                    renderableProperties={renderableProperties}
                    columns={appliedColumns}
                    filters={currentFilters}
                    sort={appliedSort}
                    onApply={onApplyView}
                    resourceLabel={resourceLabel}
                />
            )}

            {getAvailableFiltersApi && filterTitle && (
                <FilterWidget
                    entity={entity}
                    title={filterTitle}
                    getAvailableFiltersApi={getAvailableFiltersApi}
                    extraFilterComponent={extraFilterComponent}
                />
            )}

            <Widget
                title={title}
                busy={isBusy || (isFetchingList && columnRows.length > 0)}
                disableRefresh={isBusy || isFetchingList}
                enableBusyOverlay
                widgetLockName={pageWidgetLockName}
                refreshAction={getFreshData}
                resetViewAction={hasNonDefaultViewState ? onResetView : undefined}
                widgetButtons={buttons}
                titleSize="large"
                hideWidgetButtons={hideWidgetButtons}
            >
                <CustomTable
                    headers={columnHeaders}
                    data={columnRows}
                    {...(isColumnDriven ? { onSortChanged, persistSort: false } : {})}
                    hasCheckboxes={hasCheckboxes}
                    hasDetails={hasDetails}
                    columnForDetail={columnForDetail}
                    hasPagination
                    multiSelect={multiSelect}
                    paginationData={paginationData}
                    onPageChanged={onPageNumberChanged}
                    onCheckedRowsChanged={onCheckedRowsChanged}
                    onPageSizeChanged={onPageSizeChanged}
                    isLoading={isFetchingList && columnRows.length === 0}
                    disablePaginationControls={isBusy || isFetchingList}
                    disableSelectionControls={isBusy || isFetchingList}
                    disableSearchControls={isBusy || isFetchingList}
                />
            </Widget>
            {onDeleteCallback && (
                <Dialog
                    isOpen={confirmDelete}
                    caption={`Delete ${checkedRows.length > 1 ? entityNamePlural : entityNameSingular}`}
                    body={`You are about to delete ${
                        checkedRows.length > 1 ? entityNamePlural : entityNameSingular
                    }. Is this what you want to do?`}
                    toggle={() => setConfirmDelete(false)}
                    icon="delete"
                    buttons={[
                        { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                        { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                    ]}
                />
            )}
        </div>
    );
}

export default PagedList;
