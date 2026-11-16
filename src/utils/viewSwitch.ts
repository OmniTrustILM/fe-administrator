import type { ViewSlice } from 'types/listViews';
import { getFilterKey } from './listViews';
import { getSortKey } from './tableColumns';

/**
 * What a view switch did to the filters or the ordering: put the view's own in place, took them off because it carries
 * none, or took them off because the page could not apply the view's own, e.g. an ordering on a column it does not show.
 */
export type ListingChange = 'applied' | 'cleared' | 'unavailable';

export interface ViewSwitchChanges {
    filters?: ListingChange;
    sort?: ListingChange;
}

type Listing = Pick<ViewSlice, 'filters' | 'sort'>;

// Order-insensitive: Core combines filters with AND, so the same filters in another order list the same rows.
const filterSetSignature = (filters: Listing['filters']): string =>
    JSON.stringify(filters.map(getFilterKey).sort((a, b) => a.localeCompare(b)));

const sortSignature = (sort: Listing['sort']): string => (sort ? `${getSortKey(sort)}:${sort.direction}` : '');

/** Which rows a table lists and in which order, reduced to a string so two listings can be compared. */
export function listingSignature({ filters, sort }: Listing): string {
    return JSON.stringify([filterSetSignature(filters), sortSignature(sort)]);
}

const toChange = (carries: boolean, lands: boolean): ListingChange => {
    if (!carries) return 'cleared';
    return lands ? 'applied' : 'unavailable';
};

/**
 * How switching from the listing `from` to the listing the page `landed` on changes the filters and the ordering, told
 * apart by what the view `carried`: the page may not apply all of it, so the landed listing alone cannot say why.
 */
export function toViewSwitchChanges(from: Listing, landed: Listing, carried: Listing): ViewSwitchChanges {
    const changes: ViewSwitchChanges = {};
    if (filterSetSignature(from.filters) !== filterSetSignature(landed.filters)) {
        changes.filters = toChange(carried.filters.length > 0, landed.filters.length > 0);
    }
    if (sortSignature(from.sort) !== sortSignature(landed.sort))
        changes.sort = toChange(carried.sort !== undefined, landed.sort !== undefined);
    return changes;
}

const NOUNS: Record<keyof ViewSwitchChanges, string> = { filters: 'filters', sort: 'ordering' };

/** The sentence reporting a view switch, or `undefined` when the switch left the filters and the ordering as they were. */
export function describeViewSwitch(viewName: string, changes: ViewSwitchChanges): string | undefined {
    const nouns = (change: ListingChange) =>
        (['filters', 'sort'] as const)
            .filter((part) => changes[part] === change)
            .map((part) => NOUNS[part])
            .join(' and ');
    const applied = nouns('applied');
    const cleared = nouns('cleared');
    const unavailable = nouns('unavailable');

    const clauses = [
        ...(applied ? [`applied its ${applied}`] : []),
        ...(cleared ? [`cleared the ${cleared}, as it carries none`] : []),
        ...(unavailable ? [`cleared the ${unavailable}, as its own cannot be applied here`] : []),
    ];
    return clauses.length > 0 ? `Switching to "${viewName}" ${clauses.join(' and ')}.` : undefined;
}
