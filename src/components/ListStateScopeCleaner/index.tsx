import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';

import { actions as listFilterActions } from 'ducks/list-filters';
import { actions as listScopeActions, selectors as listScopeSelectors } from 'ducks/list-scopes';
import { actions as tablePaginationActions } from 'ducks/table-pagination';
import { actions as pagingActions } from 'ducks/paging';
import { actions as filterActions } from 'ducks/filters';
import { LIST_VIEW_SCOPES, isPathInScope, persistPaginationKey } from 'utils/listViewState';

const ListStateScopeCleaner = () => {
    const { pathname } = useLocation();
    const dispatch = useDispatch();
    const registeredScopes = useSelector(listScopeSelectors.registeredScopes);

    useEffect(() => {
        for (const [key, prefixes] of Object.entries(LIST_VIEW_SCOPES)) {
            if (isPathInScope(pathname, prefixes)) {
                continue;
            }

            dispatch(listFilterActions.clearListFilter({ key }));
            dispatch(tablePaginationActions.clearPagination({ key: persistPaginationKey(key) }));
        }

        for (const [entityKey, prefix] of Object.entries(registeredScopes)) {
            if (isPathInScope(pathname, [prefix])) {
                continue;
            }

            const entity = Number(entityKey);
            dispatch(pagingActions.resetPaging({ entity }));
            dispatch(filterActions.setCurrentFilters({ entity, currentFilters: [] }));
            dispatch(filterActions.setPreservedFilters({ entity, preservedFilters: [] }));
            dispatch(listScopeActions.unregisterScope({ entity }));
        }
    }, [pathname, registeredScopes, dispatch]);

    return null;
};

export default ListStateScopeCleaner;
