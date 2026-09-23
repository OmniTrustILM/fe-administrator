import type { BaseAttributeContentModel } from './attributes';
import type { AttributeContentType, FilterFieldSource, FilterFieldType, SearchFieldDataDto } from './openapi';

/**
 * Attribute values a listing entry carries for the columns that were requested, nested by field
 * source and then by field identifier. Mirrors `AttributeProjectable` from the list API contract:
 * an identifier is unique only within its source, so the map is nested rather than keyed by a
 * composite `"source:identifier"` string.
 */
export type ProjectedAttributeValues = Partial<Record<FilterFieldSource, Record<string, BaseAttributeContentModel[]>>>;

/** A listing entry that can carry projected attribute values. */
export interface AttributeProjectable {
    attributeValues?: ProjectedAttributeValues;
}

/**
 * One column of a listing table, resolved from the filter-field catalogue and, for a saved view,
 * from the stored column list.
 */
export interface ColumnDefinition {
    fieldSource: FilterFieldSource;
    fieldIdentifier: string;
    /** Label the catalogue reports for the field. */
    catalogueLabel: string;
    /** Per-view heading override. Absent means the column follows the catalogue. */
    label?: string;
    type?: FilterFieldType;
    attributeContentType?: AttributeContentType;
    sortable?: boolean;
    multiValue?: boolean;
    align?: 'left' | 'center' | 'right';
}

/**
 * A catalogue field paired with the source it was published under. An identifier is unique only
 * within its source, and the catalogue publishes the source per group rather than per field.
 */
export interface SourcedCatalogueField extends SearchFieldDataDto {
    fieldSource: FilterFieldSource;
}

/**
 * A stored column resolved against the catalogue. `available: false` marks one whose field the
 * catalogue no longer publishes — a deleted custom attribute, or a renamed metadata identifier.
 */
export interface PickerColumn extends ColumnDefinition {
    available: boolean;
}
