import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { initialState as authSettingsInitialState } from 'ducks/auth-settings';
import { testInitialState } from 'ducks/test-reducers';
import AuthenticationSettings from 'components/_pages/auth-settings';
import OAuth2ProviderDetail from './index';

export const JWK_SET_LOAD_FAILURES = {
    unavailable: {
        code: 'unavailable',
        label: 'Unavailable',
        description: 'The configured JWK Set endpoint could not be reached or returned an unsuccessful response',
    },
    invalid: {
        code: 'invalid',
        label: 'Invalid',
        description: 'The configured JWK Set or one of its keys is invalid',
    },
    tooLarge: {
        code: 'tooLarge',
        label: 'Too large',
        description: 'The configured JWK Set response exceeded the supported size limit',
    },
} as const;

export type JwkSetLoadFailureCode = keyof typeof JWK_SET_LOAD_FAILURES;

type Props = Readonly<{
    failure?: JwkSetLoadFailureCode;
}>;

function createStore(failure?: JwkSetLoadFailureCode) {
    const state = {
        ...testInitialState,
        authSettings: {
            ...authSettingsInitialState,
            authenticationSettings: {
                disableLocalhostUser: false,
                oauth2Providers: {
                    provider: {
                        name: 'provider',
                        issuerUrl: 'https://issuer.example',
                    },
                },
            },
            oauth2Provider: {
                name: 'provider',
                jwkSetKeys: [],
                jwkSetLoadFailure: failure,
            },
        },
        enums: {
            platformEnums: {
                JwkSetLoadFailure: JWK_SET_LOAD_FAILURES,
            },
        },
    };

    return configureStore({ reducer: () => state });
}

export function OAuth2ProviderDetailTestWrapper({ failure }: Props) {
    const store = createStore(failure);

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/authenticationsettings/detail/provider']}>
                <Routes>
                    <Route path="/authenticationsettings/detail/:providerName" element={<OAuth2ProviderDetail />} />
                </Routes>
            </MemoryRouter>
        </Provider>
    );
}

export function AuthenticationSettingsTestWrapper({ failure }: Props) {
    const store = createStore(failure);

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/authenticationsettings']}>
                <AuthenticationSettings />
            </MemoryRouter>
        </Provider>
    );
}
