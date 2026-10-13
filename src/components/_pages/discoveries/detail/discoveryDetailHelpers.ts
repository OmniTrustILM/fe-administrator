import { type ProgressBarTone, progressRatio } from 'components/ProgressBar';
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

/** Every count the progress shows, grouped the same way whatever the browser's locale. */
export const formatCount = (count: number) => count.toLocaleString('en-US');

/** Targets are the Provider's unit of work; the caption never shows a denominator the Provider did not send. */
export function targetsCaption(targetsProcessed: number | undefined, targetsTotal: number | undefined): string {
    if (targetsTotal === undefined) {
        return targetsProcessed === undefined ? 'No target count reported' : `${formatCount(targetsProcessed)} targets`;
    }
    if (targetsProcessed === undefined) return `${formatCount(targetsTotal)} targets in total`;
    return `${formatCount(targetsProcessed)} / ${formatCount(targetsTotal)} targets`;
}

/**
 * Where the Provider's own work stands. Core keeps a run in progress through the tail drain after the Provider has
 * finished, so a Provider that reports completion counts as finished before the run moves on.
 */
export type ProviderState = 'working' | 'paused' | 'finished' | 'failed' | 'cancelled';

export function providerState(run: Pick<DiscoveryResponseDetailModel, 'status' | 'connectorStatus' | 'connectorInterface'>): ProviderState {
    switch (run.status) {
        case DiscoveryStatus.Failed:
            return 'failed';
        case DiscoveryStatus.Cancelled:
            return 'cancelled';
        case DiscoveryStatus.Stopped:
            return 'paused';
        case DiscoveryStatus.Processing:
        case DiscoveryStatus.Completed:
        case DiscoveryStatus.Warning:
            return 'finished';
        default:
            return run.connectorInterface && run.connectorStatus === DiscoveryStatus.Completed ? 'finished' : 'working';
    }
}

export type ProviderBar = { value?: number; max?: number; caption: string; tone?: ProgressBarTone };

/** Nouns for the resources a discovery counts items of; the platform's labels are singular display names. */
const ITEM_NOUNS: Partial<Record<string, [string, string]>> = {
    [Resource.Certificates]: ['certificate', 'certificates'],
    [Resource.Keys]: ['key', 'keys'],
};

function itemNoun(resource: string, count: number): string {
    const [one, many] = ITEM_NOUNS[resource] ?? ['item', 'items'];
    return count === 1 ? one : many;
}

/**
 * The run's one resource, when its items stand in for targets: the Provider counts no targets, as one whose unit of
 * work would only be a page of search results does, and the run targets that resource alone. A run of several
 * resources has no common unit, even while the Provider has reported only one of them.
 */
function itemsProgress(
    progress: DiscoveryProgressDto,
    runResources: Resource[] | undefined,
): [string, DiscoveryResourceProgressDto] | undefined {
    if (progress.targetsProcessed !== undefined || progress.targetsTotal !== undefined) return undefined;
    if (runResources?.length !== 1) return undefined;
    const counters = progress.byResource?.[runResources[0]];
    if (!counters || (counters.produced === undefined && counters.totalEstimate === undefined)) return undefined;
    return [runResources[0], counters];
}

function itemsBar(resource: string, { produced = 0, totalEstimate }: DiscoveryResourceProgressDto): ProviderBar {
    return {
        value: produced,
        max: totalEstimate,
        caption:
            totalEstimate === undefined
                ? `${formatCount(produced)} ${itemNoun(resource, produced)} found`
                : `${formatCount(produced)} / ~${formatCount(totalEstimate)} ${itemNoun(resource, totalEstimate)}`,
    };
}

const ENDED_EARLY_TONE: Partial<Record<ProviderState, ProgressBarTone>> = { failed: 'warning', cancelled: 'info' };

/**
 * What the Provider's bar draws and the figures beside it: targets when the Provider counts them, else the items of the
 * run's one resource against the Provider's estimate. A bar with nothing to measure against moves only while the
 * Provider works: it is held empty while the run is paused and drawn full once the Provider is done. A run that ended
 * early is drawn in the tone of how it ended, and a known total keeps its true ratio, so it shows where the run stopped.
 */
export function providerBar(progress: DiscoveryProgressDto, state: ProviderState, runResources: Resource[] | undefined): ProviderBar {
    const items = itemsProgress(progress, runResources);
    const measured: ProviderBar = items
        ? itemsBar(...items)
        : {
              value: progress.targetsProcessed,
              max: progress.targetsTotal,
              caption: targetsCaption(progress.targetsProcessed, progress.targetsTotal),
          };
    const tone = ENDED_EARLY_TONE[state];
    const bar = tone ? { ...measured, tone } : measured;
    if (state === 'working' || progressRatio(bar.value, bar.max) !== undefined) return bar;
    return { ...bar, value: state === 'paused' ? 0 : 1, max: 1 };
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
