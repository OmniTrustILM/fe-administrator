import { configureStore } from '@reduxjs/toolkit';
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
    const store = useMemo(
        () =>
            configureStore({
                reducer: testReducers,
                middleware: (getDefaultMiddleware) =>
                    getDefaultMiddleware({ serializableCheck: false }).concat(
                        (_store: any) => (next: (arg0: any) => any) => (action: any) => {
                            if (action.type === secretsActions.getSyncVaultProfileAttributes.type) {
                                onGetSyncVaultProfileAttributes?.(action.payload);
                            }
                            if (action.type === secretsActions.addSyncVaultProfile.type) {
                                onAddSyncVaultProfile?.(action.payload);
                            }
                            return next(action);
                        },
                    ),
                preloadedState: {
                    ...testInitialState,
                    secrets: { syncVaultProfileAttributeDescriptors, isFetchingSyncVaultProfileAttributes },
                    vaultProfiles: { vaultProfiles },
                },
            }),
        [
            isFetchingSyncVaultProfileAttributes,
            onAddSyncVaultProfile,
            onGetSyncVaultProfileAttributes,
            syncVaultProfileAttributeDescriptors,
            vaultProfiles,
        ],
    );

    return (
        <Provider store={store}>
            <MemoryRouter>
                <SyncVaultProfileDialog secret={secret} onClose={onClose} />
            </MemoryRouter>
        </Provider>
    );
}
