import Select from 'components/Select';
import { useMemo } from 'react';

export type ReferenceOption = Readonly<{ value: string; label: string; description?: string }>;

type Props = Readonly<{
    id: string;
    label: string;
    placeholder: string;
    hint: string;
    // The references the operator may pick.
    options: readonly ReferenceOption[];
    value: string[];
    onChange: (uuids: string[]) => void;
    // Names of references already bound to the profile, for those that are not among the options.
    knownLabels?: ReadonlyMap<string, string>;
    unusableDescription: string;
    listError?: string;
    error?: string;
    disabled?: boolean;
}>;

export default function ReferenceMultiSelect({
    id,
    label,
    placeholder,
    hint,
    options,
    value,
    onChange,
    knownLabels,
    unusableDescription,
    listError,
    error,
    disabled,
}: Props) {
    const allOptions = useMemo(() => {
        const usableUuids = new Set(options.map((option) => option.value));
        // A bound reference that is no longer usable stays as a disabled option, so its chip can still be removed.
        const unusable = value
            .filter((uuid) => !usableUuids.has(uuid))
            .map((uuid) => ({ value: uuid, label: knownLabels?.get(uuid) ?? uuid, description: unusableDescription, disabled: true }));
        return [...options, ...unusable];
    }, [options, value, knownLabels, unusableDescription]);

    const selected = useMemo(
        () => value.map((uuid) => ({ value: uuid, label: allOptions.find((option) => option.value === uuid)?.label ?? uuid })),
        [value, allOptions],
    );

    return (
        <div className="space-y-1">
            <Select
                id={id}
                dataTestId={id}
                label={label}
                isMulti
                isSearchable
                required
                options={allOptions}
                value={selected}
                onChange={(next) => onChange((next ?? []).map((option) => String(option.value)))}
                placeholder={placeholder}
                isDisabled={disabled}
                error={error}
                showOptionDescriptionInDropdown
            />
            {listError ? (
                <p className="text-sm text-danger" role="alert" data-testid={`${id}-list-error`}>
                    {listError}
                </p>
            ) : null}
            <p className="text-sm text-content-subtle" data-testid={`${id}-hint`}>
                {hint}
            </p>
        </div>
    );
}
