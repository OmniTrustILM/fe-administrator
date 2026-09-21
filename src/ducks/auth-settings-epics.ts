import type { AppEpic } from 'ducks';
import { of } from 'rxjs';
import { catchError, filter, mergeMap, switchMap } from 'rxjs/operators';
import { extractError } from 'utils/net';
import { slice } from './auth-settings';
import { actions as alertActions } from './alerts';

import {
    transformAuthenticationSettingsDtoToModel,
    transformAuthenticationSettingsUpdateModelToDto,
    transformOAuth2ProviderSettingsDtoToModel,
    transformOAuth2ProviderSettingsUpdateModelToDto,
} from './transform/auth-settings';

import { actions as appRedirectActions } from './app-redirect';
import { actions as userInterfaceActions } from './user-interface';
import { LockWidgetNameEnum } from 'types/user-interface';

const getAuthenticationSettings: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getAuthenticationSettings.match),
        mergeMap(() =>
            deps.apiClients.settings.getAuthenticationSettings().pipe(
                mergeMap((settings) =>
                    of(
                        slice.actions.getAuthenticationSettingsSuccess({ settings: transformAuthenticationSettingsDtoToModel(settings) }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.AuthenticationSettings),
                    ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.getAuthenticationSettingsFailure({
                            error: extractError(err, 'Failed to get authentication settings'),
                        }),
                        userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.AuthenticationSettings),
                    ),
                ),
            ),
        ),
    );
};

const updateAuthenticationSettings: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.updateAuthenticationSettings.match),
        mergeMap((action) =>
            deps.apiClients.settings
                .updateAuthenticationSettings({
                    authenticationSettingsUpdateDto: transformAuthenticationSettingsUpdateModelToDto(
                        action.payload.authenticationSettingsUpdateModel,
                    ),
                })
                .pipe(
                    mergeMap(() =>
                        of(
                            slice.actions.updateAuthenticationSettingsSuccess(action.payload),
                            alertActions.success('Authentication settings updated successfully.'),
                        ),
                    ),
                    catchError((err) =>
                        of(
                            slice.actions.updateAuthenticationSettingsFailure({
                                error: extractError(err, 'Failed to update authentication settings'),
                            }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to update authentication settings' }),
                        ),
                    ),
                ),
        ),
    );
};

const getOAuth2ProviderSettings: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getOAuth2ProviderSettings.match),
        switchMap((action) =>
            deps.apiClients.settings.getOAuth2ProviderSettings({ providerName: action.payload.providerName }).pipe(
                mergeMap((provider) =>
                    of(
                        slice.actions.getOAuth2ProviderSettingsSuccess({
                            oauth2Provider: transformOAuth2ProviderSettingsDtoToModel(provider),
                        }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.AuthenticationProviderDetails),
                    ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.getOAuth2ProviderSettingsFailure({
                            error: extractError(err, 'Failed to get OAuth2 provider settings'),
                        }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to get OAuth2 provider settings' }),
                        userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.AuthenticationProviderDetails),
                    ),
                ),
            ),
        ),
    );
};
const updateOAuth2Provider: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.updateOAuth2Provider.match),
        mergeMap((action) =>
            deps.apiClients.settings
                .updateOAuth2ProviderSettings({
                    providerName: action.payload.providerName,
                    oAuth2ProviderSettingsUpdateDto: transformOAuth2ProviderSettingsUpdateModelToDto(
                        action.payload.oauth2ProviderSettingsUpdateModel,
                    ),
                })
                .pipe(
                    mergeMap(() =>
                        of(
                            slice.actions.updateOAuth2ProviderSuccess(),
                            alertActions.success('OAuth2 Provider settings has been updated successfully'),
                            appRedirectActions.redirect({ url: `../authenticationsettings/detail/${action.payload.providerName}` }),
                        ),
                    ),
                    catchError((err) =>
                        of(
                            slice.actions.updateOAuth2ProviderFailure({
                                error: extractError(err, 'Failed to update OAuth2 provider settings'),
                            }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to update OAuth2 provider settings' }),
                        ),
                    ),
                ),
        ),
    );
};
const createOAuth2Provider: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.createOAuth2Provider.match),
        mergeMap((action) =>
            deps.apiClients.settings
                .updateOAuth2ProviderSettings({
                    providerName: action.payload.providerName,
                    oAuth2ProviderSettingsUpdateDto: transformOAuth2ProviderSettingsUpdateModelToDto(
                        action.payload.oauth2ProviderSettingsUpdateModel,
                    ),
                })
                .pipe(
                    mergeMap(() =>
                        of(
                            slice.actions.createOAuth2ProviderSuccess(),
                            alertActions.success('OAuth2 Provider has been created'),
                            appRedirectActions.redirect({ url: `../authenticationsettings/detail/${action.payload.providerName}` }),
                        ),
                    ),
                    catchError((err) =>
                        of(
                            slice.actions.createOAuth2ProviderFailure({
                                error: extractError(err, 'Failed to create OAuth2 provider'),
                            }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to create OAuth2 provider' }),
                        ),
                    ),
                ),
        ),
    );
};
const removeOAuth2Provider: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.removeOAuth2Provider.match),
        mergeMap((action) =>
            deps.apiClients.settings.removeOAuth2Provider({ providerName: action.payload.providerName }).pipe(
                mergeMap(() =>
                    of(
                        slice.actions.removeOAuth2ProviderSuccess(),
                        alertActions.success('OAuth2 Provider has been removed'),
                        appRedirectActions.redirect({ url: `../authenticationsettings` }),
                    ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.getOAuth2ProviderSettingsFailure({
                            error: extractError(err, 'Failed to remove OAuth2 provider'),
                        }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to remove OAuth2 provider' }),
                    ),
                ),
            ),
        ),
    );
};

const epics = [
    getAuthenticationSettings,
    updateAuthenticationSettings,
    getOAuth2ProviderSettings,
    updateOAuth2Provider,
    createOAuth2Provider,
    removeOAuth2Provider,
];

export default epics;
