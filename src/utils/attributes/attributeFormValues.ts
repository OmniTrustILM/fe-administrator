// A predefined-list Date/Datetime attribute stores the selected option's raw content object
// (e.g. `{ data: '2026-03-29' }`) as the field value, not a plain string — extract it before parsing.
function resolveDateSource(item: any): unknown {
    if (item?.value?.data !== undefined) return item.value.data;
    if (item && typeof item === 'object' && 'data' in item) return item.data;
    return item;
}

export function getDatetimeFormValue(item: any): { data: string } {
    return { data: new Date(resolveDateSource(item) as any).toISOString() };
}

export function getDateFormValue(item: any): { data: string } {
    return { data: new Date(resolveDateSource(item) as any).toISOString().slice(0, 10) };
}
