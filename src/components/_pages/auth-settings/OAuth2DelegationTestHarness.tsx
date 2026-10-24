import { configureStore, type Middleware } from '@reduxjs/toolkit';
import OAuth2ProviderForm from 'components/_pages/auth-settings/form';
import OAuth2ProviderDetail from 'components/_pages/auth-settings/detail';
import ThemeProvider from 'components/ThemeProvider';
import { initialState as authSettingsInitialState } from 'ducks/auth-settings';
import { testInitialState } from 'ducks/test-reducers';
import { useMemo, useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { OAuth2ProviderSettingsResponseDto } from 'types/openapi';

type Props = {
    mode: 'create' | 'edit' | 'detail';
    provider?: OAuth2ProviderSettingsResponseDto;
};

export default function OAuth2DelegationTestHarness({ mode, provider }: Readonly<Props>) {
    const [submission, setSubmission] = useState<unknown>();
    const store = useMemo(() => {
        const state = {
            ...testInitialState,
            authSettings: { ...authSettingsInitialState, oauth2Provider: provider },
        };
        const recordSubmission: Middleware = () => (next) => (action) => {
            const candidate = action as { type: string; payload?: unknown };
            if (candidate.type === 'authSettings/createOAuth2Provider' || candidate.type === 'authSettings/updateOAuth2Provider') {
                setSubmission(candidate.payload);
            }
            return next(action);
        };
        return configureStore({
            reducer: () => state,
            middleware: (defaults) => defaults({ serializableCheck: false }).concat(recordSubmission),
        });
    }, [provider]);

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
