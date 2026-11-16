import { describe, expect, test, vi } from 'vitest';
import type { UnknownAction } from '@reduxjs/toolkit';
import { BehaviorSubject, firstValueFrom, of, Subject, throwError } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { Resource, ResourceAction } from 'types/openapi';
import { actions } from './resource';

vi.mock('../App', () => ({
    store: {
        dispatch: vi.fn(),
        getState: vi.fn(() => ({})),
    },
}));

async function listObjectAllowedActionsEpic() {
    const { default: epics } = await import('./resource-epics');
    return epics[3];
}

async function runListObjectAllowedActions(listObjectAllowedActions: (...args: unknown[]) => unknown): Promise<UnknownAction[]> {
    const epic = await listObjectAllowedActionsEpic();
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

    test('keeps only the answer to the newest request for the same object', async () => {
        const epic = await listObjectAllowedActionsEpic();
        const older = new Subject<{ items: { uuid: string; allowedActions: ResourceAction[] }[] }>();
        const newer = new Subject<{ items: { uuid: string; allowedActions: ResourceAction[] }[] }>();
        const request = vi.fn().mockReturnValueOnce(older).mockReturnValueOnce(newer);
        const action$ = new Subject<UnknownAction>();
        const emitted: UnknownAction[] = [];
        epic(
            action$ as never,
            new BehaviorSubject({}) as never,
            { apiClients: { resources: { listObjectAllowedActions: request } } } as never,
        ).subscribe((action) => emitted.push(action));

        action$.next(actions.listObjectAllowedActions({ resource: Resource.Secrets, uuid: 'uuid-1' }));
        action$.next(actions.listObjectAllowedActions({ resource: Resource.Secrets, uuid: 'uuid-1' }));
        newer.next({ items: [{ uuid: 'uuid-1', allowedActions: [ResourceAction.Update] }] });
        older.next({ items: [{ uuid: 'uuid-1', allowedActions: [ResourceAction.Detail] }] });

        expect(emitted).toEqual([
            actions.listObjectAllowedActionsSuccess({
                resource: Resource.Secrets,
                uuid: 'uuid-1',
                allowedActions: [ResourceAction.Update],
            }),
        ]);
    });

    test('answers requests for different objects independently', async () => {
        const epic = await listObjectAllowedActionsEpic();
        const first = new Subject<{ items: { uuid: string; allowedActions: ResourceAction[] }[] }>();
        const second = new Subject<{ items: { uuid: string; allowedActions: ResourceAction[] }[] }>();
        const request = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
        const action$ = new Subject<UnknownAction>();
        const emitted: UnknownAction[] = [];
        epic(
            action$ as never,
            new BehaviorSubject({}) as never,
            { apiClients: { resources: { listObjectAllowedActions: request } } } as never,
        ).subscribe((action) => emitted.push(action));

        action$.next(actions.listObjectAllowedActions({ resource: Resource.Secrets, uuid: 'uuid-1' }));
        action$.next(actions.listObjectAllowedActions({ resource: Resource.Secrets, uuid: 'uuid-2' }));
        first.next({ items: [{ uuid: 'uuid-1', allowedActions: [ResourceAction.Detail] }] });
        second.next({ items: [{ uuid: 'uuid-2', allowedActions: [ResourceAction.Update] }] });

        expect(emitted).toEqual([
            actions.listObjectAllowedActionsSuccess({
                resource: Resource.Secrets,
                uuid: 'uuid-1',
                allowedActions: [ResourceAction.Detail],
            }),
            actions.listObjectAllowedActionsSuccess({
                resource: Resource.Secrets,
                uuid: 'uuid-2',
                allowedActions: [ResourceAction.Update],
            }),
        ]);
    });
});
