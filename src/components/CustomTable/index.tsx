import type React from 'react';
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { jsxInnerText } from 'utils/jsxInnerText';
import { DEFAULT_ITEMS_PER_PAGE_OPTIONS } from 'utils/pagination';
import { useDispatch, useSelector } from 'react-redux';
import { actions as userInterfaceActions } from 'ducks/user-interface';
import { actions as tablePaginationActions, selectors as tablePaginationSelectors } from 'ducks/table-pagination';

import NewRowWidget, { type NewRowWidgetProps } from './NewRowWidget';
import { TableRowCell } from './TableRowCell';
import type { SortDirection, TableDataRow, TableHeader } from './types';
import Select from 'components/Select';
import Pagination from 'components/Pagination';
import Checkbox from 'components/Checkbox';
import SimpleBar from 'components/SimpleBar';
import cn from 'classnames';
import { useLocation } from 'react-router';
import { ArrowDown, ArrowDownUp, ArrowUp, TableProperties } from 'lucide-react';
import TableSkeleton from './TableSkeleton';

export type { SortDirection, TableDataRow, TableHeader } from './types';

type Props = {
    headers: TableHeader[];
    data: TableDataRow[];
    canSearch?: boolean;
    hasHeader?: boolean;
    hasCheckboxes?: boolean;
    hasAllCheckBox?: boolean;
    multiSelect?: boolean;
    hasPagination?: boolean;
    hasDetails?: boolean;
    checkedRows?: (number | string)[];
    paginationData?: {
        page: number;
        totalItems: number;
        pageSize: number;
        loadedPageSize: number;
        totalPages: number;
        itemsPerPageOptions?: number[];
    };
    onCheckedRowsChanged?: (checkedRows: (string | number)[]) => void;
    /**
     * Opting a table into server-driven sorting. When supplied the component stops ordering the rows it was
     * given and only reports which column was clicked and in which direction; the caller re-fetches. When
     * absent the table keeps sorting the loaded page locally, so every existing caller is unaffected.
     */
    onSortChanged?: (fieldIdentifier: string, direction: SortDirection) => void;
    /**
     * Whether the active sort is remembered across mounts. Default `true`, for a table whose ordering is
     * its own state.
     *
     * Pass `false` when the sort belongs to something durable of its own — a stored copy is consulted
     * ahead of the headers, so it would outrank the ordering that thing just applied. With `false`
     * nothing is read from or written to persistence.
     */
    persistSort?: boolean;
    onPageSizeChanged?: (pageSize: number) => void;
    onPageChanged?: (page: number) => void;
    itemsPerPageOptions?: number[];
    newRowWidgetProps?: NewRowWidgetProps;
    columnForDetail?: string;
    detailHeaders?: TableHeader[];
    paginationStateKey?: string;
    paginationPersistKey?: string;
    disablePaginationControls?: boolean;
    disableSelectionControls?: boolean;
    disableSearchControls?: boolean;
    isLoading?: boolean;
};

const emptyCheckedRows: (string | number)[] = [];

// ARIA asks for aria-sort on the sorted header only, so an unsorted column carries no attribute
// rather than an explicit "none" — otherwise every sortable header announces a sort state at once.
const ariaSortValue = (sort: SortDirection | undefined) => {
    if (sort === 'asc') return 'ascending';
    if (sort === 'desc') return 'descending';
    return undefined;
};

type ActiveSort = { column: string; direction: SortDirection };

// The request contract carries a single sort field and the local sort has always read the first
// header that declares one, so the table holds one active sort rather than a flag per header. Many
// callers still hand in several headers marked `sort: 'asc'`; taking the first collapses those to
// the one column that was ever really sorted instead of announcing all of them at once.
const declaredSort = (headers: TableHeader[]): ActiveSort | undefined => {
    const sorted = headers.find((header) => header.sort);
    return sorted?.sort ? { column: sorted.id, direction: sorted.sort } : undefined;
};

const sortSignature = (sort: ActiveSort | undefined) => (sort ? `${sort.column}:${sort.direction}` : '');

function CustomTable({
    headers,
    data,
    canSearch,
    hasHeader = true,
    hasCheckboxes,
    hasAllCheckBox = true,
    multiSelect = true,
    hasPagination,
    hasDetails,
    paginationData,
    checkedRows,
    onCheckedRowsChanged,
    onSortChanged,
    persistSort = true,
    onPageSizeChanged,
    onPageChanged,
    itemsPerPageOptions,
    newRowWidgetProps,
    detailHeaders,
    paginationStateKey,
    paginationPersistKey,
    disablePaginationControls = false,
    disableSelectionControls = false,
    disableSearchControls = false,
    isLoading = false,
}: Readonly<Props>) {
    const location = useLocation();
    const [tblData, setTblData] = useState<TableDataRow[]>(data);
    const [tblCheckedRows, setTblCheckedRows] = useState<(string | number)[]>(checkedRows || emptyCheckedRows);
    const [totalPages, setTotalPages] = useState(1);

    const serverSortEnabled = onSortChanged !== undefined;

    const [expandedRow, setExpandedRow] = useState<string | number>();
    const internalPaginationHydratedKeyRef = useRef<string | undefined>(undefined);

    const internalPaginationEnabled = hasPagination && !paginationData && !onPageChanged && !onPageSizeChanged;
    const tableSignature = useMemo(() => {
        if (paginationStateKey) {
            return paginationStateKey;
        }

        const headerIds = headers.map((header) => header.id).join('|');
        return `${headerIds}|${hasCheckboxes ? 'checkboxes' : 'no-checkboxes'}|${hasDetails ? 'details' : 'no-details'}`;
    }, [paginationStateKey, headers, hasCheckboxes, hasDetails]);
    const internalPaginationRouteKey = useMemo(() => {
        return location.pathname;
    }, [location.pathname]);
    const internalPaginationStorageKey = useMemo(
        () =>
            paginationPersistKey
                ? // route-independent: exempt from clearPaginationByRootRoute
                  `custom-table-persistent:${paginationPersistKey}`
                : `custom-table-pagination:${internalPaginationRouteKey}:${tableSignature}`,
        [paginationPersistKey, internalPaginationRouteKey, tableSignature],
    );
    const selectInternalPagination = useMemo(
        () => tablePaginationSelectors.pagination(internalPaginationStorageKey),
        [internalPaginationStorageKey],
    );
    const persistedInternalPagination = useSelector(selectInternalPagination);
    const [page, setPage] = useState(() => (internalPaginationEnabled ? persistedInternalPagination.page : 1));
    const [pageSize, setPageSize] = useState(() => (internalPaginationEnabled ? persistedInternalPagination.pageSize : 10));
    const [searchKey, setSearchKey] = useState<string>(() =>
        internalPaginationEnabled && canSearch ? (persistedInternalPagination.search ?? '') : '',
    );
    const dispatch = useDispatch();

    // A sort restored from persistence outranks the one the headers declare: it is what the user last
    // chose, and only a header that is actually there and sortable can carry it. A caller that owns
    // the sort itself is handed nothing here — see `persistSort`.
    const persistedSort = useMemo<ActiveSort | undefined>(() => {
        const column = persistedInternalPagination.sortColumn;
        if (!persistSort || !hasPagination || !column) return undefined;
        if (!headers.some((header) => header.id === column && header.sortable)) return undefined;
        return { column, direction: persistedInternalPagination.sortDirection ?? 'asc' };
    }, [persistSort, hasPagination, headers, persistedInternalPagination.sortColumn, persistedInternalPagination.sortDirection]);

    const incomingSort = useMemo(() => persistedSort ?? declaredSort(headers), [persistedSort, headers]);
    const incomingSortSignature = sortSignature(incomingSort);

    // The active sort is held on its own rather than inside a copy of the headers. A caller that
    // re-derives its `headers` array after a fetch — which server-driven sorting makes it do on every
    // click — would otherwise hand its own unsorted props straight back and drop the column the user
    // just chose, so the next click would report `asc` again instead of toggling to `desc`.
    const [activeSort, setActiveSort] = useState<ActiveSort | undefined>(incomingSort);
    const appliedIncomingSortRef = useRef(incomingSortSignature);

    useEffect(() => {
        if (appliedIncomingSortRef.current === incomingSortSignature) return;
        appliedIncomingSortRef.current = incomingSortSignature;
        setActiveSort((current) => (sortSignature(current) === incomingSortSignature ? current : incomingSort));
    }, [incomingSort, incomingSortSignature]);

    const tblHeaders = useMemo(
        () => headers.map((header) => ({ ...header, sort: header.id === activeSort?.column ? activeSort.direction : undefined })),
        [headers, activeSort],
    );

    const resetVersion = useSelector(tablePaginationSelectors.resetVersionForKey(internalPaginationStorageKey));
    const lastResetVersionRef = useRef(resetVersion);
    useEffect(() => {
        if (lastResetVersionRef.current === resetVersion) return;
        lastResetVersionRef.current = resetVersion;
        if (!internalPaginationEnabled) return;
        setPage(1);
        setPageSize(10);
        if (canSearch) setSearchKey('');
    }, [resetVersion, internalPaginationEnabled, canSearch]);

    useLayoutEffect(() => {
        if (!internalPaginationEnabled) {
            return;
        }

        if (internalPaginationHydratedKeyRef.current === internalPaginationStorageKey) {
            return;
        }

        internalPaginationHydratedKeyRef.current = internalPaginationStorageKey;
        if (page !== persistedInternalPagination.page) {
            setPage(persistedInternalPagination.page);
        }
        if (pageSize !== persistedInternalPagination.pageSize) {
            setPageSize(persistedInternalPagination.pageSize);
        }
        if (canSearch && searchKey !== (persistedInternalPagination.search ?? '')) {
            setSearchKey(persistedInternalPagination.search ?? '');
        }
    }, [
        internalPaginationEnabled,
        internalPaginationStorageKey,
        page,
        pageSize,
        canSearch,
        searchKey,
        persistedInternalPagination.page,
        persistedInternalPagination.pageSize,
        persistedInternalPagination.search,
    ]);

    useEffect(() => {
        if (!internalPaginationEnabled || !canSearch) {
            return;
        }

        if ((persistedInternalPagination.search ?? '') === searchKey) {
            return;
        }

        dispatch(
            tablePaginationActions.setSearch({
                key: internalPaginationStorageKey,
                search: searchKey,
            }),
        );
    }, [dispatch, internalPaginationEnabled, canSearch, internalPaginationStorageKey, searchKey, persistedInternalPagination.search]);

    useEffect(() => {
        if (!internalPaginationEnabled) {
            return;
        }

        if (persistedInternalPagination.page === page && persistedInternalPagination.pageSize === pageSize) {
            return;
        }

        dispatch(
            tablePaginationActions.setPagination({
                key: internalPaginationStorageKey,
                page,
                pageSize,
            }),
        );
    }, [
        dispatch,
        internalPaginationEnabled,
        internalPaginationStorageKey,
        page,
        pageSize,
        persistedInternalPagination.page,
        persistedInternalPagination.pageSize,
    ]);

    const handleRowDetailClick = useCallback(
        (rowId: string | number) => {
            const row = tblData.find((r) => r.id === rowId);
            if (!row?.detailColumns?.length) {
                return;
            }

            const detailTableHeaders: TableHeader[] =
                detailHeaders?.length === row.detailColumns.length
                    ? detailHeaders
                    : row.detailColumns.map((_, index) => ({
                          id: `detail-${index}`,
                          content: '',
                          sortable: false,
                      }));

            const processedColumns = row.detailColumns.map((col, index) => {
                if (Array.isArray(col)) {
                    return <div key={`detail-${rowId}-${index}`}>{col}</div>;
                }
                return col;
            });

            const detailData: TableDataRow[] = [
                {
                    id: 'detail-row',
                    columns: processedColumns,
                },
            ];

            const caption =
                row.detailTitle ?? (typeof row.columns[0] === 'string' ? row.columns[0] : jsxInnerText(row.columns[0] as React.ReactNode));

            dispatch(
                userInterfaceActions.showGlobalModal({
                    isOpen: true,
                    size: 'xl',
                    title: caption,
                    content: (
                        <CustomTable
                            headers={detailTableHeaders}
                            data={detailData}
                            hasHeader={Boolean(detailHeaders)}
                            hasPagination={false}
                        />
                    ),
                    showCloseButton: true,
                }),
            );
        },
        [tblData, detailHeaders, dispatch],
    );

    useEffect(() => {
        setTblCheckedRows(checkedRows || emptyCheckedRows);
    }, [checkedRows]);

    const onPageChange = useCallback(
        (page: number) => {
            if (disablePaginationControls) return;
            if (onPageChanged) onPageChanged(page);
            else setPage(page);
        },
        [disablePaginationControls, onPageChanged, setPage],
    );

    // A sort restored from persistence paints the arrow and suppresses local sorting. A server-driven
    // table has to be told about it as well, or the indicator claims an ordering the caller never
    // fetched and the two disagree until the user clicks. The signature is also stamped by the click
    // handler, which announces its own change, so no click is repeated here.
    const announcedServerSort = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (!serverSortEnabled || !activeSort) return;

        const signature = sortSignature(activeSort);
        if (announcedServerSort.current === signature) return;

        announcedServerSort.current = signature;
        onSortChanged?.(activeSort.column, activeSort.direction);
    }, [activeSort, serverSortEnabled, onSortChanged]);

    useEffect(
        () => {
            const filtered = searchKey
                ? [...data].filter((row) => {
                      let rowStr = '';
                      row.columns.forEach((col) => {
                          rowStr += typeof col === 'string' ? col : jsxInnerText(col as React.ReactNode);
                      });
                      return rowStr.toLowerCase().includes(searchKey.toLowerCase());
                  })
                : [...data];
            const sortCol = serverSortEnabled ? undefined : tblHeaders.find((h) => h.sort);

            if (!sortCol) {
                setTblCheckedRows(tblCheckedRows.filter((row) => data.find((data) => data.id === row)));
                setTblData(filtered);
                return;
            }

            const sortColumnIndex = tblHeaders.findIndex((h) => h.sort);

            if (sortColumnIndex >= 0) {
                const sortDirection = sortCol.sort || 'asc';

                filtered.sort((a, b) => {
                    const aCell = a.columns[sortColumnIndex];
                    const bCell = b.columns[sortColumnIndex];
                    const aVal = typeof aCell === 'string' ? aCell.toLowerCase() : jsxInnerText(aCell as React.ReactNode).toLowerCase();
                    const bVal = typeof bCell === 'string' ? bCell.toLowerCase() : jsxInnerText(bCell as React.ReactNode).toLowerCase();

                    switch (sortCol.sortType) {
                        case 'date': {
                            const aDate = new Date(aVal.replaceAll(' at ', ' '));
                            const bDate = new Date(bVal.replaceAll(' at ', ' '));
                            return sortDirection === 'asc' ? aDate.getTime() - bDate.getTime() : bDate.getTime() - aDate.getTime();
                        }

                        case 'numeric':
                            return sortDirection === 'asc'
                                ? Number.parseFloat(aVal) - Number.parseFloat(bVal)
                                : Number.parseFloat(bVal) - Number.parseFloat(aVal);

                        default: {
                            if (aVal === bVal) return 0;
                            const ascResult = aVal > bVal ? 1 : -1;
                            return sortDirection === 'asc' ? ascResult : -ascResult;
                        }
                    }
                });
            }

            setTblData(filtered);
            setTblCheckedRows(tblCheckedRows.filter((row) => data.find((data) => data.id === row)));
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [data, searchKey, activeSort, serverSortEnabled],
    );

    useEffect(() => {
        const nextTotalPages = Math.ceil(tblData.length / pageSize);
        setTotalPages(nextTotalPages);

        if (nextTotalPages === 0) {
            return;
        }

        if (page > nextTotalPages) {
            setPage(nextTotalPages);
        }
    }, [tblData, pageSize, page]);

    const onCheckAllCheckboxClick = useCallback(
        (value: boolean) => {
            if (disableSelectionControls) return;
            if (!value) {
                setTblCheckedRows([]);
                onCheckedRowsChanged?.([]);
                return;
            }

            const checkedRows = tblData.map((row) => row.id);

            setTblCheckedRows(checkedRows);
            onCheckedRowsChanged?.(checkedRows);
        },
        [disableSelectionControls, tblData, onCheckedRowsChanged],
    );

    const onRowToggleSelection = useCallback(
        (e: React.MouseEvent, rowId: string | number | undefined = undefined, continueAfterDetails: boolean = true) => {
            const target = e.target as HTMLElement;

            if (
                hasDetails &&
                target.localName !== 'input' &&
                target.localName !== 'button' &&
                (target.localName !== 'i' || 'expander' in target.dataset)
            ) {
                if (expandedRow === rowId) {
                    setExpandedRow(undefined);
                } else {
                    setExpandedRow(rowId);
                }
                if (!continueAfterDetails) {
                    return;
                }

                return;
            }

            if (e.target instanceof HTMLInputElement && e.target.type === 'checkbox') return;

            if (disableSelectionControls) return;

            const id = (e.currentTarget as HTMLElement).dataset.id;
            if (!id) return;

            if (!multiSelect) {
                const checkedRows: string[] = tblCheckedRows.includes(id) ? [] : [id];

                setTblCheckedRows(checkedRows);
                onCheckedRowsChanged?.(checkedRows);

                return;
            }

            const checkedRows = [...tblCheckedRows];

            if (checkedRows.includes(id)) {
                checkedRows.splice(checkedRows.indexOf(id), 1);
            } else {
                checkedRows.push(id);
            }

            setTblCheckedRows(checkedRows);
            onCheckedRowsChanged?.(checkedRows);

            e.stopPropagation();
            e.preventDefault();
        },
        [hasDetails, disableSelectionControls, multiSelect, tblCheckedRows, onCheckedRowsChanged, expandedRow],
    );

    const onRowCheckboxClick = useCallback(
        (value: boolean, id: string) => {
            if (disableSelectionControls) return;
            if (!id) return;

            if (!multiSelect) {
                const checked: string[] = tblCheckedRows.includes(id) ? [] : [id];
                setTblCheckedRows(checked);
                onCheckedRowsChanged?.(checked);
                return;
            }

            const checked = [...tblCheckedRows];

            if (value) {
                if (id && !checked.includes(id)) checked.push(id);
            } else if (id && checked.includes(id)) {
                checked.splice(checked.indexOf(id), 1);
            }

            setTblCheckedRows(checked);
            if (onCheckedRowsChanged) onCheckedRowsChanged(checked);
        },
        [disableSelectionControls, multiSelect, tblCheckedRows, onCheckedRowsChanged],
    );

    const onColumnSortClick = useCallback(
        (sortColumn: string) => {
            const hdr = tblHeaders.find((header) => header.id === sortColumn);
            if (!hdr) return;

            const sort: SortDirection = hdr.sort === 'asc' ? 'desc' : 'asc';

            // Only one column carries a sort: the request contract takes a single sort field, so a click on
            // another column moves the sort rather than adding to it.
            setActiveSort({ column: sortColumn, direction: sort });

            if (hasPagination && persistSort) {
                dispatch(tablePaginationActions.setSort({ key: internalPaginationStorageKey, sortColumn, sortDirection: sort }));
            }

            announcedServerSort.current = `${sortColumn}:${sort}`;
            onSortChanged?.(sortColumn, sort);
        },
        [tblHeaders, hasPagination, persistSort, internalPaginationStorageKey, dispatch, onSortChanged],
    );

    const onPageSizeChange = useCallback(
        (value: string | number) => {
            if (disablePaginationControls) return;
            const num = typeof value === 'string' ? Number.parseInt(value, 10) : value;
            if (!num || num <= 0) return;

            // Keep the user on the page containing the first item they were just viewing.
            const computeNextPage = (currentPage: number, currentPageSize: number, totalItems: number) => {
                if (totalItems <= 0) return 1;
                const firstVisibleItem = Math.min(Math.max((currentPage - 1) * currentPageSize + 1, 1), totalItems);
                return Math.max(1, Math.ceil(firstVisibleItem / num));
            };

            if (onPageSizeChanged) {
                onPageSizeChanged(num);
                if (paginationData && onPageChanged) {
                    const nextPage = computeNextPage(paginationData.page, paginationData.pageSize, paginationData.totalItems);
                    onPageChanged(nextPage);
                }
                return;
            }
            const nextInternalPage = computeNextPage(page, pageSize, tblData.length);
            setPageSize(num);
            setPage(nextInternalPage);
        },
        [disablePaginationControls, onPageSizeChanged, onPageChanged, paginationData, page, pageSize, tblData.length],
    );

    const checkAllChecked = useMemo(() => {
        return tblCheckedRows.length === tblData.length && tblData.length > 0;
    }, [tblData, tblCheckedRows]);

    const getSortIcon = useCallback((sort: SortDirection | undefined) => {
        // Only the sorted column carries an indicator at rest — an arrow on every header is the clutter
        // #1100 is about. The neutral double arrow stays as the affordance but is revealed on hover and
        // keyboard focus, and it keeps its box so the column does not jump width when it appears.
        if (!sort) {
            return (
                <ArrowDownUp
                    data-testid="sort-indicator"
                    data-direction="none"
                    aria-hidden="true"
                    className="size-3.5 shrink-0 invisible group-hover:visible group-focus-visible:visible"
                    strokeWidth={2.5}
                />
            );
        }

        const DirectionIcon = sort === 'asc' ? ArrowUp : ArrowDown;

        return (
            <DirectionIcon
                data-testid="sort-indicator"
                data-direction={sort}
                aria-hidden="true"
                className="size-3.5 shrink-0 text-brand"
                strokeWidth={2.5}
            />
        );
    }, []);

    const header = useMemo(() => {
        const columns: TableHeader[] = [...tblHeaders];

        if (hasCheckboxes) columns.unshift({ id: '__checkbox__', content: '', sortable: false, width: '0%' });
        return columns.map((header) => (
            <Fragment key={header.id}>
                <th
                    scope="col"
                    className={cn(
                        'p-2.5 text-start text-xs font-medium uppercase bg-surface-sunken whitespace-nowrap',
                        header.sort ? 'text-content' : 'text-content-subtle',
                    )}
                    data-id={header.id}
                    {...(header.sortable && ariaSortValue(header.sort) ? { 'aria-sort': ariaSortValue(header.sort) } : {})}
                    style={{
                        ...(header.width ? { width: header.width } : {}),
                        ...(header.minWidth ? { minWidth: header.minWidth } : {}),
                        ...(header.maxWidth == null ? {} : { maxWidth: `${header.maxWidth}px` }),
                        ...(header.align ? { textAlign: header.align } : {}),
                    }}
                >
                    {(() => {
                        const checkboxContent =
                            hasAllCheckBox && multiSelect ? (
                                <Checkbox
                                    checked={checkAllChecked}
                                    onChange={(value) => onCheckAllCheckboxClick(value)}
                                    id={`${header.id}__checkbox__`}
                                    disabled={disableSelectionControls}
                                />
                            ) : (
                                <div>&nbsp;</div>
                            );
                        const alignment = {
                            'justify-center': header.align === 'center',
                            'justify-end': header.align === 'right',
                        };
                        // A hidden heading still has to be in the accessibility tree — the cell is only
                        // visually blank. Wrapped rather than omitted, so a sortable icon column keeps an
                        // accessible name on its button.
                        const headingContent = header.headingHidden ? <span className="sr-only">{header.content}</span> : header.content;
                        // `info` sits outside the button: a sortable heading is itself a control, and a
                        // toggletip trigger inside it would nest one interactive element in another, which
                        // is invalid and leaves the keyboard and screen-reader behaviour of both undefined.
                        const sortableContent = (
                            <span className={cn('flex w-full items-center gap-1', alignment)}>
                                <button
                                    type="button"
                                    onClick={() => onColumnSortClick(header.id)}
                                    className={cn(
                                        'group flex items-center gap-1 cursor-pointer',
                                        'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 rounded-xs',
                                        header.info ? undefined : 'w-full',
                                        alignment,
                                    )}
                                >
                                    {headingContent}
                                    {/* An explicit space keeps the cell's text content separated from the next header's,
                                    so text-based selectors over the header row keep matching as they did. */}{' '}
                                    {getSortIcon(header.sort)}
                                </button>
                                {header.info}
                            </span>
                        );
                        if (header.id === '__checkbox__') return checkboxContent;
                        if (header.sortable) return sortableContent;
                        if (header.info) {
                            return (
                                <span className={cn('flex w-full items-center gap-1', alignment)}>
                                    {headingContent} {header.info}
                                </span>
                            );
                        }
                        return headingContent;
                    })()}
                </th>
            </Fragment>
        ));
    }, [
        tblHeaders,
        hasCheckboxes,
        onColumnSortClick,
        hasAllCheckBox,
        multiSelect,
        checkAllChecked,
        onCheckAllCheckboxClick,
        getSortIcon,
        disableSelectionControls,
    ]);

    const getRowStyle = useCallback((row: TableDataRow) => {
        if (!row.options) return undefined;
        const style: React.CSSProperties = {};
        if (row.options.useAccentBottomBorder) {
            Object.assign(style, { borderBottom: '1px solid' } as React.CSSProperties);
        }
        return style;
    }, []);

    const body = useMemo(() => {
        return tblData
            .filter((row, index) => {
                if (!hasPagination) return true;
                if (pageSize === 0) return true;
                return paginationData ? true : index >= (page - 1) * pageSize && index < page * pageSize;
            })
            .map((row, index) => (
                <Fragment key={row.id}>
                    <tr
                        key={`tr${row.id}`}
                        {...(hasCheckboxes || hasDetails
                            ? {
                                  onClick: (e) => {
                                      onRowToggleSelection(e, row.id, hasCheckboxes);
                                  },
                              }
                            : {})}
                        className={row.options?.rowClassName}
                        style={getRowStyle(row)}
                        data-id={row.id}
                    >
                        {hasCheckboxes && (
                            <td className="p-2.5">
                                <Checkbox
                                    checked={tblCheckedRows.includes(row.id)}
                                    onChange={(value) => {
                                        onRowCheckboxClick(value, row.id.toString());
                                    }}
                                    id={`${row.id}__checkbox__`}
                                    disabled={disableSelectionControls}
                                />
                            </td>
                        )}

                        {row.columns.map((column, index) => (
                            <TableRowCell
                                key={tblHeaders?.[index]?.id ?? index}
                                column={column}
                                index={index}
                                row={row}
                                tblHeaders={tblHeaders}
                                hasDetails={hasDetails}
                                onDetailClick={handleRowDetailClick}
                            />
                        ))}
                    </tr>
                </Fragment>
            ));
    }, [
        tblData,
        hasPagination,
        hasDetails,
        pageSize,
        paginationData,
        page,
        hasCheckboxes,
        onRowToggleSelection,
        tblCheckedRows,
        onRowCheckboxClick,
        tblHeaders,
        getRowStyle,
        handleRowDetailClick,
        disableSelectionControls,
    ]);

    return (
        <div data-testid="custom-table">
            {isLoading ? (
                <TableSkeleton
                    columnsCount={headers.length}
                    hasCheckboxes={Boolean(hasCheckboxes)}
                    hasPagination={false}
                    canSearch={Boolean(canSearch)}
                    rowCount={paginationData ? paginationData.pageSize : pageSize}
                />
            ) : (
                <>
                    {canSearch && (
                        <div className="flex justify-end mb-3">
                            <div className="max-w-sm">
                                <input
                                    id="search"
                                    placeholder="Search"
                                    value={searchKey}
                                    onChange={(event) => setSearchKey(event.target.value)}
                                    type="text"
                                    disabled={disableSearchControls}
                                    className="py-2.5 sm:py-3 px-4 block w-full border-outline rounded-lg sm:text-sm focus:border-brand focus:ring-brand disabled:opacity-50 disabled:pointer-events-none bg-surface-raised text-content placeholder-content-subtle"
                                />
                            </div>
                        </div>
                    )}
                    {(hasHeader || body?.length > 0 || !data.length) && (
                        <div className="py-2">
                            <SimpleBar forceVisible="x">
                                <div className={cn('rounded-md', { 'border border-divider': hasHeader })}>
                                    <div className="min-w-full inline-block align-middle">
                                        <div className="overflow-hidden">
                                            <table className="min-w-full divide-y divide-divider bg-surface-raised">
                                                {hasHeader && (
                                                    <thead className="bg-surface-sunken">
                                                        <tr>{header}</tr>
                                                    </thead>
                                                )}
                                                <tbody className="divide-y divide-divider">{body}</tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </SimpleBar>
                            {body.length === 0 && (
                                <div className="flex flex-col items-center justify-center gap-3 py-8">
                                    <div className="flex items-center justify-center w-14 h-14 rounded-full bg-surface-sunken">
                                        <TableProperties size={28} strokeWidth={1.5} className="text-content-subtle" />
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-sm font-medium text-content-muted">
                                            {data.length > 0 ? 'No matching items' : 'No items to show'}
                                        </span>
                                        <span className="text-xs text-content-subtle">
                                            {data.length > 0
                                                ? 'Try adjusting your search or filters to see results'
                                                : 'There are no records to display here yet'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
            {hasPagination && (
                <div className="flex justify-between items-center gap-2 mt-6">
                    <div>
                        {(paginationData ? paginationData.totalItems > 0 : (tblData?.length ?? 0) > 0) && (
                            <Select
                                id="pageSize"
                                options={(paginationData?.itemsPerPageOptions || itemsPerPageOptions || DEFAULT_ITEMS_PER_PAGE_OPTIONS).map(
                                    (option: number) => ({
                                        label: option.toString(),
                                        value: option.toString(),
                                    }),
                                )}
                                value={(paginationData ? paginationData.pageSize : pageSize).toString()}
                                onChange={(v) => onPageSizeChange(v as string | number)}
                                isDisabled={disablePaginationControls}
                                minWidth={90}
                            />
                        )}
                    </div>

                    {(paginationData ? paginationData.totalPages > 1 : totalPages > 1) && (
                        <Pagination
                            page={paginationData?.page || page}
                            totalPages={paginationData?.totalPages || totalPages}
                            onPageChange={onPageChange}
                            disabled={disablePaginationControls}
                        />
                    )}

                    {(paginationData ? paginationData.totalItems > 0 : !!tblData?.length) && (
                        <div className="text-sm">
                            {paginationData ? (
                                <div>
                                    Showing {(paginationData.page - 1) * paginationData.pageSize + 1} to{' '}
                                    {Math.min(
                                        (paginationData.page - 1) * paginationData.pageSize + paginationData.loadedPageSize,
                                        paginationData.totalItems,
                                    )}{' '}
                                    items of {paginationData.totalItems}
                                </div>
                            ) : (
                                <div>
                                    Showing {(page - 1) * pageSize + (tblData.length > 0 ? 1 : 0)} to{' '}
                                    {Math.min((page - 1) * pageSize + pageSize, tblData.length)} of {tblData.length} entries
                                </div>
                            )}

                            {searchKey && data.length - tblData.length > 0 ? (
                                <div>{data.length - tblData.length} of loaded entries filtered</div>
                            ) : (
                                <></>
                            )}
                        </div>
                    )}
                </div>
            )}

            {newRowWidgetProps && (
                <NewRowWidget
                    selectHint={newRowWidgetProps.selectHint}
                    immediateAdd={newRowWidgetProps.immediateAdd}
                    isBusy={newRowWidgetProps.isBusy}
                    newItemsList={newRowWidgetProps.newItemsList}
                    onAddClick={newRowWidgetProps.onAddClick}
                />
            )}
        </div>
    );
}

export default CustomTable;
