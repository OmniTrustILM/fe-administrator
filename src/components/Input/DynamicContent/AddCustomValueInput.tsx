import type React from 'react';
import TextInput from 'components/TextInput';
import DatePicker from 'components/DatePicker';
import Switch from 'components/Switch';
import { AttributeContentType } from 'types/openapi';

const defaultInputClassName =
    'py-2.5 px-4 block w-full border border-gray-200 rounded-lg text-sm dark:bg-neutral-900 dark:border-neutral-700';

type Props = Readonly<{
    id: string;
    inputType: string;
    contentType: AttributeContentType;
    fieldStepValue: number | undefined;
    value: string | number | boolean;
    onChange: (v: string | number | boolean) => void;
    readOnly: boolean;
    inputClassName?: string;
}>;

export function AddCustomValueInput({
    id,
    inputType,
    contentType,
    fieldStepValue,
    value,
    onChange,
    readOnly,
    inputClassName = defaultInputClassName,
}: Props): React.ReactNode {
    if (inputType === 'datetime-local') {
        let dateVal = typeof value === 'string' && value ? value : undefined;
        if (dateVal && !dateVal.includes('T')) dateVal = dateVal.replace(' ', 'T');
        return <DatePicker id={id} value={dateVal} onChange={(v) => onChange(v ?? '')} disabled={readOnly} timePicker />;
    }
    if (inputType === 'number') {
        const isInt = contentType === AttributeContentType.Integer;
        const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const raw = e.target.value;
            if (raw === '') {
                onChange('');
                return;
            }
            const parsed = isInt ? Number.parseInt(raw, 10) : Number.parseFloat(raw);
            onChange(Number.isNaN(parsed) ? 0 : parsed);
        };
        return (
            <input
                type="number"
                step={fieldStepValue}
                className={inputClassName}
                value={value === '' ? '' : Number(value)}
                onChange={handleNumberChange}
                disabled={readOnly}
            />
        );
    }
    if (inputType === 'checkbox') {
        return <Switch id={id} checked={Boolean(value)} onChange={onChange} disabled={readOnly} />;
    }
    return (
        <TextInput
            id={id}
            type={inputType as 'text' | 'date' | 'time'}
            value={String(value ?? '')}
            onChange={(v) => onChange(v)}
            disabled={readOnly}
        />
    );
}
