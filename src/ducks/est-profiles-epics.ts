import type { AppEpic } from 'ducks';
import { iif, of } from 'rxjs';
import { catchError, filter, map, mergeMap, switchMap } from 'rxjs/operators';
import { extractError } from 'utils/net';
import { actions as userInterfaceActions } from './user-interface';

import { LockWidgetNameEnum } from 'types/user-interface';
import { actions as alertActions } from './alerts';
import { actions as appRedirectActions } from './app-redirect';
import { slice } from './est-profiles';
import {
    transformEstProfileDetailDtoToModel,
    transformEstProfileDtoToModel,
    transformEstProfileEditRequestModelToDto,
    transformEstProfileRequestModelToDto,
} from './transform/est-profiles';

const listEstProfiles: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listEstProfiles.match),
        switchMap(() =>
            deps.apiClients.estProfiles.listEstProfiles().pipe(
                switchMap((estProfiles) =>
                    of(
                        slice.actions.listEstProfilesSuccess({
                            estProfileList: estProfiles.map(transformEstProfileDtoToModel),
                        }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfESTProfiles),
                    ),
                ),

                catchError((error) =>
                    of(
                        slice.actions.listEstProfilesFailure({ error: extractError(error, 'Failed to get EST Profiles list') }),
                        userInterfaceActions.insertWidgetLock(error, LockWidgetNameEnum.ListOfESTProfiles),
                    ),
                ),
            ),
        ),
    );
};

const getEstProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getEstProfile.match),
        switchMap((action) =>
            deps.apiClients.estProfiles.getEstProfile({ uuid: action.payload.uuid }).pipe(
                switchMap((estProfile) =>
                    of(
                        slice.actions.getEstProfileSuccess({ estProfile: transformEstProfileDetailDtoToModel(estProfile) }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ESTProfileDetails),
                    ),
                ),

                catchError((error) =>
                    of(
                        slice.actions.getEstProfileFailure({ error: extractError(error, 'Failed to get EST Profile details') }),
                        appRedirectActions.fetchError({ error, message: 'Failed to get EST Profile details' }),
                        userInterfaceActions.insertWidgetLock(error, LockWidgetNameEnum.ESTProfileDetails),
                    ),
                ),
            ),
        ),
    );
};

const createEstProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.createEstProfile.match),
        switchMap((action) =>
            deps.apiClients.estProfiles
                .createEstProfile({ estProfileRequestDto: transformEstProfileRequestModelToDto(action.payload) })
                .pipe(
                    switchMap((estProfile) =>
                        of(
                            slice.actions.createEstProfileSuccess(),
                            appRedirectActions.redirect({ url: `../estprofiles/detail/${estProfile.uuid}` }),
                        ),
                    ),

                    catchError((error) =>
                        of(
                            slice.actions.createEstProfileFailure({ error: extractError(error, 'Failed to create EST Profile') }),
                            appRedirectActions.fetchError({ error, message: 'Failed to create EST Profile' }),
                        ),
                    ),
                ),
        ),
    );
};

const updateEstProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.updateEstProfile.match),
        switchMap((action) =>
            deps.apiClients.estProfiles
                .updateEstProfile({
                    uuid: action.payload.uuid,
                    estProfileEditRequestDto: transformEstProfileEditRequestModelToDto(action.payload.updateEstRequest),
                })
                .pipe(
                    mergeMap((estProfile) =>
                        of(
                            slice.actions.updateEstProfileSuccess({ estProfile: transformEstProfileDetailDtoToModel(estProfile) }),
                            appRedirectActions.redirect({ url: `../../estprofiles/detail/${estProfile.uuid}` }),
                        ),
                    ),

                    catchError((error) =>
                        of(
                            slice.actions.updateEstProfileFailure({ error: extractError(error, 'Failed to update EST Profile') }),
                            appRedirectActions.fetchError({ error, message: 'Failed to update EST Profile' }),
                        ),
                    ),
                ),
        ),
    );
};

const updateEstProfileRaProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.updateEstProfileRaProfile.match),
        switchMap((action) =>
            deps.apiClients.estProfiles
                .updateEstProfileRaProfile({ uuid: action.payload.uuid, raProfileUuid: action.payload.raProfileUuid })
                .pipe(
                    switchMap(() =>
                        of(
                            slice.actions.updateEstProfileRaProfileSuccess({
                                uuid: action.payload.uuid,
                                raProfileUuid: action.payload.raProfileUuid,
                            }),
                            slice.actions.getEstProfile({ uuid: action.payload.uuid }),
                        ),
                    ),

                    catchError((error) =>
                        of(
                            slice.actions.updateEstProfileRaProfileFailure({
                                error: extractError(error, 'Failed to update EST Profile RA Profile'),
                            }),
                            appRedirectActions.fetchError({ error, message: 'Failed to update EST Profile RA Profile' }),
                        ),
                    ),
                ),
        ),
    );
};

const deleteEstProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.deleteEstProfile.match),
        switchMap((action) =>
            deps.apiClients.estProfiles.deleteEstProfile({ uuid: action.payload.uuid }).pipe(
                switchMap(() =>
                    of(
                        slice.actions.deleteEstProfileSuccess({ uuid: action.payload.uuid }),
                        appRedirectActions.redirect({ url: '../../estprofiles' }),
                    ),
                ),

                catchError((error) =>
                    of(
                        slice.actions.deleteEstProfileFailure({ error: extractError(error, 'Failed to delete EST Profile') }),
                        appRedirectActions.fetchError({ error, message: 'Failed to delete EST Profile' }),
                    ),
                ),
            ),
        ),
    );
};

const enableEstProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.enableEstProfile.match),
        switchMap((action) =>
            deps.apiClients.estProfiles.enableEstProfile({ uuid: action.payload.uuid }).pipe(
                map(() => slice.actions.enableEstProfileSuccess({ uuid: action.payload.uuid })),

                catchError((error) =>
                    of(
                        slice.actions.enableEstProfileFailure({ error: extractError(error, 'Failed to enable EST Profile') }),
                        appRedirectActions.fetchError({ error, message: 'Failed to enable EST Profile' }),
                    ),
                ),
            ),
        ),
    );
};

const disableEstProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.disableEstProfile.match),
        switchMap((action) =>
            deps.apiClients.estProfiles.disableEstProfile({ uuid: action.payload.uuid }).pipe(
                map(() => slice.actions.disableEstProfileSuccess({ uuid: action.payload.uuid })),

                catchError((error) =>
                    of(
                        slice.actions.disableEstProfileFailure({ error: extractError(error, 'Failed to disable EST Profile') }),
                        appRedirectActions.fetchError({ error, message: 'Failed to disable EST Profile' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkDeleteEstProfiles: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkDeleteEstProfiles.match),

        switchMap((action) =>
            deps.apiClients.estProfiles.bulkDeleteEstProfiles({ requestBody: action.payload.uuids }).pipe(
                mergeMap((errors) => of(slice.actions.bulkDeleteEstProfilesSuccess({ uuids: action.payload.uuids, errors }))),

                catchError((err) =>
                    of(
                        slice.actions.bulkDeleteEstProfilesFailure({ error: extractError(err, 'Failed to delete EST Profile') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to delete EST Profile' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkForceDeleteEstProfiles: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkForceDeleteEstProfiles.match),
        switchMap((action) =>
            deps.apiClients.estProfiles.forceDeleteEstProfiles({ requestBody: action.payload.uuids }).pipe(
                mergeMap((errors) => {
                    const failures = errors ?? [];
                    if (failures.length > 0) {
                        const failedUuids = new Set(failures.map((failure) => failure.uuid));
                        return of(
                            slice.actions.bulkForceDeleteEstProfilesSuccess({
                                uuids: action.payload.uuids.filter((uuid) => !failedUuids.has(uuid)),
                            }),
                            alertActions.error(
                                `Failed to delete EST Profiles: ${failures.map((failure) => `${failure.name}: ${failure.message}`).join('; ')}`,
                            ),
                        );
                    }
                    return iif(
                        () => !!action.payload.redirect,
                        of(
                            slice.actions.bulkForceDeleteEstProfilesSuccess({
                                uuids: action.payload.uuids,
                                redirect: action.payload.redirect,
                            }),
                            appRedirectActions.redirect({ url: action.payload.redirect! }),
                        ),
                        of(slice.actions.bulkForceDeleteEstProfilesSuccess({ uuids: action.payload.uuids })),
                    );
                }),

                catchError((error) =>
                    of(
                        slice.actions.bulkForceDeleteEstProfilesFailure({ error: extractError(error, 'Failed to delete EST Profiles') }),
                        appRedirectActions.fetchError({ error, message: 'Failed to delete EST Profiles' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkEnableEstProfiles: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkEnableEstProfiles.match),
        switchMap((action) =>
            deps.apiClients.estProfiles.bulkEnableEstProfiles({ requestBody: action.payload.uuids }).pipe(
                map(() => slice.actions.bulkEnableEstProfilesSuccess({ uuids: action.payload.uuids })),

                catchError((error) =>
                    of(
                        slice.actions.bulkEnableEstProfilesFailure({ error: extractError(error, 'Failed to enable EST Profile') }),
                        appRedirectActions.fetchError({ error, message: 'Failed to enable EST Profile' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkDisableEstProfiles: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkDisableEstProfiles.match),
        switchMap((action) =>
            deps.apiClients.estProfiles.bulkDisableEstProfiles({ requestBody: action.payload.uuids }).pipe(
                map(() => slice.actions.bulkDisableEstProfilesSuccess({ uuids: action.payload.uuids })),

                catchError((error) =>
                    of(
                        slice.actions.bulkDisableEstProfilesFailure({ error: extractError(error, 'Failed to disable EST Profiles') }),
                        appRedirectActions.fetchError({ error, message: 'Failed to disable EST Profiles' }),
                    ),
                ),
            ),
        ),
    );
};

const epics = [
    listEstProfiles,
    createEstProfile,
    getEstProfile,
    updateEstProfile,
    updateEstProfileRaProfile,
    deleteEstProfile,
    enableEstProfile,
    disableEstProfile,
    bulkDeleteEstProfiles,
    bulkForceDeleteEstProfiles,
    bulkEnableEstProfiles,
    bulkDisableEstProfiles,
];

export default epics;
