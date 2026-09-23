import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import ProgressBar from 'components/ProgressBar';
import Widget from 'components/Widget';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { DiscoveryResponseDetailModel } from 'types/discoveries';
import { DiscoveryStatus, PlatformEnum } from 'types/openapi';
import { importRemainder, progressRecordedCaption, targetsCaption } from './discoveryDetailHelpers';

type Props = Readonly<{
    discovery: DiscoveryResponseDetailModel;
    onRefresh?: () => void;
    className?: string;
}>;

const BY_RESOURCE_HEADERS: TableHeader[] = [
    { id: 'resource', content: 'Resource' },
    { id: 'found', content: 'Found', align: 'right' },
    { id: 'estimate', content: 'Est. total', align: 'right' },
    { id: 'phase', content: 'Phase' },
];

/**
 * Two bars for two phases, each labelled with whose work it is. The Provider's bar counts targets and is only as fresh
 * as Core's last poll of the Provider, which is what the caption dates. The platform's bar counts items, appears only
 * while the run is processing, and is counted from the platform's own rows on every read. A run against a v1 Provider
 * reports no progress at all, and then this widget renders nothing.
 */
export default function DiscoveryProgressWidget({ discovery, onRefresh, className }: Props) {
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));

    const progress = discovery.progress;
    const processing = discovery.status === DiscoveryStatus.Processing;

    const byResourceRows: TableDataRow[] = useMemo(
        () =>
            Object.entries(progress?.byResource ?? {}).map(([resource, counters]) => ({
                id: resource,
                columns: [
                    getEnumLabel(resourceEnum, resource),
                    counters.produced === undefined ? '—' : String(counters.produced),
                    counters.totalEstimate === undefined ? '—' : `~${counters.totalEstimate}`,
                    counters.phase ?? '—',
                ],
            })),
        [progress?.byResource, resourceEnum],
    );

    if (!progress && !processing) return null;

    const recorded = progressRecordedCaption(progress?.updatedAt);
    const remaining = importRemainder(discovery);
    const failed = discovery.itemsFailed ?? 0;
    const toImport = discovery.itemsNewlyDiscovered ?? 0;
    // A run that rediscovered only what the inventory already held has no import to draw; a full bar says so, where an
    // empty total would read as work of unknown size.
    const nothingToImport = toImport === 0;

    return (
        <Widget title="Progress" titleSize="large" refreshAction={onRefresh} className={className} dataTestId="discovery-progress">
            <div className="flex flex-col gap-4">
                {progress ? (
                    <div data-testid="provider-progress">
                        <ProgressBar
                            value={progress.targetsProcessed}
                            max={progress.targetsTotal}
                            ariaLabel="Discovery Provider targets"
                            dataTestId="provider-progress-bar"
                            label={
                                <>
                                    <span>Discovery Provider</span>
                                    <span className="tabular-nums" data-testid="targets-caption">
                                        {targetsCaption(progress.targetsProcessed, progress.targetsTotal)}
                                    </span>
                                </>
                            }
                            caption={
                                <span className="flex flex-wrap gap-x-3">
                                    {progress.phase ? <span data-testid="progress-phase">Phase: {progress.phase}</span> : null}
                                    <span data-testid="progress-recorded">{recorded ?? 'time of this reading not recorded'}</span>
                                </span>
                            }
                        />
                        {progress.targetsFailed ? (
                            <p className="mt-1 text-sm text-warning" data-testid="targets-failed">
                                {progress.targetsFailed} {progress.targetsFailed === 1 ? 'target' : 'targets'} failed
                            </p>
                        ) : null}
                    </div>
                ) : null}

                {processing ? (
                    <div data-testid="import-progress">
                        <ProgressBar
                            value={nothingToImport ? 1 : (discovery.itemsProcessed ?? 0)}
                            max={nothingToImport ? 1 : toImport}
                            tone="info"
                            ariaLabel="Platform import"
                            dataTestId="import-progress-bar"
                            label={
                                <>
                                    <span>Platform import</span>
                                    <span className="tabular-nums">
                                        {discovery.itemsProcessed ?? 0} / {toImport} items
                                    </span>
                                </>
                            }
                            caption={
                                <span>
                                    {nothingToImport
                                        ? 'Nothing to import'
                                        : `${remaining} waiting${failed ? `, ${failed} not imported` : ''}`}{' '}
                                    — counted on every read
                                </span>
                            }
                        />
                    </div>
                ) : null}

                {byResourceRows.length > 0 ? <CustomTable headers={BY_RESOURCE_HEADERS} data={byResourceRows} /> : null}
            </div>
        </Widget>
    );
}
