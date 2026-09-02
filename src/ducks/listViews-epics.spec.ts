import { describe, expect, test } from 'vitest';
import { Observable, firstValueFrom, from, of, throwError } from 'rxjs';
import { AjaxError } from 'rxjs/ajax';
import { delay, take, toArray } from 'rxjs/operators';
import type { ListViewModel } from 'types/listViews';
import { FilterFieldSource, Resource } from 'types/openapi';
import { actions as alertActions } from './alerts';
import epics from './listViews-epics';
import { actions } from './listViews';

const columns = [{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' }];

const stored: ListViewModel = {
    uuid: 'a',
    name: 'Expiry watch',
    resource: Resource.Certificates,
    columns,
    defaultView: false,
};

/** Same shape `app-redirect.spec.ts` uses: an `AjaxError` cannot be constructed without a real XHR. */
const ajaxError = (status: number, message: string): AjaxError => {
    const err = Object.assign(new Error(message), { name: 'AjaxError', status });
    Object.setPrototypeOf(err, AjaxError.prototype);
    return err as unknown as AjaxError;
};

type ListViewApiStubs = {
    listViews: (args: { resource: Resource }) => unknown;
    createView: (args: { listViewRequestDto: unknown }) => unknown;
    editView: (args: { uuid: string; listViewUpdateRequestDto: unknown }) => unknown;
    deleteView: (args: { uuid: string }) => unknown;
};

function createDeps(overrides: Partial<ListViewApiStubs> = {}) {
    return {
        apiClients: {
            listViews: {
                listViews: () => of([stored]),
                createView: () => of(stored),
                editView: () => of(stored),
                deleteView: () => of(undefined),
                ...overrides,
            },
        },
    };
}

// Every mutation shares one epic, because they share one rollback snapshot per resource.
const [LIST, MUTATE] = [0, 1];

type EpicUnderTest = (action$: unknown, state$: unknown, deps: unknown) => Observable<{ type: string; payload?: never }>;

async function run(index: number, action: unknown, deps: unknown, expected: number) {
    const epic = epics[index] as unknown as EpicUnderTest;
    return firstValueFrom(epic(of(action), of({}), deps).pipe(take(expected), toArray()));
}

/** Both reads dispatched back to back, which is what a page mounting two strips at once does. */
async function readBoth(actionsToDispatch: unknown[], deps: unknown, expected = 2) {
    const epic = epics[LIST] as unknown as EpicUnderTest;
    return firstValueFrom(epic(from(actionsToDispatch), of({}), deps).pipe(take(expected), toArray()));
}

const resourceOf = (action: { payload?: unknown }) => (action.payload as { resource: Resource }).resource;

describe('listViews', () => {
    test('answers a read with the stored views', async () => {
        const [emitted] = await run(LIST, actions.listViews({ resource: Resource.Certificates }), createDeps(), 1);

        expect(emitted).toEqual(actions.listViewsSuccess({ resource: Resource.Certificates, views: [stored] }));
    });

    test('a failed read reports the error against the resource it was for', async () => {
        const deps = createDeps({ listViews: () => throwError(() => ajaxError(500, 'boom')) });
        const [emitted] = await run(LIST, actions.listViews({ resource: Resource.Certificates }), deps, 1);

        expect(emitted.type).toBe(actions.listViewsFailure.type);
        expect(emitted).toMatchObject({ payload: { resource: Resource.Certificates } });
    });

    test('a failed read is surfaced, since an unread list is otherwise indistinguishable from an empty one', async () => {
        const deps = createDeps({ listViews: () => throwError(() => ajaxError(500, 'boom')) });
        const [failure, alert] = await run(LIST, actions.listViews({ resource: Resource.Certificates }), deps, 2);

        expect(failure.type).toBe(actions.listViewsFailure.type);
        expect(alert.type).toBe(alertActions.error.type);
        expect(alert.payload).toContain('Failed to get saved views');
    });

    test('a read of one resource does not cancel a read of another still in flight', async () => {
        // The slower answer is the one asked for first, so an ungrouped switch would drop it: a
        // cancelled read emits neither success nor failure, and its strip would wait for ever.
        const deps = createDeps({
            listViews: ({ resource }) => (resource === Resource.Certificates ? of([stored]).pipe(delay(20)) : of([]).pipe(delay(1))),
        });

        const emitted = await readBoth(
            [actions.listViews({ resource: Resource.Certificates }), actions.listViews({ resource: Resource.Secrets })],
            deps,
        );

        expect(emitted.map((action) => action.type)).toEqual([actions.listViewsSuccess.type, actions.listViewsSuccess.type]);
        expect(emitted.map(resourceOf).sort()).toEqual([Resource.Certificates, Resource.Secrets]);
    });

    test('a second read of the same resource still supersedes the first', async () => {
        const answers = [of([stored]).pipe(delay(20)), of([]).pipe(delay(1))];
        const deps = createDeps({ listViews: () => answers.shift() ?? of([]) });

        const [emitted] = await readBoth(
            [actions.listViews({ resource: Resource.Certificates }), actions.listViews({ resource: Resource.Certificates })],
            deps,
            1,
        );

        expect(emitted).toEqual(actions.listViewsSuccess({ resource: Resource.Certificates, views: [] }));
    });
});

describe('createView', () => {
    const request = { name: 'Expiry watch', resource: Resource.Certificates, columns };

    test('sends the request body through and carries the stored row back', async () => {
        let sent: unknown;
        const deps = createDeps({
            createView: (args) => {
                sent = args.listViewRequestDto;
                return of(stored);
            },
        });

        const [emitted] = await run(MUTATE, actions.createView({ resource: Resource.Certificates, view: request }), deps, 1);

        expect(sent).toEqual(request);
        expect(emitted).toEqual(actions.createViewSuccess({ resource: Resource.Certificates, view: stored }));
    });

    test('a failure both rolls the strip back and surfaces the message', async () => {
        const deps = createDeps({ createView: () => throwError(() => ajaxError(409, 'Name already used')) });
        const [failure, alert] = await run(MUTATE, actions.createView({ resource: Resource.Certificates, view: request }), deps, 2);

        expect(failure.type).toBe(actions.createViewFailure.type);
        expect(alert.type).toBe(alertActions.error.type);
        expect(alert.payload).toContain('Failed to create the view');
        expect(alert.payload).toContain('Name already used');
    });
});

describe('updateView', () => {
    const update = { name: 'Renamed', columns };

    test('addresses the stored view by uuid and carries the answer back', async () => {
        let sent: { uuid: string; listViewUpdateRequestDto: unknown } | undefined;
        const deps = createDeps({
            editView: (args) => {
                sent = args;
                return of(stored);
            },
        });

        const [emitted] = await run(MUTATE, actions.updateView({ resource: Resource.Certificates, uuid: 'a', view: update }), deps, 1);

        expect(sent).toEqual({ uuid: 'a', listViewUpdateRequestDto: update });
        expect(emitted).toEqual(actions.updateViewSuccess({ resource: Resource.Certificates, view: stored }));
    });

    test('a failure rolls back and surfaces the message', async () => {
        const deps = createDeps({ editView: () => throwError(() => ajaxError(500, 'boom')) });
        const [failure, alert] = await run(
            MUTATE,
            actions.updateView({ resource: Resource.Certificates, uuid: 'a', view: update }),
            deps,
            2,
        );

        expect(failure.type).toBe(actions.updateViewFailure.type);
        expect(alert.payload).toContain('Failed to save the view');
    });
});

describe('deleteView', () => {
    test('confirms the deletion of the uuid it was given, since the API answers with nothing', async () => {
        let sent: unknown;
        const deps = createDeps({
            deleteView: (args) => {
                sent = args;
                return of(undefined);
            },
        });

        const [emitted] = await run(MUTATE, actions.deleteView({ resource: Resource.Certificates, uuid: 'a' }), deps, 1);

        expect(sent).toEqual({ uuid: 'a' });
        expect(emitted).toEqual(actions.deleteViewSuccess({ resource: Resource.Certificates, uuid: 'a' }));
    });

    test('a failure rolls back and surfaces the message', async () => {
        const deps = createDeps({ deleteView: () => throwError(() => ajaxError(404, 'Gone')) });
        const [failure, alert] = await run(MUTATE, actions.deleteView({ resource: Resource.Certificates, uuid: 'a' }), deps, 2);

        expect(failure.type).toBe(actions.deleteViewFailure.type);
        expect(alert.payload).toContain('Failed to delete the view');
    });
});

describe('serialising the mutations', () => {
    test('a create and the delete behind it do not run at once, whatever their kinds', async () => {
        const log: string[] = [];

        const answer = <T>(name: string, value: T): Observable<T> =>
            new Observable<T>((subscriber) => {
                log.push(`${name}:start`);
                setTimeout(() => {
                    log.push(`${name}:end`);
                    subscriber.next(value);
                    subscriber.complete();
                }, 0);
            });

        const deps = createDeps({
            createView: () => answer('create', stored),
            deleteView: () => answer('delete', undefined),
        });

        const emitted = await firstValueFrom(
            (epics[MUTATE] as unknown as EpicUnderTest)(
                of(
                    actions.createView({
                        resource: Resource.Certificates,
                        view: { name: 'Expiry watch', resource: Resource.Certificates, columns },
                    }),
                    actions.deleteView({ resource: Resource.Certificates, uuid: 'a' }),
                ),
                of({}),
                deps,
            ).pipe(take(2), toArray()),
        );

        // The reducer holds one rollback snapshot and one `isMutating` flag per resource, so the second
        // write must not start until the first has settled — even though it is a different operation.
        expect(log).toEqual(['create:start', 'create:end', 'delete:start', 'delete:end']);
        expect(emitted.map((action) => action.type)).toEqual([actions.createViewSuccess.type, actions.deleteViewSuccess.type]);
    });

    test('two resources are not held up by one another', async () => {
        const inFlight: string[] = [];

        const deps = createDeps({
            createView: (args) => {
                const { name } = args.listViewRequestDto as { name: string };
                return new Observable((subscriber) => {
                    inFlight.push(name);
                    // Never settles: a second resource must still be able to start.
                    return () => subscriber.complete();
                });
            },
        });

        (epics[MUTATE] as unknown as EpicUnderTest)(
            of(
                actions.createView({
                    resource: Resource.Certificates,
                    view: { name: 'certificates', resource: Resource.Certificates, columns },
                }),
                actions.createView({
                    resource: Resource.Cryptographickeys,
                    view: { name: 'keys', resource: Resource.Cryptographickeys, columns },
                }),
            ),
            of({}),
            deps,
        ).subscribe();

        expect(inFlight).toEqual(['certificates', 'keys']);
    });
});
