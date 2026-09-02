import type { SearchFilterModel } from 'types/certificate';
import {
    type ListViewColumnModel,
    type ListViewModel,
    type ListViewRequestModel,
    type ListViewUpdateRequestModel,
    type ResolvedView,
    type SearchSortModel,
    SortDirection,
    type ViewSlice,
} from 'types/listViews';
import { AttributeContentType, type Resource, type SearchFieldDataByGroupDto } from 'types/openapi';
import type { ColumnDefinition, PickerColumn, SourcedCatalogueField } from 'types/tableColumns';
import { resolveColumns } from './columnPicker';
import { type ColumnSort, getColumnHeading, getColumnKey, getSortKey } from './tableColumns';

/**
 * The identity of the Standard tab. Standard is the platform default column set, and deliberately not
 * a stored row — which is what makes "always present and never removable" fall out of the model
 * rather than needing a protected-row rule. There is nothing to delete.
 *
 * A stored view is addressed by its UUID, so this cannot collide with one.
 */
export const STANDARD_VIEW_ID = 'standard';

/**
 * How many tabs the strip shows before the rest roll into an overflow menu. Tabs are excellent at
 * four views and unusable at twelve, and on these pages the strip competes with the filter widget for
 * vertical space.
 */
export const MAX_VISIBLE_TABS = 5;

/** One entry of the tab strip, Standard included. */
export interface ViewTab {
    /** {@link STANDARD_VIEW_ID} for Standard, otherwise the stored view's UUID. */
    id: string;
    name: string;
    isStandard: boolean;
    /** Whether this is the tab that opens on load. Standard is pinned only when no stored view is. */
    isPinned: boolean;
}

/** The tab strip split into what it shows and what its overflow menu holds. */
export interface TabSplit {
    visible: ViewTab[];
    overflow: ViewTab[];
}

/** The name Standard is offered under. Not "Default", which is kept free to mean "opens on load". */
export const STANDARD_VIEW_NAME = 'Standard';

/** The stored view that opens on load, if any. */
function findPinned(views: readonly ListViewModel[]): ListViewModel | undefined {
    return views.find((view) => view.defaultView);
}

/**
 * The tab strip: Standard first, then the stored views in the order the API returned them.
 *
 * Standard carries the pin only when no stored view does, because that is exactly when it is the view
 * that opens — `defaultView` on a stored row and "Standard opens" are one state, not two.
 */
export function toTabs(views: readonly ListViewModel[]): ViewTab[] {
    const pinned = findPinned(views);

    return [
        { id: STANDARD_VIEW_ID, name: STANDARD_VIEW_NAME, isStandard: true, isPinned: pinned === undefined },
        ...views.map((view) => ({ id: view.uuid, name: view.name, isStandard: false, isPinned: view === pinned })),
    ];
}

/**
 * The tab that opens on load: the pinned stored view, or Standard when none is pinned.
 */
export function resolveInitialViewId(views: readonly ListViewModel[]): string {
    return findPinned(views)?.uuid ?? STANDARD_VIEW_ID;
}

/**
 * The strip split at the visible cap, with the active tab always on the visible side.
 *
 * Pulling the active tab forward matters more than preserving order: selecting a view from the
 * overflow menu would otherwise leave the strip with no tab marked active, and the user looking at a
 * table that no tab claims. The tab it displaces goes to the front of the overflow rather than the
 * back, so it is the first thing found again.
 */
export function splitTabs(tabs: readonly ViewTab[], activeId: string, cap: number = MAX_VISIBLE_TABS): TabSplit {
    const limit = Math.max(1, cap);
    if (tabs.length <= limit) return { visible: [...tabs], overflow: [] };

    const visible = tabs.slice(0, limit);
    const overflow = tabs.slice(limit);

    const activeIndex = overflow.findIndex((tab) => tab.id === activeId);
    if (activeIndex === -1) return { visible, overflow };

    const displaced = visible[limit - 1];
    return {
        visible: [...visible.slice(0, limit - 1), overflow[activeIndex]],
        overflow: [displaced, ...overflow.slice(0, activeIndex), ...overflow.slice(activeIndex + 1)],
    };
}

/**
 * The name a duplicate is auto-named with, so duplicating never interrupts with a dialog.
 *
 * Names are unique per user and resource, so `<name> (copy)` alone would fail the second time. A
 * numeric suffix is appended rather than stacking `(copy) (copy)`, which reads as an accident.
 */
export function duplicateName(name: string, existing: readonly string[]): string {
    const taken = new Set(existing);
    const base = `${name} (copy)`;
    if (!taken.has(base)) return base;

    for (let suffix = 2; ; suffix++) {
        const candidate = `${base} ${suffix}`;
        if (!taken.has(candidate)) return candidate;
    }
}

/** A stored sort as the table expresses one. */
export function toColumnSort(sort: SearchSortModel | undefined): ColumnSort | undefined {
    if (!sort) return undefined;
    return {
        fieldSource: sort.fieldSource,
        fieldIdentifier: sort.fieldIdentifier,
        direction: sort.direction === SortDirection.Desc ? 'desc' : 'asc',
    };
}

/** The table's sort in the shape a view stores. */
export function toStoredSort(sort: ColumnSort | undefined): SearchSortModel | undefined {
    if (!sort) return undefined;
    return {
        fieldSource: sort.fieldSource,
        fieldIdentifier: sort.fieldIdentifier,
        direction: sort.direction === 'desc' ? SortDirection.Desc : SortDirection.Asc,
    };
}

/**
 * A column list in the shape a view stores: source, identifier and the heading override, and nothing
 * else. Everything the catalogue supplies is resolved on read, so storing it would only let a stored
 * view drift from a field that was relabelled since.
 */
export function toStoredColumns(columns: readonly ColumnDefinition[]): ListViewColumnModel[] {
    return columns.map((column) => ({
        fieldSource: column.fieldSource,
        fieldIdentifier: column.fieldIdentifier,
        ...(column.label ? { label: column.label } : {}),
    }));
}

/** Whether a filter carries a value at all, as opposed to testing only for presence or emptiness. */
function carriesValue(filter: SearchFilterModel): boolean {
    if (filter.value === undefined || filter.value === null || filter.value === '') return false;
    return !(Array.isArray(filter.value) && filter.value.length === 0);
}

/**
 * The `(source, identifier)` keys of the catalogue fields whose content the platform holds as a
 * secret.
 *
 * Read from the raw groups rather than from {@link toCatalogueFields}, which keeps only the
 * displayable ones: `displayable` is the flag that keeps secret content out of a column, so a secret
 * field is exactly what that subset no longer contains — while the filter widget still offers it.
 */
function secretFieldKeys(catalogue: readonly SearchFieldDataByGroupDto[]): Set<string> {
    const keys = new Set<string>();

    for (const group of catalogue) {
        for (const field of group.searchFieldData ?? []) {
            if (field.attributeContentType === AttributeContentType.Secret) {
                keys.add(getColumnKey({ fieldSource: group.filterFieldSource, fieldIdentifier: field.fieldIdentifier }));
            }
        }
    }

    return keys;
}

/**
 * The filters a view is allowed to store: every live filter except one carrying a value typed against
 * a field whose content is a secret.
 *
 * A saved view is held verbatim by Core and read back by every client that opens it, so such a value
 * would become a durable plaintext copy of secret material outside the storage that protects it. The
 * filter still applies to the table in front of the user; it is only kept out of what is written
 * back. A presence-only condition on the same field survives, because it carries nothing to leak.
 */
export function toStorableFilters(
    filters: readonly SearchFilterModel[],
    catalogue: readonly SearchFieldDataByGroupDto[],
): SearchFilterModel[] {
    const secret = secretFieldKeys(catalogue);
    if (secret.size === 0) return [...filters];

    return filters.filter((filter) => !(secret.has(getColumnKey(filter)) && carriesValue(filter)));
}

/** Every `(source, identifier)` key the catalogue publishes, `displayable` or not. */
function catalogueKeys(catalogue: readonly SearchFieldDataByGroupDto[]): Set<string> {
    const keys = new Set<string>();

    for (const group of catalogue) {
        for (const field of group.searchFieldData ?? []) {
            keys.add(getColumnKey({ fieldSource: group.filterFieldSource, fieldIdentifier: field.fieldIdentifier }));
        }
    }

    return keys;
}

/**
 * The columns a view is allowed to store: those naming a field the resource's catalogue publishes.
 *
 * A platform default set may show a column the filter-field catalogue does not carry — the keys
 * inventory renders `CKI_ENABLED`, `CKI_CREATED` and `CK_ASSOCIATIONS`, none of which is a
 * `FilterField`. Those columns are display-only. Core validates a stored view against that same
 * catalogue and rejects a create or update naming anything outside it, so keeping them would make
 * duplicating Standard fail outright rather than produce a view. They keep rendering under Standard,
 * which stores nothing at all.
 *
 * Read from the raw groups rather than through {@link toCatalogueFields}, which keeps only the
 * displayable ones: a column the *listing* cannot display is still a column the *API* accepts, and
 * such a column is deliberately kept — see {@link toStoredColumnsKeepingUnavailable}. The two rules
 * do not overlap.
 *
 * An empty catalogue is read as "has not arrived" rather than "publishes nothing", because emptying
 * every view on a failed catalogue read is far worse than sending a column the API may reject.
 */
export function toStorableColumns(
    columns: readonly ListViewColumnModel[],
    catalogue: readonly SearchFieldDataByGroupDto[],
): ListViewColumnModel[] {
    const keys = catalogueKeys(catalogue);
    if (keys.size === 0) return [...columns];

    return columns.filter((column) => keys.has(getColumnKey(column)));
}

/**
 * A stored view's columns resolved against the live catalogue. The authoritative statement of how a
 * stored view is read; everything downstream — {@link ResolvedView}, the notice, the picker — states
 * only what it does with the result.
 *
 * A view names `(fieldSource, fieldIdentifier)` pairs, and two different things can go wrong with
 * one. A field that has been deleted never arrives: `GET /v1/listViews` resolves the stored pairs
 * against the resource's own catalogue and omits what it cannot offer, so a view built entirely on
 * deleted fields arrives with no columns at all — which is the case `fellBackToStandard` exists for,
 * and the only reachable one, since nothing is left to name. A column the *listing* cannot display —
 * a secret's content, an encrypted value — does arrive intact, because the catalogue the API
 * validates a view against carries no notion of `displayable`; it is kept in place and marked
 * unavailable rather than dropped, so it can be named and reviewed instead of vanishing.
 *
 * @param standardColumns the platform default set, which both supplies columns the filter-field
 * catalogue does not publish and is what an entirely unresolved view falls back to.
 */
export function resolveView(
    stored: readonly ListViewColumnModel[],
    fields: readonly SourcedCatalogueField[],
    standardColumns: readonly ColumnDefinition[],
): ResolvedView {
    const asDefinitions = stored.map((column) => ({
        fieldSource: column.fieldSource,
        fieldIdentifier: column.fieldIdentifier,
        // A stand-in until the catalogue answers. An unresolved column shows its identifier instead,
        // which is what tells an administrator what the column used to be.
        catalogueLabel: column.label ?? column.fieldIdentifier,
        ...(column.label ? { label: column.label } : {}),
    }));

    const columns = resolveColumns(asDefinitions, [...fields], standardColumns);
    const available = columns.filter((column) => column.available);

    // Nothing renderable falls back to the platform set rather than to a table with no columns at all.
    const fellBackToStandard = available.length === 0;

    return {
        columns,
        renderable: fellBackToStandard ? [...standardColumns] : available.map(toDefinition),
        fellBackToStandard,
    };
}

/** A resolved column without the picker's availability marker, which the table has no use for. */
function toDefinition({ available, ...definition }: PickerColumn): ColumnDefinition {
    return definition;
}

/** The slice a stored view describes, resolved against the live catalogue. */
export function toViewSlice(
    view: ListViewModel,
    fields: readonly SourcedCatalogueField[],
    standardColumns: readonly ColumnDefinition[],
): ViewSlice {
    return {
        columns: resolveView(view.columns, fields, standardColumns).renderable,
        filters: view.filters ?? [],
        sort: toColumnSort(view.sort),
    };
}

/** The Standard tab's own slice: the platform columns, no filters and no ordering of its own. */
export function toStandardSlice(standardColumns: readonly ColumnDefinition[]): ViewSlice {
    return { columns: [...standardColumns], filters: [], sort: undefined };
}

/** A column list reduced to what a view actually stores, so two can be compared for equality. */
function columnSignature(columns: readonly ColumnDefinition[]): string {
    return JSON.stringify(columns.map((column) => [getColumnKey(column), getColumnHeading(column)]));
}

/** A filter list reduced to its four stored fields, so key order in the object cannot matter. */
function filterSignature(filters: readonly SearchFilterModel[]): string {
    return JSON.stringify(filters.map((filter) => [filter.fieldSource, filter.fieldIdentifier, filter.condition, filter.value ?? null]));
}

function sortSignature(sort: ColumnSort | undefined): string {
    return sort ? `${getSortKey(sort)}:${sort.direction}` : '';
}

/**
 * Whether the table has drifted from the view behind the active tab.
 *
 * Sorting and filtering are edits to the view, so both mark the tab and offer Revert / Save to view.
 * Never autosaved: a view is the thing a user comes back to, and a stray click on a header should not
 * quietly redefine "Expiry watch".
 */
export function isSliceDirty(stored: ViewSlice, current: ViewSlice): boolean {
    return (
        columnSignature(stored.columns) !== columnSignature(current.columns) ||
        filterSignature(stored.filters) !== filterSignature(current.filters) ||
        sortSignature(stored.sort) !== sortSignature(current.sort)
    );
}

/**
 * The stored column list a full-row save carries: what the table renders, with the stored columns it
 * cannot render put back at the positions they were stored at.
 *
 * Saving an ordering or a filter must not drop a column the listing cannot display. The table never
 * showed it, so the user was never offered the choice — the column picker is the one place such a
 * column is removed, because it is the one place it is shown.
 */
export function toStoredColumnsKeepingUnavailable(
    rendered: readonly ColumnDefinition[],
    resolved: readonly PickerColumn[],
): ListViewColumnModel[] {
    const stored = toStoredColumns(rendered);

    resolved.forEach((column, index) => {
        if (column.available) return;
        stored.splice(Math.min(index, stored.length), 0, ...toStoredColumns([column]));
    });

    return stored;
}

/**
 * A create request for a new view holding the given slice.
 *
 * The catalogue is required for the same reason {@link toUpdateRequest} requires it: both sieves run
 * on every write, so no path can store a column the API would reject or a filter value the storage
 * does not protect. See {@link toStorableColumns} and {@link toStorableFilters}.
 */
export function toCreateRequest(
    name: string,
    resource: Resource,
    slice: ViewSlice,
    catalogue: readonly SearchFieldDataByGroupDto[],
    defaultView = false,
): ListViewRequestModel {
    return {
        name,
        resource,
        columns: toStorableColumns(toStoredColumns(slice.columns), catalogue),
        filters: toStorableFilters(slice.filters, catalogue),
        sort: toStoredSort(slice.sort),
        defaultView,
    };
}

/**
 * An update request for a stored view.
 *
 * The API replaces the whole row, so every field it does not mean to change has to be sent back as it
 * stands. A rename that omitted the columns would empty the view.
 *
 * Which is why the catalogue is required rather than optional: a rename, a pin or a column edit sends
 * the stored filters back untouched, and a view that arrived carrying a secret-valued filter — written
 * by a client that predates this rule, or by one that does not apply it — would have that plaintext
 * rewritten on every one of them. The whole row is filtered on the way out, the patch included, so
 * there is no update path left that can carry such a value. See {@link toStorableFilters}.
 *
 * The columns go through the same treatment for a different reason: a column the catalogue does not
 * publish cannot be validated, so the API rejects the whole request. See {@link toStorableColumns}.
 */
export function toUpdateRequest(
    view: ListViewModel,
    catalogue: readonly SearchFieldDataByGroupDto[],
    patch: Partial<ListViewUpdateRequestModel> = {},
): ListViewUpdateRequestModel {
    const row: ListViewUpdateRequestModel = {
        name: view.name,
        columns: view.columns,
        filters: view.filters,
        sort: view.sort,
        defaultView: view.defaultView,
        ...patch,
    };

    return {
        ...row,
        columns: toStorableColumns(row.columns ?? [], catalogue),
        filters: toStorableFilters(row.filters ?? [], catalogue),
    };
}
