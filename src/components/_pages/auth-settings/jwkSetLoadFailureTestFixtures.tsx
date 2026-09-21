import { configureStore } from '@reduxjs/toolkit';
import JwkSetLoadFailureWarning from 'components/_pages/auth-settings/JwkSetLoadFailureWarning';
import AuthenticationSettings from 'components/_pages/auth-settings';
import { initialState as authSettingsInitialState } from 'ducks/auth-settings';
import { testInitialState } from 'ducks/test-reducers';
import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { EnumItemDto } from 'types/openapi';
import { JwkSetLoadFailure, PlatformEnum } from 'types/openapi';
import OAuth2ProviderDetail from './detail';

export const JWK_SET_LOAD_FAILURES = {
    [JwkSetLoadFailure.Unavailable]: {
        code: JwkSetLoadFailure.Unavailable,
        label: 'Unavailable',
        description: 'The configured JWK Set endpoint could not be reached or returned an unsuccessful response',
    },
    [JwkSetLoadFailure.Invalid]: {
        code: JwkSetLoadFailure.Invalid,
        label: 'Invalid',
        description: 'The configured JWK Set or one of its keys is invalid',
    },
    [JwkSetLoadFailure.TooLarge]: {
        code: JwkSetLoadFailure.TooLarge,
        label: 'Too large',
        description: 'The configured JWK Set response exceeded the supported size limit',
    },
} satisfies Record<JwkSetLoadFailure, EnumItemDto>;

type FailureProps = Readonly<{
    failure?: JwkSetLoadFailure;
}>;

type PageProps = FailureProps &
    Readonly<{
        providerName?: string;
        loadedProviderName?: string;
    }>;

function createStore(failure?: JwkSetLoadFailure, providerName = 'provider', loadedProviderName = providerName) {
    const state = {
        ...testInitialState,
        authSettings: {
            ...authSettingsInitialState,
            authenticationSettings: {
                disableLocalhostUser: false,
                oauth2Providers: {
                    [providerName]: {
                        name: providerName,
                        issuerUrl: 'https://issuer.example',
                    },
                },
            },
            oauth2Provider: {
                name: loadedProviderName,
                jwkSetKeys: [],
                jwkSetLoadFailure: failure,
            },
        },
        enums: {
            platformEnums: {
                [PlatformEnum.JwkSetLoadFailure]: JWK_SET_LOAD_FAILURES,
            },
        },
    };

    return configureStore({ reducer: () => state });
}

function useTestStore(failure?: JwkSetLoadFailure, providerName = 'provider', loadedProviderName = providerName) {
    return useMemo(() => createStore(failure, providerName, loadedProviderName), [failure, providerName, loadedProviderName]);
}

export function JwkSetLoadFailureWarningTestWrapper({ failure }: FailureProps) {
    const store = useTestStore(failure);

    return (
        <Provider store={store}>
            <JwkSetLoadFailureWarning failure={failure} />
        </Provider>
    );
}

export function OAuth2ProviderDetailTestWrapper({ failure, providerName = 'provider', loadedProviderName = providerName }: PageProps) {
    const store = useTestStore(failure, providerName, loadedProviderName);

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={[`/authenticationsettings/detail/${providerName}`]}>
                <Routes>
                    <Route path="/authenticationsettings/detail/:providerName" element={<OAuth2ProviderDetail />} />
                </Routes>
            </MemoryRouter>
        </Provider>
    );
}

export function AuthenticationSettingsTestWrapper({ failure, providerName = 'provider', loadedProviderName = providerName }: PageProps) {
    const store = useTestStore(failure, providerName, loadedProviderName);

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/authenticationsettings']}>
                <AuthenticationSettings />
            </MemoryRouter>
        </Provider>
    );
}
