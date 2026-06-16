import type { AppEpic } from 'ducks';
import { of } from 'rxjs';
import { catchError, filter, mergeMap, switchMap } from 'rxjs/operators';
import type { TspBasicCredentialDto } from 'types/openapi';
import { extractError } from 'utils/net';
import { actions as alertActions } from './alerts';
import { actions as appRedirectActions } from './app-redirect';
import { slice } from './tsp-profile-basic-credentials';

const listBasicCredentials: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listBasicCredentials.match),
        switchMap((action) =>
            deps.apiClients.tspProfileBasicCredentials
                .listTspProfileBasicCredentials({ tspProfileUuid: action.payload.tspProfileUuid })
                .pipe(
                    mergeMap((credentials: TspBasicCredentialDto[]) => of(slice.actions.listBasicCredentialsSuccess({ credentials }))),
                    catchError((err) =>
                        of(
                            slice.actions.listBasicCredentialsFailure({ error: extractError(err, 'Failed to get Basic credentials') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to get Basic credentials' }),
                        ),
                    ),
                ),
        ),
    );
};

const createBasicCredential: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.createBasicCredential.match),
        switchMap((action) =>
            deps.apiClients.tspProfileBasicCredentials
                .createTspProfileBasicCredential({
                    tspProfileUuid: action.payload.tspProfileUuid,
                    tspBasicCredentialCreateRequestDto: action.payload.request,
                })
                .pipe(
                    mergeMap((credential: TspBasicCredentialDto) =>
                        of(
                            slice.actions.createBasicCredentialSuccess({ credential }),
                            alertActions.success('Basic credential created successfully.'),
                        ),
                    ),
                    catchError((err) =>
                        of(slice.actions.createBasicCredentialFailure({ error: extractError(err, 'Failed to create Basic credential') })),
                    ),
                ),
        ),
    );
};

const updateBasicCredential: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.updateBasicCredential.match),
        switchMap((action) =>
            deps.apiClients.tspProfileBasicCredentials
                .updateTspProfileBasicCredential({
                    tspProfileUuid: action.payload.tspProfileUuid,
                    uuid: action.payload.uuid,
                    tspBasicCredentialUpdateRequestDto: action.payload.request,
                })
                .pipe(
                    mergeMap((credential: TspBasicCredentialDto) =>
                        of(
                            slice.actions.updateBasicCredentialSuccess({ credential }),
                            alertActions.success('Basic credential updated successfully.'),
                        ),
                    ),
                    catchError((err) =>
                        of(slice.actions.updateBasicCredentialFailure({ error: extractError(err, 'Failed to update Basic credential') })),
                    ),
                ),
        ),
    );
};

const deleteBasicCredential: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.deleteBasicCredential.match),
        mergeMap((action) =>
            deps.apiClients.tspProfileBasicCredentials
                .deleteTspProfileBasicCredential({
                    tspProfileUuid: action.payload.tspProfileUuid,
                    uuid: action.payload.uuid,
                })
                .pipe(
                    mergeMap(() =>
                        of(
                            slice.actions.deleteBasicCredentialSuccess({ uuid: action.payload.uuid }),
                            alertActions.success('Basic credential deleted successfully.'),
                        ),
                    ),
                    catchError((err) =>
                        of(slice.actions.deleteBasicCredentialFailure({ error: extractError(err, 'Failed to delete Basic credential') })),
                    ),
                ),
        ),
    );
};

const epics = [listBasicCredentials, createBasicCredential, updateBasicCredential, deleteBasicCredential];

export default epics;
