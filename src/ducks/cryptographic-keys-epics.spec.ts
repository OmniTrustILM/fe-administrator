import type { UnknownAction } from '@reduxjs/toolkit';
import type { AppState, EpicDependencies } from 'ducks';
import { combineEpics, StateObservable } from 'redux-observable';
import { EMPTY, type Observable, of, Subject, throwError } from 'rxjs';
import { describe, expect, onTestFinished, test, vi } from 'vitest';
import { KeyRequestType } from 'types/openapi';
import { actions as appRedirectActions } from 'ducks/app-redirect';
import { actions, initialState } from 'ducks/cryptographic-keys';
import epics from 'ducks/cryptographic-keys-epics';

vi.mock('../App', () => ({ store: { dispatch: vi.fn() } }));

type SupportedTypesRequest = ReturnType<typeof actions.listSupportedKeyRequestTypes>['payload'];

function aSupportedTypesRequest() {
    const request: SupportedTypesRequest = { tokenInstanceUuid: 'selected-token', tokenProfileUuid: 'selected-profile' };
    return {
        withProfileUuid(uuid: string) {
            request.tokenProfileUuid = uuid;
            return this;
        },
        build: () => request,
    };
}

function observeSupportedTypes(listSupportedKeyRequestTypes: (request: SupportedTypesRequest) => Observable<KeyRequestType[]>) {
    const action$ = new Subject<UnknownAction>();
    const state$ = new StateObservable<AppState>(EMPTY, { cryptographicKeys: initialState } as AppState);
    const dependencies = { apiClients: { tokenProfiles: { listSupportedKeyRequestTypes } } } as EpicDependencies;
    const emitted: UnknownAction[] = [];
    const subscription = combineEpics(...epics)(action$, state$, dependencies).subscribe((action) => emitted.push(action));
    onTestFinished(() => {
        subscription.unsubscribe();
        action$.complete();
    });
    return { dispatch: (action: UnknownAction) => action$.next(action), emitted };
}

describe('supported key request types epic', () => {
    test.each([{ supportedTypes: [KeyRequestType.Secret, KeyRequestType.KeyPair] }, { supportedTypes: [] }])(
        'listSupportedKeyRequestTypes_emitsReturnedTypes_$supportedTypes',
        ({ supportedTypes }) => {
            // given
            const request = aSupportedTypesRequest().build();
            const listSupportedKeyRequestTypes = vi.fn(() => of(supportedTypes));
            const { dispatch, emitted } = observeSupportedTypes(listSupportedKeyRequestTypes);

            // when
            dispatch(actions.listSupportedKeyRequestTypes(request));

            // then
            expect(listSupportedKeyRequestTypes).toHaveBeenCalledExactlyOnceWith(request);
            expect(emitted).toEqual([actions.listSupportedKeyRequestTypesSuccess(supportedTypes)]);
        },
    );

    test('listSupportedKeyRequestTypes_reportsApiFailureAndAllowsRetry', () => {
        // given
        const request = aSupportedTypesRequest().build();
        const apiError = new Error('Token profile unavailable');
        const recoveredTypes = [KeyRequestType.Secret];
        const listSupportedKeyRequestTypes = vi
            .fn()
            .mockReturnValueOnce(throwError(() => apiError))
            .mockReturnValueOnce(of(recoveredTypes));
        const { dispatch, emitted } = observeSupportedTypes(listSupportedKeyRequestTypes);

        // when
        dispatch(actions.listSupportedKeyRequestTypes(request));
        dispatch(actions.listSupportedKeyRequestTypes(request));

        // then
        expect(emitted).toEqual([
            actions.listSupportedKeyRequestTypesFailure(),
            appRedirectActions.fetchError({ error: apiError, message: 'Failed to get supported Key Types' }),
            actions.listSupportedKeyRequestTypesSuccess(recoveredTypes),
        ]);
    });

    test('listSupportedKeyRequestTypes_reportsSynchronousClientFailure', () => {
        // given
        const request = aSupportedTypesRequest().build();
        const clientError = new TypeError('listSupportedKeyRequestTypes is not a function');
        const { dispatch, emitted } = observeSupportedTypes(() => {
            throw clientError;
        });

        // when
        dispatch(actions.listSupportedKeyRequestTypes(request));

        // then
        expect(emitted).toEqual([
            actions.listSupportedKeyRequestTypesFailure(),
            appRedirectActions.fetchError({ error: clientError, message: 'Failed to get supported Key Types' }),
        ]);
    });

    test('listSupportedKeyRequestTypes_ignoresSupersededProfileResponse', () => {
        // given
        const previousRequest = aSupportedTypesRequest().withProfileUuid('previous-profile').build();
        const currentRequest = aSupportedTypesRequest().withProfileUuid('current-profile').build();
        const previousTypes = [KeyRequestType.Secret];
        const currentTypes = [KeyRequestType.KeyPair];
        const previousResponse = new Subject<KeyRequestType[]>();
        const listSupportedKeyRequestTypes = vi.fn().mockReturnValueOnce(previousResponse).mockReturnValueOnce(of(currentTypes));
        const { dispatch, emitted } = observeSupportedTypes(listSupportedKeyRequestTypes);

        // when
        dispatch(actions.listSupportedKeyRequestTypes(previousRequest));
        dispatch(actions.listSupportedKeyRequestTypes(currentRequest));
        previousResponse.next(previousTypes);
        previousResponse.complete();

        // then
        expect(listSupportedKeyRequestTypes.mock.calls).toEqual([[previousRequest], [currentRequest]]);
        expect(emitted).toEqual([actions.listSupportedKeyRequestTypesSuccess(currentTypes)]);
    });

    test.each([actions.clearSupportedKeyRequestTypes(), actions.resetState()])(
        '$type_cancelsPendingResponseAndAllowsAnotherRequest',
        (cancelAction) => {
            // given
            const request = aSupportedTypesRequest().build();
            const staleTypes = [KeyRequestType.Secret];
            const nextTypes = [KeyRequestType.KeyPair];
            const pendingResponse = new Subject<KeyRequestType[]>();
            const listSupportedKeyRequestTypes = vi.fn().mockReturnValueOnce(pendingResponse).mockReturnValueOnce(of(nextTypes));
            const { dispatch, emitted } = observeSupportedTypes(listSupportedKeyRequestTypes);
            dispatch(actions.listSupportedKeyRequestTypes(request));

            // when
            dispatch(cancelAction);
            pendingResponse.next(staleTypes);
            pendingResponse.error(new Error('Late error from cancelled request'));
            dispatch(actions.listSupportedKeyRequestTypes(request));

            // then
            expect(emitted).toEqual([actions.listSupportedKeyRequestTypesSuccess(nextTypes)]);
        },
    );

    test('listSupportedKeyRequestTypes_keepsPendingRequestForUnrelatedAction', () => {
        // given
        const request = aSupportedTypesRequest().build();
        const supportedTypes = [KeyRequestType.KeyPair];
        const response = new Subject<KeyRequestType[]>();
        const { dispatch, emitted } = observeSupportedTypes(() => response);
        dispatch(actions.listSupportedKeyRequestTypes(request));

        // when
        dispatch(actions.clearKeyAttributeDescriptors());
        response.next(supportedTypes);
        response.complete();

        // then
        expect(emitted).toEqual([actions.listSupportedKeyRequestTypesSuccess(supportedTypes)]);
    });
});
