import { useCallback, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import type { AttributeSelectOption } from 'utils/attributes/attributes';

const resourceUuid = (option: AttributeSelectOption) => (option.value as { data?: { uuid?: string } } | null | undefined)?.data?.uuid;

// A multi-select field may hold no value, a list, or a single item stored before the field became a list.
function selectedValues(current: unknown): unknown[] {
    if (Array.isArray(current)) return current;
    if (current == null || current === '') return [];
    return [current];
}

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
            const value = multiSelect ? [...selectedValues(getValues(name)), option.value] : option.value;
            setValue(name, value, { shouldValidate: true, shouldDirty: true });
        },
        [getValues, setValue, name, multiSelect],
    );

    return { options: merged, select };
}
