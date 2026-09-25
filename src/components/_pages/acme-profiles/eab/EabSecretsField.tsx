import Select from 'components/Select';
import { getEnumLabel, selectors as enumSelectors } from 'ducks/enums';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { PlatformEnum, type SecretDto } from 'types/openapi';
import { EAB_HINT, isEabSecret, secretLabel } from 'utils/acme-eab';

type Props = Readonly<{
    value: string[];
    onChange: (uuids: string[]) => void;
    secrets: SecretDto[];
    listError?: string;
    disabled?: boolean;
}>;

export default function EabSecretsField({ value, onChange, secrets, listError, disabled }: Props) {
    const secretTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.SecretType));
    const options = useMemo(
        () =>
            secrets.filter(isEabSecret).map((secret) => ({
                value: secret.uuid,
                label: secret.name,
                description: [getEnumLabel(secretTypeEnum, secret.type), secret.sourceVaultProfile?.name].filter(Boolean).join(' · '),
            })),
        [secrets, secretTypeEnum],
    );
    const selected = useMemo(() => value.map((uuid) => ({ value: uuid, label: secretLabel(uuid, secrets) })), [value, secrets]);

    return (
        <div className="space-y-1">
            <Select
                id="eabSecrets"
                dataTestId="eabSecrets"
                label="External Account Binding secrets"
                isMulti
                isSearchable
                options={options}
                value={selected}
                onChange={(next) => onChange((next ?? []).map((option) => String(option.value)))}
                placeholder="Select secrets holding accepted HMAC keys"
                isDisabled={disabled}
                showOptionDescriptionInDropdown
            />
            {listError ? (
                <p className="text-sm text-danger" role="alert" data-testid="eabSecrets-error">
                    {listError}
                </p>
            ) : null}
            <p className="text-sm text-content-subtle" data-testid="eabSecrets-hint">
                {EAB_HINT}
            </p>
        </div>
    );
}
