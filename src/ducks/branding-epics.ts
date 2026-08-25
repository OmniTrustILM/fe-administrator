import type { AppEpic, EpicDependencies } from 'ducks';
import { type Observable, of } from 'rxjs';
import { catchError, concatMap, filter, mergeMap, switchMap } from 'rxjs/operators';
import type { UnknownAction } from 'redux';
import type { BrandingSettingsUpdateModel } from 'types/branding';
import { featureFlags } from 'utils/feature-flags';
import { extractError } from 'utils/net';
import { actions as alertActions } from './alerts';
import { actions as appRedirectActions } from './app-redirect';
import { platformDefaultBranding, slice } from './branding';

const BRANDING_DISABLED = 'Branding is disabled for this instance.';

/** The write committed and only the read-back failed, which is not the same thing as the save having failed. */
const READ_BACK_FAILED = 'Branding was saved but could not be read back';

const getBranding: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getBranding.match),
        // switchMap, as the sibling settings epics do: a superseded read must not land after the one that replaced it.
        switchMap(() => {
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

const getPublicBranding: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getPublicBranding.match),
        switchMap(() => {
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

const runUpdate = (deps: EpicDependencies, branding: BrandingSettingsUpdateModel): Observable<UnknownAction> => {
    if (!featureFlags.isBrandingEnabled) {
        return of(slice.actions.updateBrandingFailure({ error: BRANDING_DISABLED }));
    }

    return deps.apiClients.settings.updateBrandingSettings({ brandingSettingsUpdateDto: branding }).pipe(
        // The write answers 204 and Core rewrites SVG logos before storing them, so the stored branding is read back
        // instead of echoing the request, which would leave the store holding markup Core deliberately removed.
        mergeMap(() =>
            deps.apiClients.settings.getBrandingSettings().pipe(
                mergeMap((stored) =>
                    of(slice.actions.updateBrandingSuccess({ branding: stored }), alertActions.success('Branding updated successfully.')),
                ),
                // Reporting this as a failed save would invite a retry that changes nothing, because the write landed.
                // The slice is what is wrong — it still holds the pre-write branding — so a fresh read repairs it.
                catchError((err) =>
                    of(
                        slice.actions.updateBrandingFailure({ error: extractError(err, READ_BACK_FAILED) }),
                        appRedirectActions.fetchError({ error: err, message: READ_BACK_FAILED }),
                        slice.actions.getBranding(),
                    ),
                ),
            ),
        ),
        catchError((err) =>
            of(
                slice.actions.updateBrandingFailure({ error: extractError(err, 'Failed to update branding') }),
                appRedirectActions.fetchError({ error: err, message: 'Failed to update branding' }),
            ),
        ),
    );
};

const runReset = (deps: EpicDependencies): Observable<UnknownAction> => {
    if (!featureFlags.isBrandingEnabled) {
        return of(slice.actions.resetBrandingFailure({ error: BRANDING_DISABLED }));
    }

    // An empty update clears every field, which is what makes reset one request rather than one per field. Nothing is
    // left stored afterwards, so there is no read-back: the reducer settles on an empty branding.
    return deps.apiClients.settings.updateBrandingSettings({ brandingSettingsUpdateDto: {} }).pipe(
        mergeMap(() => of(slice.actions.resetBrandingSuccess(), alertActions.success('Branding reset to default.'))),
        catchError((err) =>
            of(
                slice.actions.resetBrandingFailure({ error: extractError(err, 'Failed to reset branding') }),
                appRedirectActions.fetchError({ error: err, message: 'Failed to reset branding' }),
            ),
        ),
    );
};

const isBrandingWrite = (action: UnknownAction) => slice.actions.updateBranding.match(action) || slice.actions.resetBranding.match(action);

/**
 * Saves and resets share one pipeline so that concurrent writes commit in dispatch order: run separately and
 * concurrently, a save and a reset could reach Core in one order and settle the store in the other.
 */
const writeBranding: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(isBrandingWrite),
        concatMap((action) => (slice.actions.resetBranding.match(action) ? runReset(deps) : runUpdate(deps, action.payload.branding))),
    );
};

const epics = [getBranding, getPublicBranding, writeBranding];

export default epics;
