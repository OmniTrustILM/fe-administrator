import { configureStore, type Middleware } from '@reduxjs/toolkit';
import OAuth2ProviderForm from 'components/_pages/auth-settings/form';
import OAuth2ProviderDetail from 'components/_pages/auth-settings/detail';
import ThemeProvider from 'components/ThemeProvider';
import authSettingsReducer, { actions as authSettingsActions, initialState as authSettingsInitialState } from 'ducks/auth-settings';
import { testInitialState } from 'ducks/test-reducers';
import { useMemo, useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { OAuth2ProviderSettingsResponseDto } from 'types/openapi';

type StoredProvider = {
    provider: OAuth2ProviderSettingsResponseDto;
    eTag: string;
};

type Props = {
    mode: 'create' | 'edit' | 'detail';
    provider?: OAuth2ProviderSettingsResponseDto;
    eTag?: string;
    /** A save by someone else after the form loaded; an update without its tag is refused. */
    concurrentChange?: StoredProvider;
};

export default function OAuth2DelegationTestHarness({ mode, provider, eTag, concurrentChange }: Readonly<Props>) {
    const [submission, setSubmission] = useState<unknown>();
    const store = useMemo(() => {
        let stored = provider && { provider, eTag };
        let isChangedConcurrently = false;
        const initialState = {
            ...testInitialState,
            authSettings: { ...authSettingsInitialState, oauth2Provider: provider, oauth2ProviderETag: eTag },
        };
        const recordSubmission: Middleware = () => (next) => (action) => {
            const candidate = action as { type: string; payload?: unknown };
            if (candidate.type === 'authSettings/createOAuth2Provider' || candidate.type === 'authSettings/updateOAuth2Provider') {
                setSubmission(candidate.payload);
            }
            return next(action);
        };
        const answerProviderRequests: Middleware = (api) => (next) => (action) => {
            const result = next(action);
            if (authSettingsActions.getOAuth2ProviderSettings.match(action) && stored) {
                if (isChangedConcurrently && concurrentChange) stored = concurrentChange;
                api.dispatch(authSettingsActions.getOAuth2ProviderSettingsSuccess({ oauth2Provider: stored.provider, eTag: stored.eTag }));
            }
            if (
                authSettingsActions.updateOAuth2Provider.match(action) &&
                concurrentChange &&
                action.payload.ifMatch !== concurrentChange.eTag
            ) {
                isChangedConcurrently = true;
                api.dispatch(authSettingsActions.updateOAuth2ProviderFailure({ error: 'changed', conflict: true }));
            }
            return result;
        };
        return configureStore({
            reducer: (state = initialState, action) => ({ ...state, authSettings: authSettingsReducer(state.authSettings, action) }),
            middleware: (defaults) => defaults({ serializableCheck: false }).concat(recordSubmission, answerProviderRequests),
        });
    }, [provider, eTag, concurrentChange]);

    return (
        <Provider store={store}>
            <ThemeProvider>
                <MemoryRouter initialEntries={['/authenticationsettings/detail/provider']}>
                    {mode === 'detail' ? (
                        <Routes>
                            <Route path="/authenticationsettings/detail/:providerName" element={<OAuth2ProviderDetail />} />
                        </Routes>
                    ) : (
                        <OAuth2ProviderForm providerName={mode === 'edit' ? provider?.name : undefined} onCancel={() => {}} />
                    )}
                    <output data-testid="provider-submission">{JSON.stringify(submission)}</output>
                </MemoryRouter>
            </ThemeProvider>
        </Provider>
    );
}
