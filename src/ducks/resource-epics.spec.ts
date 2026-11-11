import { describe, expect, test, vi } from 'vitest';
import type { UnknownAction } from '@reduxjs/toolkit';
import { BehaviorSubject, firstValueFrom, of, throwError } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { Resource, ResourceAction } from 'types/openapi';
import { actions } from './resource';

vi.mock('../App', () => ({
    store: {
        dispatch: vi.fn(),
        getState: vi.fn(() => ({})),
    },
}));

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
});
