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
import type { DiscoveredKeyDto } from 'types/openapi';
import { PlatformEnum, Resource } from 'types/openapi';
import { useCopyToClipboard } from 'utils/common-hooks';
import { dateFormatter } from 'utils/dateUtil';
import { inventoryPath } from './discoveryDetailHelpers';
import { KEY_HEADERS, PUBLIC_KEY_HEADER, PublicKeyDetails, keyCells, publicKeyCell } from './discoveryKeyColumns';

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

const NAME_HEADER: TableHeader = { id: 'inventory', content: 'Name' };

/** What the platform staged rather than what it holds; a key row says the same things in its own columns instead. */
const STAGING_HEADERS: TableHeader[] = [
    { id: 'sequence', content: '#', align: 'right', width: '5%' },
    { id: 'uniqueRef', content: 'Reference' },
];

const OUTCOME_HEADERS: TableHeader[] = [
    { id: 'discoveredAt', content: 'Discovered' },
    { id: 'state', content: 'State', align: 'center' },
];

const DETAILS_HEADER: TableHeader = { id: 'details', content: 'Details', headingHidden: true, width: '5%' };

/**
 * The object first, the way every other table in the platform leads with a name, then what the run made of it. A
 * keys run trades the staging pair for the key's own columns: neither the run position nor the provider's reference
 * identifies a key, and the dialog behind the details button carries both.
 */
function headersFor(resource: Resource): TableHeader[] {
    return resource === Resource.Keys
        ? [NAME_HEADER, ...KEY_HEADERS, ...OUTCOME_HEADERS, PUBLIC_KEY_HEADER, DETAILS_HEADER]
        : [NAME_HEADER, ...STAGING_HEADERS, ...OUTCOME_HEADERS, DETAILS_HEADER];
}

/**
 * The state column is driven by `processed` and `processedError` only. `inventory` is not a success signal: for a
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
    const keyTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.KeyType));
    const keyAlgorithmEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.KeyAlgorithm));
    const keyFormatEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.KeyFormat));
    const copyToClipboard = useCopyToClipboard();

    const { pathname } = useLocation();
    const [searchParams] = useSearchParams();
    const activeTab = TABS.find((tab) => tab.tabKey === searchParams.get(TAB_URL_PARAM)) ?? TABS[0];
    const newlyDiscovered = activeTab.newlyDiscovered;

    const [inspected, setInspected] = useState<DiscoveryItemModel>();
    const [openedKey, setOpenedKey] = useState<DiscoveredKeyDto>();

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

    const copyPublicKey = useCallback(
        (publicKey: string) =>
            copyToClipboard(publicKey, 'Public key was copied to clipboard', 'Failed to copy the public key to clipboard'),
        [copyToClipboard],
    );

    const headers = useMemo(() => headersFor(resource), [resource]);

    const rows: TableDataRow[] = useMemo(
        () =>
            discoveryItems?.items.map((item) => {
                const isKey = resource === Resource.Keys;
                const path = item.inventory ? inventoryPath(item.resource, item.inventory.uuid) : undefined;
                return {
                    id: item.uuid,
                    columns: [
                        path ? (
                            <Link key="inventory" to={path}>
                                {item.inventory?.name}
                            </Link>
                        ) : (
                            (item.inventory?.name ?? '')
                        ),
                        ...(isKey
                            ? keyCells(item, { type: keyTypeEnum, algorithm: keyAlgorithmEnum, format: keyFormatEnum })
                            : [
                                  <span key="sequence" className="tabular-nums">
                                      {item.sequence}
                                  </span>,
                                  <span key="ref" className="break-all">
                                      {item.uniqueRef}
                                  </span>,
                              ]),
                        <span key="discoveredAt" className="whitespace-nowrap">
                            {item.discoveredAt ? dateFormatter(item.discoveredAt) : ''}
                        </span>,
                        itemStateBadge(item),
                        ...(isKey ? [publicKeyCell(item, setOpenedKey)] : []),
                        <Button
                            key="details"
                            variant="transparent"
                            title="Show item"
                            aria-label="Show item"
                            className="p-1"
                            onClick={() => setInspected(item)}
                            data-testid={`show-item-${item.uuid}`}
                        >
                            <Info size={16} />
                        </Button>,
                    ],
                };
            }) ?? [],
        [discoveryItems, resource, keyTypeEnum, keyAlgorithmEnum, keyFormatEnum],
    );

    const pagedTable = (
        <PagedCustomTable
            // Remounting is what re-issues onReloadData with the new filter: PagedCustomTable holds
            // onReloadData in a ref and only re-fetches on [pageSize, pageNumber].
            key={`${resource}:${activeTab.tabKey}`}
            stateKey={`${pathname}:${resource}:${activeTab.tabKey}`}
            headers={headers}
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
                caption={inspected ? `Item #${inspected.sequence} — ${inspected.uniqueRef}` : ''}
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
            <Dialog
                isOpen={openedKey !== undefined}
                size="lg"
                caption="Public key"
                body={
                    openedKey ? (
                        <PublicKeyDetails
                            discoveredKey={openedKey}
                            enums={{ type: keyTypeEnum, algorithm: keyAlgorithmEnum, format: keyFormatEnum }}
                            onCopy={copyPublicKey}
                        />
                    ) : null
                }
                toggle={() => setOpenedKey(undefined)}
                buttons={[{ color: 'primary', onClick: () => setOpenedKey(undefined), body: 'Close' }]}
            />
        </Widget>
    );
}
