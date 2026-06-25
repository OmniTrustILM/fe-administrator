import type { AppEpic } from 'ducks';
import { of } from 'rxjs';
import { catchError, filter, mergeMap, switchMap } from 'rxjs/operators';
import { extractError } from 'utils/net';

import { LockWidgetNameEnum } from 'types/user-interface';
import { slice } from './time-quality-configurations';
import { actions as appRedirectActions } from './app-redirect';
import { actions as alertActions } from './alerts';
import { actions as userInterfaceActions } from './user-interface';
import { actions as pagingActions } from './paging';
import { EntityType } from './filters';
import { transformSearchRequestModelToDto } from './transform/certificates';
import { store } from '../App';

const listTimeQualityConfigurations: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listTimeQualityConfigurations.match),
        switchMap((action) => {
            store.dispatch(pagingActions.list(EntityType.TIME_QUALITY_CONFIGURATION));
            return deps.apiClients.timeQualityConfigurations
                .listTimeQualityConfigurations({
                    searchRequestDto: action.payload ? transformSearchRequestModelToDto(action.payload) : {},
                })
                .pipe(
                    switchMap((response) =>
                        of(
                            slice.actions.listTimeQualityConfigurationsSuccess({
                                timeQualityConfigurations: response.items ?? [],
                            }),
                            pagingActions.listSuccess({
                                entity: EntityType.TIME_QUALITY_CONFIGURATION,
                                totalItems: response.totalItems ?? 0,
                            }),
                            userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfTimeQualityConfigurations),
                        ),
                    ),
                    catchError((error) =>
                        of(
                            slice.actions.listTimeQualityConfigurationsFailure({
                                error: extractError(error, 'Failed to get Time Quality Configurations list'),
                            }),
                            pagingActions.listFailure(EntityType.TIME_QUALITY_CONFIGURATION),
                            userInterfaceActions.insertWidgetLock(error, LockWidgetNameEnum.ListOfTimeQualityConfigurations),
                        ),
                    ),
                );
        }),
    );
};

const getTimeQualityConfiguration: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getTimeQualityConfiguration.match),
        switchMap((action) =>
            deps.apiClients.timeQualityConfigurations.getTimeQualityConfiguration({ uuid: action.payload.uuid }).pipe(
                switchMap((detail) =>
                    of(
                        slice.actions.getTimeQualityConfigurationSuccess({ timeQualityConfiguration: detail }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.TimeQualityConfigurationDetails),
                    ),
                ),
                catchError((error) =>
                    of(
                        slice.actions.getTimeQualityConfigurationFailure({
                            error: extractError(error, 'Failed to get Time Quality Configuration details'),
                        }),
                        appRedirectActions.fetchError({ error, message: 'Failed to get Time Quality Configuration details' }),
                        userInterfaceActions.insertWidgetLock(error, LockWidgetNameEnum.TimeQualityConfigurationDetails),
                    ),
                ),
            ),
        ),
    );
};

const listTimeQualityConfigurationSearchableFields: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listTimeQualityConfigurationSearchableFields.match),
        switchMap(() =>
            deps.apiClients.timeQualityConfigurations.listTimeQualityConfigurationSearchableFields().pipe(
                switchMap((fields) => of(slice.actions.listTimeQualityConfigurationSearchableFieldsSuccess({ searchableFields: fields }))),
                catchError((error) =>
                    of(
                        slice.actions.listTimeQualityConfigurationSearchableFieldsFailure({
                            error: extractError(error, 'Failed to get Time Quality Configuration searchable fields'),
                        }),
                    ),
                ),
            ),
        ),
    );
};

const createTimeQualityConfiguration: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.createTimeQualityConfiguration.match),
        switchMap((action) =>
            deps.apiClients.timeQualityConfigurations
                .createTimeQualityConfiguration({
                    timeQualityConfigurationRequestDto: action.payload.timeQualityConfigurationRequestDto,
                })
                .pipe(
                    mergeMap((created) =>
                        of(
                            slice.actions.createTimeQualityConfigurationSuccess({ timeQualityConfiguration: created }),
                            appRedirectActions.redirect({ url: `../timequalityconfigurations/detail/${created.uuid}` }),
                        ),
                    ),
                    catchError((error) =>
                        of(
                            slice.actions.createTimeQualityConfigurationFailure({
                                error: extractError(error, 'Failed to create Time Quality Configuration'),
                            }),
                            appRedirectActions.fetchError({ error, message: 'Failed to create Time Quality Configuration' }),
                        ),
                    ),
                ),
        ),
    );
};

const updateTimeQualityConfiguration: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.updateTimeQualityConfiguration.match),
        switchMap((action) =>
            deps.apiClients.timeQualityConfigurations
                .updateTimeQualityConfiguration({
                    uuid: action.payload.uuid,
                    timeQualityConfigurationRequestDto: action.payload.timeQualityConfigurationRequestDto,
                })
                .pipe(
                    mergeMap((updated) =>
                        of(
                            slice.actions.updateTimeQualityConfigurationSuccess({ timeQualityConfiguration: updated }),
                            appRedirectActions.redirect({ url: `../../timequalityconfigurations/detail/${updated.uuid}` }),
                        ),
                    ),
                    catchError((error) =>
                        of(
                            slice.actions.updateTimeQualityConfigurationFailure({
                                error: extractError(error, 'Failed to update Time Quality Configuration'),
                            }),
                            appRedirectActions.fetchError({ error, message: 'Failed to update Time Quality Configuration' }),
                        ),
                    ),
                ),
        ),
    );
};

const deleteTimeQualityConfiguration: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.deleteTimeQualityConfiguration.match),
        switchMap((action) =>
            deps.apiClients.timeQualityConfigurations.deleteTimeQualityConfiguration({ uuid: action.payload.uuid }).pipe(
                mergeMap(() =>
                    of(
                        slice.actions.deleteTimeQualityConfigurationSuccess({ uuid: action.payload.uuid }),
                        appRedirectActions.redirect({ url: '../../timequalityconfigurations' }),
                    ),
                ),
                catchError((error) =>
                    of(
                        slice.actions.deleteTimeQualityConfigurationFailure({
                            error: extractError(error, 'Failed to delete Time Quality Configuration'),
                        }),
                        appRedirectActions.fetchError({ error, message: 'Failed to delete Time Quality Configuration' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkDeleteTimeQualityConfigurations: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkDeleteTimeQualityConfigurations.match),
        switchMap((action) =>
            deps.apiClients.timeQualityConfigurations.bulkDeleteTimeQualityConfigurations({ requestBody: action.payload.uuids }).pipe(
                mergeMap((errors) => {
                    const successAction = slice.actions.bulkDeleteTimeQualityConfigurationsSuccess({
                        uuids: action.payload.uuids,
                        errors,
                    });
                    return errors.length === 0
                        ? of(successAction, alertActions.success('Selected Time Quality Configurations successfully deleted.'))
                        : of(successAction);
                }),
                catchError((error) =>
                    of(
                        slice.actions.bulkDeleteTimeQualityConfigurationsFailure({
                            error: extractError(error, 'Failed to delete Time Quality Configurations'),
                        }),
                        appRedirectActions.fetchError({ error, message: 'Failed to delete Time Quality Configurations' }),
                    ),
                ),
            ),
        ),
    );
};

const listAssociatedSigningProfiles: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listAssociatedSigningProfiles.match),
        switchMap((action) =>
            deps.apiClients.timeQualityConfigurations.listSigningProfilesForTimeQualityConfiguration({ uuid: action.payload.uuid }).pipe(
                switchMap((profiles) => of(slice.actions.listAssociatedSigningProfilesSuccess({ signingProfiles: profiles }))),
                catchError((error) =>
                    of(
                        slice.actions.listAssociatedSigningProfilesFailure({
                            error: extractError(error, 'Failed to get associated Signing Profiles'),
                        }),
                        appRedirectActions.fetchError({ error, message: 'Failed to get associated Signing Profiles' }),
                    ),
                ),
            ),
        ),
    );
};

const epics = [
    listTimeQualityConfigurations,
    getTimeQualityConfiguration,
    listTimeQualityConfigurationSearchableFields,
    createTimeQualityConfiguration,
    updateTimeQualityConfiguration,
    deleteTimeQualityConfiguration,
    bulkDeleteTimeQualityConfigurations,
    listAssociatedSigningProfiles,
];

export default epics;
