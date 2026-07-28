import type { TableDataRow, TableHeader } from 'components/CustomTable';

import Widget from 'components/Widget';
import Dialog from 'components/Dialog';

import { actions, selectors } from 'ducks/discoveries';
import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useSearchParams } from 'react-router';
import Button from 'components/Button';

import type { TriggerHistorySummaryModel } from 'types/rules';
import { dateFormatter } from 'utils/dateUtil';
import PagedCustomTable from '../../../CustomTable/PagedCustomTable';
import TabLayout from '../../../Layout/TabLayout';
import TriggerHistorySummaryViewer from './TriggerHistorySummaryViewer';
import { Info } from 'lucide-react';

type Props = Readonly<{
    id: string;
    triggerHistorySummary?: TriggerHistorySummaryModel;
}>;

const TAB_URL_PARAM = 'discoveredCerts';

const TABS: ReadonlyArray<{ tabKey: string; title: string; newlyDiscovered?: boolean }> = [
    { tabKey: 'all', title: 'All', newlyDiscovered: undefined },
    { tabKey: 'new', title: 'New', newlyDiscovered: true },
    { tabKey: 'existing', title: 'Existing', newlyDiscovered: false },
];

export default function DiscoveryCertificates({ id, triggerHistorySummary }: Props) {
    const dispatch = useDispatch();

    const discoveryCertificates = useSelector(selectors.discoveryCertificates);
    const isFetchingDiscoveryCertificates = useSelector(selectors.isFetchingDiscoveryCertificates);

    const { pathname } = useLocation();
    const [searchParams] = useSearchParams();
    const activeTab = TABS.find((tab) => tab.tabKey === searchParams.get(TAB_URL_PARAM)) ?? TABS[0];
    const newlyDiscovered = activeTab.newlyDiscovered;

    const [showMessage, setShowMessage] = useState<boolean>(false);
    const [message, setMessage] = useState<string>();

    const onReloadData = useCallback(
        (pageSize: number, pageNumber: number) => {
            dispatch(
                actions.getDiscoveryCertificates({
                    uuid: id,
                    itemsPerPage: pageSize,
                    pageNumber: pageNumber,
                    newlyDiscovered: newlyDiscovered,
                }),
            );
        },
        [dispatch, id, newlyDiscovered],
    );

    const discoveryCertificatesHeaders: TableHeader[] = useMemo(() => {
        const discoveryHeaders = [
            {
                id: 'commonName',
                content: 'Common Name',
            },
            {
                id: 'serialNumber',
                content: 'Serial Number',
            },
            {
                id: 'notAfter',
                content: 'Not After',
            },
            {
                id: 'notBefore',
                content: 'Not Before',
            },
            {
                id: 'issuerCommonName',
                content: 'Issuer Common Name',
            },
            {
                id: 'fingerprint',
                content: 'Fingerprint',
            },
        ];

        if (newlyDiscovered === true) {
            discoveryHeaders.push(
                {
                    id: 'triggers',
                    content: 'Triggers',
                },
                {
                    id: 'errorInfo',
                    content: '',
                },
            );
        }

        return discoveryHeaders;
    }, [newlyDiscovered]);

    const discoveryCertificatesData: TableDataRow[] = useMemo(
        () =>
            discoveryCertificates?.certificates.map((r) => {
                const certificateColumns = [
                    r.inventoryUuid ? (
                        <Link key="cn" to={`../../certificates/detail/${r.inventoryUuid}`}>
                            {r.commonName}
                        </Link>
                    ) : (
                        r.commonName
                    ),
                    <span key="serial">{r.serialNumber}</span>,
                    <span key="notafter" style={{ whiteSpace: 'nowrap' }}>
                        {dateFormatter(r.notAfter)}
                    </span>,
                    <span key="notbefore" style={{ whiteSpace: 'nowrap' }}>
                        {dateFormatter(r.notBefore)}
                    </span>,
                    r.issuerCommonName,
                    <span key="fingerprint">{r.fingerprint}</span>,
                ];

                if (newlyDiscovered === true) {
                    const triggerHistoryObjectSummary = triggerHistorySummary?.objects?.find(
                        (summary) => summary.referenceObjectUuid === r.uuid,
                    );
                    certificateColumns.push(
                        triggerHistoryObjectSummary ? (
                            <TriggerHistorySummaryViewer triggerHistoryObjectSummary={triggerHistoryObjectSummary} />
                        ) : (
                            ''
                        ),
                        r.processedError ? (
                            <Button
                                variant="transparent"
                                title="Show error"
                                className="p-1"
                                onClick={() => {
                                    setMessage(r.processedError ?? '');
                                    setShowMessage(true);
                                }}
                            >
                                <Info size={16} />
                            </Button>
                        ) : (
                            ''
                        ),
                    );
                }
                return {
                    id: r.serialNumber + r.fingerprint,
                    columns: certificateColumns,
                };
            }) ?? [],
        [discoveryCertificates, triggerHistorySummary?.objects, newlyDiscovered],
    );

    const pagedTable = (
        <PagedCustomTable
            // Remounting is what re-issues onReloadData with the new newlyDiscovered value:
            // PagedCustomTable holds onReloadData in a ref and only re-fetches on [pageSize, pageNumber].
            key={activeTab.tabKey}
            // The tab lives in the query string, so the default pathname-only pagination key would be
            // shared by all three tabs and a tab switch would restore the previous tab's page number.
            stateKey={`${pathname}:${activeTab.tabKey}`}
            headers={discoveryCertificatesHeaders}
            data={discoveryCertificatesData}
            totalItems={discoveryCertificates?.totalItems}
            onReloadData={onReloadData}
        />
    );

    return (
        <Widget title="Discovered Certificates" titleSize="large" busy={isFetchingDiscoveryCertificates}>
            <TabLayout
                tabUrlParam={TAB_URL_PARAM}
                tabs={TABS.map((tab) => ({ tabKey: tab.tabKey, title: tab.title, content: pagedTable }))}
                onlyActiveTabContent
                noBorder
            />
            <Dialog
                isOpen={showMessage}
                size={'lg'}
                caption="Processing error"
                body={message}
                toggle={() => setShowMessage(false)}
                buttons={[{ color: 'primary', onClick: () => setShowMessage(false), body: 'Close' }]}
            />
        </Widget>
    );
}
