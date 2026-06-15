import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

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
};

const DEFAULT_PAGINATION_STATE: TablePaginationState = {
    page: 1,
    pageSize: 10,
};

export const initialState: State = {
    byKey: {},
    activeRootRoute: undefined,
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
        },

        clearPaginationByRootRoute: (state, action: PayloadAction<{ rootRoute: string }>) => {
            const rootRoutePrefix = `/${action.payload.rootRoute}`;

            state.byKey = Object.fromEntries(
                Object.entries(state.byKey).filter(
                    ([key]) =>
                        !key.startsWith(`custom-table-pagination:${rootRoutePrefix}`) &&
                        !key.startsWith(`paged-custom-table-pagination:${rootRoutePrefix}`),
                ),
            );
        },

        setActiveRootRoute: (state, action: PayloadAction<{ rootRoute: string }>) => {
            state.activeRootRoute = action.payload.rootRoute;
        },
    },
});

const state = (reduxStore: any): State => reduxStore?.[slice.name] ?? initialState;

const pagination =
    (key: string) =>
    (reduxStore: any): TablePaginationState =>
        state(reduxStore).byKey[key] ?? DEFAULT_PAGINATION_STATE;

const activeRootRoute = (reduxStore: any): string | undefined => state(reduxStore).activeRootRoute;

export const selectors = {
    state,
    pagination,
    activeRootRoute,
};

export const actions = slice.actions;

export default slice.reducer;
