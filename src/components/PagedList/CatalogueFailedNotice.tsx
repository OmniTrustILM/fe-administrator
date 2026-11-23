import type { AppState } from 'ducks';
import { type EntityType, actions as filterActions, selectors as filterSelectors } from 'ducks/filters';
import { TriangleAlert } from 'lucide-react';
import { useCallback } from 'react';
import { useDispatch, useStore } from 'react-redux';
import type { Observable } from 'rxjs';
import type { ApiClients } from 'src/api';
import type { SearchFieldListModel } from 'types/certificate';

type GetAvailableFiltersApi = (apiClients: ApiClients) => Observable<Array<SearchFieldListModel>>;

/** Reads the field catalogue again when its last read failed and no read is already out. Reports whether it asked. */
export function useRetryFailedCatalogue(entity: EntityType, getAvailableFiltersApi: GetAvailableFiltersApi | undefined) {
    const dispatch = useDispatch();
    const store = useStore<AppState>();

    return useCallback(() => {
        const state = store.getState();
        // A read already out would be cancelled by the next one, so a second click restarts rather than retries.
        if (
            !getAvailableFiltersApi ||
            !filterSelectors.hasFailedFilters(entity)(state) ||
            filterSelectors.isFetchingFilters(entity)(state)
        ) {
            return false;
        }
        dispatch(filterActions.getAvailableFilters({ entity, getAvailableFiltersApi }));
        return true;
    }, [dispatch, store, entity, getAvailableFiltersApi]);
}

/** The host's refresh action is what reads the catalogue again. */
export default function CatalogueFailedNotice() {
    return (
        <span
            role="alert"
            className="relative ml-2 flex items-center gap-1.5 rounded-lg bg-warning-surface px-3 py-1.5 text-sm text-warning before:absolute before:top-1/2 before:-left-1 before:size-2 before:-translate-y-1/2 before:rotate-45 before:bg-warning-surface"
            data-testid="paged-list-catalogue-failed"
        >
            <TriangleAlert size={16} className="shrink-0" aria-hidden="true" />
            Fields failed to load, so columns and sorting are locked. Refresh to try again.
        </span>
    );
}
