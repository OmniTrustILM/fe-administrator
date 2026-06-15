import { act, createElement } from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import ListStateScopeCleaner from './index';
import { slice as listFiltersSlice } from 'ducks/list-filters';
import { slice as listScopesSlice, actions as listScopeActions } from 'ducks/list-scopes';
import { slice as tablePaginationSlice, actions as tablePaginationActions } from 'ducks/table-pagination';
import { slice as pagingSlice, actions as pagingActions, selectors as pagingSelectors } from 'ducks/paging';
import { slice as filtersSlice, EntityType } from 'ducks/filters';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const buildStore = () =>
    configureStore({
        reducer: combineReducers({
            [listFiltersSlice.name]: listFiltersSlice.reducer,
            [listScopesSlice.name]: listScopesSlice.reducer,
            [tablePaginationSlice.name]: tablePaginationSlice.reducer,
            [pagingSlice.name]: pagingSlice.reducer,
            [filtersSlice.name]: filtersSlice.reducer,
        }),
    });

describe('ListStateScopeCleaner', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    const renderAt = async (store: ReturnType<typeof buildStore>, route: string) => {
        root = createRoot(container);
        await act(async () => {
            root.render(
                createElement(
                    Provider,
                    { store } as any,
                    createElement(MemoryRouter, { initialEntries: [route] } as any, createElement(ListStateScopeCleaner)),
                ),
            );
        });
    };

    it('resets a PagedList entity paging when the path leaves its registered scope', async () => {
        const store = buildStore();
        store.dispatch(listScopeActions.registerScope({ entity: EntityType.SECRET, prefix: '/secrets' }));
        store.dispatch(pagingActions.setPagination({ entity: EntityType.SECRET, pageNumber: 3, pageSize: 50 }));

        await renderAt(store, '/connectors');

        expect(pagingSelectors.pageNumber(EntityType.SECRET)(store.getState())).toBe(1);
        expect(pagingSelectors.pageSize(EntityType.SECRET)(store.getState())).toBe(10);
        expect(store.getState().listScopes.byEntity[EntityType.SECRET]).toBeUndefined();
    });

    it('keeps a PagedList entity paging while drilling into its own detail route', async () => {
        const store = buildStore();
        store.dispatch(listScopeActions.registerScope({ entity: EntityType.SECRET, prefix: '/secrets' }));
        store.dispatch(pagingActions.setPagination({ entity: EntityType.SECRET, pageNumber: 3, pageSize: 50 }));

        await renderAt(store, '/secrets/detail/abc');

        expect(pagingSelectors.pageNumber(EntityType.SECRET)(store.getState())).toBe(3);
        expect(pagingSelectors.pageSize(EntityType.SECRET)(store.getState())).toBe(50);
    });

    it('clears a Workflows persistent pagination key when leaving its scope', async () => {
        const store = buildStore();
        store.dispatch(
            tablePaginationActions.setPagination({ key: 'custom-table-persistent:workflows:conditions', page: 4, pageSize: 100 }),
        );

        await renderAt(store, '/certificates');

        expect(store.getState().tablePagination.byKey['custom-table-persistent:workflows:conditions']).toBeUndefined();
    });

    it('keeps a Workflows persistent pagination key while within its scope (rules/conditions)', async () => {
        const store = buildStore();
        store.dispatch(
            tablePaginationActions.setPagination({ key: 'custom-table-persistent:workflows:conditions', page: 4, pageSize: 100 }),
        );

        await renderAt(store, '/conditions/detail/xyz');

        expect(store.getState().tablePagination.byKey['custom-table-persistent:workflows:conditions']).toEqual({ page: 4, pageSize: 100 });
    });
});
