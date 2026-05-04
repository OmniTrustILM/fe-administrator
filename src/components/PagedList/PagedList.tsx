import { type EntityType, selectors as filterSelectors } from 'ducks/filters';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';

import type { ApiClients } from 'src/api';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import FilterWidget from 'components/FilterWidget';
import Widget from 'components/Widget';
import PagedListSkeleton from './PagedListSkeleton';
import type { IconName } from 'types/icons';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { actions, selectors } from 'ducks/paging';
import type { Observable } from 'rxjs';
import type { SearchFieldListModel, SearchFilterModel, SearchRequestModel } from 'types/certificate';
import type { LockWidgetNameEnum } from 'types/user-interface';

interface Props {
    entity: EntityType;
    headers: TableHeader[];
    data: TableDataRow[];
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
}

function PagedList({
    headers,
    data,
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
}: Props) {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const currentFilters = useSelector(filterSelectors.currentFilters(entity));

    const totalItems = useSelector(selectors.totalItems(entity));
    const checkedRows = useSelector(selectors.checkedRows(entity));
    const isFetchingList = useSelector(selectors.isFetchingList(entity));
    const pageNumber = useSelector(selectors.pageNumber(entity));
    const pageSize = useSelector(selectors.pageSize(entity));

    const [confirmDelete, setConfirmDelete] = useState(false);
    const previousFiltersSnapshotRef = useRef<string | undefined>(undefined);
    const hasLoadedOnce = useRef(false);
    if (!isFetchingList && data.length > 0) hasLoadedOnce.current = true;

    const onCheckedRowsChanged = useCallback(
        (rows: (string | number)[]) => {
            dispatch(actions.setCheckedRows({ entity, checkedRows: rows as string[] }));
        },
        [dispatch, entity],
    );

    const getFreshData = useCallback(() => {
        onListCallback({ itemsPerPage: pageSize, pageNumber, filters: currentFilters });
        onCheckedRowsChanged([]);
    }, [currentFilters, pageSize, pageNumber, onListCallback, onCheckedRowsChanged]);

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
            dispatch(
                actions.setPagination({
                    entity,
                    pageSize,
                    pageNumber: nextPageNumber,
                }),
            );
        },
        [dispatch, entity, pageSize],
    );

    const onDeleteConfirmed = useCallback(() => {
        setConfirmDelete(false);
        onDeleteCallback!(checkedRows, currentFilters);
        onCheckedRowsChanged([]);
        getFreshData();
    }, [checkedRows, onDeleteCallback, currentFilters, onCheckedRowsChanged, getFreshData]);

    useEffect(() => {
        const currentFiltersSnapshot = JSON.stringify(currentFilters ?? []);

        if (previousFiltersSnapshotRef.current === undefined) {
            previousFiltersSnapshotRef.current = currentFiltersSnapshot;
            return;
        }

        if (previousFiltersSnapshotRef.current !== currentFiltersSnapshot) {
            dispatch(
                actions.setPagination({
                    entity,
                    pageSize,
                    pageNumber: 1,
                }),
            );
        }

        previousFiltersSnapshotRef.current = currentFiltersSnapshot;
    }, [currentFilters, dispatch, entity, pageSize]);

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

    const paginationData = useMemo(
        () => ({
            page: pageNumber,
            totalItems: totalItems,
            pageSize: pageSize,
            loadedPageSize: pageSize,
            totalPages: Math.ceil(totalItems / pageSize),
            itemsPerPageOptions: [10, 20, 50, 100, 200, 500, 1000],
        }),
        [pageNumber, totalItems, pageSize],
    );

    if (isFetchingList && data.length === 0 && !hasLoadedOnce.current) {
        const estimatedButtonCount = (!addHidden ? 1 : 0) + (onDeleteCallback ? 1 : 0) + (additionalButtons?.length ?? 0);
        return (
            <PagedListSkeleton
                hasFilter={!!getAvailableFiltersApi && !!filterTitle}
                filterTitle={filterTitle}
                buttonsCount={estimatedButtonCount}
                columnsCount={headers.length}
                hasCheckboxes={hasCheckboxes}
                hasExtraFilter={!!extraFilterComponent}
            />
        );
    }

    return (
        <div className="flex flex-col gap-4 md:gap-8">
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
                busy={isBusy || (isFetchingList && data.length > 0)}
                enableBusyOverlay
                widgetLockName={pageWidgetLockName}
                refreshAction={getFreshData}
                widgetButtons={buttons}
                titleSize="large"
                hideWidgetButtons={hideWidgetButtons}
            >
                <CustomTable
                    headers={headers}
                    data={data}
                    hasCheckboxes={hasCheckboxes}
                    hasDetails={hasDetails}
                    columnForDetail={columnForDetail}
                    hasPagination
                    multiSelect={multiSelect}
                    paginationData={paginationData}
                    onPageChanged={onPageNumberChanged}
                    onCheckedRowsChanged={onCheckedRowsChanged}
                    onPageSizeChanged={onPageSizeChanged}
                    isLoading={isFetchingList && data.length === 0}
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
