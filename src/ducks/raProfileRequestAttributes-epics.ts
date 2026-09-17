import type { AppEpic } from 'ducks';
import { of } from 'rxjs';
import { catchError, concatMap, filter, switchMap } from 'rxjs/operators';

import type { CertificateRequestAttributesSettingsDto, PlatformSettingsUpdateDto } from 'types/openapi';
import { extractError } from 'utils/net';
import { actions as alertActions } from './alerts';
import { actions as appRedirectActions } from './app-redirect';
import { actions as raProfilesActions } from './ra-profiles';
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
                    switchMap((raProfileDto) => {
                        const { authorityUuid, raProfileUuid } = action.payload;
                        const set = raProfileDto.certificateRequestAttributes;
                        return of(
                            slice.actions.updateRaProfileRequestAttributesSuccess({ set }),
                            set
                                ? raProfilesActions.raProfileRequestAttributesUpdated({
                                      uuid: raProfileUuid,
                                      certificateRequestAttributes: set,
                                  })
                                : raProfilesActions.getRaProfileDetail({ authorityUuid, uuid: raProfileUuid }),
                            alertActions.success('Request attributes updated successfully.'),
                        );
                    }),
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
        // Read the current request-attributes group first, then send only that group back.
        //
        // Core's PUT works per section and, inside `certificates`, per group (`validation`,
        // `requestAttributes`, `registration`): whatever is left out of the body is left untouched,
        // whatever is present is stored as sent. So this sends exactly the group this slice owns.
        // Re-sending the read `utils` section would turn the CBOM sync defaults Core fills into
        // that GET into stored operator values, `branding` is not part of the update body at all,
        // and re-sending the other certificate groups would pin whatever Core fills into them one
        // day for the same reason. The general settings duck's update epic just forwards a
        // caller-built UpdateDto, so there is no shared write path to route through.
        switchMap((action) =>
            deps.apiClients.settings.getPlatformSettings().pipe(
                concatMap((current) => {
                    const platformSettingsUpdateDto: PlatformSettingsUpdateDto = {
                        certificates: {
                            // Spread the existing group first so fields we don't own here
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
