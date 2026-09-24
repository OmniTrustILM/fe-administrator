import Badge from 'components/Badge';
import Button from 'components/Button';
import type { TableDataRow, TableHeader } from 'components/CustomTable';
import PagedCustomTable from 'components/CustomTable/PagedCustomTable';
import Dialog from 'components/Dialog';
import JsonViewer from 'components/JsonViewer';
import TabLayout from 'components/Layout/TabLayout';
import Widget from 'components/Widget';
import { actions, selectors } from 'ducks/discoveries';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { Info } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useSearchParams } from 'react-router';
import type { DiscoveryItemModel } from 'types/discoveries';
import { PlatformEnum, type Resource } from 'types/openapi';
import { dateFormatter } from 'utils/dateUtil';
import { inventoryPath } from './discoveryDetailHelpers';

type Props = Readonly<{
    discoveryUuid: string;
    resource: Resource;
}>;

const TAB_URL_PARAM = 'discoveredItems';

const TABS: ReadonlyArray<{ tabKey: string; title: string; newlyDiscovered?: boolean }> = [
    { tabKey: 'all', title: 'All', newlyDiscovered: undefined },
    { tabKey: 'new', title: 'New', newlyDiscovered: true },
    { tabKey: 'existing', title: 'Existing', newlyDiscovered: false },
];

const HEADERS: TableHeader[] = [
    { id: 'sequence', content: '#', align: 'right', width: '5%' },
    { id: 'uniqueRef', content: 'Reference' },
    { id: 'discoveredAt', content: 'Discovered' },
    { id: 'state', content: 'State', align: 'center' },
    { id: 'inventory', content: 'In inventory' },
    { id: 'details', content: 'Details', width: '5%' },
];

/**
 * The state column is driven by `processed` and `processedError` only. `inventoryUuid` is not a success signal: for a
 * certificate it is present as soon as one with the same content exists anywhere, including from an earlier run, so it
 * can be set while the item is still waiting. It is a link and nothing more.
 */
export function itemStateBadge(item: Pick<DiscoveryItemModel, 'processed' | 'processedError'>) {
    if (item.processedError) {
        return (
            <Badge color="danger" title={item.processedError} dataTestId="item-state-failed">
                Failed
            </Badge>
        );
    }
    if (item.processed) {
        return (
            <Badge color="success" dataTestId="item-state-imported">
                Imported
            </Badge>
        );
    }
    return (
        <Badge color="gray" dataTestId="item-state-waiting">
            Waiting
        </Badge>
    );
}

export default function DiscoveryItemsTable({ discoveryUuid, resource }: Props) {
    const dispatch = useDispatch();

    const discoveryItems = useSelector(selectors.discoveryItems);
    const isFetchingDiscoveryItems = useSelector(selectors.isFetchingDiscoveryItems);
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));

    const { pathname } = useLocation();
    const [searchParams] = useSearchParams();
    const activeTab = TABS.find((tab) => tab.tabKey === searchParams.get(TAB_URL_PARAM)) ?? TABS[0];
    const newlyDiscovered = activeTab.newlyDiscovered;

    const [inspected, setInspected] = useState<DiscoveryItemModel>();

    const onReloadData = useCallback(
        (pageSize: number, pageNumber: number) => {
            dispatch(
                actions.getDiscoveryItems({
                    uuid: discoveryUuid,
                    resource,
                    newlyDiscovered,
                    itemsPerPage: pageSize,
                    pageNumber,
                }),
            );
        },
        [dispatch, discoveryUuid, resource, newlyDiscovered],
    );

    const rows: TableDataRow[] = useMemo(
        () =>
            discoveryItems?.items.map((item) => {
                const path = item.inventoryUuid ? inventoryPath(item.resource, item.inventoryUuid) : undefined;
                return {
                    id: item.uuid,
                    columns: [
                        <span key="sequence" className="tabular-nums">
                            {item.sequence}
                        </span>,
                        <span key="ref" className="break-all">
                            {item.uniqueRef}
                        </span>,
                        <span key="discoveredAt" className="whitespace-nowrap">
                            {item.discoveredAt ? dateFormatter(item.discoveredAt) : ''}
                        </span>,
                        itemStateBadge(item),
                        item.inventoryUuid ? (
                            path ? (
                                <Link key="inventory" to={path}>
                                    {item.inventoryUuid}
                                </Link>
                            ) : (
                                item.inventoryUuid
                            )
                        ) : (
                            ''
                        ),
                        <Button
                            key="details"
                            variant="transparent"
                            title="Show item"
                            className="p-1"
                            onClick={() => setInspected(item)}
                            data-testid={`show-item-${item.uuid}`}
                        >
                            <Info size={16} />
                        </Button>,
                    ],
                };
            }) ?? [],
        [discoveryItems],
    );

    const pagedTable = (
        <PagedCustomTable
            // Remounting is what re-issues onReloadData with the new filter: PagedCustomTable holds
            // onReloadData in a ref and only re-fetches on [pageSize, pageNumber].
            key={`${resource}:${activeTab.tabKey}`}
            stateKey={`${pathname}:${resource}:${activeTab.tabKey}`}
            headers={HEADERS}
            data={rows}
            totalItems={discoveryItems?.totalItems}
            onReloadData={onReloadData}
        />
    );

    return (
        <Widget title={`Discovered ${getEnumLabel(resourceEnum, resource)}`} titleSize="large" busy={isFetchingDiscoveryItems}>
            <TabLayout
                tabUrlParam={TAB_URL_PARAM}
                tabs={TABS.map((tab) => ({ tabKey: tab.tabKey, title: tab.title, content: pagedTable }))}
                onlyActiveTabContent
                noBorder
            />
            <Dialog
                isOpen={inspected !== undefined}
                size="xl"
                caption={inspected ? `Item ${inspected.uniqueRef}` : ''}
                body={
                    inspected ? (
                        <div className="flex flex-col gap-3">
                            {inspected.processedError ? (
                                <div role="alert" className="rounded-lg border border-danger bg-danger-surface p-3 text-sm text-danger">
                                    {inspected.processedError}
                                </div>
                            ) : null}
                            <JsonViewer
                                value={JSON.stringify({ payload: inspected.payload ?? null, meta: inspected.meta ?? [] }, null, 2)}
                                height={420}
                            />
                        </div>
                    ) : null
                }
                toggle={() => setInspected(undefined)}
                buttons={[{ color: 'primary', onClick: () => setInspected(undefined), body: 'Close' }]}
            />
        </Widget>
    );
}
