import { progressRatio } from 'components/ProgressBar';
import type { DiscoveryResponseDetailModel } from 'types/discoveries';
import {
    type ConnectorInterfaceDto,
    type DiscoveryProgressDto,
    type DiscoveryResourceProgressDto,
    DiscoveryStatus,
    Resource,
} from 'types/openapi';
import { dateFormatter, formatTimeAgo } from 'utils/dateUtil';

export type DiscoveryLifecycleAction = 'stop' | 'resume' | 'cancel';

/**
 * Which lifecycle controls the run's own state allows. `stoppable` says whether the run has the capability at all
 * (false for every run against a v1 Discovery Provider); the status says which control is valid right now. Nothing is
 * valid once the Provider has finished and the platform is importing, or once the run has reached a terminal status.
 * Permission is the caller's third factor.
 */
export function lifecycleActionsForStatus(status: DiscoveryStatus | undefined, stoppable: boolean | undefined): DiscoveryLifecycleAction[] {
    if (!stoppable) return [];
    switch (status) {
        case DiscoveryStatus.InProgress:
            return ['stop', 'cancel'];
        case DiscoveryStatus.Stopped:
            return ['resume', 'cancel'];
        default:
            return [];
    }
}

export function visibleLifecycleActions(
    run: Pick<DiscoveryResponseDetailModel, 'status' | 'stoppable'>,
    isAllowed: (action: DiscoveryLifecycleAction) => boolean,
): DiscoveryLifecycleAction[] {
    return lifecycleActionsForStatus(run.status, run.stoppable).filter(isAllowed);
}

/** The generation a run is driven by, in the words the authorities detail already uses for its interface row. */
export function connectorInterfaceLabel(connectorInterface: ConnectorInterfaceDto | undefined): string {
    return connectorInterface ? `Discovery (${connectorInterface.version})` : 'Legacy (v1)';
}

/** The interface version alone, for a list column where the word "Discovery" would repeat on every row. */
export function connectorInterfaceVersion(connectorInterface: ConnectorInterfaceDto | undefined): string {
    return connectorInterface?.version ?? 'v1';
}

/** A run that ended here staged items but never imported them, and no triggers ran on them. */
export function isNotProcessedRun(status: DiscoveryStatus | undefined): boolean {
    return status === DiscoveryStatus.Cancelled || status === DiscoveryStatus.Failed;
}

/** A run in one of these has ended for good; its figures will not move again. */
export function isTerminalRun(status: DiscoveryStatus | undefined): boolean {
    return (
        status === DiscoveryStatus.Completed ||
        status === DiscoveryStatus.Warning ||
        status === DiscoveryStatus.Failed ||
        status === DiscoveryStatus.Cancelled
    );
}

/**
 * A run whose figures are still moving: the Provider is working, or the platform is importing what it found. Core marks
 * a v1 run that outlives its wait limit as Warning and goes on waiting for the Provider, so such a run is live for as
 * long as its Provider reports it in progress. Core treats a v2 Warning as the end.
 */
export function isLiveRun(
    run: Pick<DiscoveryResponseDetailModel, 'status' | 'connectorStatus' | 'connectorInterface'> | undefined,
): boolean {
    if (!run) return false;
    if (run.status === DiscoveryStatus.InProgress || run.status === DiscoveryStatus.Processing) return true;
    return !run.connectorInterface && run.status === DiscoveryStatus.Warning && run.connectorStatus === DiscoveryStatus.InProgress;
}

/**
 * What the delete button says when Core will refuse the call. Cancel is itself refused once the run is processing -
 * the Provider is done and the remaining import is not abortable - so the only way out of that state is waiting.
 */
export function deleteTooltip(status: DiscoveryStatus | undefined, deletable: boolean): string {
    if (deletable) return 'Delete';
    return status === DiscoveryStatus.Processing ? 'Delete (wait for the run to end)' : 'Delete (cancel the run first)';
}

/**
 * The resources a run's Results tab has a view for, in the contract's order. Core synthesizes ["certificates"] for a
 * run against a v1 Provider, so an absent or empty list only ever comes from a response older than that field.
 */
export function resultResources(resources: Resource[] | undefined): Resource[] {
    return resources && resources.length > 0 ? resources : [Resource.Certificates];
}

/**
 * Dates a progress reading. The counters arrive on Core's poll of the Provider, so they are always a little behind
 * the response carrying them; this is what tells a fresh reading from a page nobody has refreshed in ten minutes.
 */
export function progressRecordedCaption(updatedAt: string | undefined, now: number = Date.now()): string | undefined {
    if (!updatedAt) return undefined;
    const recorded = dateFormatter(updatedAt);
    const ago = formatTimeAgo(updatedAt, now);
    return ago ? `as of ${recorded} — ${ago}` : `as of ${recorded}`;
}

/** What the platform still has to import: the newly discovered items that are neither imported nor failed. */
export function importRemainder(
    run: Pick<DiscoveryResponseDetailModel, 'itemsNewlyDiscovered' | 'itemsProcessed' | 'itemsFailed'>,
): number {
    return Math.max(0, (run.itemsNewlyDiscovered ?? 0) - (run.itemsProcessed ?? 0) - (run.itemsFailed ?? 0));
}

/** Targets are the Provider's unit of work; the caption never shows a denominator the Provider did not send. */
export function targetsCaption(targetsProcessed: number | undefined, targetsTotal: number | undefined): string {
    if (targetsProcessed === undefined && targetsTotal === undefined) return 'No target count reported';
    if (targetsTotal === undefined) return `${targetsProcessed} targets`;
    if (targetsProcessed === undefined) return `${targetsTotal} targets in total`;
    return `${targetsProcessed} / ${targetsTotal} targets`;
}

export type ProviderBar = { value?: number; max?: number; caption: string };

/**
 * The one resource whose items stand in for targets when the Provider counts none, as one whose unit of work would only
 * be a page of search results does. Several resources have no common unit to draw, and one without a count has nothing
 * to draw.
 */
function itemsProgress(progress: DiscoveryProgressDto): [string, DiscoveryResourceProgressDto] | undefined {
    if (progress.targetsProcessed !== undefined || progress.targetsTotal !== undefined) return undefined;
    const entries = Object.entries(progress.byResource ?? {});
    if (entries.length !== 1) return undefined;
    const [, counters] = entries[0];
    return counters.produced === undefined && counters.totalEstimate === undefined ? undefined : entries[0];
}

/** The platform serves a resource's label in the singular ("Certificate"), so the plural is made from it. */
const itemNoun = (singular: string, count: number) => (count === 1 ? singular : `${singular}s`);

function itemsBar({ produced = 0, totalEstimate }: DiscoveryResourceProgressDto, singular: string): ProviderBar {
    const found = produced.toLocaleString('en-US');
    return {
        value: produced,
        max: totalEstimate,
        caption:
            totalEstimate === undefined
                ? `${found} ${itemNoun(singular, produced)} found`
                : `${found} / ~${totalEstimate.toLocaleString('en-US')} ${itemNoun(singular, totalEstimate)}`,
    };
}

/**
 * What the Provider's bar draws and the figures beside it: targets when the Provider counts them, else the items of the
 * run's one resource against the Provider's estimate. Once the Provider is done, a bar with nothing to measure against
 * is drawn full rather than left moving, since no more work is coming; a known total keeps its true ratio, so a run
 * cancelled partway shows where it stopped.
 */
export function providerBar(
    progress: DiscoveryProgressDto,
    providerDone: boolean,
    resourceLabel: (resource: string) => string,
): ProviderBar {
    const items = itemsProgress(progress);
    const bar: ProviderBar = items
        ? itemsBar(items[1], resourceLabel(items[0]).toLowerCase())
        : {
              value: progress.targetsProcessed,
              max: progress.targetsTotal,
              caption: targetsCaption(progress.targetsProcessed, progress.targetsTotal),
          };
    return providerDone && progressRatio(bar.value, bar.max) === undefined ? { ...bar, value: 1, max: 1 } : bar;
}

export type CertificateNote = { kind: 'repeats' | 'notHandedOver'; count: number };

/**
 * What a gap between the provider's certificate figure and the saved one means, for a certificates-only v2 run. The
 * provider counts items as it found them, repeats included; the platform saves each distinct certificate once; and
 * `itemsDiscovered` counts every item actually handed over. So items received above certificates saved are
 * repeats collapsed on the same certificate, and items reported above items received were never handed over. That
 * second note waits for a terminal status: while the run is live the provider is expected to lead the drain by a page.
 * A run with other resources cannot be split this way and gets no note; neither does a v1 run, which reports no item
 * count.
 */
export function certificateNotes(
    run: Pick<
        DiscoveryResponseDetailModel,
        'status' | 'resources' | 'itemsDiscovered' | 'totalCertificatesDiscovered' | 'connectorTotalCertificatesDiscovered'
    >,
): CertificateNote[] {
    const resources = resultResources(run.resources);
    if (run.itemsDiscovered === undefined || resources.length !== 1 || resources[0] !== Resource.Certificates) {
        return [];
    }
    const received = run.itemsDiscovered;
    const saved = run.totalCertificatesDiscovered ?? 0;
    const reported = run.connectorTotalCertificatesDiscovered ?? received;
    const notes: CertificateNote[] = [];
    if (reported > received && isTerminalRun(run.status)) notes.push({ kind: 'notHandedOver', count: reported - received });
    if (received > saved) notes.push({ kind: 'repeats', count: received - saved });
    return notes;
}

/** Where the object an item was imported as lives, relative to the discovery detail route. */
export function inventoryPath(resource: Resource, inventoryUuid: string): string | undefined {
    switch (resource) {
        case Resource.Certificates:
            return `../../certificates/detail/${inventoryUuid}`;
        case Resource.Keys:
            return `../../keys/detail/${inventoryUuid}`;
        default:
            return undefined;
    }
}
