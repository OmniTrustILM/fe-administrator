import { configureStore, type Middleware } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import { actions as secretsActions } from 'ducks/secrets';
import { testReducers, testInitialState } from 'ducks/test-reducers';

import type { AttributeDescriptorModel, AttributeRequestModel } from 'types/attributes';
import type { SecretDetailDto, SecretType, VaultProfileDto } from 'types/openapi';

import { SyncVaultProfileDialog } from './SyncVaultProfileDialog';

export type SyncVaultProfileDialogTestWrapperProps = Readonly<{
    secret: SecretDetailDto;
    vaultProfiles?: VaultProfileDto[];
    syncVaultProfileAttributeDescriptors?: AttributeDescriptorModel[];
    isFetchingSyncVaultProfileAttributes?: boolean;
    onGetSyncVaultProfileAttributes?: (params: { vaultUuid: string; vaultProfileUuid: string; secretType: SecretType }) => void;
    onAddSyncVaultProfile?: (params: { uuid: string; vaultProfileUuid: string; attributes: AttributeRequestModel[] }) => void;
    onClose?: () => void;
}>;

export function SyncVaultProfileDialogTestWrapper({
    secret,
    vaultProfiles = [],
    syncVaultProfileAttributeDescriptors = [],
    isFetchingSyncVaultProfileAttributes = false,
    onGetSyncVaultProfileAttributes,
    onAddSyncVaultProfile,
    onClose = () => {},
}: SyncVaultProfileDialogTestWrapperProps) {
    const store = useMemo(() => {
        const captureMiddleware: Middleware = () => (next) => (action) => {
            if (secretsActions.getSyncVaultProfileAttributes.match(action)) {
                onGetSyncVaultProfileAttributes?.(action.payload);
            }
            if (secretsActions.addSyncVaultProfile.match(action)) {
                onAddSyncVaultProfile?.(action.payload);
            }
            return next(action);
        };

        return configureStore({
            reducer: testReducers,
            middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }).concat(captureMiddleware),
            preloadedState: {
                ...testInitialState,
                secrets: { syncVaultProfileAttributeDescriptors, isFetchingSyncVaultProfileAttributes },
                vaultProfiles: { vaultProfiles },
            },
        });
    }, [
        isFetchingSyncVaultProfileAttributes,
        onAddSyncVaultProfile,
        onGetSyncVaultProfileAttributes,
        syncVaultProfileAttributeDescriptors,
        vaultProfiles,
    ]);

    return (
        <Provider store={store}>
            <MemoryRouter>
                <SyncVaultProfileDialog secret={secret} onClose={onClose} />
            </MemoryRouter>
        </Provider>
    );
}
