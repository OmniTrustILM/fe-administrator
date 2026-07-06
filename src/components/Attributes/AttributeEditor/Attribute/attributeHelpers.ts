import type { AttributeDescriptorModel, CustomAttributeModel, DataAttributeModel, RegexpAttributeConstraintModel } from 'types/attributes';
import { AttributeConstraintType, AttributeContentType, type RangeAttributeConstraintData } from 'types/openapi';
import { isCustomAttributeModel, isDataAttributeModel } from 'types/attributes';
import type { AttributeSelectOption, AttributeSelectOptionValue } from 'utils/attributes/attributes';
import { getFormattedDateTime } from 'utils/dateUtil';
import { composeValidators, validateFloat, validateInteger, validatePattern, validateRequired } from 'utils/validators';

/** A form-field validator: returns an error message, or undefined when the value is valid. */
export type FieldValidator = (value: unknown, allValues?: object, fieldState?: unknown) => string | undefined;

/** A react-select option whose value may be any dynamic form value. */
export type SelectFieldOption = { value: unknown; label: string };

export function parseListValueByContentType(
    contentType: AttributeContentType,
    raw: string | number | boolean | { value: string | number; label: string } | undefined,
): string | number | boolean | undefined {
    if (raw === undefined || raw === null || raw === '') return undefined;
    const val = typeof raw === 'object' && raw !== null && 'value' in raw ? raw.value : raw;
    const str = String(val).trim();
    if (str === '') return undefined;
    switch (contentType) {
        case AttributeContentType.Integer: {
            const intVal = Number.parseInt(str, 10);
            return Number.isNaN(intVal) ? undefined : intVal;
        }
        case AttributeContentType.Float: {
            const floatVal = Number.parseFloat(str);
            return Number.isNaN(floatVal) ? undefined : floatVal;
        }
        case AttributeContentType.Boolean:
            return str === 'true' || str === '1';
        default:
            return str;
    }
}

export function transformInputValueForDescriptor(
    value: unknown,
    descriptor: DataAttributeModel | CustomAttributeModel,
): string | number | boolean | undefined {
    if (descriptor.contentType === AttributeContentType.Datetime) {
        return getFormattedDateTime(value as string);
    }
    if (descriptor.contentType === AttributeContentType.Boolean && descriptor.properties.required) {
        return (value as boolean | undefined) ?? false;
    }
    return value as string | number | boolean | undefined;
}

export function getSelectValueFromField(fieldValue: unknown, multiSelect: boolean): SelectFieldOption[] | AttributeSelectOptionValue {
    if (multiSelect) {
        if (!fieldValue) return [];
        if (!Array.isArray(fieldValue)) return [];
        return (fieldValue as unknown[]).map((v): SelectFieldOption => {
            if (typeof v === 'object' && v !== null && 'value' in v) {
                const option = v as { value: unknown; label?: unknown };
                return { value: option.value, label: (option.label as string) || String(option.value) };
            }
            if (typeof v === 'object' && v !== null) {
                const content = v as { reference?: unknown; data?: unknown };
                return { value: v, label: String(content.reference ?? content.data ?? JSON.stringify(v)) };
            }
            return { value: v, label: String(v) };
        });
    }
    if (!fieldValue) return '';
    if (typeof fieldValue === 'object' && 'value' in fieldValue && (fieldValue as { value: unknown }).value !== undefined) {
        return (fieldValue as { value: AttributeSelectOptionValue }).value;
    }
    return fieldValue as string | number;
}

export function getFormTypeFromAttributeContentType(
    type: AttributeContentType,
): 'text' | 'number' | 'date' | 'time' | 'datetime-local' | 'password' | 'checkbox' | 'textarea' {
    switch (type) {
        case AttributeContentType.Boolean:
            return 'checkbox';
        case AttributeContentType.Integer:
        case AttributeContentType.Float:
            return 'number';
        case AttributeContentType.String:
        case AttributeContentType.Credential:
        case AttributeContentType.Object:
            return 'text';
        case AttributeContentType.Text:
        case AttributeContentType.Codeblock:
            return 'textarea';
        case AttributeContentType.Date:
            return 'date';
        case AttributeContentType.Time:
            return 'time';
        case AttributeContentType.Datetime:
            return 'datetime-local';
        case AttributeContentType.Secret:
            return 'password';
        default:
            return 'text';
    }
}

/** RegExp constraint from connector (used for validation message + pattern hint in the UI). */
export function getRegexpConstraint(
    descriptor: DataAttributeModel | CustomAttributeModel | undefined,
): RegexpAttributeConstraintModel | undefined {
    if (!descriptor || !isDataAttributeModel(descriptor)) return undefined;
    const regexValidator = descriptor.constraints?.find((c) => c.type === AttributeConstraintType.RegExp);
    return regexValidator as RegexpAttributeConstraintModel | undefined;
}

function addDataAttributeConstraintValidators(descriptor: DataAttributeModel, validators: FieldValidator[]): void {
    const regexValidator = descriptor.constraints?.find((c) => c.type === AttributeConstraintType.RegExp);
    if (regexValidator) {
        const pattern = new RegExp((regexValidator as RegexpAttributeConstraintModel).data ?? '');
        validators.push(validatePattern(pattern, regexValidator.errorMessage));
    }
    const rangeValidator = descriptor.constraints?.find((c) => c.type === AttributeConstraintType.Range);
    if (!rangeValidator?.data) return;
    const rangeData = rangeValidator.data as RangeAttributeConstraintData;
    const { from, to } = rangeData;
    if (from && to) {
        const fromAlt = from === 1 ? String.raw`[1-9]\d{0,${to.toString().length - 1}}` : String(from);
        const pattern = new RegExp(`^(?:${fromAlt}|${to})$`);
        validators.push(validatePattern(pattern, rangeValidator.errorMessage));
    }
}

export function buildAttributeValidators(descriptor: AttributeDescriptorModel | undefined): FieldValidator {
    const validators: FieldValidator[] = [];
    if (!descriptor) return composeValidators(...validators);

    if (!isDataAttributeModel(descriptor) && !isCustomAttributeModel(descriptor)) {
        return composeValidators(...validators);
    }
    if (descriptor.properties.required) validators.push(validateRequired());

    // For list/select attributes (like RSA key size) we trust backend-provided values
    // and do not attach numeric validators on the frontend to avoid blocking the form
    const isListAttribute = descriptor.properties.list === true;

    if (!isListAttribute && descriptor.contentType === AttributeContentType.Integer) {
        validators.push(validateInteger());
    }
    if (!isListAttribute && descriptor.contentType === AttributeContentType.Float) {
        validators.push(validateFloat());
    }
    if (isDataAttributeModel(descriptor)) {
        addDataAttributeConstraintValidators(descriptor, validators);
    }
    return composeValidators(...validators);
}

export function getUpdatedOptionsForEditSelect(
    valuesRecieved: AttributeSelectOption[],
    options?: AttributeSelectOption[],
): AttributeSelectOption[] | undefined {
    if (valuesRecieved?.length > 0) {
        const updatedOptions = options?.filter((option) => {
            return !valuesRecieved.some((value) => JSON.stringify(value.value) === JSON.stringify(option.value));
        });
        return updatedOptions;
    }
    return options;
}
