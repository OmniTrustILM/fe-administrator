import { FilterFieldSource } from 'types/openapi';
import type { ColumnDefinition, SourcedCatalogueField } from 'types/tableColumns';
import { groupCatalogueFields, matchesFieldSearch } from 'utils/columnPicker';
import { getColumnHeading, getColumnKey } from 'utils/tableColumns';

/** The order the menu lays the sources out in, left to right. */
export const MENU_SOURCE_ORDER: readonly FilterFieldSource[] = [
    FilterFieldSource.Custom,
    FilterFieldSource.Meta,
    FilterFieldSource.Data,
    FilterFieldSource.Property,
];

export interface MenuSourceColumn {
    source: FilterFieldSource;
    /** The fields left after the search, minus the ones the table is already showing. */
    fields: SourcedCatalogueField[];
    /** Whether the source publishes anything at all, which is what tells an empty search from a barren source. */
    isPublishing: boolean;
    /** Whether the source has fields but every one of them is already a column, which reads as neither. */
    isExhausted: boolean;
}

export interface MenuContents {
    /**
     * The columns the table is showing, as catalogue fields, in display order. A column the catalogue
     * does not publish is built from the column itself, so it can still be taken off here.
     */
    shown: SourcedCatalogueField[];
    sources: MenuSourceColumn[];
}

/**
 * The catalogue as the menu shows it: what is already on the table first, then the four source
 * columns holding everything else.
 *
 * A shown field is taken out of its source column rather than rendered checked in both places — with
 * a dozen columns spread across four lists, "what am I showing?" is otherwise unanswerable without
 * reading all four.
 *
 * Every source gets a column whether or not it has fields left to put in it: a search that empties
 * one column must not shift the other three sideways, and a resource with no custom attributes should
 * say so where they would have been.
 */
export function toMenuContents(fields: SourcedCatalogueField[], columns: ColumnDefinition[], search: string): MenuContents {
    const byKey = new Map(fields.map((field) => [getColumnKey(field), field]));

    // Built from the columns themselves, enriched from the catalogue where it publishes a match. A
    // platform column the catalogue does not carry — the keys inventory ships one — is still on the
    // table, and this section is the only place it can be taken off again.
    const onTable = columns.map((column) => {
        const published = byKey.get(getColumnKey(column));
        // Headed the way the table heads it, published or not: listing a renamed column under its
        // catalogue name makes the section disagree with the header, and puts it out of reach of a
        // search for the name the operator gave it.
        return {
            ...(published ?? { fieldSource: column.fieldSource, fieldIdentifier: column.fieldIdentifier }),
            fieldLabel: getColumnHeading(column),
        } as SourcedCatalogueField;
    });

    // Taken out of the source columns whether or not the search keeps them in the shown section, or a
    // search that hides a column from the top would put it back among the fields on offer.
    const shownKeys = new Set(onTable.map(getColumnKey));
    const remaining = fields.filter((field) => !shownKeys.has(getColumnKey(field)));
    const shown = onTable.filter((field) => matchesFieldSearch(field, search));
    const matched = new Map(groupCatalogueFields(remaining, search).map((group) => [group.source, group.fields]));

    return {
        shown,
        sources: MENU_SOURCE_ORDER.map((source) => ({
            source,
            fields: matched.get(source) ?? [],
            isPublishing: fields.some((field) => field.fieldSource === source),
            isExhausted: !remaining.some((field) => field.fieldSource === source),
        })),
    };
}
