import Container from 'components/Container';
import TabLayout from 'components/Layout/TabLayout';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { useSelector } from 'react-redux';
import type { DiscoveryResponseDetailModel } from 'types/discoveries';
import { DiscoveryStatus, PlatformEnum, Resource } from 'types/openapi';
import type { TriggerHistorySummaryModel } from 'types/rules';
import DiscoveryCertificates from './DiscoveryCertificates';
import DiscoveryItemsTable from './DiscoveryItemsTable';
import { isNotProcessedRun, resultResources } from './discoveryDetailHelpers';

type Props = Readonly<{
    discovery: DiscoveryResponseDetailModel;
    triggerHistorySummary?: TriggerHistorySummaryModel;
}>;

const RESOURCE_TAB_URL_PARAM = 'resource';

/**
 * One view per resource the run targeted, in the contract's order. Certificates keep the existing view, which has
 * columns no generic table can have; every other resource renders the generic staged-item table. A single-resource run
 * renders its view directly, so a run against a v1 Provider looks exactly as it did.
 */
export default function DiscoveryResults({ discovery, triggerHistorySummary }: Props) {
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const resources = resultResources(discovery.resources);

    const viewFor = (resource: Resource) =>
        resource === Resource.Certificates ? (
            <DiscoveryCertificates id={discovery.uuid} triggerHistorySummary={triggerHistorySummary} />
        ) : (
            <DiscoveryItemsTable discoveryUuid={discovery.uuid} resource={resource} />
        );

    return (
        <Container>
            {isNotProcessedRun(discovery.status) ? (
                <output
                    data-testid="not-processed-banner"
                    className="block rounded-lg border border-warning bg-warning-surface p-4 text-sm text-warning"
                >
                    {discovery.status === DiscoveryStatus.Cancelled ? 'This run was cancelled' : 'This run failed'} and its items were never
                    processed: nothing below was imported into the inventory, and no triggers ran on it.
                </output>
            ) : null}
            {resources.length === 1 ? (
                viewFor(resources[0])
            ) : (
                <TabLayout
                    tabUrlParam={RESOURCE_TAB_URL_PARAM}
                    noBorder
                    tabs={resources.map((resource) => ({
                        tabKey: resource,
                        title: getEnumLabel(resourceEnum, resource),
                        content: viewFor(resource),
                    }))}
                />
            )}
        </Container>
    );
}
