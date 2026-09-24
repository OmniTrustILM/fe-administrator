import { type EntityType, actions as filterActions, selectors as filterSelectors } from 'ducks/filters';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { useLocation, useNavigate } from 'react-router';
import { actions as listScopeActions } from 'ducks/list-scopes';
import type { AppState } from 'ducks';

import type { ApiClients } from 'src/api';
import AddColumnMenu from 'components/AddColumnMenu';
import ColumnDragHandle from 'components/ColumnDragHandle';
import ColumnHeaderMenu from 'components/ColumnHeaderMenu';
import CustomTable, { type SortDirection, type TableDataRow, type TableHeader } from 'components/CustomTable';
import { buildTableRows, type CellRegistry } from 'components/CustomTable/columns';
import Dialog from 'components/Dialog';
import FilterWidget from 'components/FilterWidget';
import ViewTabs, { isViewStripReady } from 'components/ViewTabs';
import Widget from 'components/Widget';
import type { ReactNode } from 'react';
import { selectors as listViewSelectors } from 'ducks/listViews';
import type { ViewSlice } from 'types/listViews';
import type { Resource } from 'types/openapi';
import type { ColumnDefinition, SourcedCatalogueField } from 'types/tableColumns';
import { moveColumn, toCatalogueFields } from 'utils/columnPicker';
import { type ColumnSort, buildColumnHeaders, getColumnHeading, getColumnKey } from 'utils/tableColumns';
import {
    buildListRequest,
    getRenderableProperties,
    isSameSort,
    toColumnSortFromHeader,
    toDisplayableSort,
    renameColumn,
    toProjectedKeys,
    toggleColumn,
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
    /** Also the gate on which property columns the add-column menu offers; see `toCatalogueFields`. */
    registry?: CellRegistry<TRow>;
    rowOptions?: (row: TRow) => TableDataRow['options'];
    headerInfo?: Readonly<Record<string, ReactNode>>;
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
/** Joins projected column keys into one comparable value; no key can contain it. */
const PROJECTION_SEPARATOR = '\u0000';

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
    const hasCatalogueFailed = useSelector(filterSelectors.hasFailedFilters(entity));

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
        defaultSort,
    } = configurableColumns ?? ({} as Partial<ConfigurableColumns<TRow>>);

    const [columnSelection, setColumnSelection] = useState<ColumnDefinition[]>(NO_COLUMNS);
    const [sortSelection, setSortSelection] = useState<ColumnSort | undefined>(defaultSort);

    const renderableProperties = useMemo(() => getRenderableProperties(registry), [registry]);

    /**
     * Sortability merged in, from the catalogue once it has answered and from the page's own declared
     * ordering until then. Applied to whatever set is on the table rather than to the standard one
     * alone: a selection replaces that set, and the catalogue can still answer after one was taken —
     * the duck keeps a resource's fields across visits, so the strip opens on the held answer while
     * the refetch is out, and merging only into the standard set would freeze that selection on it.
     */
    const withSortability = useCallback(
        (columns: ColumnDefinition[]) =>
            hasLoadedCatalogue ? withCatalogueSortability(columns, catalogue) : withDeclaredSortability(columns, defaultSort),
        [hasLoadedCatalogue, catalogue, defaultSort],
    );

    const sortableStandardColumns = useMemo(() => withSortability(standardColumns ?? NO_COLUMNS), [withSortability, standardColumns]);

    // Holds only the deviation and falls back, so a config arriving after the first render cannot
    // leave the table with no columns at all.
    const appliedColumns = useMemo(
        () => (columnSelection.length > 0 ? withSortability(columnSelection) : sortableStandardColumns),
        [withSortability, columnSelection, sortableStandardColumns],
    );

    const appliedSort = useMemo(() => toDisplayableSort(sortSelection, appliedColumns), [sortSelection, appliedColumns]);

    const catalogueFields = useMemo(() => toCatalogueFields(catalogue, renderableProperties), [catalogue, renderableProperties]);

    const selectHasLoadedViews = useMemo(
        () => (columnsResource ? listViewSelectors.hasLoaded(columnsResource) : () => false),
        [columnsResource],
    );
    const hasLoadedViews = useSelector(selectHasLoadedViews);
    const isStripReady = isViewStripReady(hasLoadedViews, hasLoadedCatalogue);

    const totalItems = useSelector(selectors.totalItems(entity));
    const checkedRows = useSelector(selectors.checkedRows(entity));
    const isFetchingList = useSelector(selectors.isFetchingList(entity));
    const pageNumber = useSelector(selectors.pageNumber(entity));
    const pageSize = useSelector(selectors.pageSize(entity));
    const listedFiltersSnapshot = useSelector(selectors.filtersSnapshot(entity));

    /**
     * Applies a column set to the table and nowhere else; the summary bar's Save is what stores it.
     *
     * An ordering the new set cannot paint is dropped rather than merely hidden: kept, it would come
     * back on its own the moment the column was added again, which is not what taking the column away
     * asked for. Page 4 of one ordering is not page 4 of another, so a dropped ordering also sends the
     * listing back to the first page.
     */
    const applyColumns = useCallback(
        (next: ColumnDefinition[]) => {
            if (next === appliedColumns) return;

            const nextSort = toDisplayableSort(sortSelection, next);

            setColumnSelection(next);
            setSortSelection(nextSort);
            if (!isSameSort(nextSort, appliedSort)) {
                dispatch(actions.setPagination({ entity, pageSize, pageNumber: 1 }));
            }
        },
        [appliedColumns, appliedSort, sortSelection, dispatch, entity, pageSize],
    );

    const onResetColumns = useCallback(() => applyColumns(sortableStandardColumns), [applyColumns, sortableStandardColumns]);

    const onRenameColumn = useCallback(
        (key: string, label: string | undefined) => applyColumns(renameColumn(appliedColumns, key, label)),
        [applyColumns, appliedColumns],
    );

    const onRemoveColumn = useCallback(
        (key: string) => {
            // An empty selection reads as "back to Standard", so the last column standing holds here as
            // it does in the menu, rather than resetting the table to a set nobody asked for.
            if (appliedColumns.length === 1) return;
            applyColumns(appliedColumns.filter((column) => getColumnKey(column) !== key));
        },
        [applyColumns, appliedColumns],
    );

    const onToggleColumn = useCallback(
        (field: SourcedCatalogueField) => applyColumns(toggleColumn(appliedColumns, field, sortableStandardColumns)),
        [applyColumns, appliedColumns, sortableStandardColumns],
    );

    const addColumnMenu = useMemo(
        () =>
            isColumnDriven ? (
                <AddColumnMenu
                    fields={catalogueFields}
                    isCatalogueLoaded={hasLoadedCatalogue}
                    columns={appliedColumns}
                    // Both withheld until the strip is up: applying the opening view replaces the column
                    // set wholesale, so a change made before that would be wiped without a trace.
                    onToggle={isStripReady ? onToggleColumn : undefined}
                    onReset={isStripReady ? onResetColumns : undefined}
                />
            ) : undefined,
        [isColumnDriven, catalogueFields, hasLoadedCatalogue, appliedColumns, onToggleColumn, onResetColumns, isStripReady],
    );

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
     * The attribute columns the rows on screen were fetched with, and the ones the table wants now.
     *
     * Columns are keyed out of the request snapshot entirely and compared as these two instead, because
     * most column changes need no new data at all: a property column renders from the listing entry, a
     * removal renders from what is already there, and a reorder changes only the request's bytes. Only
     * an attribute column the current rows were never projected has nowhere to read from.
     */
    const projectedKeys = useRef<string[]>([]);
    const wantedProjection = useMemo(() => toProjectedKeys(listRequest.columns).join(PROJECTION_SEPARATOR), [listRequest.columns]);

    /**
     * The fetch is keyed on the request it will send rather than on the values it was built from.
     * Merging the catalogue's sort capability rebuilds the column objects without changing a byte of
     * the request — `toRequestColumns` carries only the source and identifier — so depending on the
     * columns would list a second time for the same request. `listRequestRef` holds the value the
     * snapshot stands for, and `refreshToken` is read for its identity alone: a change to it means
     * the page asked to send this same request again.
     */
    const listRequestSnapshot = useMemo(() => {
        const { columns, ...rest } = listRequest;
        return JSON.stringify(rest);
    }, [listRequest]);
    const listRequestRef = useRef(listRequest);
    listRequestRef.current = listRequest;

    /** What the last request actually stood for, so the one effect below cannot send it twice. */
    const lastSent = useRef<{ request: string; refreshToken: unknown; onList: typeof onListCallback } | undefined>(undefined);

    const getFreshData = useCallback(() => {
        // What this request asks to be projected is what the rows will carry, so a column dropped since
        // the last fetch stops counting as available and asks for a new one if it comes back. A request
        // that fails leaves no rows, and the effect below takes the claim back.
        projectedKeys.current = toProjectedKeys(listRequestRef.current.columns);
        onListCallback(listRequestRef.current);
        onCheckedRowsChanged([]);
    }, [onListCallback, onCheckedRowsChanged]);

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
     *
     * The ordering is put through the same sieve as `applyColumns`: this is the path the column
     * dialog comes back on, and it hands back the ordering the table was listing under before it.
     */
    const hasAppliedView = useRef(false);
    const onApplyView = useCallback(
        (slice: ViewSlice) => {
            const isInitialApplication = !hasAppliedView.current;

            hasAppliedView.current = true;
            setColumnSelection(slice.columns);
            setSortSelection(toDisplayableSort(slice.sort, slice.columns));

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

    /** Goes through `applyColumns` like adding a column does; `listRequestSnapshot` keys order out, so a reorder neither re-lists nor leaves the page. */
    const onMoveColumn = useCallback(
        (from: number, to: number) => applyColumns(moveColumn(appliedColumns, from, to)),
        [applyColumns, appliedColumns],
    );

    const columnKeys = useMemo(() => appliedColumns.map(getColumnKey), [appliedColumns]);

    /**
     * The heading each column carries before anyone renames it. A page may ship a heading of its own —
     * the CBOM inventory abbreviates several — so resetting to what the catalogue calls the field would
     * replace a deliberate choice with a name the page never used.
     */
    const shippedHeadings = useMemo(
        () => new Map(sortableStandardColumns.map((column) => [getColumnKey(column), getColumnHeading(column)])),
        [sortableStandardColumns],
    );

    const renderHeaderAction = useCallback(
        (header: TableHeader) => {
            // Withheld until the strip is up: the opening view replaces the columns and the ordering when
            // it lands, so a move or a sort made before then is applied and then silently undone.
            if (!isStripReady) return undefined;

            const column = appliedColumns.find((candidate) => getColumnKey(candidate) === header.id);
            if (!column) return undefined;

            return (
                <ColumnHeaderMenu
                    columnKey={header.id}
                    label={getColumnHeading(column)}
                    columnKeys={columnKeys}
                    sortable={column.sortable === true}
                    hasCatalogueFailed={hasCatalogueFailed}
                    onSort={(direction) => onSortChanged(header.id, direction)}
                    onMove={onMoveColumn}
                    onRename={(next) => onRenameColumn(header.id, next)}
                    defaultHeading={shippedHeadings.get(header.id) ?? column.catalogueLabel}
                    onRemove={() => onRemoveColumn(header.id)}
                    isLastColumn={appliedColumns.length === 1}
                    dataTestId={`column-header-menu-${header.id}`}
                />
            );
        },
        [
            isStripReady,
            appliedColumns,
            columnKeys,
            hasCatalogueFailed,
            onSortChanged,
            onMoveColumn,
            onRenameColumn,
            onRemoveColumn,
            shippedHeadings,
        ],
    );

    const renderHeaderLead = useCallback(
        (header: TableHeader) => {
            if (!isStripReady) return undefined;

            const column = appliedColumns.find((candidate) => getColumnKey(candidate) === header.id);
            if (!column) return undefined;

            return (
                <ColumnDragHandle
                    columnKey={header.id}
                    label={getColumnHeading(column)}
                    columnKeys={columnKeys}
                    onMove={onMoveColumn}
                    dataTestId={`column-drag-handle-${header.id}`}
                />
            );
        },
        [isStripReady, appliedColumns, columnKeys, onMoveColumn],
    );

    const columnHeaders = useMemo(
        () => (isColumnDriven ? buildColumnHeaders(appliedColumns, { sort: appliedSort, info: headerInfo }) : (headers ?? EMPTY_HEADERS)),
        [isColumnDriven, appliedColumns, appliedSort, headerInfo, headers],
    );

    /**
     * The rows last answered for, held while the next answer is out.
     *
     * A listing duck empties its array as the request goes out, so without this the table blanks on
     * every page, ordering and filter change — and a column added to a table with nothing on it would
     * take the header down with it, closing the menu the change was made from. They are held as the
     * answered rows rather than as built cells, so the held page rebuilds against the columns now on
     * the table: a newly added attribute column reads empty until its values arrive, under the busy
     * overlay that says so.
     */
    const wasFetchingList = useRef(false);
    const lastAnsweredRows = useRef(columnsRows);
    if (!isFetchingList) lastAnsweredRows.current = columnsRows;

    // A request that ended with nothing projected nothing, so the cache gives its claim back — otherwise
    // a failed listing would leave it insisting the attributes it asked for had arrived, and taking such
    // a column away and putting it back would suppress the one request able to fetch them. Only on the
    // way out of a fetch: a page that is simply empty needs no request when its projection shrinks.
    if (wasFetchingList.current && !isFetchingList && (columnsRows?.length ?? 0) === 0) projectedKeys.current = [];
    wasFetchingList.current = isFetchingList;
    const heldRows = isFetchingList && (columnsRows?.length ?? 0) === 0 ? lastAnsweredRows.current : columnsRows;

    const columnRows = useMemo(
        () =>
            isColumnDriven && heldRows && getRowId
                ? buildTableRows(heldRows, appliedColumns, { getRowId, registry, rowOptions })
                : (data ?? EMPTY_ROWS),
        [isColumnDriven, heldRows, getRowId, registry, rowOptions, appliedColumns, data],
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

    /**
     * One trigger, not two: a single action can move the request and the wanted projection together —
     * applying a view sets an ordering and brings in an attribute column at once — and two effects
     * racing for that would list the same page twice. What was last sent is recorded here, so a change
     * that only shrinks the projection sends nothing at all.
     */
    useEffect(() => {
        const wanted = wantedProjection === '' ? [] : wantedProjection.split(PROJECTION_SEPARATOR);
        const needsProjection = wanted.some((key) => !projectedKeys.current.includes(key));
        const sent = lastSent.current;

        if (
            !needsProjection &&
            sent?.request === listRequestSnapshot &&
            sent.refreshToken === refreshToken &&
            sent.onList === onListCallback
        ) {
            return;
        }

        lastSent.current = { request: listRequestSnapshot, refreshToken, onList: onListCallback };
        getFreshData();
        setHasSentFirstRequest(true);
    }, [getFreshData, wantedProjection, listRequestSnapshot, refreshToken, onListCallback]);

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
                columnsCount={columnHeaders.length + (isColumnDriven ? 1 : 0)}
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
                    {...(isColumnDriven ? { onSortChanged, persistSort: false, renderHeaderAction, renderHeaderLead } : {})}
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
                    trailingHeaderAction={addColumnMenu}
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
