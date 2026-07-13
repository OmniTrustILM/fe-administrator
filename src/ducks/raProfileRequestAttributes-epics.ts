import type { AppEpic } from 'ducks';
import { of } from 'rxjs';
import { catchError, concatMap, filter, switchMap } from 'rxjs/operators';

import type { CertificateRequestAttributesSettingsDto, PlatformSettingsUpdateDto } from 'types/openapi';
import { extractError } from 'utils/net';
import { actions as alertActions } from './alerts';
import { actions as appRedirectActions } from './app-redirect';
import { slice } from './raProfileRequestAttributes';

export const updateRaProfileRequestAttributes: AppEpic = (action$, state$, deps) => {
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

export const getPlatformDefaultRequestAttributes: AppEpic = (action$, state$, deps) => {
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

export const updatePlatformDefaultRequestAttributes: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.updatePlatformDefaultRequestAttributes.match),
        // Read current platform settings first, then merge only the requestAttributes
        // sub-section so validation and other certificate settings are preserved.
        //
        // This re-sends the read DTO as an update, relying on PlatformSettingsDto being
        // structurally assignable to PlatformSettingsUpdateDto (true field-for-field under Core
        // spec 2.18.1). The explicit `PlatformSettingsUpdateDto` annotation below pins that
        // assumption at compile time: if a future spec bump diverges the read/update shapes, the
        // assignment stops compiling and this mapping must be revisited rather than silently
        // shipping stale/read-only fields or dropping new required ones. This slice deliberately
        // owns only the request-attributes sub-section; the general settings duck's update epic
        // likewise just forwards a caller-built UpdateDto, so there is no shared write path to route
        // through — only a per-save read-modify-write here.
        switchMap((action) =>
            deps.apiClients.settings.getPlatformSettings().pipe(
                concatMap((current) => {
                    const platformSettingsUpdateDto: PlatformSettingsUpdateDto = {
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
                    };
                    return deps.apiClients.settings.updatePlatformSettings({ platformSettingsUpdateDto }).pipe(
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
                    );
                }),
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
