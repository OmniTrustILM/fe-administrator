import { useMemo, useState } from 'react';
import { type SecretDto, SecretState, SecretType } from 'types/openapi';
import { withProviders } from 'utils/test-helpers';
import { createEabSecretStore, type EabKeyApiBehaviour, stubEabKeyApi, VAULT_PROFILE } from './eabKeyFixture';
import EabSecretsField from './EabSecretsField';

const LISTED_SECRET = {
    uuid: 's-1',
    name: 'EAB key one',
    type: SecretType.SecretKey,
    enabled: true,
    state: SecretState.Active,
    sourceVaultProfile: { uuid: VAULT_PROFILE.uuid, name: VAULT_PROFILE.name },
} as SecretDto;

type Props = EabKeyApiBehaviour & Readonly<{ initialValue?: string[] }>;

export default function EabSecretsFieldHarness({ initialValue = ['s-1'], ...behaviour }: Props) {
    const [value, setValue] = useState(initialValue);
    const [submits, setSubmits] = useState(0);
    const store = useMemo(() => createEabSecretStore(), []);
    // biome-ignore lint/correctness/useExhaustiveDependencies: one stub per mount
    const keyApi = useMemo(() => stubEabKeyApi(behaviour, () => {}), []);

    return withProviders(
        // The field sits inside the ACME profile form, which must not submit when the dialog's secret form does.
        <form
            onSubmit={(event) => {
                event.preventDefault();
                setSubmits((count) => count + 1);
            }}
        >
            <EabSecretsField value={value} onChange={setValue} secrets={[LISTED_SECRET]} keyApi={keyApi} />
            <pre data-testid="value">{JSON.stringify(value)}</pre>
            <span data-testid="enclosing-submits">{submits}</span>
        </form>,
        { store },
    );
}
