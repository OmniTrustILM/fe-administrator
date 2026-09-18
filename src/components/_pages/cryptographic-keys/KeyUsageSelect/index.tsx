import Select from 'components/Select';
import Label from 'components/Label';
import { getEnumDescription, getEnumLabel } from 'ducks/enums';
import { useMemo } from 'react';
import type { EnumItemModel } from 'types/enums';
import { KeyType, KeyUsage } from 'types/openapi';

type KeyUsageEnum = { [key: string]: EnumItemModel } | undefined;

const KEY_TYPE_ALLOWED_USAGES: Partial<Record<KeyType, KeyUsage[]>> = {
    [KeyType.Public]: [KeyUsage.Verify, KeyUsage.Encrypt, KeyUsage.Wrap],
    [KeyType.Private]: [KeyUsage.Sign, KeyUsage.Decrypt, KeyUsage.Unwrap],
};

export function filterKeyUsagesByType(usages: KeyUsage[], keyType?: KeyType): KeyUsage[] {
    const allowedUsages = keyType ? KEY_TYPE_ALLOWED_USAGES[keyType] : undefined;
    return usages.filter((usage) => !allowedUsages || allowedUsages.includes(usage));
}

export type KeyUsageSelectProps = Readonly<{
    value: KeyUsage[];
    onChange: (values: KeyUsage[]) => void;
    keyUsageEnum: KeyUsageEnum;
    supportedKeyUsages?: KeyUsage[];
    isDisabled?: boolean;
    keyType?: KeyType;
    id?: string;
    label?: string;
}>;

export function getKeyUsageOptions(
    availableUsages: KeyUsage[],
    keyUsageEnum: KeyUsageEnum,
    allowedUsages?: KeyUsage[],
): { value: KeyUsage; label: string; description?: string }[] {
    return availableUsages
        .filter((usage) => !allowedUsages || allowedUsages.includes(usage))
        .map((usage) => ({
            value: usage,
            label: getEnumLabel(keyUsageEnum, usage),
            description: getEnumDescription(keyUsageEnum, usage),
        }));
}

export default function KeyUsageSelect({
    value,
    onChange,
    keyUsageEnum,
    supportedKeyUsages,
    isDisabled = false,
    keyType,
    id = 'field',
    label = 'Key Usage',
}: KeyUsageSelectProps) {
    const availableUsages = supportedKeyUsages ?? Object.values(KeyUsage);

    const options = useMemo(() => {
        return getKeyUsageOptions(filterKeyUsagesByType(availableUsages, keyType), keyUsageEnum);
    }, [availableUsages, keyUsageEnum, keyType]);

    const selectValue = useMemo(
        () =>
            value.map(
                (usage) =>
                    options.find((opt) => opt.value === usage) || {
                        value: usage,
                        label: getEnumLabel(keyUsageEnum, usage),
                    },
            ),
        [value, options, keyUsageEnum],
    );

    return (
        <div className="form-group">
            <Label htmlFor={id}>{label}</Label>
            <Select
                isMulti={true}
                id={id}
                options={options}
                value={selectValue}
                onChange={(values) => onChange((values || []).map((item) => item.value as KeyUsage))}
                isClearable={true}
                isDisabled={isDisabled}
                showOptionDescriptionInDropdown
            />
        </div>
    );
}
