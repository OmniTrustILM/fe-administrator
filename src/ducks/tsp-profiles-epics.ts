import type { AppEpic } from 'ducks';
import { of } from 'rxjs';
import { catchError, filter, map, mergeMap, switchMap } from 'rxjs/operators';
import { extractError } from 'utils/net';

import { LockWidgetNameEnum } from 'types/user-interface';
import { slice } from './tsp-profiles';
import { actions as appRedirectActions } from './app-redirect';
import { actions as alertActions } from './alerts';
import { actions as userInterfaceActions } from './user-interface';
import { actions as pagingActions } from './paging';
import { EntityType } from './filters';
import { transformSearchRequestModelToDto } from './transform/certificates';
import { store } from '../App';

const listTspProfiles: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listTspProfiles.match),
        switchMap((action) => {
            store.dispatch(pagingActions.list(EntityType.TSP_PROFILE));
            return deps.apiClients.tspProfiles
                .listTspProfiles({
                    searchRequestDto: action.payload ? transformSearchRequestModelToDto(action.payload) : {},
                })
                .pipe(
                    switchMap((response) =>
                        of(
                            slice.actions.listTspProfilesSuccess({ tspProfiles: response.items ?? [] }),
                            pagingActions.listSuccess({ entity: EntityType.TSP_PROFILE, totalItems: response.totalItems ?? 0 }),
                            userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfTspProfiles),
                        ),
                    ),
                    catchError((error) =>
                        of(
                            slice.actions.listTspProfilesFailure({ error: extractError(error, 'Failed to get TSP Profiles list') }),
                            pagingActions.listFailure(EntityType.TSP_PROFILE),
                            userInterfaceActions.insertWidgetLock(error, LockWidgetNameEnum.ListOfTspProfiles),
                        ),
                    ),
                );
        }),
    );
};

const getTspProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getTspProfile.match),
        switchMap((action) =>
            deps.apiClients.tspProfiles.getTspProfile({ uuid: action.payload.uuid }).pipe(
                switchMap((detail) =>
                    of(
                        slice.actions.getTspProfileSuccess({ tspProfile: detail }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.TspProfileDetails),
                    ),
                ),
                catchError((error) =>
                    of(
                        slice.actions.getTspProfileFailure({ error: extractError(error, 'Failed to get TSP Profile details') }),
                        appRedirectActions.fetchError({ error, message: 'Failed to get TSP Profile details' }),
                        userInterfaceActions.insertWidgetLock(error, LockWidgetNameEnum.TspProfileDetails),
                    ),
                ),
            ),
        ),
    );
};

const listTspProfileSearchableFields: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listTspProfileSearchableFields.match),
        switchMap(() =>
            deps.apiClients.tspProfiles.listTspProfileSearchableFields().pipe(
                switchMap((fields) => of(slice.actions.listTspProfileSearchableFieldsSuccess({ searchableFields: fields }))),
                catchError((error) =>
                    of(
                        slice.actions.listTspProfileSearchableFieldsFailure({
                            error: extractError(error, 'Failed to get TSP Profile searchable fields'),
                        }),
                    ),
                ),
            ),
        ),
    );
};

const createTspProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.createTspProfile.match),
        switchMap((action) =>
            deps.apiClients.tspProfiles.createTspProfile({ tspProfileRequestDto: action.payload.tspProfileRequestDto }).pipe(
                mergeMap((created) =>
                    of(
                        slice.actions.createTspProfileSuccess({ tspProfile: created }),
                        appRedirectActions.redirect({ url: `../tspprofiles/detail/${created.uuid}` }),
                    ),
                ),
                catchError((error) =>
                    of(
                        slice.actions.createTspProfileFailure({ error: extractError(error, 'Failed to create TSP Profile') }),
                        appRedirectActions.fetchError({ error, message: 'Failed to create TSP Profile' }),
                    ),
                ),
            ),
        ),
    );
};

const updateTspProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.updateTspProfile.match),
        switchMap((action) =>
            deps.apiClients.tspProfiles
                .updateTspProfile({ uuid: action.payload.uuid, tspProfileRequestDto: action.payload.tspProfileRequestDto })
                .pipe(
                    mergeMap((updated) =>
                        of(
                            slice.actions.updateTspProfileSuccess({ tspProfile: updated }),
                            appRedirectActions.redirect({ url: `../../tspprofiles/detail/${updated.uuid}` }),
                        ),
                    ),
                    catchError((error) =>
                        of(
                            slice.actions.updateTspProfileFailure({ error: extractError(error, 'Failed to update TSP Profile') }),
                            appRedirectActions.fetchError({ error, message: 'Failed to update TSP Profile' }),
                        ),
                    ),
                ),
        ),
    );
};

const deleteTspProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.deleteTspProfile.match),
        switchMap((action) =>
            deps.apiClients.tspProfiles.deleteTspProfile({ uuid: action.payload.uuid }).pipe(
                mergeMap(() =>
                    of(
                        slice.actions.deleteTspProfileSuccess({ uuid: action.payload.uuid }),
                        appRedirectActions.redirect({ url: '../../tspprofiles' }),
                    ),
                ),
                catchError((error) =>
                    of(
                        slice.actions.deleteTspProfileFailure({ error: extractError(error, 'Failed to delete TSP Profile') }),
                        appRedirectActions.fetchError({ error, message: 'Failed to delete TSP Profile' }),
                    ),
                ),
            ),
        ),
    );
};

const enableTspProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.enableTspProfile.match),
        switchMap((action) =>
            deps.apiClients.tspProfiles.enableTspProfile({ uuid: action.payload.uuid }).pipe(
                map(() => slice.actions.enableTspProfileSuccess({ uuid: action.payload.uuid })),
                catchError((error) =>
                    of(
                        slice.actions.enableTspProfileFailure({ error: extractError(error, 'Failed to enable TSP Profile') }),
                        appRedirectActions.fetchError({ error, message: 'Failed to enable TSP Profile' }),
                    ),
                ),
            ),
        ),
    );
};

const disableTspProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.disableTspProfile.match),
        switchMap((action) =>
            deps.apiClients.tspProfiles.disableTspProfile({ uuid: action.payload.uuid }).pipe(
                map(() => slice.actions.disableTspProfileSuccess({ uuid: action.payload.uuid })),
                catchError((error) =>
                    of(
                        slice.actions.disableTspProfileFailure({ error: extractError(error, 'Failed to disable TSP Profile') }),
                        appRedirectActions.fetchError({ error, message: 'Failed to disable TSP Profile' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkDeleteTspProfiles: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkDeleteTspProfiles.match),
        switchMap((action) =>
            deps.apiClients.tspProfiles.bulkDeleteTspProfiles({ requestBody: action.payload.uuids }).pipe(
                mergeMap((errors) => {
                    const successAction = slice.actions.bulkDeleteTspProfilesSuccess({ uuids: action.payload.uuids, errors });
                    return errors.length === 0
                        ? of(successAction, alertActions.success('Selected TSP Profiles successfully deleted.'))
                        : of(successAction);
                }),
                catchError((error) =>
                    of(
                        slice.actions.bulkDeleteTspProfilesFailure({ error: extractError(error, 'Failed to delete TSP Profiles') }),
                        appRedirectActions.fetchError({ error, message: 'Failed to delete TSP Profiles' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkEnableTspProfiles: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkEnableTspProfiles.match),
        switchMap((action) =>
            deps.apiClients.tspProfiles.bulkEnableTspProfiles({ requestBody: action.payload.uuids }).pipe(
                map(() => slice.actions.bulkEnableTspProfilesSuccess({ uuids: action.payload.uuids })),
                catchError((error) =>
                    of(
                        slice.actions.bulkEnableTspProfilesFailure({ error: extractError(error, 'Failed to enable TSP Profiles') }),
                        appRedirectActions.fetchError({ error, message: 'Failed to enable TSP Profiles' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkDisableTspProfiles: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkDisableTspProfiles.match),
        switchMap((action) =>
            deps.apiClients.tspProfiles.bulkDisableTspProfiles({ requestBody: action.payload.uuids }).pipe(
                map(() => slice.actions.bulkDisableTspProfilesSuccess({ uuids: action.payload.uuids })),
                catchError((error) =>
                    of(
                        slice.actions.bulkDisableTspProfilesFailure({ error: extractError(error, 'Failed to disable TSP Profiles') }),
                        appRedirectActions.fetchError({ error, message: 'Failed to disable TSP Profiles' }),
                    ),
                ),
            ),
        ),
    );
};

const epics = [
    listTspProfiles,
    getTspProfile,
    listTspProfileSearchableFields,
    createTspProfile,
    updateTspProfile,
    deleteTspProfile,
    enableTspProfile,
    disableTspProfile,
    bulkDeleteTspProfiles,
    bulkEnableTspProfiles,
    bulkDisableTspProfiles,
];

export default epics;
