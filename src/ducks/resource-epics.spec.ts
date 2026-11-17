import { describe, expect, test, vi } from 'vitest';
import type { UnknownAction } from '@reduxjs/toolkit';
import { BehaviorSubject, firstValueFrom, from, of, Subject, throwError } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { Resource, ResourceAction } from 'types/openapi';
import { actions } from './resource';

vi.mock('../App', () => ({
    store: {
        dispatch: vi.fn(),
        getState: vi.fn(() => ({})),
    },
}));

type AllowedActionsResponse = { items: { uuid: string; allowedActions?: ResourceAction[] }[] };

async function startListObjectAllowedActions(
    listObjectAllowedActions: (...args: unknown[]) => unknown,
    requested = [actions.listObjectAllowedActions({ resource: Resource.Secrets, uuids: ['uuid-1'] })],
): Promise<UnknownAction[]> {
    const { default: epics } = await import('./resource-epics');
    const epic = epics[3];
    const deps = { apiClients: { resources: { listObjectAllowedActions } } };
    const output$ = epic(from(requested), new BehaviorSubject({}) as never, deps as never);
    const emitted: UnknownAction[] = [];
    output$.subscribe((action) => emitted.push(action));
    return emitted;
}

async function runListObjectAllowedActions(
    listObjectAllowedActions: (...args: unknown[]) => unknown,
    uuids = ['uuid-1'],
): Promise<UnknownAction[]> {
    const { default: epics } = await import('./resource-epics');
    const epic = epics[3];
    const deps = { apiClients: { resources: { listObjectAllowedActions } } };
    const output$ = epic(
        of(actions.listObjectAllowedActions({ resource: Resource.Secrets, uuids })),
        new BehaviorSubject({}) as never,
        deps as never,
    );
    return firstValueFrom(output$.pipe(toArray()));
}

const success = (answers: { uuid: string; allowedActions: ResourceAction[] | undefined }[]) =>
    actions.listObjectAllowedActionsSuccess({ resource: Resource.Secrets, answers });

describe('listObjectAllowedActions epic', () => {
    test('requests the one object and stores its allowed actions', async () => {
        const request = vi.fn(() => of({ items: [{ uuid: 'uuid-1', allowedActions: [ResourceAction.Detail] }] }));

        const emitted = await runListObjectAllowedActions(request);

        expect(request).toHaveBeenCalledWith({ resource: Resource.Secrets, objectAllowedActionsRequestDto: { uuids: ['uuid-1'] } });
        expect(emitted).toEqual([success([{ uuid: 'uuid-1', allowedActions: [ResourceAction.Detail] }])]);
    });

    test('requests several objects in one call and stores each answer', async () => {
        const request = vi.fn(() =>
            of({
                items: [
                    { uuid: 'uuid-2', allowedActions: [ResourceAction.Update] },
                    { uuid: 'uuid-1', allowedActions: [ResourceAction.Detail] },
                ],
            }),
        );

        const emitted = await runListObjectAllowedActions(request, ['uuid-1', 'uuid-2', 'uuid-3']);

        expect(request).toHaveBeenCalledTimes(1);
        expect(emitted).toEqual([
            success([
                { uuid: 'uuid-1', allowedActions: [ResourceAction.Detail] },
                { uuid: 'uuid-2', allowedActions: [ResourceAction.Update] },
                { uuid: 'uuid-3', allowedActions: undefined },
            ]),
        ]);
    });

    test('splits a request over the server limit of 1000 objects', async () => {
        const uuids = Array.from({ length: 1001 }, (_, index) => `uuid-${index}`);
        const request = vi.fn(() => of({ items: [] }));

        await runListObjectAllowedActions(request, uuids);

        expect(
            request.mock.calls.map(
                ([args]) => (args as { objectAllowedActionsRequestDto: { uuids: string[] } }).objectAllowedActionsRequestDto.uuids,
            ),
        ).toEqual([uuids.slice(0, 1000), uuids.slice(1000)]);
    });

    test('matches the answer to a mixed-case request UUID', async () => {
        const uuid = 'AB12CD34-0000-4000-8000-00000000000F';
        const request = () => of({ items: [{ uuid: uuid.toLowerCase(), allowedActions: [ResourceAction.Update] }] });

        const emitted = await startListObjectAllowedActions(request, [
            actions.listObjectAllowedActions({ resource: Resource.Secrets, uuids: [uuid] }),
        ]);

        expect(emitted).toEqual([success([{ uuid, allowedActions: [ResourceAction.Update] }])]);
    });

    test('stores no actions for an object left out of the answer', async () => {
        const emitted = await runListObjectAllowedActions(() => of({ items: [] }));

        expect(emitted).toEqual([success([{ uuid: 'uuid-1', allowedActions: undefined }])]);
    });

    test('records a failed request without raising an alert', async () => {
        const emitted = await runListObjectAllowedActions(() => throwError(() => new Error('boom')), ['uuid-1', 'uuid-2']);

        expect(emitted).toEqual([actions.listObjectAllowedActionsFailure({ resource: Resource.Secrets, uuids: ['uuid-1', 'uuid-2'] })]);
    });

    test('completes overlapping requests for different objects', async () => {
        const responses: Record<string, Subject<AllowedActionsResponse>> = { 'uuid-1': new Subject(), 'uuid-2': new Subject() };
        const request = vi.fn(
            ({ objectAllowedActionsRequestDto }: { objectAllowedActionsRequestDto: { uuids: string[] } }) =>
                responses[objectAllowedActionsRequestDto.uuids[0]],
        );

        const emitted = await startListObjectAllowedActions(request as never, [
            actions.listObjectAllowedActions({ resource: Resource.Secrets, uuids: ['uuid-1'] }),
            actions.listObjectAllowedActions({ resource: Resource.Secrets, uuids: ['uuid-2'] }),
        ]);
        responses['uuid-2'].next({ items: [{ uuid: 'uuid-2', allowedActions: [ResourceAction.Update] }] });
        responses['uuid-1'].next({ items: [{ uuid: 'uuid-1', allowedActions: [ResourceAction.Detail] }] });

        expect(emitted).toEqual([
            success([{ uuid: 'uuid-2', allowedActions: [ResourceAction.Update] }]),
            success([{ uuid: 'uuid-1', allowedActions: [ResourceAction.Detail] }]),
        ]);
    });

    test('drops an older request for the same objects once a newer one starts, in any order', async () => {
        const older = new Subject<AllowedActionsResponse>();
        const newer = new Subject<AllowedActionsResponse>();
        const request = vi.fn().mockReturnValueOnce(older).mockReturnValueOnce(newer);

        const emitted = await startListObjectAllowedActions(request, [
            actions.listObjectAllowedActions({ resource: Resource.Secrets, uuids: ['uuid-1', 'uuid-2'] }),
            actions.listObjectAllowedActions({ resource: Resource.Secrets, uuids: ['UUID-2', 'uuid-1'] }),
        ]);
        newer.next({ items: [{ uuid: 'uuid-1', allowedActions: [ResourceAction.Detail] }] });
        older.error(new Error('boom'));

        expect(older.observed).toBe(false);
        expect(emitted).toEqual([
            success([
                { uuid: 'UUID-2', allowedActions: undefined },
                { uuid: 'uuid-1', allowedActions: [ResourceAction.Detail] },
            ]),
        ]);
    });
});
