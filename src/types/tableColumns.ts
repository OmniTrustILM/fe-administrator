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
 * A field the column catalogue offers, i.e. `GET /v1/{resource}/search` extended with the two flags
 * the list contract added.
 *
 * They are declared here rather than read off the generated DTO because regenerating
 * `src/types/openapi` currently pulls an unrelated platform bump that does not compile. Both are
 * optional and typed exactly as the contract declares them, so this becomes redundant — not wrong —
 * once the generated types catch up.
 */
export interface ColumnCatalogueField extends SearchFieldDataDto {
    /** Whether the field may be requested as a column of the listing. */
    displayable?: boolean;
    /** Whether the listing may be ordered by the field. */
    sortable?: boolean;
}

/** A catalogue field paired with the source it was published under. */
export interface SourcedCatalogueField extends ColumnCatalogueField {
    fieldSource: FilterFieldSource;
}

/**
 * A column in the picker's selected list. `available: false` marks a stored column whose field the
 * catalogue no longer publishes — a deleted custom attribute, or a renamed metadata identifier.
 */
export interface PickerColumn extends ColumnDefinition {
    available: boolean;
}
