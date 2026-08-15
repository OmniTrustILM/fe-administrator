import type { AppEpic } from 'ducks';
import { of } from 'rxjs';
import { catchError, filter, mergeMap } from 'rxjs/operators';
import { featureFlags } from 'utils/feature-flags';
import { extractError } from 'utils/net';
import { actions as alertActions } from './alerts';
import { actions as appRedirectActions } from './app-redirect';
import { platformDefaultBranding, slice } from './branding';

const BRANDING_DISABLED = 'Branding is disabled for this instance.';

const getBranding: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getBranding.match),
        mergeMap(() => {
            // Nothing to read when the feature is off, and asking would 404 on a deployment that predates it.
            if (!featureFlags.isBrandingEnabled) {
                return of(slice.actions.getBrandingSuccess({ branding: {} }));
            }

            return deps.apiClients.settings.getBrandingSettings().pipe(
                mergeMap((branding) => of(slice.actions.getBrandingSuccess({ branding }))),
                catchError((err) =>
                    of(
                        slice.actions.getBrandingFailure({ error: extractError(err, 'Failed to get branding') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to get branding' }),
                    ),
                ),
            );
        }),
    );
};

/**
 * The anonymous read. Dispatched without a session, so a failure resolves to the platform default rather than
 * redirecting: this runs on the login page, where there is nowhere to redirect to and nobody to tell.
 */
const getPublicBranding: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getPublicBranding.match),
        mergeMap(() => {
            if (!featureFlags.isBrandingEnabled) {
                return of(slice.actions.getPublicBrandingSuccess({ branding: platformDefaultBranding }));
            }

            return deps.apiClients.branding.getBranding().pipe(
                mergeMap((branding) => of(slice.actions.getPublicBrandingSuccess({ branding }))),
                catchError((err) => of(slice.actions.getPublicBrandingFailure({ error: extractError(err, 'Failed to get branding') }))),
            );
        }),
    );
};

const updateBranding: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.updateBranding.match),
        mergeMap((action) => {
            if (!featureFlags.isBrandingEnabled) {
                return of(slice.actions.updateBrandingFailure({ error: BRANDING_DISABLED }));
            }

            return deps.apiClients.settings.updateBrandingSettings({ brandingSettingsUpdateDto: action.payload.branding }).pipe(
                mergeMap(() =>
                    of(
                        slice.actions.updateBrandingSuccess({ branding: action.payload.branding }),
                        alertActions.success('Branding updated successfully.'),
                    ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.updateBrandingFailure({ error: extractError(err, 'Failed to update branding') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to update branding' }),
                    ),
                ),
            );
        }),
    );
};

const resetBranding: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.resetBranding.match),
        mergeMap(() => {
            if (!featureFlags.isBrandingEnabled) {
                return of(slice.actions.resetBrandingFailure({ error: BRANDING_DISABLED }));
            }

            // An empty update clears every field, which is what makes reset one request rather than one per field.
            return deps.apiClients.settings.updateBrandingSettings({ brandingSettingsUpdateDto: {} }).pipe(
                mergeMap(() => of(slice.actions.resetBrandingSuccess(), alertActions.success('Branding reset to default.'))),
                catchError((err) =>
                    of(
                        slice.actions.resetBrandingFailure({ error: extractError(err, 'Failed to reset branding') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to reset branding' }),
                    ),
                ),
            );
        }),
    );
};

const epics = [getBranding, getPublicBranding, updateBranding, resetBranding];

export default epics;
