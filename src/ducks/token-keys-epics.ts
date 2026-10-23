import type { AppEpic } from 'ducks';
import { defer, of } from 'rxjs';
import { catchError, filter, map, switchMap } from 'rxjs/operators';
import type { TokenKeyOnboardingResultDto } from 'types/openapi';
import { extractError } from 'utils/net';
import { actions as alertActions } from './alerts';
import { slice } from './token-keys';
import { describeOnboarding } from './transform/token-keys';

const listTokenKeys: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listTokenKeys.match),
        switchMap((action) =>
            defer(() => deps.apiClients.cryptographicKeys.listTokenKeys(action.payload)).pipe(
                map((tokenKeys) => slice.actions.listTokenKeysSuccess({ tokenKeys })),
                catchError((error) =>
                    of(
                        slice.actions.listTokenKeysFailure({ error: extractError(error, 'Failed to list the keys in the key storage') }),
                        alertActions.error(extractError(error, 'Failed to list the keys in the key storage')),
                    ),
                ),
            ),
        ),
    );
};

function onboardingAlert(results: TokenKeyOnboardingResultDto[]) {
    const outcome = describeOnboarding(results);
    return results.some((result) => result.onboarded) ? alertActions.success(outcome) : alertActions.info(outcome);
}

const onboardTokenKeys: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.onboardTokenKeys.match),
        switchMap((action) =>
            defer(() =>
                deps.apiClients.cryptographicKeys.onboardTokenKeys({
                    tokenInstanceUuid: action.payload.tokenInstanceUuid,
                    tokenProfileUuid: action.payload.tokenProfileUuid,
                    onboardTokenKeysRequestDto: { keys: action.payload.keys, customAttributes: action.payload.customAttributes },
                }),
            ).pipe(
                switchMap((response) =>
                    of(slice.actions.onboardTokenKeysSuccess({ results: response.results }), onboardingAlert(response.results)),
                ),
                catchError((error) =>
                    of(
                        slice.actions.onboardTokenKeysFailure({ error: extractError(error, 'Failed to onboard the keys') }),
                        alertActions.error(extractError(error, 'Failed to onboard the keys')),
                    ),
                ),
            ),
        ),
    );
};

const epics = [listTokenKeys, onboardTokenKeys];

export default epics;
