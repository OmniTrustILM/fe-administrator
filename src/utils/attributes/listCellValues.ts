import type { BaseAttributeContentModel } from 'types/attributes';
import { AttributeContentType, type FileAttributeContentData } from 'types/openapi';
import { getFormattedDate, getFormattedDateTime } from 'utils/dateUtil';

/** One value of an attribute, prepared for a list cell. */
export interface ListCellValue {
    /** What the cell shows. */
    label: string;
    /** Information that belongs in the overflow reveal rather than in the column itself. */
    detail?: string;
    /** Set when the value points at another object that has a detail route. */
    link?: { resource: string; uuid: string };
}

type ResourceContentData = { resource?: string; uuid?: string; name?: string };

function isFileContentData(data: unknown): data is FileAttributeContentData {
    return typeof data === 'object' && data !== null && 'fileName' in data && 'mimeType' in data;
}

function toResourceValue(item: BaseAttributeContentModel): ListCellValue | undefined {
    const data = (item.data ?? {}) as ResourceContentData;
    const label = item.reference ?? data.name ?? data.uuid;
    if (!label) return undefined;
    const link = data.resource && data.uuid ? { resource: data.resource, uuid: data.uuid } : undefined;
    return { label, ...(link ? { link } : {}) };
}

function toFileValue(item: BaseAttributeContentModel): ListCellValue | undefined {
    if (!isFileContentData(item.data)) return item.reference ? { label: item.reference } : undefined;
    return { label: item.data.fileName, detail: item.data.mimeType };
}

function toLabel(contentType: AttributeContentType, item: BaseAttributeContentModel): string | undefined {
    switch (contentType) {
        case AttributeContentType.String:
        case AttributeContentType.Text:
            // The reference is the human-readable form; the data is the stored code behind it.
            return item.reference ?? String(item.data);
        case AttributeContentType.Integer:
        case AttributeContentType.Float:
            return String(item.data);
        case AttributeContentType.Boolean:
            // 'true' / 'false' is developer-facing copy; a column reads as a table of answers.
            return item.data ? 'Yes' : 'No';
        case AttributeContentType.Date:
            return getFormattedDate(String(item.data));
        case AttributeContentType.Datetime:
            return getFormattedDateTime(String(item.data));
        case AttributeContentType.Time:
            return String(item.data);
        case AttributeContentType.Credential:
        case AttributeContentType.Object:
            // Never the raw object: it is unbounded, and a column has one line.
            return item.reference;
        case AttributeContentType.Secret:
            // Unreachable through the picker — the catalogue marks secrets displayable=false — but
            // masked rather than rendered, so no path can put one on screen.
            return '*****';
        case AttributeContentType.Codeblock:
            // Also unreachable, and deliberately not rendered: getAttributeContent returns a
            // <CodeBlock> for these, which is multi-line by construction and breaks the row rule.
            return 'Code block';
        default:
            return undefined;
    }
}

/**
 * The values an attribute contributes to a list cell, one entry per content item in `item_order`.
 * A detail page and a table column want different things from the same content, so this deviates
 * from `getAttributeContent` where the column needs it to — notably files, booleans and objects.
 *
 * An item that has nothing presentable is dropped rather than rendered blank, so a cell left with
 * no values resolves to the empty state.
 */
export function getListCellValues(contentType: AttributeContentType, content: BaseAttributeContentModel[] | undefined): ListCellValue[] {
    if (!content || content.length === 0) return [];

    return content.reduce<ListCellValue[]>((values, item) => {
        let value: ListCellValue | undefined;
        if (contentType === AttributeContentType.Resource) value = toResourceValue(item);
        else if (contentType === AttributeContentType.File) value = toFileValue(item);
        else {
            const label = toLabel(contentType, item);
            value = label ? { label } : undefined;
        }
        if (value) values.push(value);
        return values;
    }, []);
}
