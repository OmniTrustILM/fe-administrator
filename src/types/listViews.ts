import type { ColumnSort } from 'utils/tableColumns';
import type { SearchFilterModel } from './certificate';
import type { ColumnDefinition, PickerColumn } from './tableColumns';

export type {
    ListViewColumnDto,
    ListViewColumnDto as ListViewColumnModel,
    ListViewDto,
    ListViewDto as ListViewModel,
    ListViewRequestDto,
    ListViewRequestDto as ListViewRequestModel,
    ListViewUpdateRequestDto,
    ListViewUpdateRequestDto as ListViewUpdateRequestModel,
    SearchSortRequestDto,
    SearchSortRequestDto as SearchSortModel,
} from './openapi';

export { SortDirection } from './openapi';

/**
 * The slice of a listing a view describes. A tab is read as a promise about which rows are shown and
 * not only which headings, so the three travel together: applying a view applies all three at once.
 */
export interface ViewSlice {
    columns: ColumnDefinition[];
    filters: SearchFilterModel[];
    sort?: ColumnSort;
}

/**
 * A stored view resolved against the live column catalogue.
 *
 * A view names `(fieldSource, fieldIdentifier)` pairs, so a deleted custom attribute — or a connector
 * that renames a metadata identifier — leaves a column that resolves to nothing. The API resolves the
 * same pairs on read and omits the ones it cannot offer, so what arrives is a view already shortened;
 * a view built entirely on since-deleted fields arrives with no columns at all, which is the case
 * `fellBackToStandard` exists for.
 */
export interface ResolvedView {
    /** Every stored column in its stored order, available or not. What the picker edits. */
    columns: PickerColumn[];
    /** The columns the table renders: the available ones, or the platform set when none resolved. */
    renderable: ColumnDefinition[];
    /** Whether nothing resolved at all, so the render fell back to the platform column set. */
    fellBackToStandard: boolean;
}
