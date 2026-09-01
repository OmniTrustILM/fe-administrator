import { describe, expect, test } from 'vitest';
import { type Observable, firstValueFrom, of, throwError } from 'rxjs';
import { AjaxError } from 'rxjs/ajax';
import { take, toArray } from 'rxjs/operators';
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

const [LIST, CREATE, UPDATE, DELETE] = [0, 1, 2, 3];

type EpicUnderTest = (action$: unknown, state$: unknown, deps: unknown) => Observable<{ type: string; payload?: never }>;

async function run(index: number, action: unknown, deps: unknown, expected: number) {
    const epic = epics[index] as unknown as EpicUnderTest;
    return firstValueFrom(epic(of(action), of({}), deps).pipe(take(expected), toArray()));
}

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

    test('a read is not paired with an alert; the strip simply shows Standard alone', async () => {
        const deps = createDeps({ listViews: () => throwError(() => ajaxError(500, 'boom')) });
        const emitted = await firstValueFrom(
            (epics[LIST] as unknown as EpicUnderTest)(of(actions.listViews({ resource: Resource.Certificates })), of({}), deps).pipe(
                toArray(),
            ),
        );

        expect(emitted).toHaveLength(1);
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

        const [emitted] = await run(CREATE, actions.createView({ resource: Resource.Certificates, view: request }), deps, 1);

        expect(sent).toEqual(request);
        expect(emitted).toEqual(actions.createViewSuccess({ resource: Resource.Certificates, view: stored }));
    });

    test('a failure both rolls the strip back and surfaces the message', async () => {
        const deps = createDeps({ createView: () => throwError(() => ajaxError(409, 'Name already used')) });
        const [failure, alert] = await run(CREATE, actions.createView({ resource: Resource.Certificates, view: request }), deps, 2);

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

        const [emitted] = await run(UPDATE, actions.updateView({ resource: Resource.Certificates, uuid: 'a', view: update }), deps, 1);

        expect(sent).toEqual({ uuid: 'a', listViewUpdateRequestDto: update });
        expect(emitted).toEqual(actions.updateViewSuccess({ resource: Resource.Certificates, view: stored }));
    });

    test('a failure rolls back and surfaces the message', async () => {
        const deps = createDeps({ editView: () => throwError(() => ajaxError(500, 'boom')) });
        const [failure, alert] = await run(
            UPDATE,
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

        const [emitted] = await run(DELETE, actions.deleteView({ resource: Resource.Certificates, uuid: 'a' }), deps, 1);

        expect(sent).toEqual({ uuid: 'a' });
        expect(emitted).toEqual(actions.deleteViewSuccess({ resource: Resource.Certificates, uuid: 'a' }));
    });

    test('a failure rolls back and surfaces the message', async () => {
        const deps = createDeps({ deleteView: () => throwError(() => ajaxError(404, 'Gone')) });
        const [failure, alert] = await run(DELETE, actions.deleteView({ resource: Resource.Certificates, uuid: 'a' }), deps, 2);

        expect(failure.type).toBe(actions.deleteViewFailure.type);
        expect(alert.payload).toContain('Failed to delete the view');
    });
});
