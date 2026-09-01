import { describe, expect, test } from 'vitest';
import type { ListViewModel } from 'types/listViews';
import { FilterFieldSource, Resource } from 'types/openapi';
import { PENDING_VIEW_UUID, actions, initialState, selectors, slice } from './listViews';
import type { State } from './listViews';

const columns = [{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' }];

const view = (uuid: string, name: string, overrides: Partial<ListViewModel> = {}): ListViewModel => ({
    uuid,
    name,
    resource: Resource.Certificates,
    columns,
    defaultView: false,
    ...overrides,
});

const reduce = (state: State, action: { type: string; payload?: unknown }): State =>
    slice.reducer(state, action as Parameters<typeof slice.reducer>[1]);

const reduceAll = (actionList: { type: string; payload?: unknown }[], from: State = initialState): State => actionList.reduce(reduce, from);

const listed = (views: ListViewModel[]): State =>
    reduceAll([
        actions.listViews({ resource: Resource.Certificates }),
        actions.listViewsSuccess({ resource: Resource.Certificates, views }),
    ]);

const certificates = (state: State) => selectors.resourceViews(Resource.Certificates)({ [slice.name]: state } as never);

describe('reading the saved views', () => {
    test('a resource with nothing stored reads as an empty strip rather than undefined', () => {
        expect(certificates(initialState)).toEqual({ views: [], isFetching: false, isMutating: false });
    });

    test('a read reports itself in flight and then settles on the views', () => {
        const fetching = reduce(initialState, actions.listViews({ resource: Resource.Certificates }));
        expect(certificates(fetching).isFetching).toBe(true);

        const settled = reduce(fetching, actions.listViewsSuccess({ resource: Resource.Certificates, views: [view('a', 'One')] }));
        expect(certificates(settled)).toMatchObject({ isFetching: false, views: [view('a', 'One')] });
    });

    test('a failed read stops being in flight and reports the error', () => {
        const failed = reduceAll([
            actions.listViews({ resource: Resource.Certificates }),
            actions.listViewsFailure({ resource: Resource.Certificates, error: 'nope' }),
        ]);

        expect(certificates(failed).isFetching).toBe(false);
        expect(selectors.error({ [slice.name]: failed } as never)).toBe('nope');
    });

    test('resources hold their views apart', () => {
        const both = reduceAll(
            [actions.listViewsSuccess({ resource: Resource.Cryptographickeys, views: [view('k', 'Keys view')] })],
            listed([view('a', 'One')]),
        );

        expect(certificates(both).views.map((v) => v.uuid)).toEqual(['a']);
        expect(
            selectors
                .views(Resource.Cryptographickeys)({ [slice.name]: both } as never)
                .map((v) => v.uuid),
        ).toEqual(['k']);
    });
});

describe('creating a view', () => {
    const request = { name: 'Expiry watch', resource: Resource.Certificates, columns };

    test('the tab appears before the API answers', () => {
        const optimistic = reduce(listed([view('a', 'One')]), actions.createView({ resource: Resource.Certificates, view: request }));

        expect(certificates(optimistic).views.map((v) => v.uuid)).toEqual(['a', PENDING_VIEW_UUID]);
        expect(certificates(optimistic).isMutating).toBe(true);
    });

    test('the stored view replaces the pending one in place, and the strip is told which uuid to follow', () => {
        const created = reduceAll(
            [
                actions.createView({ resource: Resource.Certificates, view: request }),
                actions.createViewSuccess({ resource: Resource.Certificates, view: view('new', 'Expiry watch') }),
            ],
            listed([view('a', 'One')]),
        );

        expect(certificates(created).views.map((v) => v.uuid)).toEqual(['a', 'new']);
        expect(certificates(created)).toMatchObject({ isMutating: false, createdUuid: 'new' });
    });

    test('a create that succeeded without an optimistic row still lands', () => {
        const created = reduce(
            listed([view('a', 'One')]),
            actions.createViewSuccess({ resource: Resource.Certificates, view: view('new', 'Expiry watch') }),
        );

        expect(certificates(created).views.map((v) => v.uuid)).toEqual(['a', 'new']);
    });

    test('a failed create rolls the tab back off the strip', () => {
        const failed = reduceAll(
            [
                actions.createView({ resource: Resource.Certificates, view: request }),
                actions.createViewFailure({ resource: Resource.Certificates, error: 'nope' }),
            ],
            listed([view('a', 'One')]),
        );

        expect(certificates(failed).views.map((v) => v.uuid)).toEqual(['a']);
        expect(certificates(failed)).toMatchObject({ isMutating: false, rollback: undefined });
        expect(selectors.error({ [slice.name]: failed } as never)).toBe('nope');
    });

    test('creating a pinned view un-pins the one that held it', () => {
        const pinnedElsewhere = listed([view('a', 'One', { defaultView: true })]);
        const optimistic = reduce(
            pinnedElsewhere,
            actions.createView({ resource: Resource.Certificates, view: { ...request, defaultView: true } }),
        );

        expect(certificates(optimistic).views.map((v) => v.defaultView)).toEqual([false, true]);
    });
});

describe('editing a view', () => {
    const stored = [view('a', 'One'), view('b', 'Two')];
    const rename = { name: 'Renamed', columns };

    test('the rename shows before the API answers, and survives the answer', () => {
        const optimistic = reduce(listed(stored), actions.updateView({ resource: Resource.Certificates, uuid: 'a', view: rename }));
        expect(certificates(optimistic).views[0].name).toBe('Renamed');

        const settled = reduce(optimistic, actions.updateViewSuccess({ resource: Resource.Certificates, view: view('a', 'Renamed') }));
        expect(certificates(settled).views[0].name).toBe('Renamed');
        expect(certificates(settled).isMutating).toBe(false);
    });

    test('a failed rename puts the old name back', () => {
        const failed = reduceAll(
            [
                actions.updateView({ resource: Resource.Certificates, uuid: 'a', view: rename }),
                actions.updateViewFailure({ resource: Resource.Certificates, error: 'nope' }),
            ],
            listed(stored),
        );

        expect(certificates(failed).views.map((v) => v.name)).toEqual(['One', 'Two']);
    });

    test('an edit naming a view that is gone changes nothing but still settles', () => {
        const missing = reduce(listed(stored), actions.updateView({ resource: Resource.Certificates, uuid: 'gone', view: rename }));

        expect(certificates(missing).views).toEqual(stored);
        expect(certificates(missing).isMutating).toBe(true);
    });

    test('pinning a view un-pins the one that held it, in the same render', () => {
        const optimistic = reduce(
            listed([view('a', 'One', { defaultView: true }), view('b', 'Two')]),
            actions.updateView({ resource: Resource.Certificates, uuid: 'b', view: { ...rename, name: 'Two', defaultView: true } }),
        );

        expect(certificates(optimistic).views.map((v) => v.defaultView)).toEqual([false, true]);
    });

    test('the same invariant holds on what the API returns', () => {
        const settled = reduce(
            listed([view('a', 'One', { defaultView: true }), view('b', 'Two')]),
            actions.updateViewSuccess({ resource: Resource.Certificates, view: view('b', 'Two', { defaultView: true }) }),
        );

        expect(certificates(settled).views.map((v) => v.defaultView)).toEqual([false, true]);
    });
});

describe('deleting a view', () => {
    const stored = [view('a', 'One'), view('b', 'Two')];

    test('the tab goes before the API answers', () => {
        const optimistic = reduce(listed(stored), actions.deleteView({ resource: Resource.Certificates, uuid: 'a' }));

        expect(certificates(optimistic).views.map((v) => v.uuid)).toEqual(['b']);
        expect(certificates(optimistic).isMutating).toBe(true);
    });

    test('a failed delete brings the tab back', () => {
        const failed = reduceAll(
            [
                actions.deleteView({ resource: Resource.Certificates, uuid: 'a' }),
                actions.deleteViewFailure({ resource: Resource.Certificates, error: 'nope' }),
            ],
            listed(stored),
        );

        expect(certificates(failed).views.map((v) => v.uuid)).toEqual(['a', 'b']);
        expect(selectors.error({ [slice.name]: failed } as never)).toBe('nope');
    });

    test('success settles the strip', () => {
        const settled = reduceAll(
            [
                actions.deleteView({ resource: Resource.Certificates, uuid: 'a' }),
                actions.deleteViewSuccess({ resource: Resource.Certificates, uuid: 'a' }),
            ],
            listed(stored),
        );

        expect(certificates(settled)).toMatchObject({ views: [view('b', 'Two')], isMutating: false, rollback: undefined });
    });
});

describe('resetState', () => {
    test('drops every resource', () => {
        const cleared = reduce(listed([view('a', 'One')]), actions.resetState());
        expect(cleared).toEqual(initialState);
    });
});

describe('selectors', () => {
    test('report the flags the strip gates its actions on', () => {
        const store = {
            [slice.name]: reduce(listed([view('a', 'One')]), actions.deleteView({ resource: Resource.Certificates, uuid: 'a' })),
        };

        expect(selectors.isMutating(Resource.Certificates)(store as never)).toBe(true);
        expect(selectors.isFetching(Resource.Certificates)(store as never)).toBe(false);
        expect(selectors.createdUuid(Resource.Certificates)(store as never)).toBeUndefined();
    });

    test('survive a store that has not built the slice yet', () => {
        expect(selectors.views(Resource.Certificates)({} as never)).toEqual([]);
        expect(selectors.error({} as never)).toBeUndefined();
    });
});
