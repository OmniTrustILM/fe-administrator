import { Buffer } from 'buffer';
type InputType = 'text' | 'number' | 'email' | 'password' | 'date' | 'time' | 'datetime-local' | 'textarea' | 'checkbox' | 'radio' | 'file';
import { AttributeContentType, FilterFieldType } from 'types/openapi';

export const removeNullValues = (obj: any): any => {
    if (obj === null || obj === undefined) {
        return null;
    }

    if (Array.isArray(obj)) {
        return obj.map(removeNullValues).filter((val) => val !== null);
    }

    if (typeof obj === 'object') {
        const newObj: any = {};
        for (const [key, value] of Object.entries(obj)) {
            const newValue = removeNullValues(value);
            if (newValue !== null) {
                newObj[key] = newValue;
            }
        }
        return newObj;
    }

    return obj;
};

export const capitalize = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};

export const getStepValue = (type: string) => {
    if (type === 'datetime' || type === 'time' || type === 'datetime-local') {
        return 1;
    } else return undefined;
};

export const isObjectSame = (obj1: Record<string, unknown>, obj2: Record<string, unknown>): boolean => {
    if (obj1 === obj2) {
        return true;
    }

    if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
        return false;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) {
        return false;
    }

    for (const key of keys1) {
        if (!keys2.includes(key) || !isObjectSame(obj1[key] as Record<string, unknown>, obj2[key] as Record<string, unknown>)) {
            return false;
        }
    }

    return true;
};

export const utf8ToBase64 = (str: string): string => {
    // Return the Base64 string
    return Buffer.from(str, 'utf8').toString('base64');
};

export const base64ToUtf8 = (str: string): string => {
    // Return the utf string
    return Buffer.from(str, 'base64').toString('utf8');
};

export const getFormTypeFromAttributeContentType = (type: AttributeContentType): InputType => {
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
        case AttributeContentType.File:
            return 'file';
        case AttributeContentType.Secret:
            return 'password';
        default:
            return 'text';
    }
};

export const getFormTypeFromFilterFieldType = (type: FilterFieldType) => {
    switch (type) {
        case FilterFieldType.Date:
            return 'date';
        case FilterFieldType.Datetime:
            return 'datetime-local';
        case FilterFieldType.String:
            return 'text';
        case FilterFieldType.Number:
            return 'number';
        default:
            return 'text';
    }
};
