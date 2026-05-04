import type React from 'react';
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { jsxInnerText } from 'utils/jsxInnerText';
import { useDispatch, useSelector } from 'react-redux';
import { actions as userInterfaceActions } from 'ducks/user-interface';
import { actions as tablePaginationActions, selectors as tablePaginationSelectors } from 'ducks/table-pagination';

import NewRowWidget, { type NewRowWidgetProps } from './NewRowWidget';
import { TableRowCell } from './TableRowCell';
import type { TableDataRow, TableHeader } from './types';
import Select from 'components/Select';
import Pagination from 'components/Pagination';
import Checkbox from 'components/Checkbox';
import SimpleBar from 'simplebar-react';
import cn from 'classnames';
import { useLocation } from 'react-router';
import TableSkeleton from './TableSkeleton';

export type { TableDataRow, TableHeader } from './types';

interface Props {
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
        itemsPerPageOptions: number[];
    };
    onCheckedRowsChanged?: (checkedRows: (string | number)[]) => void;
    onPageSizeChanged?: (pageSize: number) => void;
    onPageChanged?: (page: number) => void;
    itemsPerPageOptions?: number[];
    newRowWidgetProps?: NewRowWidgetProps;
    columnForDetail?: string;
    detailHeaders?: TableHeader[];
    paginationStateKey?: string;
    disablePaginationControls?: boolean;
    disableSelectionControls?: boolean;
    disableSearchControls?: boolean;
    isLoading?: boolean;
}

const emptyCheckedRows: (string | number)[] = [];

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
    onPageSizeChanged,
    onPageChanged,
    itemsPerPageOptions,
    newRowWidgetProps,
    detailHeaders,
    columnForDetail,
    paginationStateKey,
    disablePaginationControls = false,
    disableSelectionControls = false,
    disableSearchControls = false,
    isLoading = false,
}: Props) {
    const location = useLocation();
    const [tblHeaders, setTblHeaders] = useState<TableHeader[]>();
    const [tblData, setTblData] = useState<TableDataRow[]>(data);
    const [tblCheckedRows, setTblCheckedRows] = useState<(string | number)[]>(checkedRows || emptyCheckedRows);
    const [totalPages, setTotalPages] = useState(1);

    const [searchKey, setSearchKey] = useState<string>('');
    const [sortColumn, setSortColumn] = useState<string>('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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
        () => `custom-table-pagination:${internalPaginationRouteKey}:${tableSignature}`,
        [internalPaginationRouteKey, tableSignature],
    );
    const currentRootRoute = useMemo(() => {
        const normalizedRoute = internalPaginationRouteKey.startsWith('/')
            ? internalPaginationRouteKey.slice(1)
            : internalPaginationRouteKey;

        return normalizedRoute.split('/')[0] || '';
    }, [internalPaginationRouteKey]);
    const selectInternalPagination = useMemo(
        () => tablePaginationSelectors.pagination(internalPaginationStorageKey),
        [internalPaginationStorageKey],
    );
    const persistedInternalPagination = useSelector(selectInternalPagination);
    const [page, setPage] = useState(() => (internalPaginationEnabled ? persistedInternalPagination.page : 1));
    const [pageSize, setPageSize] = useState(() => (internalPaginationEnabled ? persistedInternalPagination.pageSize : 10));
    const activeRootRoute = useSelector(tablePaginationSelectors.activeRootRoute);
    const dispatch = useDispatch();

    useEffect(() => {
        if (!currentRootRoute) {
            return;
        }

        if (!activeRootRoute) {
            dispatch(tablePaginationActions.setActiveRootRoute({ rootRoute: currentRootRoute }));
            return;
        }

        if (activeRootRoute !== currentRootRoute) {
            dispatch(tablePaginationActions.clearPaginationByRootRoute({ rootRoute: activeRootRoute }));
            dispatch(tablePaginationActions.setActiveRootRoute({ rootRoute: currentRootRoute }));
        }
    }, [activeRootRoute, currentRootRoute, dispatch]);

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
    }, [
        internalPaginationEnabled,
        internalPaginationStorageKey,
        page,
        pageSize,
        persistedInternalPagination.page,
        persistedInternalPagination.pageSize,
    ]);

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
            if (!row || !row.detailColumns?.length) {
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
                    return <div key={`detail-col-${index}`}>{col}</div>;
                }
                return col;
            });

            const detailData: TableDataRow[] = [
                {
                    id: 'detail-row',
                    columns: processedColumns,
                },
            ];

            const caption = typeof row.columns[0] === 'string' ? row.columns[0] : jsxInnerText(row.columns[0] as React.ReactNode);

            dispatch(
                userInterfaceActions.showGlobalModal({
                    isOpen: true,
                    size: 'xl',
                    title: caption,
                    content: (
                        <CustomTable headers={detailTableHeaders} data={detailData} hasHeader={!!detailHeaders} hasPagination={false} />
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

    useEffect(() => {
        setTblHeaders(headers);
    }, [headers]);

    useEffect(() => {
        if (!tblHeaders) return;

        const sortCol = tblHeaders.find((h) => h.sort);

        if (sortCol) {
            setSortColumn(sortCol.id);
            setSortOrder(sortCol.sort || 'asc');
        }
    }, [tblHeaders]);

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
            const sortCol = tblHeaders ? tblHeaders.find((h) => h.sort) : undefined;

            if (!tblHeaders || !sortCol) {
                setTblCheckedRows(tblCheckedRows.filter((row) => data.find((data) => data.id === row)));
                setTblData(filtered);
                return;
            }

            const sortColumnIndex = tblHeaders.findIndex((h) => h.sort);

            if (sortColumnIndex >= 0) {
                const sortDirection = sortCol.sort || 'asc';

                filtered.sort((a, b) => {
                    const aVal =
                        typeof a.columns[sortColumnIndex] === 'string'
                            ? (a.columns[sortColumnIndex] as string).toLowerCase()
                            : jsxInnerText(a.columns[sortColumnIndex] as React.ReactNode).toLowerCase();
                    const bVal =
                        typeof b.columns[sortColumnIndex] === 'string'
                            ? (b.columns[sortColumnIndex] as string).toLowerCase()
                            : jsxInnerText(b.columns[sortColumnIndex] as React.ReactNode).toLowerCase();

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

                        default:
                            if (aVal === bVal) return 0;
                            return aVal > bVal ? (sortDirection === 'asc' ? 1 : -1) : sortDirection === 'asc' ? -1 : 1;
                    }
                });
            }

            setTblData(filtered);
            setTblCheckedRows(tblCheckedRows.filter((row) => data.find((data) => data.id === row)));
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [data, searchKey, sortColumn, sortOrder],
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
                if (onCheckedRowsChanged) onCheckedRowsChanged([]);
                return;
            }

            const checkedRows = tblData.map((row) => row.id);

            setTblCheckedRows(checkedRows);
            if (onCheckedRowsChanged) onCheckedRowsChanged(checkedRows);
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
                if (onCheckedRowsChanged) onCheckedRowsChanged(checkedRows);

                return;
            }

            const checkedRows = [...tblCheckedRows];

            if (checkedRows.includes(id)) {
                checkedRows.splice(checkedRows.indexOf(id), 1);
            } else {
                checkedRows.push(id);
            }

            setTblCheckedRows(checkedRows);
            if (onCheckedRowsChanged) onCheckedRowsChanged(checkedRows);

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
                if (onCheckedRowsChanged) onCheckedRowsChanged(checked);
                return;
            }

            const checked = [...tblCheckedRows];

            if (value) {
                if (id && !checked.includes(id)) checked.push(id);
            } else {
                if (id && checked.includes(id)) checked.splice(checked.indexOf(id), 1);
            }

            setTblCheckedRows(checked);
            if (onCheckedRowsChanged) onCheckedRowsChanged(checked);
        },
        [disableSelectionControls, multiSelect, tblCheckedRows, onCheckedRowsChanged],
    );

    const onColumnSortClick = useCallback(
        (e: React.MouseEvent<HTMLTableCellElement>) => {
            if (!tblHeaders) return;

            const sortColumn = e.currentTarget.dataset.id;

            const hdr = tblHeaders?.find((header) => header.id === sortColumn);
            if (!hdr) return;

            const column = tblHeaders?.findIndex((header) => header.id === sortColumn);
            if (column === undefined || column === -1) return;

            const sort = hdr.sort === 'asc' ? 'desc' : 'asc';

            const headers: TableHeader[] = tblHeaders.map((header) => ({
                ...header,
                sort: header.id === sortColumn ? sort : undefined,
            }));

            setTblHeaders(headers);
        },
        [tblHeaders],
    );

    const onPageSizeChange = useCallback(
        (value: string | number) => {
            if (disablePaginationControls) return;
            const num = typeof value === 'string' ? Number.parseInt(value, 10) : value;
            if (onPageSizeChanged) {
                onPageSizeChanged(num);
                return;
            }
            setPageSize(num);
            setPage(1);
        },
        [disablePaginationControls, onPageSizeChanged],
    );

    const checkAllChecked = useMemo(() => {
        return tblCheckedRows.length === tblData.length && tblData.length > 0;
    }, [tblData, tblCheckedRows]);

    const getSortIcon = useCallback((sort: 'asc' | 'desc' | undefined) => {
        return (
            <div className="w-[14px]">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-arrow-down-up-icon lucide-arrow-down-up"
                >
                    <path d="m3 16 4 4 4-4" color={sort && sort === 'desc' ? 'var(--dark-gray-color)' : 'currentColor'} />
                    <path d="M7 20V4" color={sort && sort === 'desc' ? 'var(--dark-gray-color)' : 'currentColor'} />
                    <path d="m21 8-4-4-4 4" color={sort && sort === 'asc' ? 'var(--dark-gray-color)' : 'currentColor'} />
                    <path d="M17 4v16" color={sort && sort === 'asc' ? 'var(--dark-gray-color)' : 'currentColor'} />
                </svg>
            </div>
        );
    }, []);

    const header = useMemo(() => {
        const columns = tblHeaders ? [...tblHeaders] : [];

        if (hasCheckboxes) columns.unshift({ id: '__checkbox__', content: '', sortable: false, width: '0%' });
        return columns.map((header) => (
            <Fragment key={header.id}>
                <th
                    scope="col"
                    className={cn(
                        'p-2.5 text-start text-xs font-medium text-gray-500 uppercase dark:text-neutral-400 !color-gray-500 bg-[#F8FAFC] whitespace-nowrap',
                        {
                            'cursor-pointer': header.sortable,
                        },
                    )}
                    data-id={header.id}
                    {...(header.sortable ? { onClick: onColumnSortClick } : {})}
                    style={{
                        ...(header.width ? { width: header.width } : {}),
                        ...(header.maxWidth == null ? {} : { maxWidth: `${header.maxWidth}px` }),
                        ...(header.align ? { textAlign: header.align } : {}),
                    }}
                >
                    {header.id === '__checkbox__' ? (
                        hasAllCheckBox && multiSelect ? (
                            <Checkbox
                                checked={checkAllChecked}
                                onChange={(value) => onCheckAllCheckboxClick(value)}
                                id={`${header.id}__checkbox__`}
                                disabled={disableSelectionControls}
                            />
                        ) : (
                            <div>&nbsp;</div>
                        )
                    ) : header.sortable ? (
                        <div className={cn('flex items-center gap-1', { 'justify-center': header.align === 'center' })}>
                            {header.content}
                            &nbsp;
                            {getSortIcon(header.sort)}
                        </div>
                    ) : (
                        header.content
                    )}
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
                    hasCheckboxes={!!hasCheckboxes}
                    hasPagination={false}
                    canSearch={!!canSearch}
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
                                    onChange={(event) => setSearchKey(event.target.value)}
                                    type="text"
                                    disabled={disableSearchControls}
                                    className="py-2.5 sm:py-3 px-4 block w-full border-gray-200 rounded-lg sm:text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600"
                                />
                            </div>
                        </div>
                    )}
                    {(hasHeader || body?.length > 0) && (
                        <div className="py-2">
                            <SimpleBar forceVisible="x">
                                <div className={cn('rounded-md', { 'border border-gray-100': hasHeader })}>
                                    <div className="min-w-full inline-block align-middle">
                                        <div className="overflow-hidden">
                                            <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700 bg-white">
                                                {hasHeader && (
                                                    <thead className="bg-gray-50 dark:bg-neutral-700">
                                                        <tr>{header}</tr>
                                                    </thead>
                                                )}
                                                <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">{body}</tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </SimpleBar>
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
                                options={(paginationData?.itemsPerPageOptions || itemsPerPageOptions || [10, 20, 50, 100]).map(
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

                    {tblData?.length ? (
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
                    ) : (
                        <div className="text-sm">No items to show</div>
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
