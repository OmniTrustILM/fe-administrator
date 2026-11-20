import { useCallback, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import type { AttributeSelectOption } from 'utils/attributes/attributes';

const resourceUuid = (option: AttributeSelectOption) => (option.value as { data?: { uuid?: string } }).data?.uuid;

// A resource created from the picker may sit beyond the listing's first page, so it is kept among the options here.
export function useCreatedOptions(name: string, multiSelect: boolean, options: AttributeSelectOption[] | undefined) {
    const { getValues, setValue } = useFormContext();
    const [created, setCreated] = useState<AttributeSelectOption[]>([]);

    const merged = useMemo(() => {
        if (created.length === 0) return options;
        const listed = options ?? [];
        return [...listed, ...created.filter((option) => !listed.some((item) => resourceUuid(item) === resourceUuid(option)))];
    }, [options, created]);

    const select = useCallback(
        (option: AttributeSelectOption) => {
            setCreated((current) => [...current, option]);
            const selected: unknown[] = getValues(name) ?? [];
            setValue(name, multiSelect ? [...selected, option.value] : option.value, { shouldValidate: true, shouldDirty: true });
        },
        [getValues, setValue, name, multiSelect],
    );

    return { options: merged, select };
}
