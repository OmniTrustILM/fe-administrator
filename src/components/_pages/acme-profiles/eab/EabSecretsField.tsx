import Button from 'components/Button';
import Select from 'components/Select';
import { getEnumLabel, selectors as enumSelectors } from 'ducks/enums';
import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { PlatformEnum, type SecretDto } from 'types/openapi';
import { EAB_HINT, isEabSecret, secretLabel } from 'utils/acme-eab';
import GenerateEabKeyDialog, { type EabKeyApi } from './GenerateEabKeyDialog';

type Props = Readonly<{
    value: string[];
    onChange: (uuids: string[]) => void;
    secrets: SecretDto[];
    listError?: string;
    disabled?: boolean;
    keyApi?: EabKeyApi;
}>;

export default function EabSecretsField({ value, onChange, secrets, listError, disabled, keyApi }: Props) {
    const secretTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.SecretType));
    const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false);
    // Secrets created here are not in `secrets` until the next listing.
    const [createdSecrets, setCreatedSecrets] = useState<SecretDto[]>([]);
    const knownSecrets = useMemo(
        () => [...secrets, ...createdSecrets.filter((created) => !secrets.some((secret) => secret.uuid === created.uuid))],
        [secrets, createdSecrets],
    );
    const options = useMemo(() => {
        const usable = knownSecrets.filter(isEabSecret).map((secret) => ({
            value: secret.uuid,
            label: secret.name,
            description: [getEnumLabel(secretTypeEnum, secret.type), secret.sourceVaultProfile?.name].filter(Boolean).join(' · '),
        }));
        const usableUuids = new Set(usable.map((option) => option.value));
        // Select disables its trigger, and the chips inside it, when it has no options; a bound secret that is no longer
        // usable stays as a disabled option so it can still be removed.
        const unusable = value
            .filter((uuid) => !usableUuids.has(uuid))
            .map((uuid) => ({ value: uuid, label: secretLabel(uuid, knownSecrets), description: 'Not usable', disabled: true }));
        return [...usable, ...unusable];
    }, [knownSecrets, secretTypeEnum, value]);
    const selected = useMemo(() => value.map((uuid) => ({ value: uuid, label: secretLabel(uuid, knownSecrets) })), [value, knownSecrets]);

    return (
        <div className="space-y-3">
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
            <Button
                variant="outline"
                type="button"
                disabled={disabled}
                onClick={() => setIsKeyDialogOpen(true)}
                data-testid="generate-eab-key"
            >
                Generate key
            </Button>
            <GenerateEabKeyDialog
                isOpen={isKeyDialogOpen}
                onClose={() => setIsKeyDialogOpen(false)}
                onSelect={(secret) => {
                    setCreatedSecrets((current) => [...current, secret]);
                    onChange([...value, secret.uuid]);
                }}
                api={keyApi}
            />
        </div>
    );
}
