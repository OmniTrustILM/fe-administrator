import { VAULT_PATH_ATTRIBUTE } from 'components/_pages/acme-profiles/eab/eabKeyFixture';
import { useMemo, useState } from 'react';
import { of } from 'rxjs';
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

const withPath = () => of([VAULT_PATH_ATTRIBUTE]);
const withoutAttributes = () => of([]);

type Props = Readonly<{ preset?: Preset; throughStore?: boolean; vaultProfileHasAttribute?: boolean }>;

// Without onCreate the form creates through the store, as the secrets inventory does.
export default function SecretFormPresetHarness({ preset, throughStore = false, vaultProfileHasAttribute = false }: Props) {
    // Only the types: a store create carries the secret content.
    const [actionTypes, setActionTypes] = useState<string[]>([]);
    const store = useMemo(() => {
        const created = createMockStore({
            vaultProfiles: { vaultProfiles: [VAULT_PROFILE] },
            secrets: {
                syncVaultProfileAttributeDescriptors: [],
                isFetchingSyncVaultProfileAttributes: false,
                secretCreationAttributeDescriptors: [],
                isFetchingSecretCreationAttributes: false,
            },
            enums: { platformEnums: { SecretType: TYPE_LABELS } },
        });
        const dispatch = created.dispatch;
        created.dispatch = ((action: Parameters<typeof dispatch>[0]) => {
            setActionTypes((current) => [...current, action.type]);
            return dispatch(action);
        }) as typeof dispatch;
        return created;
    }, []);

    return withProviders(
        <div>
            <pre data-testid="store-action-types">{actionTypes.join('\n')}</pre>
            <SecretForm
                preset={preset}
                onCreate={throughStore ? undefined : recordRequest}
                loadSecretAttributes={vaultProfileHasAttribute ? withPath : withoutAttributes}
            />
        </div>,
        { store },
    );
}
