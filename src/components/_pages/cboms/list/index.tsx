import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import { firstValueFrom } from 'rxjs';
import WidgetButtons, { type WidgetButtonProps } from 'components/WidgetButtons';
import Dialog from 'components/Dialog';
import { useCopyToClipboard, useRunOnSuccessfulFinish } from 'utils/common-hooks';
import CbomUploadDialog from '../CbomUploadDialog';
import { actions as alertActions } from 'ducks/alerts';
import { actions, selectors } from 'ducks/cbom';
import PagedList from 'components/PagedList/PagedList';
import type { TableDataRow, TableHeader } from 'components/CustomTable';
import { LockWidgetNameEnum } from 'types/user-interface';
import type { SearchRequestModel } from 'types/certificate';
import { type ApiClients, backendClient } from 'src/api';
import { EntityType } from 'ducks/filters';

const toFiniteNumber = (value: unknown): number => {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

function CbomsList() {
    const dispatch = useDispatch();

    const cboms = useSelector(selectors.selectCbomList);
    const isFetching = useSelector(selectors.selectIsFetchingList);
    const isDeleting = useSelector(selectors.selectIsDeleting);
    const isBulkDeleting = useSelector(selectors.selectIsBulkDeleting);
    const isSyncing = useSelector(selectors.selectIsSyncing);

    const isBusy = isFetching || isDeleting || isBulkDeleting || isSyncing;

    const headers: TableHeader[] = useMemo(
        () => [
            { content: 'Serial number', sortable: true, id: 'serial' },
            { content: 'Ver.', sortable: true, id: 'version', align: 'center', sortType: 'numeric' },
            { content: 'Source', sortable: true, id: 'source' },
            { content: 'Alg.', sortable: true, id: 'algorithm', align: 'center', sortType: 'numeric' },
            { content: 'Certs', sortable: true, id: 'certificates', align: 'center', sortType: 'numeric' },
            { content: 'Proto.', sortable: true, id: 'protocol', align: 'center', sortType: 'numeric' },
            { content: 'Material', sortable: true, id: 'material', align: 'center', sortType: 'numeric' },
            { content: 'Assets', sortable: true, id: 'assets', align: 'center', sortType: 'numeric' },
            { content: 'Action', sortable: false, id: 'action', align: 'center' },
        ],
        [],
    );

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
        ],
        [dispatch, isSyncing],
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

    const rows: TableDataRow[] = useMemo(
        () =>
            cboms.map((c) => ({
                id: c.uuid,
                options: {
                    rowClassName: c.uuid === highlightedCbomUuid ? 'bg-green-50' : undefined,
                },
                columns: [
                    <Link key="serial" to={`./detail/${c.uuid}`}>
                        {c.serialNumber}
                    </Link>,
                    toFiniteNumber(c.version),
                    c.source || '-',
                    toFiniteNumber(c.algorithms),
                    toFiniteNumber(c.certificates),
                    toFiniteNumber(c.protocols),
                    toFiniteNumber(c.cryptoMaterial),
                    toFiniteNumber(c.totalAssets),
                    <WidgetButtons
                        key={`actions-${c.uuid}`}
                        buttons={
                            [
                                {
                                    id: 'copy',
                                    icon: 'copy',
                                    disabled: false,
                                    tooltip: 'Copy JSON',
                                    onClick: (e) => {
                                        e.stopPropagation();
                                        void handleCopyCbomJson(c.uuid);
                                    },
                                },
                                {
                                    id: 'download',
                                    icon: 'download',
                                    disabled: false,
                                    tooltip: 'Download JSON',
                                    onClick: (e) => {
                                        e.stopPropagation();
                                        void handleDownloadCbomJson(c.uuid, c.serialNumber, c.version);
                                    },
                                },
                            ] as WidgetButtonProps[]
                        }
                    />,
                ],
            })),
        [cboms, handleCopyCbomJson, handleDownloadCbomJson, highlightedCbomUuid],
    );

    const onList = useCallback((filters: SearchRequestModel) => dispatch(actions.listCboms(filters)), [dispatch]);

    const isUploading = useSelector(selectors.selectIsUploading);
    const isUploadSuccess = useSelector(selectors.selectIsUploadSuccess);
    const syncSucceeded = useSelector(selectors.selectSyncSucceeded);

    useRunOnSuccessfulFinish(isUploading, isUploadSuccess, () => {
        setIsUploadOpen(false);
        setHighlightedCbomUuid(cboms[0]?.uuid);
        onList({ itemsPerPage: 10, pageNumber: 1, filters: [] });
    });

    useEffect(() => {
        if (!highlightedCbomUuid) {
            return;
        }

        const timeoutId = globalThis.setTimeout(() => setHighlightedCbomUuid(undefined), 5000);
        return () => globalThis.clearTimeout(timeoutId);
    }, [highlightedCbomUuid]);

    useRunOnSuccessfulFinish(isSyncing, syncSucceeded, () => {
        onList({ itemsPerPage: 10, pageNumber: 1, filters: [] });
    });

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
                headers={headers}
                data={rows}
                isBusy={isBusy}
                title="CBOMs"
                entityNameSingular="a CBOM"
                entityNamePlural="CBOMs"
                addHidden
                hasCheckboxes={true}
                additionalButtons={additionalButtons}
                pageWidgetLockName={LockWidgetNameEnum.ListOfCboms}
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
