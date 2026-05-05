import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router';
import { firstValueFrom } from 'rxjs';
import Breadcrumb from 'components/Breadcrumb';
import Container from 'components/Container';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Spinner from 'components/Spinner';
import Widget from 'components/Widget';
import WidgetButtons from 'components/WidgetButtons';
import { backendClient } from 'src/api';
import { actions as alertActions } from 'ducks/alerts';
import { actions, selectors } from 'ducks/cbom';
import type { CbomDetailDto, CbomDto } from 'types/openapi';
import { useCopyToClipboard } from 'utils/common-hooks';
import { dateFormatter } from 'utils/dateUtil';

export default function CbomVersionsHistory() {
    const dispatch = useDispatch();
    const { id = '' } = useParams();

    const detail = useSelector(selectors.selectCbomDetail);
    const versions = useSelector(selectors.selectCbomVersions);
    const isFetchingDetail = useSelector(selectors.selectIsFetchingDetail);
    const isFetchingVersions = useSelector(selectors.selectIsFetchingVersions);

    const copyToClipboard = useCopyToClipboard();

    useEffect(() => {
        if (!id) return;
        dispatch(actions.getCbomDetail({ uuid: id }));
        dispatch(actions.listCbomVersions({ uuid: id }));
    }, [dispatch, id]);

    const tableHeaders: TableHeader[] = useMemo(
        () => [
            { id: 'version', content: 'Version' },
            { id: 'created', content: 'Created' },
            { id: 'assets', content: 'Assets' },
            { id: 'action', content: 'Action', align: 'center' },
        ],
        [],
    );

    const getVersionJson = useCallback(async (uuid: string): Promise<string> => {
        const cbomDetail = (await firstValueFrom(backendClient.cbomManagement.getCbomDetail({ uuid }))) as CbomDetailDto;
        return JSON.stringify(cbomDetail.content ?? {}, null, 2);
    }, []);

    const handleCopyVersion = useCallback(
        async (version: CbomDto) => {
            try {
                const json = await getVersionJson(version.uuid);
                copyToClipboard(json, `Version ${version.version} copied`, 'Failed to copy version');
            } catch {
                dispatch(alertActions.error('Failed to copy version'));
            }
        },
        [copyToClipboard, dispatch, getVersionJson],
    );

    const handleDownloadVersion = useCallback(
        async (version: CbomDto) => {
            try {
                const json = await getVersionJson(version.uuid);
                const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.download = `cbom-${version.serialNumber}-v${version.version}.json`;
                document.body.appendChild(anchor);
                anchor.click();
                anchor.remove();
                URL.revokeObjectURL(url);
            } catch {
                dispatch(alertActions.error('Failed to download version'));
            }
        },
        [dispatch, getVersionJson],
    );

    const versionRows: TableDataRow[] = useMemo(() => {
        const latestVersionNumber = versions.length ? Math.max(...versions.map((version) => version.version)) : undefined;
        const originalVersionNumber = versions.length ? Math.min(...versions.map((version) => version.version)) : undefined;

        return [...versions]
            .sort((a, b) => b.version - a.version)
            .map((version) => ({
                id: version.uuid,
                columns: [
                    <div key={`version-link-wrap-${version.uuid}`} className="inline-flex items-center gap-1">
                        <Link className="text-[var(--primary-blue-color)]" to={`/cboms/detail/${version.uuid}`}>
                            {`Version ${version.version}`}
                        </Link>
                        {version.version === latestVersionNumber ? (
                            <span className="text-[var(--dark-gray-color)]">(Latest)</span>
                        ) : version.version === originalVersionNumber ? (
                            <span className="text-[var(--dark-gray-color)]">(Original)</span>
                        ) : null}
                    </div>,
                    <span key={`created-${version.uuid}`} style={{ whiteSpace: 'nowrap' }}>
                        {dateFormatter(version.createdAt)}
                    </span>,
                    version.totalAssets,
                    <WidgetButtons
                        key={`actions-${version.uuid}`}
                        buttons={[
                            {
                                id: 'copy',
                                icon: 'copy',
                                disabled: false,
                                tooltip: 'Copy JSON',
                                onClick: (e) => {
                                    e.stopPropagation();
                                    void handleCopyVersion(version);
                                },
                            },
                            {
                                id: 'download',
                                icon: 'download',
                                disabled: false,
                                tooltip: 'Download JSON',
                                onClick: (e) => {
                                    e.stopPropagation();
                                    void handleDownloadVersion(version);
                                },
                            },
                        ]}
                    />,
                ],
            }));
    }, [versions, handleCopyVersion, handleDownloadVersion]);

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: 'CBOM Inventory', href: '/cboms' },
                    { label: detail ? `${detail.serialNumber} / ${detail.version}` : 'CBOM Detail', href: `/cboms/detail/${id}` },
                    { label: 'Version History', href: '' },
                ]}
            />

            <Spinner active={isFetchingDetail || isFetchingVersions} />

            <Container>
                <Widget title={detail ? `${detail.serialNumber} / ${detail.version}` : 'CBOM Detail'} titleSize="large">
                    <CustomTable headers={tableHeaders} data={versionRows} hasPagination />
                </Widget>
            </Container>
        </div>
    );
}
