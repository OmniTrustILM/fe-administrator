import type { AppEpic } from 'ducks';
import { of } from 'rxjs';
import { catchError, concatMap, filter, switchMap } from 'rxjs/operators';

import type { CertificateRequestAttributesSettingsDto } from 'types/openapi';
import { extractError } from 'utils/net';
import { actions as alertActions } from './alerts';
import { actions as appRedirectActions } from './app-redirect';
import { slice } from './raProfileRequestAttributes';

const updateRaProfileRequestAttributes: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.updateRaProfileRequestAttributes.match),
        switchMap((action) =>
            deps.apiClients.raProfiles
                .updateRaProfileRequestAttributesConfiguration({
                    authorityUuid: action.payload.authorityUuid,
                    raProfileUuid: action.payload.raProfileUuid,
                    raProfileCertificateRequestAttributesUpdateDto: action.payload.data,
                })
                .pipe(
                    switchMap((raProfileDto) =>
                        of(
                            slice.actions.updateRaProfileRequestAttributesSuccess({ set: raProfileDto.certificateRequestAttributes }),
                            alertActions.success('Request attributes updated successfully.'),
                        ),
                    ),
                    catchError((err) =>
                        of(
                            slice.actions.updateRaProfileRequestAttributesFailure({
                                error: extractError(err, 'Failed to update request attributes'),
                            }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to update request attributes' }),
                        ),
                    ),
                ),
        ),
    );
};

const getPlatformDefaultRequestAttributes: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getPlatformDefaultRequestAttributes.match),
        switchMap(() =>
            deps.apiClients.settings.getPlatformSettings().pipe(
                switchMap((platformSettings) =>
                    of(slice.actions.getPlatformDefaultRequestAttributesSuccess(platformSettings.certificates?.requestAttributes ?? {})),
                ),
                catchError((err) =>
                    of(
                        slice.actions.getPlatformDefaultRequestAttributesFailure({
                            error: extractError(err, 'Failed to get platform default request attributes'),
                        }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to get platform default request attributes' }),
                    ),
                ),
            ),
        ),
    );
};

const updatePlatformDefaultRequestAttributes: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.updatePlatformDefaultRequestAttributes.match),
        // Read current platform settings first, then merge only the requestAttributes
        // sub-section so validation and other certificate settings are preserved.
        switchMap((action) =>
            deps.apiClients.settings.getPlatformSettings().pipe(
                concatMap((current) =>
                    deps.apiClients.settings
                        .updatePlatformSettings({
                            platformSettingsUpdateDto: {
                                ...current,
                                certificates: {
                                    ...current.certificates,
                                    // Spread the existing sub-object first so fields we don't own here
                                    // (e.g. externalCsrValidationStrict, owned by the strictness toggle) are preserved.
                                    requestAttributes: {
                                        ...current.certificates?.requestAttributes,
                                        ...action.payload.data,
                                    },
                                },
                            },
                        })
                        .pipe(
                            switchMap(() => {
                                const updated: CertificateRequestAttributesSettingsDto = {
                                    requestAttributes: action.payload.data.requestAttributes,
                                    externalCsrValidationStrict:
                                        action.payload.data.externalCsrValidationStrict ??
                                        current.certificates?.requestAttributes?.externalCsrValidationStrict,
                                };
                                return of(
                                    slice.actions.updatePlatformDefaultRequestAttributesSuccess(updated),
                                    alertActions.success('Platform default request attributes updated successfully.'),
                                );
                            }),
                        ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.updatePlatformDefaultRequestAttributesFailure({
                            error: extractError(err, 'Failed to update platform default request attributes'),
                        }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to update platform default request attributes' }),
                    ),
                ),
            ),
        ),
    );
};

const epics = [updateRaProfileRequestAttributes, getPlatformDefaultRequestAttributes, updatePlatformDefaultRequestAttributes];

export default epics;
