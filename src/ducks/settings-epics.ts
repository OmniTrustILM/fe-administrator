import type { UnknownAction } from '@reduxjs/toolkit';
import type { AppEpic } from 'ducks';
import { iif, of } from 'rxjs';
import { catchError, filter, mergeMap, switchMap } from 'rxjs/operators';

import { LockWidgetNameEnum } from 'types/user-interface';
import { extractError } from 'utils/net';
import { updateBackendUtilsClients } from '../api';
import { actions as alertActions } from './alerts';
import { actions as appRedirectActions } from './app-redirect';
import { slice } from './settings';
import {
    transformLoggingSettingsDtoToModel,
    transformLoggingSettingsModelToDto,
    transformSettingsPlatformDtoToModel,
} from './transform/settings';
import { actions as userInterfaceActions } from './user-interface';

const getPlatformSettings: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getPlatformSettings.match),
        switchMap(() =>
            deps.apiClients.settings.getPlatformSettings().pipe(
                switchMap((platformSettings) => {
                    const platformSettingsModel = transformSettingsPlatformDtoToModel(platformSettings);
                    updateBackendUtilsClients(platformSettingsModel.utils?.utilsServiceUrl);
                    return of(
                        slice.actions.getPlatformSettingsSuccess(platformSettingsModel),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.PlatformSettings),
                    );
                }),
                catchError((err) =>
                    of(
                        slice.actions.getPlatformSettingsFailure({ error: extractError(err, 'Failed to get platform settings') }),
                        userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.PlatformSettings),
                    ),
                ),
            ),
        ),
    );
};

const updatePlatformSettings: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.updatePlatformSettings.match),
        switchMap((action) =>
            deps.apiClients.settings.updatePlatformSettings({ platformSettingsUpdateDto: action.payload }).pipe(
                mergeMap(() => {
                    if (typeof action.payload.utils === 'object') {
                        updateBackendUtilsClients(action.payload.utils?.utilsServiceUrl);
                    }
                    const actions = [
                        slice.actions.updatePlatformSettingsSuccess(action.payload),
                        alertActions.success('Platform settings updated successfully.'),
                        appRedirectActions.redirect({ url: '../settings' }),
                    ].filter((el) => el) as UnknownAction[];
                    return of(...actions);
                }),
                catchError((err) =>
                    of(
                        slice.actions.updatePlatformSettingsFailure({ error: extractError(err, 'Failed to update platform settings') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to update platform settings' }),
                    ),
                ),
            ),
        ),
    );
};

const getEventsSettings: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getEventsSettings.match),
        switchMap(() =>
            deps.apiClients.settings.getEventsSettings().pipe(
                switchMap((eventsSettings) => {
                    return of(slice.actions.getEventsSettingsSuccess(eventsSettings));
                }),
                catchError((err) =>
                    of(
                        slice.actions.getEventsSettingsFailure({ error: extractError(err, 'Failed to get events settings') }),
                        userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.EventSettings),
                    ),
                ),
            ),
        ),
    );
};

const updateEventSettings: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.updateEventSettings.match),
        switchMap((action) =>
            deps.apiClients.settings.updateEventSettings({ eventSettingsDto: action.payload.eventSettings }).pipe(
                mergeMap(() =>
                    iif(
                        () => !!action.payload.redirect,
                        of(
                            slice.actions.updateEventSettingsSuccess(action.payload),
                            alertActions.success('Event settings updated successfully.'),
                            appRedirectActions.redirect({ url: action.payload.redirect! }),
                        ),
                        of(
                            slice.actions.updateEventSettingsSuccess(action.payload),
                            alertActions.success('Event settings updated successfully.'),
                        ),
                    ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.updateEventSettingsFailure({
                            error: extractError(err, 'Failed to update event settings'),
                        }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to update event settings' }),
                    ),
                ),
            ),
        ),
    );
};

const getLoggingSettings: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getLoggingSettings.match),
        mergeMap(() =>
            deps.apiClients.settings.getLoggingSettings().pipe(
                mergeMap((settings) =>
                    of(
                        slice.actions.getLoggingSettingsSuccess(transformLoggingSettingsDtoToModel(settings)),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.LoggingSettings),
                    ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.getLoggingSettingsFailure({
                            error: extractError(err, 'Failed to get logging settings'),
                        }),
                        userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.LoggingSettings),
                    ),
                ),
            ),
        ),
    );
};

const updateLoggingSettings: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.updateLoggingSettings.match),
        mergeMap((action) =>
            deps.apiClients.settings
                .updateLoggingSettings({
                    loggingSettingsDto: transformLoggingSettingsModelToDto(action.payload),
                })
                .pipe(
                    mergeMap(() =>
                        of(
                            slice.actions.updateLoggingSettingsSuccess(action.payload),
                            alertActions.success('Logging settings updated successfully.'),
                        ),
                    ),
                    catchError((err) =>
                        of(
                            slice.actions.updateLoggingSettingsFailure({
                                error: extractError(err, 'Failed to update logging settings'),
                            }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to update logging settings' }),
                        ),
                    ),
                ),
        ),
    );
};

const epics = [
    getPlatformSettings,
    updatePlatformSettings,
    getEventsSettings,
    updateEventSettings,
    getLoggingSettings,
    updateLoggingSettings,
];

export default epics;
