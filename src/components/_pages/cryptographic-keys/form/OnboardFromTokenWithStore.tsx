import { configureStore, type Middleware, type UnknownAction } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import OnboardFromToken from 'components/_pages/cryptographic-keys/form/OnboardFromToken';
import {
    actions as customAttributeActions,
    slice as customAttributeSlice,
    type State as CustomAttributeState,
} from 'ducks/customAttributes';
import { testReducers } from 'ducks/test-reducers';
import { actions as tokenKeyActions, slice as tokenKeySlice, type State as TokenKeyState } from 'ducks/token-keys';
import { actions as tokenProfileActions, slice as tokenProfileSlice, type State as TokenProfileState } from 'ducks/token-profiles';
import type { CustomAttributeModel } from 'types/attributes';
import type { TokenKeyListResponseDto, TokenKeyOnboardingResultDto, TokenProfileDto } from 'types/openapi';

type State = Omit<ReturnType<typeof testReducers>, 'customAttributes' | 'tokenprofiles' | 'tokenKeys'> & {
    customAttributes: CustomAttributeState;
    tokenprofiles: TokenProfileState;
    tokenKeys: TokenKeyState;
};

function reducer(state: State | undefined, action: UnknownAction): State {
    return {
        ...testReducers(state, action),
        customAttributes: customAttributeSlice.reducer(state?.customAttributes, action),
        tokenprofiles: tokenProfileSlice.reducer(state?.tokenprofiles, action),
        tokenKeys: tokenKeySlice.reducer(state?.tokenKeys, action),
    };
}

export type OnboardFromTokenWithStoreProps = Readonly<{
    profiles: TokenProfileDto[];
    page: TokenKeyListResponseDto;
    /** Answers every listing after the first in place of the page. */
    relistedPage?: TokenKeyListResponseDto;
    /** Answers each listing of the second page. */
    secondPage?: TokenKeyListResponseDto;
    /** Fails each listing of key pairs with this error in place of the page. */
    listingError?: string;
    /** Leaves an onboarding in flight when absent. */
    onboardingResults?: TokenKeyOnboardingResultDto[];
    keyCustomAttributes?: CustomAttributeModel[];
    onAction?: (action: UnknownAction) => void;
    onCancel?: () => void;
    onDone?: () => void;
}>;

const noop = () => {};

/** Mounts the tab against the real token profiles, token keys and custom attributes slices, answering their requests from the fixtures. */
export default function OnboardFromTokenWithStore({
    profiles,
    page,
    relistedPage,
    secondPage,
    listingError,
    onboardingResults,
    keyCustomAttributes,
    onAction,
    onCancel = noop,
    onDone = noop,
}: OnboardFromTokenWithStoreProps) {
    const store = useMemo(() => {
        let listings = 0;
        const pageFor = (pageNumber: number) => {
            if (pageNumber === 2 && secondPage) return secondPage;
            return listings++ > 0 && relistedPage ? relistedPage : page;
        };
        const answer: Middleware = (api) => (next) => (action) => {
            const result = next(action);
            onAction?.(action as UnknownAction);
            const later = (answered: UnknownAction) => setTimeout(() => api.dispatch(answered), 0);
            if (tokenProfileActions.listKeyListableTokenProfiles.match(action)) {
                later(tokenProfileActions.listKeyListableTokenProfilesSuccess({ tokenProfiles: profiles }));
            } else if (tokenKeyActions.listTokenKeys.match(action)) {
                later(
                    listingError === undefined
                        ? tokenKeyActions.listTokenKeysSuccess({ tokenKeys: pageFor(action.payload.pageNumber) })
                        : tokenKeyActions.listTokenKeysFailure({ error: listingError }),
                );
            } else if (tokenKeyActions.onboardTokenKeys.match(action) && onboardingResults) {
                later(tokenKeyActions.onboardTokenKeysSuccess({ results: onboardingResults }));
            } else if (customAttributeActions.listResourceCustomAttributes.match(action)) {
                later(customAttributeActions.listResourceCustomAttributesSuccess(keyCustomAttributes ?? []));
            }
            return result;
        };
        return configureStore({
            reducer,
            middleware: (getDefault) => getDefault({ serializableCheck: false }).concat(answer),
        });
    }, [profiles, page, relistedPage, secondPage, listingError, onboardingResults, keyCustomAttributes, onAction]);

    return (
        <Provider store={store}>
            <MemoryRouter>
                <OnboardFromToken onCancel={onCancel} onDone={onDone} />
            </MemoryRouter>
        </Provider>
    );
}
