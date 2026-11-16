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
    requested = [actions.listObjectAllowedActions({ resource: Resource.Secrets, uuid: 'uuid-1' })],
): Promise<UnknownAction[]> {
    const { default: epics } = await import('./resource-epics');
    const epic = epics[3];
    const deps = { apiClients: { resources: { listObjectAllowedActions } } };
    const output$ = epic(from(requested), new BehaviorSubject({}) as never, deps as never);
    const emitted: UnknownAction[] = [];
    output$.subscribe((action) => emitted.push(action));
    return emitted;
}

async function runListObjectAllowedActions(listObjectAllowedActions: (...args: unknown[]) => unknown): Promise<UnknownAction[]> {
    const { default: epics } = await import('./resource-epics');
    const epic = epics[3];
    const deps = { apiClients: { resources: { listObjectAllowedActions } } };
    const output$ = epic(
        of(actions.listObjectAllowedActions({ resource: Resource.Secrets, uuid: 'uuid-1' })),
        new BehaviorSubject({}) as never,
        deps as never,
    );
    return firstValueFrom(output$.pipe(toArray()));
}

describe('listObjectAllowedActions epic', () => {
    test('requests the one object and stores its allowed actions', async () => {
        const request = vi.fn(() => of({ items: [{ uuid: 'uuid-1', allowedActions: [ResourceAction.Detail] }] }));

        const emitted = await runListObjectAllowedActions(request);

        expect(request).toHaveBeenCalledWith({ resource: Resource.Secrets, objectAllowedActionsRequestDto: { uuids: ['uuid-1'] } });
        expect(emitted).toEqual([
            actions.listObjectAllowedActionsSuccess({
                resource: Resource.Secrets,
                uuid: 'uuid-1',
                allowedActions: [ResourceAction.Detail],
            }),
        ]);
    });

    test('stores no actions for an object left out of the answer', async () => {
        const emitted = await runListObjectAllowedActions(() => of({ items: [] }));

        expect(emitted).toEqual([
            actions.listObjectAllowedActionsSuccess({ resource: Resource.Secrets, uuid: 'uuid-1', allowedActions: undefined }),
        ]);
    });

    test('records a failed request without raising an alert', async () => {
        const emitted = await runListObjectAllowedActions(() => throwError(() => new Error('boom')));

        expect(emitted).toEqual([actions.listObjectAllowedActionsFailure({ resource: Resource.Secrets, uuid: 'uuid-1' })]);
    });

    test('completes overlapping requests for different objects', async () => {
        const responses: Record<string, Subject<AllowedActionsResponse>> = { 'uuid-1': new Subject(), 'uuid-2': new Subject() };
        const request = vi.fn(
            ({ objectAllowedActionsRequestDto }: { objectAllowedActionsRequestDto: { uuids: string[] } }) =>
                responses[objectAllowedActionsRequestDto.uuids[0]],
        );

        const emitted = await startListObjectAllowedActions(request as never, [
            actions.listObjectAllowedActions({ resource: Resource.Secrets, uuid: 'uuid-1' }),
            actions.listObjectAllowedActions({ resource: Resource.Secrets, uuid: 'uuid-2' }),
        ]);
        responses['uuid-2'].next({ items: [{ uuid: 'uuid-2', allowedActions: [ResourceAction.Update] }] });
        responses['uuid-1'].next({ items: [{ uuid: 'uuid-1', allowedActions: [ResourceAction.Detail] }] });

        expect(emitted).toEqual([
            actions.listObjectAllowedActionsSuccess({
                resource: Resource.Secrets,
                uuid: 'uuid-2',
                allowedActions: [ResourceAction.Update],
            }),
            actions.listObjectAllowedActionsSuccess({
                resource: Resource.Secrets,
                uuid: 'uuid-1',
                allowedActions: [ResourceAction.Detail],
            }),
        ]);
    });

    test('drops an older request for the same object once a newer one starts', async () => {
        const older = new Subject<AllowedActionsResponse>();
        const newer = new Subject<AllowedActionsResponse>();
        const request = vi.fn().mockReturnValueOnce(older).mockReturnValueOnce(newer);

        const emitted = await startListObjectAllowedActions(request, [
            actions.listObjectAllowedActions({ resource: Resource.Secrets, uuid: 'uuid-1' }),
            actions.listObjectAllowedActions({ resource: Resource.Secrets, uuid: 'uuid-1' }),
        ]);
        newer.next({ items: [{ uuid: 'uuid-1', allowedActions: [ResourceAction.Detail] }] });
        older.error(new Error('boom'));

        expect(older.observed).toBe(false);
        expect(emitted).toEqual([
            actions.listObjectAllowedActionsSuccess({
                resource: Resource.Secrets,
                uuid: 'uuid-1',
                allowedActions: [ResourceAction.Detail],
            }),
        ]);
    });
});
