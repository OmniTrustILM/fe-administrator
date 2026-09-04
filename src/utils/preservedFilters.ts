/**
 * When a list page should put a deep link's filters back.
 *
 * A link from elsewhere in the application - a dashboard tile, a certificate's detail page - carries
 * the filters it wants shown. They reach the page as `preservedFilters`, and sometimes as the current
 * filters as well, depending on the link. Either way they have to be applied once and then never
 * again: an empty filter set afterwards is a deliberate choice, so a restore that stayed armed would
 * put the link's conditions back the moment a tab switch cleared them, and go on doing it.
 *
 * The subtlety this exists to make explicit is that "applied" includes "was already applied". A link
 * that populated the current filters itself leaves nothing to do, but the restore is finished all the
 * same, and recording that is what stops it firing later against the user's own act.
 */
export type PreservedFilterRestore =
    /** Put the preserved filters into the current filters, and record the restore as done. */
    | 'restore'
    /** Nothing to apply, but the restore is done: the filters are already the ones the link asked for. */
    | 'settled'
    /** Not a deep-link arrival at all. The restore stays armed, because it has not happened. */
    | 'inapplicable';

export const preservedFilterRestore = ({
    withPreservedFilters,
    preservedCount,
    currentCount,
}: {
    /** Whether the page honours deep-link filters at all - a picker mounted inside a dialog does not. */
    withPreservedFilters: boolean;
    preservedCount: number;
    currentCount: number;
}): PreservedFilterRestore => {
    if (!withPreservedFilters || preservedCount === 0) {
        return 'inapplicable';
    }

    return currentCount === 0 ? 'restore' : 'settled';
};
