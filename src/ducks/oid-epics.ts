import type { AppEpic } from 'ducks';
import { slice } from 'ducks/oids';
import { catchError, defer, filter, groupBy, mergeMap, of, switchMap } from 'rxjs';
import { store } from '../App';
import { actions as pagingActions } from './paging';
import { EntityType } from './filters';
import { transformSearchRequestModelToDto } from 'ducks/transform/certificates';
import { actions as appRedirectActions } from './app-redirect';
import { extractError } from 'utils/net';
import type { OidCategory } from 'types/openapi';
import { FilterConditionOperator, FilterFieldSource } from 'types/openapi';
import type { SearchRequestModel } from 'types/certificate';

const listOIDs: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.listOIDs.match),
        switchMap((action) => {
            store.dispatch(pagingActions.list(EntityType.OID));
            return deps.apiClients.oids.listCustomOidEntries({ searchRequestDto: transformSearchRequestModelToDto(action.payload) }).pipe(
                mergeMap((oidResponse) =>
                    of(
                        slice.actions.listOIDsSuccess({ oids: oidResponse.oidEntries || [] }),
                        pagingActions.listSuccess({ entity: EntityType.OID, totalItems: oidResponse.totalItems || 0 }),
                    ),
                ),

                catchError((error) =>
                    of(slice.actions.listOIDsFailure({ error: error.message }), pagingActions.listFailure(EntityType.OID)),
                ),
            );
        }),
    );
};

const listOidsByCategory: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.listOidsByCategory.match),
        // Split by category so the two categories fetch concurrently, but collapse repeated
        // dispatches of the *same* category (e.g. a consumer page remount) with switchMap so a
        // slower older request can't resolve after — and overwrite — a newer one.
        groupBy((action) => action.payload.category),
        mergeMap((group$) =>
            group$.pipe(
                switchMap((action) => {
                    const category: OidCategory = action.payload.category;
                    const search: SearchRequestModel = {
                        filters: [
                            {
                                fieldSource: FilterFieldSource.Property,
                                fieldIdentifier: 'OID_ENTRY_CATEGORY',
                                condition: FilterConditionOperator.Equals,
                                value: [category],
                            },
                        ],
                        // A single 1000-entry page is treated as the cap for these categories; a category
                        // with more custom OIDs would truncate the dropdown (accepted for RDN/extension types).
                        itemsPerPage: 1000,
                        pageNumber: 1,
                    };
                    return deps.apiClients.oids.listCustomOidEntries({ searchRequestDto: transformSearchRequestModelToDto(search) }).pipe(
                        mergeMap((response) => of(slice.actions.listOidsByCategorySuccess({ category, oids: response.oidEntries || [] }))),
                        catchError((error) =>
                            of(
                                slice.actions.listOidsByCategoryFailure({
                                    category,
                                    error: extractError(error, 'Failed to load OID entries'),
                                }),
                            ),
                        ),
                    );
                }),
            ),
        ),
    );
};

const listSystemOids: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listSystemOids.match),
        // The built-in system OID list is immutable per release: fetch it once and serve the cache
        // thereafter. A prior failure leaves systemOidsLoaded false, so a later mount retries.
        filter(() => !state$?.value?.oids?.systemOidsLoaded),
        switchMap(() =>
            // `defer` so a synchronous throw from the client call (e.g. a stale bundle where
            // listSystemOidEntries is undefined) surfaces as an error notification the catchError below
            // handles — never an uncaught error, which would tear down the whole redux-observable root
            // epic and stall every other API call.
            // No category filter — fetch every category once; consumers slice it via systemOidsByCategory.
            defer(() => deps.apiClients.oids.listSystemOidEntries({})).pipe(
                mergeMap((oids) => of(slice.actions.listSystemOidsSuccess({ oids: oids ?? [] }))),
                catchError((error) =>
                    of(slice.actions.listSystemOidsFailure({ error: extractError(error, 'Failed to load system OID entries') })),
                ),
            ),
        ),
    );
};

const getOID: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getOID.match),
        switchMap((action) =>
            deps.apiClients.oids.getCustomOidEntry({ oid: action.payload.oid }).pipe(
                mergeMap((oid) => of(slice.actions.getOIDSuccess({ oid: oid }))),
                catchError((error) => of(slice.actions.getOIDFailure({ error: error.message }))),
            ),
        ),
    );
};

const createOID: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.createOID.match),
        switchMap((action) =>
            deps.apiClients.oids.createCustomOidEntry({ customOidEntryRequestDto: action.payload.oid }).pipe(
                mergeMap((oid) =>
                    of(
                        slice.actions.createOIDSuccess({ oid: oid }),
                        appRedirectActions.redirect({ url: `../custom-oids/detail/${oid.oid}` }),
                    ),
                ),
                catchError((error) =>
                    of(
                        slice.actions.createOIDFailure({ error: extractError(error, 'Failed to add Custom OID') }),
                        appRedirectActions.fetchError({ error, message: 'Failed to add Custom OID' }),
                    ),
                ),
            ),
        ),
    );
};

const updateOID: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.updateOID.match),
        switchMap((action) => {
            return deps.apiClients.oids
                .editCustomOidEntry({ oid: action.payload.oid, customOidEntryUpdateRequestDto: action.payload.data })
                .pipe(
                    mergeMap((oid) =>
                        of(
                            slice.actions.updateOIDSuccess({ oid: oid }),
                            appRedirectActions.redirect({ url: `../custom-oids/detail/${oid.oid}` }),
                        ),
                    ),
                    catchError((error) =>
                        of(
                            slice.actions.updateOIDFailure({ error: extractError(error, 'Failed to update Custom OID') }),
                            appRedirectActions.fetchError({ error, message: 'Failed to update Custom OID' }),
                        ),
                    ),
                );
        }),
    );
};

const deleteOID: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.deleteOID.match),
        switchMap((action) =>
            deps.apiClients.oids.deleteCustomOidEntry({ oid: action.payload.oid }).pipe(
                mergeMap(() =>
                    of(
                        slice.actions.deleteOIDSuccess({ oid: action.payload.oid }),
                        appRedirectActions.redirect({ url: `../../custom-oids` }),
                    ),
                ),
                catchError((error) =>
                    of(
                        slice.actions.deleteOIDFailure({ error: extractError(error, 'Failed to delete Custom OID') }),
                        appRedirectActions.fetchError({ error, message: 'Failed to delete Custom OID' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkDeleteOIDs: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkDeleteOIDs.match),
        switchMap((action) =>
            deps.apiClients.oids.bulkDeleteCustomOidEntry({ requestBody: action.payload.oids }).pipe(
                mergeMap(() => of(slice.actions.bulkDeleteOIDsSuccess({ oids: action.payload.oids }))),
                catchError((error) => of(slice.actions.bulkDeleteOIDsFailure({ error: error.message }))),
            ),
        ),
    );
};

const epics = [listOIDs, listOidsByCategory, listSystemOids, createOID, updateOID, deleteOID, getOID, bulkDeleteOIDs];

export default epics;
