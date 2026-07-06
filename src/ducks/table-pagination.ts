import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';

export type TablePaginationState = {
    page: number;
    pageSize: number;
    search?: string;
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc';
};

export type State = {
    byKey: Record<string, TablePaginationState>;
    activeRootRoute?: string;
    resetVersionByKey: Record<string, number>;
};

const DEFAULT_PAGINATION_STATE: TablePaginationState = {
    page: 1,
    pageSize: 10,
};

export const initialState: State = {
    byKey: {},
    activeRootRoute: undefined,
    resetVersionByKey: {},
};

const bumpResetVersion = (state: State, key: string) => {
    state.resetVersionByKey = state.resetVersionByKey ?? {};
    state.resetVersionByKey[key] = (state.resetVersionByKey[key] ?? 0) + 1;
};

export const slice = createSlice({
    name: 'tablePagination',

    initialState,

    reducers: {
        setPagination: (state, action: PayloadAction<{ key: string; page: number; pageSize: number }>) => {
            state.byKey[action.payload.key] = {
                ...state.byKey[action.payload.key],
                page: action.payload.page,
                pageSize: action.payload.pageSize,
            };
        },

        setSearch: (state, action: PayloadAction<{ key: string; search: string }>) => {
            const prev = state.byKey[action.payload.key] ?? DEFAULT_PAGINATION_STATE;
            state.byKey[action.payload.key] = {
                ...prev,
                search: action.payload.search,
            };
        },

        setSort: (state, action: PayloadAction<{ key: string; sortColumn?: string; sortDirection?: 'asc' | 'desc' }>) => {
            const prev = state.byKey[action.payload.key] ?? DEFAULT_PAGINATION_STATE;
            state.byKey[action.payload.key] = {
                ...prev,
                sortColumn: action.payload.sortColumn,
                sortDirection: action.payload.sortDirection,
            };
        },

        clearPagination: (state, action: PayloadAction<{ key: string }>) => {
            delete state.byKey[action.payload.key];
            bumpResetVersion(state, action.payload.key);
        },

        clearPaginationByRootRoute: (state, action: PayloadAction<{ rootRoute: string }>) => {
            const rootRoutePrefix = `/${action.payload.rootRoute}`;

            for (const key of Object.keys(state.byKey)) {
                if (
                    key.startsWith(`custom-table-pagination:${rootRoutePrefix}`) ||
                    key.startsWith(`paged-custom-table-pagination:${rootRoutePrefix}`)
                ) {
                    delete state.byKey[key];
                    bumpResetVersion(state, key);
                }
            }
        },

        clearPaginationByPath: (state, action: PayloadAction<{ pathname: string }>) => {
            const prefix = `custom-table-pagination:${action.payload.pathname}:`;
            for (const key of Object.keys(state.byKey)) {
                if (key.startsWith(prefix)) {
                    delete state.byKey[key];
                    bumpResetVersion(state, key);
                }
            }
        },

        setActiveRootRoute: (state, action: PayloadAction<{ rootRoute: string }>) => {
            state.activeRootRoute = action.payload.rootRoute;
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name] ?? initialState;

const pagination =
    (key: string) =>
    (reduxStore: AppState): TablePaginationState =>
        state(reduxStore).byKey[key] ?? DEFAULT_PAGINATION_STATE;

const activeRootRoute = (reduxStore: AppState): string | undefined => state(reduxStore).activeRootRoute;

const hasResettableStateForPath =
    (pathname: string) =>
    (reduxStore: AppState): boolean => {
        const prefix = `custom-table-pagination:${pathname}:`;
        return Object.entries(state(reduxStore).byKey).some(
            ([key, value]) =>
                key.startsWith(prefix) && ((value.page ?? 1) > 1 || (value.pageSize ?? 10) !== 10 || !!value.search || !!value.sortColumn),
        );
    };

const resetVersionForKey =
    (key: string) =>
    (reduxStore: AppState): number =>
        state(reduxStore).resetVersionByKey?.[key] ?? 0;

export const selectors = {
    state,
    pagination,
    activeRootRoute,
    hasResettableStateForPath,
    resetVersionForKey,
};

export const actions = slice.actions;

export default slice.reducer;
