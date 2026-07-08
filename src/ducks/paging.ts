import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { WritableDraft } from 'immer/dist/internal';
import type { AppState } from 'ducks';
import type { EntityType } from './filters';
import { selectors as filterSelectors } from './filters';

export type Paging = {
    entity: EntityType;
    paging: PagingObject;
};

type PagingObject = {
    totalItems: number;
    checkedRows: string[];
    isFetchingList: boolean;
    pageNumber: number;
    pageSize: number;
};

export type State = {
    pagings: Paging[];
};

const EMPTY_PAGING: PagingObject = {
    totalItems: 0,
    checkedRows: [],
    isFetchingList: false,
    pageNumber: 1,
    pageSize: 10,
};

const normalizePositiveInteger = (value: number, fallback: number) => {
    if (!Number.isFinite(value)) return fallback;

    const normalized = Math.floor(value);
    return normalized > 0 ? normalized : fallback;
};

export const initialState: State = {
    pagings: [],
};

const updatePagingState = (state: WritableDraft<State>, entity: EntityType, callback: (pagingObject: PagingObject) => void) => {
    const index = state.pagings.findIndex((f) => f.entity === entity);
    const paging = index === -1 ? { entity, paging: { ...EMPTY_PAGING } } : state.pagings[index];

    callback(paging.paging);

    state.pagings =
        index === -1 ? [...state.pagings, paging] : [...state.pagings.slice(0, index), paging, ...state.pagings.slice(index + 1)];
};

export const slice = createSlice({
    name: 'pagings',

    initialState,

    reducers: {
        list: (state, action: PayloadAction<EntityType>) => {
            updatePagingState(state, action.payload, (paging) => {
                paging.isFetchingList = true;
            });
        },

        listSuccess: (state, action: PayloadAction<{ entity: EntityType; totalItems: number }>) => {
            updatePagingState(state, action.payload.entity, (paging) => {
                paging.isFetchingList = false;
                paging.totalItems = action.payload.totalItems;
            });
        },

        listFailure: (state, action: PayloadAction<EntityType>) => {
            updatePagingState(state, action.payload, (paging) => {
                paging.isFetchingList = false;
            });
        },

        setCheckedRows: (state, action: PayloadAction<{ entity: EntityType; checkedRows: string[] }>) => {
            updatePagingState(state, action.payload.entity, (paging) => {
                paging.checkedRows = action.payload.checkedRows;
            });
        },

        setPagination: (state, action: PayloadAction<{ entity: EntityType; pageNumber: number; pageSize: number }>) => {
            updatePagingState(state, action.payload.entity, (paging) => {
                paging.pageNumber = normalizePositiveInteger(action.payload.pageNumber, paging.pageNumber || 1);
                paging.pageSize = normalizePositiveInteger(action.payload.pageSize, paging.pageSize || 10);
            });
        },

        resetPaging: (state, action: PayloadAction<{ entity: EntityType }>) => {
            updatePagingState(state, action.payload.entity, (paging) => {
                paging.pageNumber = EMPTY_PAGING.pageNumber;
                paging.pageSize = EMPTY_PAGING.pageSize;
                paging.checkedRows = [];
            });
        },
    },
});

const state = (reduxStore: any): State => reduxStore?.[slice.name];

const totalItems = (entity: EntityType) =>
    createSelector(state, (state) => (state?.pagings.find((f) => f.entity === entity)?.paging ?? EMPTY_PAGING).totalItems);
const checkedRows = (entity: EntityType) =>
    createSelector(state, (state) => (state?.pagings.find((f) => f.entity === entity)?.paging ?? EMPTY_PAGING).checkedRows);
const isFetchingList = (entity: EntityType) =>
    createSelector(state, (state) => (state?.pagings.find((f) => f.entity === entity)?.paging ?? EMPTY_PAGING).isFetchingList);
const pageNumber = (entity: EntityType) =>
    createSelector(state, (state) => (state?.pagings.find((f) => f.entity === entity)?.paging ?? EMPTY_PAGING).pageNumber);
const pageSize = (entity: EntityType) =>
    createSelector(state, (state) => (state?.pagings.find((f) => f.entity === entity)?.paging ?? EMPTY_PAGING).pageSize);

/**
 * Builds the params for a list request for `entity` from the current redux root state:
 * the active page, page size and filters. Callers pass the full `AppState` value
 * (e.g. `state.value` inside an epic).
 */
export function entityListParams(entity: EntityType, stateValue: AppState) {
    return {
        pageNumber: pageNumber(entity)(stateValue),
        itemsPerPage: pageSize(entity)(stateValue),
        filters: filterSelectors.currentFilters(entity)(stateValue),
    };
}

export type EntityListParams = ReturnType<typeof entityListParams>;

/**
 * Builds the list-request params to use after deleting `deletedCount` items, given the paging
 * snapshot captured *before* the delete. When the current page would become empty (e.g. all rows
 * on the last page were deleted), steps back to the new last page so the re-fetch lands on a page
 * that still has data.
 *
 * The `totalBeforeDelete` snapshot must be read when the delete is dispatched, not when it
 * resolves: `PagedList.onDeleteConfirmed` fires an immediate (pre-commit) re-fetch on delete whose
 * `listSuccess` can overwrite `totalItems` with the already-reduced count, so reading it later
 * would double-subtract `deletedCount` and step back too far.
 */
export function listParamsAfterDelete(paramsBeforeDelete: EntityListParams, totalBeforeDelete: number, deletedCount: number) {
    const { pageNumber: currentPage, itemsPerPage, filters } = paramsBeforeDelete;

    const totalAfterDelete = Math.max(0, totalBeforeDelete - deletedCount);
    const lastPageAfterDelete = Math.max(1, Math.ceil(totalAfterDelete / Math.max(1, itemsPerPage)));
    const pageNumber = Math.min(currentPage, lastPageAfterDelete);

    return { pageNumber, itemsPerPage, filters };
}

export const selectors = {
    state,

    totalItems,
    checkedRows,
    isFetchingList,
    pageNumber,
    pageSize,
};

export const actions = slice.actions;

export default slice.reducer;
