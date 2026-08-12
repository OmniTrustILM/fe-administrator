import { useCallback, useMemo, useState, useEffect } from 'react';
import Button from 'components/Button';
import Select from 'components/Select';

interface OptionType {
    value: string;
    label: string;
}

type Props = {
    id?: string;
    selectedValues: string[];
    onValuesChange: (values: string[]) => void;
    placeholder?: string;
    addPlaceholder?: string;
    initialOptions?: OptionType[];
    options?: OptionType[];
    setOptions?: (options: OptionType[]) => void;
};

export default function MultipleValueTextInput({
    id,
    selectedValues = [],
    onValuesChange,
    placeholder = 'Select or add values',
    addPlaceholder = 'Add value',
    initialOptions = [],
    options: externalOptions,
    setOptions: externalSetOptions,
}: Readonly<Props>) {
    const [newValue, setNewValue] = useState<string>('');
    const [internalOptions, setInternalOptions] = useState<OptionType[]>(initialOptions);

    // Use external options if provided, otherwise use internal
    const options = externalOptions ?? internalOptions;
    const setOptions = externalSetOptions ?? setInternalOptions;

    // Update internal options when initialOptions change
    useEffect(() => {
        if (externalOptions === undefined && initialOptions.length > 0) {
            setInternalOptions(initialOptions);
        }
    }, [initialOptions, externalOptions]);
    const allOptions = useMemo(() => {
        const currentOptions = selectedValues.map((val: string) => ({
            label: val,
            value: val,
        }));
        return [...options, ...currentOptions.filter((opt) => !options.some((o) => o.value === opt.value))];
    }, [selectedValues, options]);

    const selectedOptions = useMemo(() => {
        return selectedValues.map((val: string) => ({
            label: val,
            value: val,
        }));
    }, [selectedValues]);

    const handleSelectChange = useCallback(
        (values: { value: string | number; label: string }[] | undefined) => {
            if (!values || !Array.isArray(values)) {
                onValuesChange([]);
                return;
            }
            const stringValues = values.map((v) => (typeof v.value === 'string' ? v.value : String(v.value)));
            onValuesChange(stringValues);
        },
        [onValuesChange],
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && newValue.trim()) {
                e.preventDefault();
                const trimmedValue = newValue.trim();
                if (!selectedValues.includes(trimmedValue)) {
                    onValuesChange([...selectedValues, trimmedValue]);
                    if (!options.some((opt) => opt.value === trimmedValue)) {
                        setOptions([...options, { label: trimmedValue, value: trimmedValue }]);
                    }
                }
                setNewValue('');
            }
        },
        [newValue, onValuesChange, selectedValues, options, setOptions],
    );

    const handleAddClick = useCallback(() => {
        if (newValue.trim()) {
            const trimmedValue = newValue.trim();
            if (!selectedValues.includes(trimmedValue)) {
                onValuesChange([...selectedValues, trimmedValue]);
                if (!options.some((opt) => opt.value === trimmedValue)) {
                    setOptions([...options, { label: trimmedValue, value: trimmedValue }]);
                }
            }
            setNewValue('');
        }
    }, [newValue, onValuesChange, selectedValues, options, setOptions]);

    return (
        <div className="flex gap-2">
            <div className="flex-1">
                <Select
                    id={id || 'multiple-value-input'}
                    isMulti={true}
                    value={selectedOptions}
                    options={allOptions}
                    onChange={handleSelectChange}
                    placeholder={placeholder}
                />
            </div>
            <div className="flex gap-2">
                <input
                    type="text"
                    className="text-content py-2.5 sm:py-3 px-4 block border-outline rounded-lg text-sm focus:border-brand focus:ring-brand bg-surface-raised placeholder-content-subtle"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder={addPlaceholder}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                />
                <Button type="button" variant="outline" onClick={handleAddClick}>
                    Add
                </Button>
            </div>
        </div>
    );
}
