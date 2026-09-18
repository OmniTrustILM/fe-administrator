import type { AppEpic } from 'ducks';
import { defer, iif, of } from 'rxjs';
import { catchError, filter, map, mergeMap, switchMap } from 'rxjs/operators';
import { extractError } from 'utils/net';
import { actions as alertActions } from './alerts';
import { actions as appRedirectActions } from './app-redirect';
import { slice } from './token-profiles';
import { actions as userInterfaceActions } from './user-interface';

import { LockWidgetNameEnum } from 'types/user-interface';
import {
    transformTokenProfileAddRequestModelToDto,
    transformTokenProfileDetailResponseDtoToModel,
    transformTokenProfileEditRequestModelToDto,
    transformTokenProfileResponseDtoToModel,
} from './transform/token-profiles';

const listTokenProfiles: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listTokenProfiles.match),
        switchMap((action) =>
            deps.apiClients.tokenProfiles.listTokenProfiles({ enabled: action.payload.enabled }).pipe(
                switchMap((list) =>
                    of(
                        slice.actions.listTokenProfilesSuccess({
                            tokenProfiles: list.map(transformTokenProfileResponseDtoToModel),
                        }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfTokenProfiles),
                    ),
                ),

                catchError((error) =>
                    of(
                        slice.actions.listTokenProfilesFailure({ error: extractError(error, 'Failed to get Token profiles list') }),
                        alertActions.error(extractError(error, 'Failed to get Token profiles list')),
                        userInterfaceActions.insertWidgetLock(error, LockWidgetNameEnum.ListOfTokenProfiles),
                    ),
                ),
            ),
        ),
    );
};

const getTokenProfileDetail: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getTokenProfileDetail.match),
        switchMap((action) =>
            deps.apiClients.tokenProfiles
                .getTokenProfile({ tokenInstanceUuid: action.payload.tokenInstanceUuid, uuid: action.payload.uuid })
                .pipe(
                    switchMap((profileDto) =>
                        of(
                            slice.actions.getTokenProfileDetailSuccess({
                                tokenProfile: transformTokenProfileDetailResponseDtoToModel(profileDto),
                            }),
                            ...(action.payload.skipWidgetLock
                                ? []
                                : [userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.TokenProfileDetails)]),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.getTokenProfileDetailFailure({ error: extractError(err, 'Failed to get Token Profile detail') }),
                            ...(action.payload.skipWidgetLock
                                ? []
                                : [userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.TokenProfileDetails)]),
                        ),
                    ),
                ),
        ),
    );
};

const createTokenProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.createTokenProfile.match),

        switchMap((action) =>
            deps.apiClients.tokenProfiles
                .createTokenProfile({
                    tokenInstanceUuid: action.payload.tokenInstanceUuid,
                    addTokenProfileRequestDto: transformTokenProfileAddRequestModelToDto(action.payload.tokenProfileAddRequest),
                })
                .pipe(
                    mergeMap((obj) =>
                        iif(
                            () => !!action.payload.usesGlobalModal,
                            of(
                                slice.actions.createTokenProfileSuccess({
                                    uuid: obj.uuid,
                                    tokenInstanceUuid: action.payload.tokenInstanceUuid,
                                }),
                                userInterfaceActions.hideGlobalModal(),
                                slice.actions.listTokenProfiles({ enabled: true }),
                                userInterfaceActions.setFormCallbackValue(action.payload.tokenProfileAddRequest.name),
                                userInterfaceActions.setInitiateFormCallback(true),
                            ),
                            of(
                                slice.actions.createTokenProfileSuccess({
                                    uuid: obj.uuid,
                                    tokenInstanceUuid: action.payload.tokenInstanceUuid,
                                }),
                                appRedirectActions.redirect({
                                    url: `../tokenprofiles/detail/${action.payload.tokenInstanceUuid}/${obj.uuid}`,
                                }),
                            ),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.createTokenProfileFailure({ error: extractError(err, 'Failed to create profile') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to create profile' }),
                        ),
                    ),
                ),
        ),
    );
};

const getSupportedTokenProfileKeyUsages: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getSupportedTokenProfileKeyUsages.match),
        switchMap((action) =>
            defer(() =>
                deps.apiClients.tokenProfiles.listSupportedTokenProfileKeyUsages({
                    tokenInstanceUuid: action.payload.tokenInstanceUuid,
                }),
            ).pipe(
                map((keyUsages) =>
                    slice.actions.getSupportedTokenProfileKeyUsagesSuccess({
                        tokenInstanceUuid: action.payload.tokenInstanceUuid,
                        keyUsages,
                    }),
                ),
                catchError((err) =>
                    of(
                        slice.actions.getSupportedTokenProfileKeyUsagesFailure({
                            tokenInstanceUuid: action.payload.tokenInstanceUuid,
                            error: extractError(err, 'Failed to get supported Token Profile Key Usages'),
                        }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to get supported Token Profile Key Usages' }),
                    ),
                ),
            ),
        ),
    );
};

const updateTokenProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.updateTokenProfile.match),
        switchMap((action) =>
            deps.apiClients.tokenProfiles
                .editTokenProfile({
                    uuid: action.payload.profileUuid,
                    tokenInstanceUuid: action.payload.tokenInstanceUuid,
                    editTokenProfileRequestDto: transformTokenProfileEditRequestModelToDto(action.payload.tokenProfileEditRequest),
                })
                .pipe(
                    mergeMap((tokenProfileDto) =>
                        iif(
                            () => !!action.payload.redirect,
                            of(
                                slice.actions.updateTokenProfileSuccess({
                                    tokenProfile: transformTokenProfileDetailResponseDtoToModel(tokenProfileDto),
                                    redirect: action.payload.redirect,
                                }),

                                appRedirectActions.redirect({ url: action.payload.redirect! }),
                            ),
                            iif(
                                () => !!action.payload.usesGlobalModal,
                                of(
                                    slice.actions.updateTokenProfileSuccess({
                                        tokenProfile: transformTokenProfileDetailResponseDtoToModel(tokenProfileDto),
                                        redirect: action.payload.redirect,
                                    }),
                                    userInterfaceActions.resetState(),
                                ),
                                of(
                                    slice.actions.updateTokenProfileSuccess({
                                        tokenProfile: transformTokenProfileDetailResponseDtoToModel(tokenProfileDto),
                                        redirect: action.payload.redirect,
                                    }),
                                ),
                            ),
                        ),
                    ),

                    catchError((err) =>
                        of(slice.actions.updateTokenProfileFailure({ error: extractError(err, 'Failed to update profile') })),
                    ),
                ),
        ),
    );
};

const enableTokenProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.enableTokenProfile.match),

        switchMap((action) =>
            deps.apiClients.tokenProfiles
                .enableTokenProfile({ tokenInstanceUuid: action.payload.tokenInstanceUuid, uuid: action.payload.uuid })
                .pipe(
                    map(() => slice.actions.enableTokenProfileSuccess({ uuid: action.payload.uuid })),

                    catchError((err) =>
                        of(
                            slice.actions.enableTokenProfileFailure({ error: extractError(err, 'Failed to enable profile') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to enable profile' }),
                        ),
                    ),
                ),
        ),
    );
};

const disableTokenProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.disableTokenProfile.match),

        switchMap((action) =>
            deps.apiClients.tokenProfiles
                .disableTokenProfile({ tokenInstanceUuid: action.payload.tokenInstanceUuid, uuid: action.payload.uuid })
                .pipe(
                    map(() => slice.actions.disableTokenProfileSuccess({ uuid: action.payload.uuid })),

                    catchError((err) =>
                        of(
                            slice.actions.enableTokenProfileFailure({ error: extractError(err, 'Failed to disable profile') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to disable profile' }),
                        ),
                    ),
                ),
        ),
    );
};

const deleteTokenProfile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.deleteTokenProfile.match),
        switchMap((action) =>
            deps.apiClients.tokenProfiles
                .deleteTokenProfile({ tokenInstanceUuid: action.payload.tokenInstanceUuid, uuid: action.payload.uuid })
                .pipe(
                    mergeMap(() =>
                        iif(
                            () => !!action.payload.redirect,
                            of(
                                slice.actions.deleteTokenProfileSuccess({ uuid: action.payload.uuid }),
                                appRedirectActions.redirect({ url: action.payload.redirect! }),
                            ),
                            of(slice.actions.deleteTokenProfileSuccess({ uuid: action.payload.uuid })),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.deleteTokenProfileFailure({ error: extractError(err, 'Failed to delete profile') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to delete profile' }),
                        ),
                    ),
                ),
        ),
    );
};

const bulkEnableProfiles: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkEnableTokenProfiles.match),
        switchMap((action) =>
            deps.apiClients.tokenProfiles.enableTokenProfiles({ requestBody: action.payload.uuids }).pipe(
                map(() => slice.actions.bulkEnableTokenProfilesSuccess({ uuids: action.payload.uuids })),

                catchError((err) =>
                    of(
                        slice.actions.bulkEnableTokenProfilesFailure({ error: extractError(err, 'Failed to enable profiles') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to enable profiles' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkDisableProfiles: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkDisableTokenProfiles.match),

        switchMap((action) =>
            deps.apiClients.tokenProfiles.disableTokenProfiles({ requestBody: action.payload.uuids }).pipe(
                map(() => slice.actions.bulkDisableTokenProfilesSuccess({ uuids: action.payload.uuids })),

                catchError((err) =>
                    of(
                        slice.actions.bulkDisableTokenProfilesFailure({ error: extractError(err, 'Failed to disable profiles') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to disable profiles' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkDeleteProfiles: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkDeleteTokenProfiles.match),
        switchMap((action) =>
            deps.apiClients.tokenProfiles.deleteTokenProfiles({ requestBody: action.payload.uuids }).pipe(
                mergeMap(() =>
                    of(
                        slice.actions.bulkDeleteTokenProfilesSuccess({ uuids: action.payload.uuids }),
                        alertActions.success('Selected profiles successfully deleted.'),
                    ),
                ),

                catchError((err) =>
                    of(
                        slice.actions.bulkDeleteTokenProfilesFailure({ error: extractError(err, 'Failed to delete profiles') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to delete profiles' }),
                    ),
                ),
            ),
        ),
    );
};

const updateKeyUsage: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.updateKeyUsage.match),

        switchMap((action) =>
            deps.apiClients.tokenProfiles
                .updateKeyUsages({
                    tokenInstanceUuid: action.payload.tokenInstanceUuid,
                    tokenProfileUuid: action.payload.uuid,
                    tokenProfileKeyUsageRequestDto: action.payload.usage,
                })
                .pipe(
                    map(() => slice.actions.updateKeyUsageSuccess({ uuid: action.payload.uuid, usage: action.payload.usage.usage })),

                    catchError((err) =>
                        of(
                            slice.actions.updateKeyUsageFailure({ error: extractError(err, 'Failed to enable profile') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to Update Key Usages' }),
                        ),
                    ),
                ),
        ),
    );
};

const bulkUpdateKeyUsage: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkUpdateKeyUsage.match),
        switchMap((action) =>
            deps.apiClients.tokenProfiles.updateKeysUsages({ bulkTokenProfileKeyUsageRequestDto: action.payload.usage }).pipe(
                map(() => slice.actions.bulkUpdateKeyUsageSuccess({})),

                catchError((err) =>
                    of(
                        slice.actions.bulkEnableTokenProfilesFailure({ error: extractError(err, 'Failed to enable profiles') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to enable profiles' }),
                    ),
                ),
            ),
        ),
    );
};

const epics = [
    listTokenProfiles,
    getTokenProfileDetail,
    createTokenProfile,
    getSupportedTokenProfileKeyUsages,
    updateTokenProfile,
    enableTokenProfile,
    disableTokenProfile,
    deleteTokenProfile,
    bulkEnableProfiles,
    bulkDisableProfiles,
    bulkDeleteProfiles,
    updateKeyUsage,
    bulkUpdateKeyUsage,
];

export { getSupportedTokenProfileKeyUsages, getTokenProfileDetail };
export default epics;
