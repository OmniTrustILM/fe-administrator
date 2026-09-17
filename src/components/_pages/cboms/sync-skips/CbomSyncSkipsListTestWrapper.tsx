import { combineReducers, configureStore, type Middleware } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import cbomSyncSkipsReducer, { actions, initialState } from 'ducks/cbom-sync-skips';
import enumsReducer from 'ducks/enums';
import filtersReducer from 'ducks/filters';
import pagingReducer from 'ducks/paging';
import userInterfaceReducer from 'ducks/user-interface';
import type { CbomSyncSkipDto } from 'types/openapi';
import CbomSyncSkipsList from './index';

const reducer = combineReducers({
    pagings: pagingReducer,
    filters: filtersReducer,
    userInterface: userInterfaceReducer,
    enums: enumsReducer,
    cbomSyncSkips: cbomSyncSkipsReducer,
});

const stateLabels = {
    retrying: { code: 'retrying', label: 'Retrying' },
    permanentlySkipped: { code: 'permanentlySkipped', label: 'Permanently skipped' },
};

type Props = {
    /** The page the (stubbed) list request answers with. */
    items: CbomSyncSkipDto[];
};

/**
 * Browser-side harness for the component test: Playwright CT serializes what a spec passes to `mount`, so the store
 * has to be built here. Real reducers; the list epic is stood in for by a middleware that answers the page's own
 * mount-time request with `items`, and the retry epic by nothing at all, so a dispatched retry stays "in flight"
 * for the spec to observe.
 */
export default function CbomSyncSkipsListTestWrapper({ items }: Props) {
    const store = useMemo(() => {
        const page = { items, totalItems: items.length, pageNumber: 1, itemsPerPage: 10, totalPages: 1 };
        const answerListRequests: Middleware = (api) => (next) => (action) => {
            const result = next(action);
            if (actions.listSyncSkips.match(action)) {
                api.dispatch(actions.listSyncSkipsSuccess({ data: page }));
            }
            return result;
        };
        return configureStore({
            reducer,
            middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }).concat(answerListRequests),
            preloadedState: {
                enums: { platformEnums: { CbomSyncSkipState: stateLabels } },
                cbomSyncSkips: initialState,
            } as Partial<ReturnType<typeof reducer>> as ReturnType<typeof reducer>,
        });
    }, [items]);

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/cboms/sync-skips']}>
                <CbomSyncSkipsList />
            </MemoryRouter>
        </Provider>
    );
}
