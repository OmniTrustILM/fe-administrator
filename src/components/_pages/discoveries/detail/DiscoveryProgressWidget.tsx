import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import ProgressBar from 'components/ProgressBar';
import Widget from 'components/Widget';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { DiscoveryResponseDetailModel } from 'types/discoveries';
import { DiscoveryStatus, PlatformEnum } from 'types/openapi';
import { formatCount, importRemainder, progressRecordedCaption, providerBar, providerState } from './discoveryDetailHelpers';

type Props = Readonly<{
    discovery: DiscoveryResponseDetailModel;
    className?: string;
}>;

const targetCount = (count: number) => `${formatCount(count)} ${count === 1 ? 'target' : 'targets'}`;

const BY_RESOURCE_HEADERS: TableHeader[] = [
    { id: 'resource', content: 'Resource' },
    { id: 'found', content: 'Found', align: 'right' },
    { id: 'estimate', content: 'Est. total', align: 'right' },
    { id: 'phase', content: 'Phase' },
];

/**
 * Two bars for two phases, each labelled with whose work it is. The Provider's bar draws what {@link providerBar}
 * measures and is only as fresh as Core's last poll of the Provider, which is what the caption dates. A target that held nothing is a normal outcome and reads muted; only one that could
 * not be read is flagged. The platform's bar counts items, appears only while the run is processing, and is counted
 * from the platform's own rows on every read. A run against a v1 Provider reports no progress at all, and then this
 * widget renders nothing. A v2 run always gets the widget, so the row it shares keeps its shape when the first report
 * arrives.
 */
export default function DiscoveryProgressWidget({ discovery, className }: Props) {
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));

    const progress = discovery.progress;
    const processing = discovery.status === DiscoveryStatus.Processing;

    const byResourceRows: TableDataRow[] = useMemo(
        () =>
            Object.entries(progress?.byResource ?? {}).map(([resource, counters]) => ({
                id: resource,
                columns: [
                    getEnumLabel(resourceEnum, resource),
                    counters.produced === undefined ? '—' : formatCount(counters.produced),
                    counters.totalEstimate === undefined ? '—' : `~${formatCount(counters.totalEstimate)}`,
                    counters.phase ?? '—',
                ],
            })),
        [progress?.byResource, resourceEnum],
    );

    if (!discovery.connectorInterface && !progress && !processing) return null;

    const state = providerState(discovery);
    const providerDone = state !== 'working' && state !== 'paused';
    const bar = progress ? providerBar(progress, state, discovery.resources) : undefined;

    const recorded = progressRecordedCaption(progress?.updatedAt);
    const remaining = importRemainder(discovery);
    const failed = discovery.itemsFailed ?? 0;
    const toImport = discovery.itemsNewlyDiscovered ?? 0;
    // A run that rediscovered only what the inventory already held has no import to draw; a full bar says so, where an
    // empty total would read as work of unknown size.
    const nothingToImport = toImport === 0;
    const notImported = failed ? `, ${formatCount(failed)} not imported` : '';
    const importCaption = nothingToImport ? 'Nothing to import' : `${formatCount(remaining)} waiting${notImported}`;

    return (
        <Widget title="Progress" titleSize="large" className={className} dataTestId="discovery-progress">
            <div className="flex flex-col gap-4">
                {progress && bar ? (
                    <div data-testid="provider-progress">
                        <ProgressBar
                            value={bar.value}
                            max={bar.max}
                            tone={bar.tone}
                            ariaLabel="Discovery Provider"
                            dataTestId="provider-progress-bar"
                            label={
                                <>
                                    <span>Discovery Provider</span>
                                    <span className="tabular-nums" data-testid="targets-caption">
                                        {bar.caption}
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
                                {targetCount(progress.targetsFailed)} failed
                            </p>
                        ) : null}
                        {progress.targetsEmpty ? (
                            <p className="mt-1 text-sm text-content-muted" data-testid="targets-empty">
                                {targetCount(progress.targetsEmpty)} had nothing to discover
                            </p>
                        ) : null}
                    </div>
                ) : (
                    <p className="text-sm text-content-muted" data-testid="no-provider-progress">
                        {providerDone ? 'The Discovery Provider reported no progress for this run.' : 'No progress reported yet.'}
                    </p>
                )}

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
                                        {formatCount(discovery.itemsProcessed ?? 0)} / {formatCount(toImport)} items
                                    </span>
                                </>
                            }
                            caption={<span>{importCaption}</span>}
                        />
                    </div>
                ) : null}

                {byResourceRows.length > 0 ? <CustomTable headers={BY_RESOURCE_HEADERS} data={byResourceRows} /> : null}
            </div>
        </Widget>
    );
}
