import { describe, expect, test } from 'vitest';
import { firstValueFrom, of, throwError } from 'rxjs';
import { take, toArray } from 'rxjs/operators';

import { Resource, ResourceEvent } from 'types/openapi';

import epics from './event-history-epics';
import { actions } from './event-history';
import { sampleEventHistory, sampleEventHistoryRequest, sampleObjectEventHistory } from './__fixtures__/event-history';

async function runEpic(epicIndex: number, action: any, depsOverrides: any, takeCount = 1): Promise<any[]> {
    const deps = {
        apiClients: {
            events: {
                getPlatformSettingsEventHistory: () => of(sampleEventHistory),
                getObjectEventHistory: () => of(sampleObjectEventHistory),
                ...depsOverrides,
            },
            resources: {
                listResourceRuleFilterFields: () => of([]),
                ...depsOverrides,
            },
        },
    };
    return firstValueFrom((epics[epicIndex] as any)(of(action), of({}) as any, deps as any).pipe(take(takeCount), toArray())) as Promise<
        any[]
    >;
}

describe('event-history epics', () => {
    test('getPlatformSettingsEventHistory success emits getPlatformSettingsEventHistorySuccess', async () => {
        const calls: any[] = [];
        const emitted = await runEpic(
            0,
            actions.getPlatformSettingsEventHistory({
                event: ResourceEvent.CertificateStatusChanged,
                request: sampleEventHistoryRequest,
            }),
            {
                getPlatformSettingsEventHistory: (req: any) => {
                    calls.push(req);
                    return of(sampleEventHistory);
                },
            },
        );

        expect(calls).toEqual([
            {
                event: ResourceEvent.CertificateStatusChanged,
                eventHistoryRequestDto: sampleEventHistoryRequest,
            },
        ]);
        expect(emitted).toEqual([actions.getPlatformSettingsEventHistorySuccess({ eventHistory: sampleEventHistory })]);
    });

    test('getPlatformSettingsEventHistory failure emits getPlatformSettingsEventHistoryFailure', async () => {
        const emitted = await runEpic(
            0,
            actions.getPlatformSettingsEventHistory({
                event: ResourceEvent.CertificateStatusChanged,
                request: sampleEventHistoryRequest,
            }),
            {
                getPlatformSettingsEventHistory: () => throwError(() => new Error('boom')),
            },
        );

        expect(emitted).toHaveLength(1);
        expect(emitted[0].type).toBe(actions.getPlatformSettingsEventHistoryFailure.type);
        expect(emitted[0].payload.error).toContain('Failed to get event history');
    });

    test('getObjectEventHistory success emits getObjectEventHistorySuccess', async () => {
        const calls: any[] = [];
        const emitted = await runEpic(
            1,
            actions.getObjectEventHistory({
                resource: Resource.Certificates,
                uuid: 'object-uuid',
                itemsPerPage: 10,
                pageNumber: 1,
            }),
            {
                getObjectEventHistory: (req: any) => {
                    calls.push(req);
                    return of(sampleObjectEventHistory);
                },
            },
        );

        expect(calls).toEqual([
            {
                resource: Resource.Certificates,
                uuid: 'object-uuid',
                itemsPerPage: 10,
                pageNumber: 1,
            },
        ]);
        expect(emitted).toEqual([actions.getObjectEventHistorySuccess({ objectEventHistory: sampleObjectEventHistory })]);
    });

    test('getObjectEventHistory failure emits getObjectEventHistoryFailure', async () => {
        const emitted = await runEpic(
            1,
            actions.getObjectEventHistory({
                resource: Resource.Certificates,
                uuid: 'object-uuid',
                itemsPerPage: 10,
                pageNumber: 1,
            }),
            {
                getObjectEventHistory: () => throwError(() => new Error('boom')),
            },
        );

        expect(emitted).toHaveLength(1);
        expect(emitted[0].type).toBe(actions.getObjectEventHistoryFailure.type);
        expect(emitted[0].payload.error).toContain('Failed to get object event history');
    });

    test('getConditionFilterFields reads the rule filter fields of the resource', async () => {
        const calls: any[] = [];
        const field = {
            filterFieldSource: 'property',
            searchFieldData: [{ fieldIdentifier: 'NOT_AFTER', fieldLabel: 'Expires At', type: 'datetime', conditions: [] }],
        };
        const emitted = await runEpic(2, actions.getConditionFilterFields({ resource: Resource.Certificates }), {
            listResourceRuleFilterFields: (req: any) => {
                calls.push(req);
                return of([field]);
            },
        });

        expect(calls).toEqual([{ resource: Resource.Certificates }]);
        expect(emitted).toHaveLength(1);
        expect(emitted[0].type).toBe(actions.getConditionFilterFieldsSuccess.type);
        expect(emitted[0].payload.resource).toBe(Resource.Certificates);
        expect(emitted[0].payload.filterFields[0].searchFieldData[0].fieldLabel).toBe('Expires At');
    });

    test('getConditionFilterFields failure names the resource', async () => {
        const emitted = await runEpic(2, actions.getConditionFilterFields({ resource: Resource.Keys }), {
            listResourceRuleFilterFields: () => throwError(() => new Error('boom')),
        });

        expect(emitted).toEqual([
            actions.getConditionFilterFieldsFailure({
                resource: Resource.Keys,
                error: expect.stringContaining('Failed to get condition filter fields'),
            }),
        ]);
    });
});
