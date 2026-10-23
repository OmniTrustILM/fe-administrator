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
import reducer, { actions, initialState, selectors } from './token-keys';
import tokenKeyEpics from './token-keys-epics';
import { describeOnboarding } from './transform/token-keys';

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
    keyUuid: 'key-1',
    keyName: 'signer',
};
const skipped: TokenKeyOnboardingResultDto = {
    keyPairMeta: keyPairMeta('handle-2'),
    onboarded: false,
    reason: 'Key signer already holds this key pair.',
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

    test('onboardTokenKeys reports onboarded keys as a success', async () => {
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
            alertActions.success('Onboarded 1 of 2 key pairs.'),
        ]);
    });

    test('onboardTokenKeys reports zero onboarded keys as information', async () => {
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
        expect(emitted).toEqual([actions.onboardTokenKeysSuccess({ results: [skipped] }), alertActions.info('Onboarded 0 of 1 key pair.')]);
    });

    test('onboardTokenKeys reports a refused onboarding', async () => {
        // given
        const onboardTokenKeys = vi.fn(() => throwError(() => new Error('refused')));
        const action = actions.onboardTokenKeys({ ...request, keys: [{ keyPairMeta: keyPairMeta('handle-1') }] });

        // when
        const emitted = await firstValueFrom(
            epicNamed(tokenKeyEpics, 'onboardTokenKeys')(of(action), of({}), {
                apiClients: { cryptographicKeys: { onboardTokenKeys } },
            }).pipe(toArray()),
        );

        // then
        expect(emitted[0]).toEqual(actions.onboardTokenKeysFailure({ error: 'Failed to onboard the keys. refused' }));
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

describe('describeOnboarding', () => {
    test('counts what was onboarded', () => {
        expect(describeOnboarding([onboarded, skipped])).toBe('Onboarded 1 of 2 key pairs.');
    });

    test('names a single key pair in the singular', () => {
        expect(describeOnboarding([onboarded])).toBe('Onboarded 1 of 1 key pair.');
    });
});
