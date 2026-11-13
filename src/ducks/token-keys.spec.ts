import type { UnknownAction } from '@reduxjs/toolkit';
import type { AppState, EpicDependencies } from 'ducks';
import { combineEpics, StateObservable } from 'redux-observable';
import { EMPTY, firstValueFrom, type Observable, of, Subject, throwError } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { describe, expect, onTestFinished, test, vi } from 'vitest';
import {
    type OnboardTokenKeysResponseDto,
    KeyAlgorithm,
    type TokenKeyOnboardingResultDto,
    type RequestAttribute,
    type TokenKeyListResponseDto,
    TokenKeyStatus,
} from 'types/openapi';
import { keyPairMeta } from './__fixtures__/token-keys';
import { actions as alertActions } from './alerts';
import { actions as appRedirectActions } from './app-redirect';
import reducer, { actions, initialState, selectors } from './token-keys';
import tokenKeyEpics from './token-keys-epics';
import { summarizeOnboarding } from './transform/token-keys';

function epicNamed(epics: unknown[], name: string) {
    const epic = (epics as { name: string }[]).find((candidate) => candidate.name === name);
    if (!epic) throw new Error(`Epic "${name}" not found`);
    return epic as unknown as (action$: unknown, state$: unknown, deps: unknown) => ReturnType<typeof of>;
}

const page: TokenKeyListResponseDto = {
    items: [
        {
            keyPairMeta: keyPairMeta('handle-1'),
            label: 'signer',
            keyAlgorithm: KeyAlgorithm.Rsa,
            length: 2048,
            status: TokenKeyStatus.Onboardable,
            suggestedName: 'signer',
        },
    ],
    itemsPerPage: 10,
    pageNumber: 1,
    totalPages: 1,
    totalItems: 1,
};

const onboarded: TokenKeyOnboardingResultDto = {
    keyPairMeta: keyPairMeta('handle-1'),
    onboarded: true,
    intoExistingKey: false,
    keyUuid: 'key-1',
    keyName: 'signer',
};
const skipped: TokenKeyOnboardingResultDto = {
    keyPairMeta: keyPairMeta('handle-2'),
    onboarded: false,
    intoExistingKey: false,
    reason: 'Key signer already holds this key pair.',
};
const secondOnboarded: TokenKeyOnboardingResultDto = {
    keyPairMeta: keyPairMeta('handle-3'),
    onboarded: true,
    intoExistingKey: false,
    keyUuid: 'key-3',
    keyName: 'archiver',
};
const skippedWithoutReason: TokenKeyOnboardingResultDto = {
    keyPairMeta: keyPairMeta('handle-4'),
    onboarded: false,
    intoExistingKey: false,
};
const skippedForName: TokenKeyOnboardingResultDto = {
    keyPairMeta: keyPairMeta('handle-5'),
    onboarded: false,
    intoExistingKey: false,
    reason: 'A key named backup already exists.',
};

const request = { tokenInstanceUuid: 'token', tokenProfileUuid: 'profile' };

type TokenKeysClient = {
    onboardTokenKeys: () => Observable<OnboardTokenKeysResponseDto>;
    listTokenKeys: () => Observable<TokenKeyListResponseDto>;
};

function observeTokenKeys(cryptographicKeys: TokenKeysClient) {
    const action$ = new Subject<UnknownAction>();
    const state$ = new StateObservable<AppState>(EMPTY, { tokenKeys: initialState } as AppState);
    const dependencies = { apiClients: { cryptographicKeys } } as unknown as EpicDependencies;
    let state = initialState;
    const subscription = combineEpics(...tokenKeyEpics)(action$, state$, dependencies).subscribe((action) => {
        state = reducer(state, action);
    });
    onTestFinished(() => {
        subscription.unsubscribe();
        action$.complete();
    });
    return {
        dispatch: (action: UnknownAction) => {
            state = reducer(state, action);
            action$.next(action);
        },
        state: () => state,
    };
}

describe('token keys slice', () => {
    test('a listing is in progress until its page or its failure arrives', () => {
        // given
        const listing = reducer(
            { ...initialState, tokenKeys: page },
            actions.listTokenKeys({ ...request, pageNumber: 2, itemsPerPage: 10 }),
        );

        // when
        const listed = reducer(listing, actions.listTokenKeysSuccess({ tokenKeys: page }));
        const failed = reducer(listing, actions.listTokenKeysFailure({ error: 'down' }));

        // then
        expect(listing.isListingTokenKeys).toBe(true);
        expect(listed.isListingTokenKeys).toBe(false);
        expect(selectors.tokenKeys({ tokenKeys: listed } as never)).toEqual(page);
        expect(failed.isListingTokenKeys).toBe(false);
        expect(failed.tokenKeys).toBeUndefined();
    });

    test('a failed listing keeps its error until the next listing or clearing', () => {
        // given
        const listing = actions.listTokenKeys({ ...request, pageNumber: 1, itemsPerPage: 10 });
        const failed = reducer(reducer(initialState, listing), actions.listTokenKeysFailure({ error: 'down' }));

        // when
        const relisting = reducer(failed, listing);
        const cleared = reducer(failed, actions.clearTokenKeys());

        // then
        expect(selectors.tokenKeysError({ tokenKeys: failed } as never)).toBe('down');
        expect(relisting.tokenKeysError).toBeUndefined();
        expect(cleared.tokenKeysError).toBeUndefined();
    });

    test('an onboarding forgets the previous results and keeps the new ones', () => {
        // given
        const earlier = { ...initialState, tokenKeyOnboardingResults: [skipped] };

        // when
        const onboarding = reducer(earlier, actions.onboardTokenKeys({ ...request, keys: [{ keyPairMeta: keyPairMeta('handle-1') }] }));
        const done = reducer(onboarding, actions.onboardTokenKeysSuccess({ results: [onboarded] }));

        // then
        expect(onboarding.isOnboardingTokenKeys).toBe(true);
        expect(onboarding.tokenKeyOnboardingResults).toBeUndefined();
        expect(done.isOnboardingTokenKeys).toBe(false);
        expect(done.tokenKeyOnboardingResults).toEqual([onboarded]);
    });

    test('clearing forgets the page, the results and the pending onboarding', () => {
        // given
        const onboarding = reducer(
            { ...initialState, tokenKeys: page, tokenKeyOnboardingResults: [onboarded] },
            actions.onboardTokenKeys({ ...request, keys: [{ keyPairMeta: keyPairMeta('handle-1') }] }),
        );

        // when
        const cleared = reducer(onboarding, actions.clearTokenKeys());

        // then
        expect(cleared).toEqual(initialState);
    });

    test('an onboarding answered after clearing leaves the next profile untouched', () => {
        // given
        const lateOnboarding = new Subject<OnboardTokenKeysResponseDto>();
        const { dispatch, state } = observeTokenKeys({ onboardTokenKeys: () => lateOnboarding, listTokenKeys: () => of(page) });
        dispatch(actions.onboardTokenKeys({ ...request, keys: [{ keyPairMeta: keyPairMeta('handle-1') }] }));
        dispatch(actions.clearTokenKeys());
        dispatch(actions.listTokenKeys({ tokenInstanceUuid: 'token', tokenProfileUuid: 'other-profile', pageNumber: 1, itemsPerPage: 10 }));
        const listed = state();

        // when
        lateOnboarding.next({ results: [onboarded] });
        lateOnboarding.complete();

        // then
        expect(listed.tokenKeys).toEqual(page);
        expect(state()).toEqual(listed);
    });

    test.each([
        { answer: 'page', settle: (listing: Subject<TokenKeyListResponseDto>) => listing.next(page) },
        { answer: 'failure', settle: (listing: Subject<TokenKeyListResponseDto>) => listing.error(new Error('down')) },
    ])('a listing answered with a $answer after clearing leaves the state cleared', ({ settle }) => {
        // given
        const lateListing = new Subject<TokenKeyListResponseDto>();
        const { dispatch, state } = observeTokenKeys({ onboardTokenKeys: () => EMPTY, listTokenKeys: () => lateListing });
        dispatch(actions.listTokenKeys({ ...request, pageNumber: 1, itemsPerPage: 10 }));
        dispatch(actions.clearTokenKeys());
        const cleared = state();

        // when
        settle(lateListing);

        // then
        expect(cleared).toEqual(initialState);
        expect(state()).toEqual(cleared);
    });
});

describe('token key epics', () => {
    test('listTokenKeys asks Core for the page', async () => {
        // given
        const listTokenKeys = vi.fn(() => of(page));
        const action = actions.listTokenKeys({ ...request, pageNumber: 2, itemsPerPage: 5 });

        // when
        const emitted = await firstValueFrom(
            epicNamed(tokenKeyEpics, 'listTokenKeys')(of(action), of({}), {
                apiClients: { cryptographicKeys: { listTokenKeys } },
            }).pipe(toArray()),
        );

        // then
        expect(listTokenKeys).toHaveBeenCalledWith({ ...request, pageNumber: 2, itemsPerPage: 5 });
        expect(emitted).toEqual([actions.listTokenKeysSuccess({ tokenKeys: page })]);
    });

    test('listTokenKeys reports a failed listing', async () => {
        // given
        const failure = new Error('down');
        const action = actions.listTokenKeys({ ...request, pageNumber: 1, itemsPerPage: 10 });

        // when
        const emitted = await firstValueFrom(
            epicNamed(tokenKeyEpics, 'listTokenKeys')(of(action), of({}), {
                apiClients: { cryptographicKeys: { listTokenKeys: () => throwError(() => failure) } },
            }).pipe(toArray()),
        );

        // then
        expect(emitted).toEqual([
            actions.listTokenKeysFailure({ error: 'Failed to list the keys in the key storage. down' }),
            appRedirectActions.fetchError({ error: failure, message: 'Failed to list the keys in the key storage' }),
        ]);
    });

    test('onboardTokenKeys reports an onboarding of every key as a success', async () => {
        // given
        const onboardTokenKeys = vi.fn(() => of({ results: [onboarded] }));
        const action = actions.onboardTokenKeys({ ...request, keys: [{ keyPairMeta: keyPairMeta('handle-1') }] });

        // when
        const emitted = await firstValueFrom(
            epicNamed(tokenKeyEpics, 'onboardTokenKeys')(of(action), of({}), {
                apiClients: { cryptographicKeys: { onboardTokenKeys } },
            }).pipe(toArray()),
        );

        // then
        expect(emitted).toEqual([actions.onboardTokenKeysSuccess({ results: [onboarded] }), alertActions.success('Onboarded 1 key pair.')]);
    });

    test('onboardTokenKeys reports a batch with a refused key as an error', async () => {
        // given
        const onboardTokenKeys = vi.fn(() => of({ results: [onboarded, skipped] }));
        const action = actions.onboardTokenKeys({
            ...request,
            keys: [{ keyPairMeta: keyPairMeta('handle-1') }, { keyPairMeta: keyPairMeta('handle-2') }],
        });

        // when
        const emitted = await firstValueFrom(
            epicNamed(tokenKeyEpics, 'onboardTokenKeys')(of(action), of({}), {
                apiClients: { cryptographicKeys: { onboardTokenKeys } },
            }).pipe(toArray()),
        );

        // then
        expect(onboardTokenKeys).toHaveBeenCalledWith({
            ...request,
            onboardTokenKeysRequestDto: { keys: [{ keyPairMeta: keyPairMeta('handle-1') }, { keyPairMeta: keyPairMeta('handle-2') }] },
        });
        expect(emitted).toEqual([
            actions.onboardTokenKeysSuccess({ results: [onboarded, skipped] }),
            alertActions.error('Onboarded 1 of 2 key pairs and failed to onboard 1.\nKey signer already holds this key pair.'),
        ]);
    });

    test('onboardTokenKeys reports a refused key as an error with its reason', async () => {
        // given
        const onboardTokenKeys = vi.fn(() => of({ results: [skipped] }));
        const action = actions.onboardTokenKeys({ ...request, keys: [{ keyPairMeta: keyPairMeta('handle-2') }] });

        // when
        const emitted = await firstValueFrom(
            epicNamed(tokenKeyEpics, 'onboardTokenKeys')(of(action), of({}), {
                apiClients: { cryptographicKeys: { onboardTokenKeys } },
            }).pipe(toArray()),
        );

        // then
        expect(emitted).toEqual([
            actions.onboardTokenKeysSuccess({ results: [skipped] }),
            alertActions.error('Failed to onboard the key pair. Key signer already holds this key pair.'),
        ]);
    });

    test('onboardTokenKeys reports a refused onboarding', async () => {
        // given
        const refusal = new Error('refused');
        const onboardTokenKeys = vi.fn(() => throwError(() => refusal));
        const action = actions.onboardTokenKeys({ ...request, keys: [{ keyPairMeta: keyPairMeta('handle-1') }] });

        // when
        const emitted = await firstValueFrom(
            epicNamed(tokenKeyEpics, 'onboardTokenKeys')(of(action), of({}), {
                apiClients: { cryptographicKeys: { onboardTokenKeys } },
            }).pipe(toArray()),
        );

        // then
        expect(emitted).toEqual([
            actions.onboardTokenKeysFailure({ error: 'Failed to onboard the keys. refused' }),
            appRedirectActions.fetchError({ error: refusal, message: 'Failed to onboard the keys' }),
        ]);
    });

    test('onboardTokenKeys sends the custom attributes of the new keys', async () => {
        // given
        const onboardTokenKeys = vi.fn(() => of({ results: [onboarded] }));
        const customAttributes = [{ name: 'department', version: 'v3', uuid: 'department-uuid', content: [] }] as RequestAttribute[];
        const action = actions.onboardTokenKeys({ ...request, keys: [{ keyPairMeta: keyPairMeta('handle-1') }], customAttributes });

        // when
        await firstValueFrom(
            epicNamed(tokenKeyEpics, 'onboardTokenKeys')(of(action), of({}), {
                apiClients: { cryptographicKeys: { onboardTokenKeys } },
            }).pipe(toArray()),
        );

        // then
        expect(onboardTokenKeys).toHaveBeenCalledWith({
            ...request,
            onboardTokenKeysRequestDto: { keys: [{ keyPairMeta: keyPairMeta('handle-1') }], customAttributes },
        });
    });
});

describe('summarizeOnboarding', () => {
    test.each([
        { batch: 'its one key onboarded', results: [onboarded], expected: { allOnboarded: true, message: 'Onboarded 1 key pair.' } },
        {
            batch: 'every key onboarded',
            results: [onboarded, secondOnboarded],
            expected: { allOnboarded: true, message: 'Onboarded 2 key pairs.' },
        },
        {
            batch: 'its one key refused',
            results: [skipped],
            expected: { allOnboarded: false, message: 'Failed to onboard the key pair. Key signer already holds this key pair.' },
        },
        {
            batch: 'its one key refused without a reason',
            results: [skippedWithoutReason],
            expected: { allOnboarded: false, message: 'Failed to onboard the key pair.' },
        },
        {
            batch: 'every key refused',
            results: [skipped, skippedForName],
            expected: {
                allOnboarded: false,
                message: 'Failed to onboard 2 key pairs.\nKey signer already holds this key pair.\nA key named backup already exists.',
            },
        },
        {
            batch: 'every key refused, one without a reason',
            results: [skipped, skippedWithoutReason],
            expected: { allOnboarded: false, message: 'Failed to onboard 2 key pairs.\nKey signer already holds this key pair.' },
        },
        {
            batch: 'some keys refused',
            results: [onboarded, skipped, skippedForName],
            expected: {
                allOnboarded: false,
                message:
                    'Onboarded 1 of 3 key pairs and failed to onboard 2.\nKey signer already holds this key pair.\nA key named backup already exists.',
            },
        },
    ])('summarizes a batch with $batch', ({ results, expected }) => {
        expect(summarizeOnboarding(results)).toEqual(expected);
    });
});
