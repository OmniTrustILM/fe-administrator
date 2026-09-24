import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { firstValueFrom } from 'rxjs';
import WidgetButtons, { type WidgetButtonProps } from 'components/WidgetButtons';
import Dialog from 'components/Dialog';
import { useCopyToClipboard, useRunOnSuccessfulFinish } from 'utils/common-hooks';
import CbomUploadDialog from '../CbomUploadDialog';
import { actions as alertActions } from 'ducks/alerts';
import { actions, selectors } from 'ducks/cbom';
import PagedList from 'components/PagedList/PagedList';
import { LockWidgetNameEnum } from 'types/user-interface';
import { type CbomDto, PlatformEnum, Resource } from 'types/openapi';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { dateFormatter } from 'utils/dateUtil';
import { buildCbomCellRegistry, CBOM_COLUMNS } from '../cbomTableHelpers';
import type { SearchRequestModel } from 'types/certificate';
import { type ApiClients, backendClient } from 'src/api';
import { EntityType, actions as filterActions } from 'ducks/filters';
import { actions as pagingActions } from 'ducks/paging';

function CbomsList() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const cboms = useSelector(selectors.selectCbomList);
    const assetSyncStateEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.CbomAssetSyncState));
    const isFetching = useSelector(selectors.selectIsFetchingList);
    const isDeleting = useSelector(selectors.selectIsDeleting);
    const isBulkDeleting = useSelector(selectors.selectIsBulkDeleting);
    const isSyncing = useSelector(selectors.selectIsSyncing);

    const isBusy = isFetching || isDeleting || isBulkDeleting || isSyncing;

    const copyToClipboard = useCopyToClipboard();
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [highlightedCbomUuid, setHighlightedCbomUuid] = useState<string>();
    const additionalButtons: WidgetButtonProps[] = useMemo(
        () => [
            {
                id: 'upload',
                icon: 'upload',
                disabled: false,
                tooltip: 'Upload CBOM',
                onClick: () => setIsUploadOpen(true),
            },
            {
                id: 'sync',
                icon: 'repeat',
                disabled: isSyncing,
                tooltip: 'Sync CBOMs',
                onClick: () => dispatch(actions.syncCboms()),
            },
            {
                id: 'sync-skips',
                icon: 'cross-circle',
                disabled: false,
                tooltip: 'Skipped documents: what the sync could not store',
                'aria-label': 'Skipped documents',
                onClick: () => navigate('./sync-skips'),
            },
        ],
        [dispatch, isSyncing, navigate],
    );

    const getCbomJson = useCallback(async (uuid: string): Promise<string> => {
        const cbomDetail = await firstValueFrom(backendClient.cbomManagement.getCbomDetail({ uuid }));
        return JSON.stringify(cbomDetail.content ?? {}, null, 2);
    }, []);

    const handleCopyCbomJson = useCallback(
        async (uuid: string) => {
            try {
                const json = await getCbomJson(uuid);
                copyToClipboard(json, 'CBOM JSON copied', 'Failed to copy CBOM JSON');
            } catch {
                dispatch(alertActions.error('Failed to copy CBOM JSON'));
            }
        },
        [copyToClipboard, dispatch, getCbomJson],
    );

    const handleDownloadCbomJson = useCallback(
        async (uuid: string, serialNumber: string, version: number) => {
            try {
                const json = await getCbomJson(uuid);
                const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.download = `cbom-${serialNumber}-v${version}.json`;
                document.body.appendChild(anchor);
                anchor.click();
                anchor.remove();
                URL.revokeObjectURL(url);
            } catch {
                dispatch(alertActions.error('Failed to download CBOM JSON'));
            }
        },
        [dispatch, getCbomJson],
    );

    const renderActions = useCallback(
        (cbom: CbomDto) => (
            <WidgetButtons
                buttons={
                    [
                        {
                            id: 'copy',
                            icon: 'copy',
                            disabled: false,
                            tooltip: 'Copy JSON',
                            onClick: (e) => {
                                e.stopPropagation();
                                void handleCopyCbomJson(cbom.uuid);
                            },
                        },
                        {
                            id: 'download',
                            icon: 'download',
                            disabled: false,
                            tooltip: 'Download JSON',
                            onClick: (e) => {
                                e.stopPropagation();
                                void handleDownloadCbomJson(cbom.uuid, cbom.serialNumber, cbom.version);
                            },
                        },
                    ] as WidgetButtonProps[]
                }
            />
        ),
        [handleCopyCbomJson, handleDownloadCbomJson],
    );

    const registry = useMemo(
        () => buildCbomCellRegistry({ assetSyncStateEnum, getEnumLabel, dateFormatter, renderActions }),
        [assetSyncStateEnum, renderActions],
    );

    const rowOptions = useCallback(
        (cbom: CbomDto) => (cbom.uuid === highlightedCbomUuid ? { rowBackground: 'bg-success-surface' } : undefined),
        [highlightedCbomUuid],
    );

    const configurableColumns = useMemo(
        () => ({
            resource: Resource.Cboms,
            standardColumns: CBOM_COLUMNS,
            rows: cboms,
            getRowId: (cbom: CbomDto) => cbom.uuid,
            registry,
            rowOptions,
        }),
        [cboms, registry, rowOptions],
    );

    const onList = useCallback((filters: SearchRequestModel) => dispatch(actions.listCboms(filters)), [dispatch]);

    const isUploading = useSelector(selectors.selectIsUploading);
    const isUploadSuccess = useSelector(selectors.selectIsUploadSuccess);
    const syncSucceeded = useSelector(selectors.selectSyncSucceeded);

    // Back to an unfiltered first page, so the CBOM the upload produced is on it. The refresh goes
    // through the token rather than a request assembled here, which would carry no columns and no
    // ordering — blanking every picker-added column and dropping the applied sort.
    const [pageRefreshToken, setPageRefreshToken] = useState(0);
    const deleteRefreshToken = useSelector(selectors.selectListRefreshToken);
    const refreshToken = pageRefreshToken + deleteRefreshToken;

    const refreshFromFirstPage = useCallback(() => {
        dispatch(filterActions.setCurrentFilters({ entity: EntityType.CBOM, currentFilters: [] }));
        dispatch(pagingActions.resetPaging({ entity: EntityType.CBOM }));
        setPageRefreshToken((token) => token + 1);
    }, [dispatch]);

    useRunOnSuccessfulFinish(isUploading, isUploadSuccess, () => {
        setIsUploadOpen(false);
        setHighlightedCbomUuid(cboms[0]?.uuid);
        refreshFromFirstPage();
    });

    useEffect(() => {
        if (!highlightedCbomUuid) {
            return;
        }

        const timeoutId = globalThis.setTimeout(() => setHighlightedCbomUuid(undefined), 5000);
        return () => globalThis.clearTimeout(timeoutId);
    }, [highlightedCbomUuid]);

    useRunOnSuccessfulFinish(isSyncing, syncSucceeded, refreshFromFirstPage);

    return (
        <>
            <PagedList
                entity={EntityType.CBOM}
                onListCallback={onList}
                onDeleteCallback={(uuids) => {
                    if (uuids.length === 1) {
                        dispatch(actions.deleteCbom({ uuid: uuids[0] }));
                        return;
                    }

                    if (uuids.length > 1) {
                        dispatch(actions.bulkDeleteCbom({ uuids }));
                    }
                }}
                getAvailableFiltersApi={useCallback((apiClients: ApiClients) => apiClients.cbomManagement.getCbomSearchableFields(), [])}
                filterTitle="CBOMs Filter"
                configurableColumns={configurableColumns}
                isBusy={isBusy}
                title="CBOMs"
                entityNameSingular="a CBOM"
                entityNamePlural="CBOMs"
                addHidden
                hasCheckboxes={true}
                additionalButtons={additionalButtons}
                pageWidgetLockName={LockWidgetNameEnum.ListOfCboms}
                refreshToken={refreshToken}
            />

            <Dialog
                isOpen={isUploadOpen}
                caption="Upload CBOM"
                body={
                    <CbomUploadDialog
                        onCancel={() => setIsUploadOpen(false)}
                        onUpload={(data) => dispatch(actions.uploadCbom({ content: data.content }))}
                    />
                }
                toggle={() => setIsUploadOpen(false)}
                buttons={[]}
                size="xl"
                icon="upload"
            />
        </>
    );
}

export default CbomsList;
