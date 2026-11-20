import { useMemo } from 'react';
import { type CreateSecretRequest, SecretType } from 'types/openapi';
import { createMockStore, withProviders } from 'utils/test-helpers';
import SecretForm from '.';

type Preset = Readonly<{ type: SecretType; content?: string; allowedTypes?: SecretType[] }>;

const VAULT_PROFILE = { uuid: 'vp-1', name: 'Vault One', enabled: true, vaultInstance: { uuid: 'vault-1', name: 'Vault' } };

const TYPE_LABELS = {
    [SecretType.Generic]: { label: 'Generic' },
    [SecretType.PrivateKey]: { label: 'Private Key' },
    [SecretType.ApiKey]: { label: 'API Key' },
    [SecretType.SecretKey]: { label: 'Secret Key' },
};

// Requests hold the secret content, so they are kept off the page for the spec to read with `page.evaluate`.
const CREATE_REQUESTS = 'secretFormCreateRequests';

function recordRequest(request: CreateSecretRequest) {
    const target = globalThis as unknown as Record<string, CreateSecretRequest[]>;
    target[CREATE_REQUESTS] = [...(target[CREATE_REQUESTS] ?? []), request];
}

// Without onCreate the form creates through the store, as the secrets inventory does.
export default function SecretFormPresetHarness({ preset, throughStore = false }: Readonly<{ preset?: Preset; throughStore?: boolean }>) {
    const store = useMemo(
        () =>
            createMockStore({
                vaultProfiles: { vaultProfiles: [VAULT_PROFILE] },
                secrets: {
                    syncVaultProfileAttributeDescriptors: [],
                    isFetchingSyncVaultProfileAttributes: false,
                    secretCreationAttributeDescriptors: [],
                    isFetchingSecretCreationAttributes: false,
                },
                enums: { platformEnums: { SecretType: TYPE_LABELS } },
            }),
        [],
    );

    return withProviders(<SecretForm preset={preset} onCreate={throughStore ? undefined : recordRequest} />, { store });
}
