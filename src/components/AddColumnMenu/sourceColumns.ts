import { FilterFieldSource } from 'types/openapi';
import type { SourcedCatalogueField } from 'types/tableColumns';
import { groupCatalogueFields } from 'utils/columnPicker';

/** The order the menu lays the sources out in, left to right. */
export const MENU_SOURCE_ORDER: readonly FilterFieldSource[] = [
    FilterFieldSource.Custom,
    FilterFieldSource.Meta,
    FilterFieldSource.Data,
    FilterFieldSource.Property,
];

export interface MenuSourceColumn {
    source: FilterFieldSource;
    /** The fields left after the search. */
    fields: SourcedCatalogueField[];
    /** Whether the source publishes anything at all, which is what tells an empty search from a barren source. */
    isPublishing: boolean;
}

/**
 * The catalogue as the menu's four columns. Every source gets a column whether or not it has fields
 * to put in it: a search that empties one column must not shift the other three sideways, and a
 * resource with no custom attributes should say so where they would have been.
 */
export function toMenuColumns(fields: SourcedCatalogueField[], search: string): MenuSourceColumn[] {
    const matched = new Map(groupCatalogueFields(fields, search).map((group) => [group.source, group.fields]));

    return MENU_SOURCE_ORDER.map((source) => ({
        source,
        fields: matched.get(source) ?? [],
        isPublishing: fields.some((field) => field.fieldSource === source),
    }));
}
