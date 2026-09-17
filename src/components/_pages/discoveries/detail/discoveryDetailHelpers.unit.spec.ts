import { describe, expect, it } from 'vitest';

import { DiscoveryStatus, Resource } from 'types/openapi';
import {
    certificateNotes,
    connectorInterfaceLabel,
    connectorInterfaceVersion,
    type DiscoveryLifecycleAction,
    importRemainder,
    inventoryPath,
    isNotProcessedRun,
    lifecycleActionsForStatus,
    progressRecordedCaption,
    resultResources,
    targetsCaption,
    visibleLifecycleActions,
} from './discoveryDetailHelpers';

const ALL_STATUSES = Object.values(DiscoveryStatus);

describe('lifecycle visibility matrix (stoppable × status)', () => {
    it.each<[DiscoveryStatus, DiscoveryLifecycleAction[]]>([
        [DiscoveryStatus.InProgress, ['stop', 'cancel']],
        [DiscoveryStatus.Stopped, ['resume', 'cancel']],
        [DiscoveryStatus.Processing, []],
        [DiscoveryStatus.Completed, []],
        [DiscoveryStatus.Failed, []],
        [DiscoveryStatus.Warning, []],
        [DiscoveryStatus.Cancelled, []],
    ])('a stoppable run in %s offers %j', (status, expected) => {
        expect(lifecycleActionsForStatus(status, true)).toEqual(expected);
    });

    it.each(ALL_STATUSES)('a run that is not stoppable offers nothing in %s, so a v1 run renders exactly as before', (status) => {
        expect(lifecycleActionsForStatus(status, false)).toEqual([]);
        expect(lifecycleActionsForStatus(status, undefined)).toEqual([]);
    });

    it('is exhaustive over the status enum', () => {
        for (const status of ALL_STATUSES) {
            expect(Array.isArray(lifecycleActionsForStatus(status, true))).toBe(true);
        }
    });

    it('hides, rather than disables, an action the user lacks permission for', () => {
        const run = { status: DiscoveryStatus.InProgress, stoppable: true };

        expect(visibleLifecycleActions(run, () => true)).toEqual(['stop', 'cancel']);
        expect(visibleLifecycleActions(run, (action) => action === 'cancel')).toEqual(['cancel']);
        expect(visibleLifecycleActions(run, () => false)).toEqual([]);
    });
});

describe('connectorInterfaceLabel', () => {
    it('names the generation from the interface version', () => {
        expect(connectorInterfaceLabel({ uuid: 'i-1', code: 'discovery' as any, version: 'v2' })).toBe('Discovery (v2)');
    });

    it('calls a run with no interface what it is', () => {
        expect(connectorInterfaceLabel(undefined)).toBe('Legacy (v1)');
    });

    it('offers the version alone for a list column', () => {
        expect(connectorInterfaceVersion({ uuid: 'i-1', code: 'discovery' as any, version: 'v2' })).toBe('v2');
        expect(connectorInterfaceVersion(undefined)).toBe('v1');
    });
});

describe('not-processed banner', () => {
    it.each([
        [DiscoveryStatus.Cancelled, true],
        [DiscoveryStatus.Failed, true],
        [DiscoveryStatus.Completed, false],
        [DiscoveryStatus.Warning, false],
        [DiscoveryStatus.InProgress, false],
        [DiscoveryStatus.Stopped, false],
        [DiscoveryStatus.Processing, false],
        [undefined, false],
    ])('%s → %s', (status, expected) => {
        expect(isNotProcessedRun(status)).toBe(expected);
    });
});

describe('result tab derivation', () => {
    it('keeps the contract order', () => {
        expect(resultResources([Resource.Keys, Resource.Certificates])).toEqual([Resource.Keys, Resource.Certificates]);
    });

    it('falls back to certificates for a response without the field', () => {
        expect(resultResources(undefined)).toEqual([Resource.Certificates]);
        expect(resultResources([])).toEqual([Resource.Certificates]);
    });
});

describe('progressRecordedCaption', () => {
    const recordedAt = '2026-09-13T12:32:07.000Z';
    const fourMinutesLater = new Date('2026-09-13T12:36:07.000Z').getTime();

    it('dates the reading and says how old it is', () => {
        const caption = progressRecordedCaption(recordedAt, fourMinutesLater);

        expect(caption).toMatch(/^as of \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} — 4 minutes ago$/);
    });

    it('is absent when the Provider has reported no progress at all', () => {
        expect(progressRecordedCaption(undefined)).toBeUndefined();
    });

    it('still dates a reading taken this very second', () => {
        const caption = progressRecordedCaption(recordedAt, new Date(recordedAt).getTime());

        expect(caption).toMatch(/^as of \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });
});

describe('targetsCaption', () => {
    it('shows a denominator only when the Provider sent one', () => {
        expect(targetsCaption(12, 30)).toBe('12 / 30 targets');
        expect(targetsCaption(12, undefined)).toBe('12 targets');
        expect(targetsCaption(undefined, 30)).toBe('30 targets in total');
        expect(targetsCaption(undefined, undefined)).toBe('No target count reported');
    });
});

describe('importRemainder', () => {
    it('is what is neither imported nor failed', () => {
        expect(importRemainder({ itemsNewlyDiscovered: 2306, itemsProcessed: 1840, itemsFailed: 6 })).toBe(460);
    });

    it('reports zero for a run that imported nothing, never a negative or an absence', () => {
        expect(importRemainder({ itemsNewlyDiscovered: 0, itemsProcessed: 0, itemsFailed: 0 })).toBe(0);
        expect(importRemainder({ itemsNewlyDiscovered: 3, itemsProcessed: 3, itemsFailed: 1 })).toBe(0);
        expect(importRemainder({} as any)).toBe(0);
    });
});

describe('certificateNotes', () => {
    const certificatesOnly = { resources: [Resource.Certificates], status: DiscoveryStatus.Completed };

    it('reads a provider figure above the saved one as repeats when everything was handed over', () => {
        // Four hosts answered with a three-certificate chain each: 12 items, 8 distinct certificates.
        expect(
            certificateNotes({
                ...certificatesOnly,
                itemsDiscovered: 12,
                totalCertificatesDiscovered: 8,
                connectorTotalCertificatesDiscovered: 12,
            }),
        ).toEqual([{ kind: 'repeats', count: 4 }]);
    });

    it('reads items reported above items received as never handed over once the run has ended', () => {
        expect(
            certificateNotes({
                ...certificatesOnly,
                status: DiscoveryStatus.Cancelled,
                itemsDiscovered: 9,
                totalCertificatesDiscovered: 8,
                connectorTotalCertificatesDiscovered: 12,
            }),
        ).toEqual([
            { kind: 'notHandedOver', count: 3 },
            { kind: 'repeats', count: 1 },
        ]);
    });

    it('holds the never-handed-over note while the run is still live, when the provider is expected to lead', () => {
        expect(
            certificateNotes({
                ...certificatesOnly,
                status: DiscoveryStatus.InProgress,
                itemsDiscovered: 9,
                totalCertificatesDiscovered: 8,
                connectorTotalCertificatesDiscovered: 12,
            }),
        ).toEqual([{ kind: 'repeats', count: 1 }]);
    });

    it('says nothing when the figures agree', () => {
        expect(
            certificateNotes({
                ...certificatesOnly,
                itemsDiscovered: 8,
                totalCertificatesDiscovered: 8,
                connectorTotalCertificatesDiscovered: 8,
            }),
        ).toEqual([]);
    });

    it('says nothing for a v1 run or a run with other resources, whose figures cannot be split', () => {
        expect(certificateNotes({ ...certificatesOnly, totalCertificatesDiscovered: 8, connectorTotalCertificatesDiscovered: 12 })).toEqual(
            [],
        );
        expect(
            certificateNotes({
                resources: [Resource.Certificates, Resource.Keys],
                status: DiscoveryStatus.Completed,
                itemsDiscovered: 52,
                totalCertificatesDiscovered: 48,
                connectorTotalCertificatesDiscovered: 48,
            }),
        ).toEqual([]);
    });
});

describe('inventoryPath', () => {
    it('links the resources that have a detail page', () => {
        expect(inventoryPath(Resource.Certificates, 'c-1')).toBe('../../certificates/detail/c-1');
        expect(inventoryPath(Resource.Keys, 'k-1')).toBe('../../keys/detail/k-1');
    });

    it('has no link for a resource without one', () => {
        expect(inventoryPath(Resource.Discoveries, 'x')).toBeUndefined();
    });
});
