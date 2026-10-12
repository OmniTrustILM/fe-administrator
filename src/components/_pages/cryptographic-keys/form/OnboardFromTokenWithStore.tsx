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
import { actions, slice as tokenProfileSlice, type State as TokenProfileState } from 'ducks/token-profiles';
import type { CustomAttributeModel } from 'types/attributes';
import type { TokenKeyListResponseDto, TokenKeyOnboardingResultDto, TokenProfileDto } from 'types/openapi';

type State = Omit<ReturnType<typeof testReducers>, 'customAttributes' | 'tokenprofiles'> & {
    customAttributes: CustomAttributeState;
    tokenprofiles: TokenProfileState;
};

function reducer(state: State | undefined, action: UnknownAction): State {
    return {
        ...testReducers(state, action),
        customAttributes: customAttributeSlice.reducer(state?.customAttributes, action),
        tokenprofiles: tokenProfileSlice.reducer(state?.tokenprofiles, action),
    };
}

export type OnboardFromTokenWithStoreProps = Readonly<{
    profiles: TokenProfileDto[];
    page: TokenKeyListResponseDto;
    /** Answers every listing after the first in place of the page. */
    relistedPage?: TokenKeyListResponseDto;
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

/** Mounts the tab against the real token profiles and custom attributes slices, answering their requests from the fixtures. */
export default function OnboardFromTokenWithStore({
    profiles,
    page,
    relistedPage,
    listingError,
    onboardingResults,
    keyCustomAttributes,
    onAction,
    onCancel = noop,
    onDone = noop,
}: OnboardFromTokenWithStoreProps) {
    const store = useMemo(() => {
        let listings = 0;
        const answer: Middleware = (api) => (next) => (action) => {
            const result = next(action);
            onAction?.(action as UnknownAction);
            const later = (answered: UnknownAction) => setTimeout(() => api.dispatch(answered), 0);
            if (actions.listKeyListableTokenProfiles.match(action)) {
                later(actions.listKeyListableTokenProfilesSuccess({ tokenProfiles: profiles }));
            } else if (actions.listTokenKeys.match(action)) {
                later(
                    listingError === undefined
                        ? actions.listTokenKeysSuccess({ tokenKeys: listings++ > 0 && relistedPage ? relistedPage : page })
                        : actions.listTokenKeysFailure({ error: listingError }),
                );
            } else if (actions.onboardTokenKeys.match(action) && onboardingResults) {
                later(actions.onboardTokenKeysSuccess({ results: onboardingResults }));
            } else if (customAttributeActions.listResourceCustomAttributes.match(action)) {
                later(customAttributeActions.listResourceCustomAttributesSuccess(keyCustomAttributes ?? []));
            }
            return result;
        };
        return configureStore({
            reducer,
            middleware: (getDefault) => getDefault({ serializableCheck: false }).concat(answer),
        });
    }, [profiles, page, relistedPage, listingError, onboardingResults, keyCustomAttributes, onAction]);

    return (
        <Provider store={store}>
            <MemoryRouter>
                <OnboardFromToken onCancel={onCancel} onDone={onDone} />
            </MemoryRouter>
        </Provider>
    );
}
