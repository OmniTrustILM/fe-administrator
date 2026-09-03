import type { AppEpic, EpicDependencies } from 'ducks';
import { type Observable, of } from 'rxjs';
import { AjaxError } from 'rxjs/ajax';
import { catchError, concatMap, filter, mergeMap, switchMap } from 'rxjs/operators';
import type { UnknownAction } from 'redux';
import type { BrandingSettingsUpdateModel } from 'types/branding';
import { extractError } from 'utils/net';
import { actions as alertActions } from './alerts';
import { actions as appRedirectActions } from './app-redirect';
import { platformDefaultBranding, slice } from './branding';

/** The write committed and only the read-back failed, which is not the same thing as the save having failed. */
const READ_BACK_FAILED = 'Branding was saved but could not be read back';

/**
 * A Core that predates branding does not serve these endpoints at all. That is indistinguishable from an instance that
 * has simply never been branded, and neither is something an operator can act on, so both settle on the default rather
 * than surfacing an error. Only reads are treated this way: a *write* against a Core without branding is a real failure.
 */
const isBrandingAbsent = (err: unknown) => err instanceof AjaxError && err.status === 404;

const getBranding: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getBranding.match),
        // switchMap, as the sibling settings epics do: a superseded read must not land after the one that replaced it.
        switchMap(() =>
            deps.apiClients.settings.getBrandingSettings().pipe(
                mergeMap((branding) => of(slice.actions.getBrandingSuccess({ branding }))),
                catchError((err) =>
                    isBrandingAbsent(err)
                        ? of(slice.actions.getBrandingSuccess({ branding: {} }))
                        : of(
                              slice.actions.getBrandingFailure({ error: extractError(err, 'Failed to get branding') }),
                              appRedirectActions.fetchError({ error: err, message: 'Failed to get branding' }),
                          ),
                ),
            ),
        ),
    );
};

const getPublicBranding: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getPublicBranding.match),
        switchMap(() =>
            deps.apiClients.branding.getBranding().pipe(
                mergeMap((branding) => of(slice.actions.getPublicBrandingSuccess({ branding }))),
                catchError((err) =>
                    isBrandingAbsent(err)
                        ? of(slice.actions.getPublicBrandingSuccess({ branding: platformDefaultBranding }))
                        : of(slice.actions.getPublicBrandingFailure({ error: extractError(err, 'Failed to get branding') })),
                ),
            ),
        ),
    );
};

const runUpdate = (deps: EpicDependencies, branding: BrandingSettingsUpdateModel): Observable<UnknownAction> =>
    deps.apiClients.settings.updateBrandingSettings({ brandingSettingsUpdateDto: branding }).pipe(
        // The write answers 204 and Core rewrites SVG logos before storing them, so the stored branding is read back
        // instead of echoing the request, which would leave the store holding markup Core deliberately removed.
        mergeMap(() =>
            deps.apiClients.settings.getBrandingSettings().pipe(
                // The anonymous read is refreshed alongside the authenticated one, because it is the anonymous
                // response that the token layer and the theme resolve from. Without it a committed save would not
                // reach the page it was made on: the palette and the operator default would stay as they were until
                // the next full reload.
                mergeMap((stored) =>
                    of(
                        slice.actions.updateBrandingSuccess({ branding: stored }),
                        slice.actions.getPublicBranding(),
                        alertActions.success('Branding updated successfully.'),
                    ),
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

const runReset = (deps: EpicDependencies): Observable<UnknownAction> =>
    // An empty update clears every field, which is what makes reset one request rather than one per field. Nothing is
    // left stored afterwards, so there is no read-back: the reducer settles on an empty branding.
    deps.apiClients.settings.updateBrandingSettings({ brandingSettingsUpdateDto: {} }).pipe(
        // Refreshed for the same reason as a save: unbranding has to take effect on the page it was requested from.
        mergeMap(() =>
            of(slice.actions.resetBrandingSuccess(), slice.actions.getPublicBranding(), alertActions.success('Branding reset to default.')),
        ),
        catchError((err) =>
            of(
                slice.actions.resetBrandingFailure({ error: extractError(err, 'Failed to reset branding') }),
                appRedirectActions.fetchError({ error: err, message: 'Failed to reset branding' }),
            ),
        ),
    );

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
