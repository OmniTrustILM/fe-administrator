import type { AppState } from 'ducks';
import { type EntityType, actions as filterActions, selectors as filterSelectors } from 'ducks/filters';
import { TriangleAlert } from 'lucide-react';
import { useCallback } from 'react';
import { useDispatch, useStore } from 'react-redux';
import type { Observable } from 'rxjs';
import type { ApiClients } from 'src/api';
import type { SearchFieldListModel } from 'types/certificate';

type GetAvailableFiltersApi = (apiClients: ApiClients) => Observable<Array<SearchFieldListModel>>;

/** Reads the field catalogue again, but only when its last read failed, so a plain refresh costs nothing extra. */
export function useRetryFailedCatalogue(entity: EntityType, getAvailableFiltersApi: GetAvailableFiltersApi | undefined) {
    const dispatch = useDispatch();
    const store = useStore<AppState>();

    return useCallback(() => {
        if (!getAvailableFiltersApi || !filterSelectors.hasFailedFilters(entity)(store.getState())) return;
        dispatch(filterActions.getAvailableFilters({ entity, getAvailableFiltersApi }));
    }, [dispatch, store, entity, getAvailableFiltersApi]);
}

/** Sits beside the widget's refresh button, which is what reads the catalogue again. */
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
