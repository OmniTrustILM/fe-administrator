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
import { buildListRequest, getRenderableProperties, isSameSort, toColumnSortFromHeader } from './columnState';
import PagedListSkeleton from './PagedListSkeleton';
import type { IconName } from 'types/icons';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { actions, selectors } from 'ducks/paging';
import { actions as tablePaginationActions } from 'ducks/table-pagination';
import type { Observable } from 'rxjs';
import type { SearchFieldListModel, SearchFilterModel, SearchRequestModel } from 'types/certificate';
import type { LockWidgetNameEnum } from 'types/user-interface';

/**
 * What a page hands over to be driven by the column pipeline: the platform default column set, the
 * listing entries, and how to render a cell of each.
 *
 * A page that supplies this stops passing `headers` and `data`. The host then owns the applied column
 * set and the applied ordering, renders the saved-view tab strip above the filter widget, and names
 * both in the listing request. A page that supplies nothing keeps passing `headers` and `data` and is
 * untouched — which is what keeps the thirty-odd other list pages out of this.
 */
export interface ConfigurableColumns<TRow extends object> {
    /** The resource the saved views belong to, e.g. `Resource.Certificates`. */
    resource: Resource;
    /** The platform default column set, which is what the Standard tab shows. */
    standardColumns: ColumnDefinition[];
    /** The listing entries, rendered through the applied columns rather than as a positional array. */
    rows: TRow[];
    getRowId: (row: TRow) => string | number;
    /**
     * Cell renderers for the property columns whose value is on the listing entry. Doubles as the
     * statement of which property columns the page can render at all: a property field outside it is
     * not offered by the picker, because it could only ever render the empty state.
     */
    registry?: CellRegistry<TRow>;
    rowOptions?: (row: TRow) => TableDataRow['options'];
    /** Auxiliary heading content by column key — the enum legends a heading carries beside its label. */
    headerInfo?: Readonly<Record<string, ReactNode>>;
    /** Named in the column dialog's caption, e.g. "Certificates". */
    resourceLabel?: string;
}

type Props<TRow extends object> = {
    entity: EntityType;
    /** The columns a page assembles itself. Omitted by a page on the pipeline. */
    headers?: TableHeader[];
    /** The rows a page assembles itself. Omitted by a page on the pipeline. */
    data?: TableDataRow[];
    /** Opts the page into the column pipeline. See {@link ConfigurableColumns}. */
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
};

const EMPTY_HEADERS: TableHeader[] = [];
const EMPTY_ROWS: TableDataRow[] = [];
const NO_COLUMNS: ColumnDefinition[] = [];

/**
 * Generic in the row type so a page's own listing model reaches its `getRowId`, its registry and its
 * `rowOptions` unchanged. A page that passes no column config never names it and it infers as
 * `object`, which is what keeps the callers off the pipeline untouched.
 */
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

    // The column catalogue is the filter-field catalogue: one read, already in the store because the
    // filter widget fetches it. `hasLoadedFilters` rather than `!isFetchingFilters`, which is also
    // false before the first read and so cannot say whether the catalogue is still to come.
    const catalogue = useSelector(filterSelectors.availableFilters(entity));
    const hasLoadedCatalogue = useSelector(filterSelectors.hasLoadedFilters(entity));

    const [appliedColumns, setAppliedColumns] = useState<ColumnDefinition[]>(() => configurableColumns?.standardColumns ?? NO_COLUMNS);
    const [appliedSort, setAppliedSort] = useState<ColumnSort | undefined>(undefined);

    /*
     * The config is taken apart here rather than depended on whole. A page writes it as an object
     * literal, so the object's identity changes on every render — and a `getFreshData` that depended
     * on it would be rebuilt every render, refetch from the effect that watches it, and never settle.
     * Everything below depends on the individual values instead, and on whether the mode is on at all.
     */
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
    } = configurableColumns ?? ({} as Partial<ConfigurableColumns<TRow>>);

    const renderableProperties = useMemo(() => getRenderableProperties(registry), [registry]);

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

    const onCheckedRowsChanged = useCallback(
        (rows: (string | number)[]) => {
            dispatch(actions.setCheckedRows({ entity, checkedRows: rows as string[] }));
        },
        [dispatch, entity],
    );

    const getFreshData = useCallback(() => {
        onListCallback(
            buildListRequest(
                { itemsPerPage: pageSize, pageNumber: effectivePageNumber, filters: currentFilters },
                isColumnDriven ? appliedColumns : undefined,
                appliedSort,
            ),
        );
        onCheckedRowsChanged([]);
    }, [currentFilters, pageSize, effectivePageNumber, onListCallback, onCheckedRowsChanged, isColumnDriven, appliedColumns, appliedSort]);

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
     * Applies a view: its columns, its filters and its ordering together (D7).
     *
     * The filters go through the filters duck rather than into local state, because the filter widget
     * reads them from there — a view that only changed the table would leave the widget showing
     * conditions the rows no longer honour. Back to page 1 and no selection, because the filters
     * change which rows exist and a carried-over selection would span rows the user cannot see.
     */
    const onApplyView = useCallback(
        (slice: ViewSlice) => {
            setAppliedColumns(slice.columns);
            setAppliedSort(slice.sort);
            dispatch(filterActions.setCurrentFilters({ entity, currentFilters: slice.filters }));
            dispatch(actions.setPagination({ entity, pageSize, pageNumber: 1 }));
            onCheckedRowsChanged([]);
        },
        [dispatch, entity, pageSize, onCheckedRowsChanged],
    );

    const onSortChanged = useCallback(
        (key: string, direction: SortDirection) => {
            const next = toColumnSortFromHeader(key, direction, appliedColumns);
            // The table announces the ordering its headers declare once on mount, which is the one it
            // was just handed. Treating that echo as a change would refetch, rebuild the headers and
            // echo again.
            if (isSameSort(next, appliedSort)) return;

            setAppliedSort(next);
            // A different ordering makes the current page number meaningless: page 2 of one ordering is
            // not page 2 of another.
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

    if (!isFetchingList && columnRows.length > 0) hasLoadedOnce.current = true;

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

    useEffect(() => {
        getFreshData();
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

    const hasNonDefaultViewState = currentFilters.length > 0 || pageNumber > 1 || pageSize !== 10;

    const onResetView = useCallback(() => {
        dispatch(filterActions.setCurrentFilters({ entity, currentFilters: [] }));
        dispatch(filterActions.setPreservedFilters({ entity, preservedFilters: [] }));
        dispatch(actions.resetPaging({ entity }));
        const rootRoute = location.pathname.split('/')[1] ?? '';
        if (rootRoute) {
            dispatch(tablePaginationActions.clearPaginationByRootRoute({ rootRoute }));
        }
    }, [dispatch, entity, location.pathname]);

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

    if (isFetchingList && columnRows.length === 0 && !hasLoadedOnce.current) {
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
            {/*
             * Above the filter widget rather than inside it: under D7 a view carries its own filters,
             * so a tab has to read as containing the filter rather than sitting within it.
             */}
            {columnsResource && standardColumns && (
                <ViewTabs
                    resource={columnsResource}
                    catalogue={catalogue}
                    isCatalogueLoaded={hasLoadedCatalogue}
                    standardColumns={standardColumns}
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
