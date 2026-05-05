import Select from 'components/Select';
import Label from 'components/Label';
import { getEnumLabel } from 'ducks/enums';
import { useMemo } from 'react';
import type { EnumItemModel } from 'types/enums';
import { KeyType, KeyUsage } from 'types/openapi';

type KeyUsageEnum = { [key: string]: EnumItemModel } | undefined;

const KEY_TYPE_ALLOWED_USAGES: Partial<Record<KeyType, KeyUsage[]>> = {
    [KeyType.Public]: [KeyUsage.Verify, KeyUsage.Encrypt, KeyUsage.Wrap],
    [KeyType.Private]: [KeyUsage.Sign, KeyUsage.Decrypt, KeyUsage.Unwrap],
};

export type KeyUsageSelectProps = Readonly<{
    value: KeyUsage[];
    onChange: (values: KeyUsage[]) => void;
    keyUsageEnum: KeyUsageEnum;
    keyType?: KeyType;
    id?: string;
    label?: string;
}>;

export default function KeyUsageSelect({ value, onChange, keyUsageEnum, keyType, id = 'field', label = 'Key Usage' }: KeyUsageSelectProps) {
    const allowedUsages = keyType ? KEY_TYPE_ALLOWED_USAGES[keyType] : undefined;

    const options = useMemo(() => {
        const list: { value: KeyUsage; label: string }[] = [];
        for (const suit in KeyUsage) {
            const usage = KeyUsage[suit as keyof typeof KeyUsage];
            if (allowedUsages && !allowedUsages.includes(usage)) continue;
            list.push({ value: usage, label: getEnumLabel(keyUsageEnum, usage) });
        }
        return list;
    }, [keyUsageEnum, allowedUsages]);

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
            />
        </div>
    );
}
