import type React from 'react';
import { useState } from 'react';
import Button from 'components/Button';
import { AttributeContentType } from 'types/openapi';
import { getStepValue } from 'utils/common-utils';
import { ContentFieldConfiguration } from './contentFieldConfiguration';
import { AddCustomValueInput } from './AddCustomValueInput';
import { Check, X } from 'lucide-react';

type Props = {
    open: boolean;
    onClose: () => void;
    idPrefix: string;
    contentType: AttributeContentType;
    multiSelect?: boolean;
    readOnly: boolean;
    fieldValue: unknown;
    onFieldChange: (value: unknown) => void;
    parseValue?: (raw: string | number | boolean) => unknown;
    inputClassName?: string;
};

export function AddCustomValuePanel({
    open,
    onClose,
    idPrefix,
    contentType,
    multiSelect = false,
    readOnly,
    fieldValue,
    onFieldChange,
    parseValue = (x) => x,
    inputClassName,
}: Readonly<Props>): React.ReactNode {
    const [customValue, setCustomValue] = useState<string | number | boolean>('');

    if (!open) return null;

    const config = ContentFieldConfiguration[contentType];
    const inputType = config?.type ?? 'text';
    const fieldStepValue = getStepValue(inputType);
    const isBooleanContentType = contentType === AttributeContentType.Boolean;

    const handleAdd = () => {
        const val = customValue;
        const isValidNumber = typeof val === 'number' && !Number.isNaN(val);
        const isValidNonEmpty = val !== '' && val !== undefined && val !== null;
        const isValid = isBooleanContentType || isValidNumber || isValidNonEmpty;
        if (!isValid) return;
        const parsed = parseValue(val);
        if (multiSelect) {
            let current: unknown[];
            if (Array.isArray(fieldValue)) {
                current = fieldValue;
            } else if (fieldValue == null) {
                current = [];
            } else {
                current = [fieldValue];
            }
            onFieldChange([...current, parsed]);
        } else {
            onFieldChange(parsed);
        }
        setCustomValue(isBooleanContentType ? false : '');
        onClose();
    };

    const handleCancel = () => {
        setCustomValue(isBooleanContentType ? false : '');
        onClose();
    };

    const isValidNumber = typeof customValue === 'number' && !Number.isNaN(customValue);
    const hasNonEmptyString = customValue !== '' && customValue !== undefined && String(customValue).trim() !== '';
    const canAdd = isBooleanContentType || isValidNumber || hasNonEmptyString;

    return (
        <div data-testid={`${idPrefix}-add-custom-panel`} className="flex flex-wrap items-center gap-2 mt-2">
            <div className="min-w-[120px] flex-1">
                <AddCustomValueInput
                    id={`${idPrefix}-custom`}
                    inputType={inputType}
                    contentType={contentType}
                    fieldStepValue={fieldStepValue}
                    value={customValue}
                    onChange={setCustomValue}
                    readOnly={readOnly}
                    inputClassName={inputClassName}
                />
            </div>
            <div className="flex gap-1">
                <Button
                    type="button"
                    variant="transparent"
                    onClick={handleAdd}
                    disabled={!canAdd}
                    title="Save"
                    data-testid={`${idPrefix}-add-custom-value`}
                >
                    <Check size={16} />
                </Button>
                <Button
                    type="button"
                    variant="transparent"
                    onClick={handleCancel}
                    title="Cancel"
                    data-testid={`${idPrefix}-cancel-custom-value`}
                >
                    <X size={16} />
                </Button>
            </div>
        </div>
    );
}
