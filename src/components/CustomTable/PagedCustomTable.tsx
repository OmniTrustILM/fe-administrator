import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { actions as tablePaginationActions, selectors as tablePaginationSelectors } from 'ducks/table-pagination';

type Props = {
    headers: TableHeader[];
    data: TableDataRow[];
    totalItems?: number;
    onReloadData: (pageSize: number, pageNumber: number) => void;
    stateKey?: string;
    tableStateKey?: string;
    isLoading?: boolean;
};

export default function PagedCustomTable({ headers, data, totalItems, onReloadData, stateKey, tableStateKey, isLoading }: Readonly<Props>) {
    const dispatch = useDispatch();
    const location = useLocation();

    const paginationStateStorageKey = `paged-custom-table-pagination:${stateKey ?? location.pathname}`;
    const selectPaginationState = useMemo(
        () => tablePaginationSelectors.pagination(paginationStateStorageKey),
        [paginationStateStorageKey],
    );
    const persistedPaginationState = useSelector(selectPaginationState);

    // Opens on what is stored, so the first persist and the first load cannot run on a default page and write it back.
    const [pagination, setPagination] = useState(() => ({
        key: paginationStateStorageKey,
        page: persistedPaginationState.page,
        pageSize: persistedPaginationState.pageSize,
    }));
    if (pagination.key !== paginationStateStorageKey) {
        setPagination({
            key: paginationStateStorageKey,
            page: persistedPaginationState.page,
            pageSize: persistedPaginationState.pageSize,
        });
    }
    const { page: pageNumber, pageSize } = pagination;

    const setPageNumber = useCallback((page: number) => setPagination((current) => ({ ...current, page })), []);
    const setPageSize = useCallback((size: number) => setPagination((current) => ({ ...current, pageSize: size })), []);

    const onReloadDataRef = useRef(onReloadData);

    useEffect(() => {
        onReloadDataRef.current = onReloadData;
    }, [onReloadData]);

    useEffect(() => {
        if (persistedPaginationState.page === pageNumber && persistedPaginationState.pageSize === pageSize) {
            return;
        }

        dispatch(
            tablePaginationActions.setPagination({
                key: paginationStateStorageKey,
                page: pageNumber,
                pageSize,
            }),
        );
    }, [dispatch, pageNumber, pageSize, paginationStateStorageKey, persistedPaginationState.page, persistedPaginationState.pageSize]);

    useEffect(() => {
        onReloadDataRef.current(pageSize, pageNumber);
    }, [pageSize, pageNumber]);

    const paginationData = useMemo(
        () => ({
            page: pageNumber,
            totalItems: totalItems ?? 0,
            pageSize: pageSize,
            loadedPageSize: pageSize,
            totalPages: Math.ceil((totalItems ?? 0) / pageSize),
        }),
        [pageNumber, totalItems, pageSize],
    );

    return (
        <div data-testid="paged-custom-table">
            <CustomTable
                headers={headers}
                data={data}
                paginationStateKey={tableStateKey}
                hasPagination={true}
                paginationData={paginationData}
                onPageChanged={setPageNumber}
                onPageSizeChanged={setPageSize}
                isLoading={isLoading}
            />
        </div>
    );
}
