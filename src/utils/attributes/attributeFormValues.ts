// A predefined-list Date/Datetime attribute stores the selected option's raw content object
// (e.g. `{ data: '2026-03-29' }`) as the field value, not a plain string — extract it before parsing.
function resolveDateSource(item: unknown): unknown {
    if (item && typeof item === 'object') {
        const withValue = item as { value?: { data?: unknown } };
        if (withValue.value?.data !== undefined) return withValue.value.data;
        if ('data' in item) return (item as { data?: unknown }).data;
    }
    return item;
}

export function getDatetimeFormValue(item: unknown): { data: string } {
    return { data: new Date(resolveDateSource(item) as string | number | Date).toISOString() };
}

export function getDateFormValue(item: unknown): { data: string } {
    return { data: new Date(resolveDateSource(item) as string | number | Date).toISOString().slice(0, 10) };
}
