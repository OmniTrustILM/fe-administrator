/**
 * Shared helpers for turning dynamic values into display strings without ever
 * falling back to Object's default stringification ('[object Object]').
 */

/** Stringify any value for display, using JSON for objects instead of '[object Object]'. */
export function toDisplayString(value: unknown): string {
    return typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
}

/**
 * Select-option label for an attribute content item: reference first, then a
 * RESOURCE-style object's name, then the primitive value.
 */
export function contentItemLabel(value: { reference?: string; data?: unknown } | null | undefined): string {
    if (value?.reference) return value.reference;
    const data = value?.data;
    if (data == null) return '';
    if (typeof data === 'object') {
        const name = (data as { name?: unknown }).name;
        return typeof name === 'string' ? name : JSON.stringify(data);
    }
    if (typeof data === 'string') return data;
    if (typeof data === 'number' || typeof data === 'boolean') return String(data);
    return '';
}
