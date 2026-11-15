import { useMemo } from 'react';
import type { NameAndUuidDto, SecretDto } from 'types/openapi';
import { isEstBasicAuthSecret } from 'utils/est-profile';
import ReferenceMultiSelect from './ReferenceMultiSelect';

type Props = Readonly<{
    value: string[];
    onChange: (uuids: string[]) => void;
    secrets: readonly SecretDto[];
    // The basic-auth secrets the profile already has.
    bound?: readonly NameAndUuidDto[];
    listError?: string;
    error?: string;
    disabled?: boolean;
}>;

export default function BasicAuthSecretsField({ value, onChange, secrets, bound, listError, error, disabled }: Props) {
    const options = useMemo(
        () =>
            secrets
                .filter(isEstBasicAuthSecret)
                .map((secret) => ({ value: secret.uuid, label: secret.name, description: secret.sourceVaultProfile?.name })),
        [secrets],
    );
    const knownLabels = useMemo(
        () => new Map([...(bound ?? []), ...secrets].map((secret) => [secret.uuid, secret.name] as const)),
        [bound, secrets],
    );

    return (
        <ReferenceMultiSelect
            id="basicCredentialSecrets"
            label="Basic-auth secrets"
            placeholder="Select the secrets holding accepted RA credentials"
            hint="An RA authenticates with the username and password of one of these. Only enabled Basic Auth secrets are listed, leaving out failed, pending approval and rejected ones."
            options={options}
            value={value}
            onChange={onChange}
            knownLabels={knownLabels}
            unusableDescription="Not usable"
            listError={listError}
            error={error}
            disabled={disabled}
        />
    );
}
