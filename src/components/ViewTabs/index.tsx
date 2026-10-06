import Dialog from 'components/Dialog';
import Dropdown, { type DropdownItem } from 'components/Dropdown';
import SimpleBar from 'components/SimpleBar';
import type { HandedInFilters, ViewPosition } from 'ducks/filters';
import { actions as listViewActions, PENDING_VIEW_UUID, selectors as listViewSelectors } from 'ducks/listViews';
import { ChevronDown, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { SearchFilterModel } from 'types/certificate';
import type { ListViewModel, ListViewRequestModel, ViewSlice } from 'types/listViews';
import type { Resource, SearchFieldDataByGroupDto } from 'types/openapi';
import type { ColumnDefinition, PickerColumn } from 'types/tableColumns';
import { toCatalogueFields } from 'utils/columnPicker';
import {
    catalogueKeys,
    STANDARD_VIEW_ID,
    STANDARD_VIEW_NAME,
    duplicateName,
    goneAttributeKeys,
    toDormantKey,
    isSliceDirty,
    newViewName,
    resolveInitialViewId,
    resolveView,
    splitTabs,
    toColumnSort,
    toCreateRequest,
    toStandardSlice,
    toStorableFilters,
    toStoredColumns,
    toStoredColumnsKeepingUnavailable,
    toStoredSort,
    toTabs,
    toUpdateRequest,
    toViewSlice,
    type StoredField,
    type ViewSchema,
    withoutMissingFieldFilters,
    getFilterKey,
    type ViewTab as ViewTabModel,
} from 'utils/listViews';
import { type ColumnSort, getColumnKey, getSortKey } from 'utils/tableColumns';
import NameViewDialog from './NameViewDialog';
import OverflowViewsMenu from './OverflowViewsMenu';
import ReturnedColumnsNotice from './ReturnedColumnsNotice';
import UnresolvedColumnsNotice from './UnresolvedColumnsNotice';
import ViewSummaryBar from './ViewSummaryBar';
import ViewTab from './ViewTab';

export type ViewTabsProps = Readonly<{
    resource: Resource;
    /** The column catalogue for the resource, i.e. `GET /v1/{resource}/search`. */
    catalogue: SearchFieldDataByGroupDto[];
    /**
     * Whether the catalogue read has settled. The strip waits for it, because until then every stored
     * column resolves to nothing. A page re-reading a catalogue it already holds should report the
     * re-read as unsettled, or the strip opens on the copy the re-read is about to replace.
     *
     * A page that tracks its own fetch state should say so here. The fallback reads a non-empty
     * catalogue as an arrived one, which cannot tell a read still in flight from a resource that
     * publishes no filter fields at all — but a catalogue that arrived carrying only fields the
     * listing cannot display is a settled read either way, and the strip must not hide behind it.
     */
    isCatalogueLoaded?: boolean;
    /** The platform default column set for this page, which is what the Standard tab shows. */
    standardColumns: ColumnDefinition[];
    /**
     * The ordering the Standard tab lists under, i.e. the page's declared default. Part of Standard,
     * so returning to the tab restores it and a page opening on it is not reported as drifted.
     */
    standardSort?: ColumnSort;
    /** The column keys the page has a cell renderer for; gates a stored view's columns and the picker. */
    renderableProperties?: ReadonlySet<string>;
    /** The columns the table is showing, which a saved view may since have drifted from. */
    columns: ColumnDefinition[];
    /** The filters the table is listing under. A view carries its filters, so they can drift too. */
    filters: SearchFilterModel[];
    /** The ordering the table is listing under. */
    sort?: ColumnSort;
    /**
     * Filters handed in for the strip to open on instead of its opening view's own. A drill-down opens on
     * Standard with its filters, reported as Standard's unsaved changes: Standard cannot hold them, so the
     * only save offered is a new view and no stored view is ever written with filters its owner never set.
     * A return goes back to the position the strip was left in, or to Standard when that view is gone.
     */
    handedIn?: HandedInFilters;
    /** Reports where the strip stands, for a return from a detail page to come back to. */
    onPositionChange?: (position: ViewPosition) => void;
    /**
     * Applies a view: its columns, its filters and its ordering, together. The caller is expected to
     * return to page 1 and clear its row selection — the filters change which rows exist, so a
     * carried-over selection would span rows the user can no longer see.
     */
    onApply: (slice: ViewSlice) => void;
    dataTestId?: string;
}>;

type PendingDialog = 'rename' | 'create' | 'new' | 'delete';

const NO_KEYS: ReadonlySet<string> = new Set();

/**
 * Whether the strip is up, given a settled view list and a settled catalogue. A host withholding its
 * own column controls has to ask the same question, or a change made before the opening view lands is
 * applied and then silently undone.
 *
 * Why the strip waits for both is written down on `isReady` below.
 */
export function isViewStripReady(hasLoadedViews: boolean, isCatalogueLoaded: boolean): boolean {
    return hasLoadedViews && isCatalogueLoaded;
}

const filtersKey = (filters: readonly SearchFilterModel[]) => filters.map(getFilterKey).join('\n');

/** `live` with each of `dropped` put back at the index it held in `original`, unless `live` already has it. */
function reinsert<T>(live: readonly T[], dropped: readonly T[], original: readonly T[], keyOf: (item: T) => string): T[] {
    const result = [...live];
    for (const item of dropped) {
        if (result.some((each) => keyOf(each) === keyOf(item))) continue;
        result.splice(Math.min(original.indexOf(item), result.length), 0, item);
    }
    return result;
}

/**
 * `live` with the `stored` filters put back, except on a field `live` already filters by. The user's filter replaces
 * the stored ones there: Core combines filters with AND, so keeping both would list under two values of one field.
 */
function reinsertStoredFilters(
    live: readonly SearchFilterModel[],
    stored: readonly SearchFilterModel[],
    original: readonly SearchFilterModel[],
): SearchFilterModel[] {
    const ownKeys = new Set(live.map(getColumnKey));
    return reinsert(
        live,
        stored.filter((filter) => !ownKeys.has(getColumnKey(filter))),
        original,
        getFilterKey,
    );
}

/**
 * The saved-view tab strip: one tab per view, above the filter widget because filters are part of
 * each view.
 *
 * The first tab is Standard — the platform column set the page ships with. It is deliberately not a
 * stored row, which is what makes "always present and never removable" fall out of the model rather
 * than needing a protected-row rule: there is nothing to delete, and nothing to hold a rename.
 */
export default function ViewTabs({
    resource,
    catalogue,
    isCatalogueLoaded,
    standardColumns,
    standardSort,
    renderableProperties,
    columns,
    filters,
    sort,
    handedIn,
    onPositionChange,
    onApply,
    dataTestId = 'view-tabs',
}: ViewTabsProps) {
    const dispatch = useDispatch();

    const views = useSelector(listViewSelectors.views(resource));
    const hasLoaded = useSelector(listViewSelectors.hasLoaded(resource));
    const isFetching = useSelector(listViewSelectors.isFetching(resource));
    const isMutating = useSelector(listViewSelectors.isMutating(resource));
    const isStale = useSelector(listViewSelectors.isStale(resource));
    const createdUuid = useSelector(listViewSelectors.createdUuid(resource));
    const dormantFields = useSelector(listViewSelectors.dormantFields(resource));
    const confirmingFields = useSelector(listViewSelectors.confirming(resource));

    const [activeId, setActiveId] = useState(STANDARD_VIEW_ID);
    // The filters a drill-down opened Standard on, kept to tell the Dashboard's filters from the user's own edits.
    const [drillDownFilters, setDrillDownFilters] = useState<SearchFilterModel[] | undefined>(undefined);
    const [dialog, setDialog] = useState<PendingDialog | undefined>(undefined);
    const [requestedFor, setRequestedFor] = useState<Resource | undefined>(undefined);
    const [dismissedNotices, setDismissedNotices] = useState<ReadonlySet<string>>(() => new Set());
    const [targetId, setTargetId] = useState<string | undefined>(undefined);

    const catalogueFields = useMemo(() => toCatalogueFields(catalogue, renderableProperties), [catalogue, renderableProperties]);
    const dormant = useMemo<ReadonlySet<string>>(() => new Set(dormantFields), [dormantFields]);

    // A field seen gone from a view and published again resolves no column of that view until the user confirms it.
    const fieldsFor = useCallback(
        (view: ListViewModel | undefined) =>
            !view || dormant.size === 0 ? catalogueFields : catalogueFields.filter((field) => !dormant.has(toDormantKey(view.uuid, field))),
        [catalogueFields, dormant],
    );

    /**
     * The column keys of a view's held-back fields, published again and not yet confirmed. Judged against every
     * published field, not only the displayable ones: a filter on a field the listing cannot show still narrows it.
     */
    const heldKeysOf = useCallback(
        (view: ListViewModel | undefined): ReadonlySet<string> => {
            if (!view || dormant.size === 0) return NO_KEYS;
            const published = catalogueKeys(catalogue);
            return new Set(
                view.columns
                    .filter((column) => published.has(getColumnKey(column)) && dormant.has(toDormantKey(view.uuid, column)))
                    .map(getColumnKey),
            );
        },
        [catalogue, dormant],
    );

    // A filter on a held-back field is withheld with its column, or it would narrow the list by an attribute nobody confirmed.
    const sliceOf = useCallback(
        (view: ListViewModel): ViewSlice => {
            const slice = toViewSlice(view, fieldsFor(view), standardColumns);
            const heldKeys = heldKeysOf(view);
            return heldKeys.size === 0
                ? slice
                : { ...slice, filters: slice.filters.filter((filter) => !heldKeys.has(getColumnKey(filter))) };
        },
        [fieldsFor, heldKeysOf, standardColumns],
    );

    const schema = useMemo<ViewSchema>(() => ({ catalogue, standardColumns }), [catalogue, standardColumns]);

    /**
     * The strip is held back until the view list has settled and the catalogue has arrived, and shows
     * nothing at all until then.
     *
     * Both halves are load-order bugs waiting to happen otherwise. Without the list, an empty read is
     * indistinguishable from one still in flight, so the first optimistic create would be mistaken for
     * the initial result. Without the catalogue, every stored column resolves to nothing, so applying
     * a view would show the platform columns under that view's name and stay there.
     *
     * The catalogue half is gated on the read having settled and not on it having produced anything:
     * a resource whose catalogue publishes only fields the listing cannot display resolves to no
     * displayable fields at all, and gating on those would hide the strip for good — Standard needs
     * none of them.
     *
     * The list half waits for the read this strip sent, not for any settled one. A page opened again
     * still holds the list from its last visit, and opening on that copy applies a view as it stood
     * then: the read that replaces it moves the stored side and not the table, which reports the
     * difference as an unsaved edit nobody made, and Save to view would then write the old copy back.
     * A read set aside because a write overlapped it leaves that copy in place too, so it is sent again.
     */
    const hasFreshViews = requestedFor === resource && hasLoaded && !isFetching && !isStale;
    const isReady = isViewStripReady(hasFreshViews, isCatalogueLoaded ?? catalogue.length > 0);

    const activeView = useMemo(() => views.find((view) => view.uuid === activeId), [views, activeId]);
    const tabs = useMemo(() => toTabs(views), [views]);
    const { visible, overflow } = useMemo(() => splitTabs(tabs, activeId), [tabs, activeId]);
    const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeId) ?? tabs[0], [tabs, activeId]);

    const resolved = useMemo(
        () => (activeView ? resolveView(activeView.columns, fieldsFor(activeView), standardColumns) : undefined),
        [activeView, fieldsFor, standardColumns],
    );

    const held = useMemo(() => {
        if (!activeView || dormant.size === 0) return [];
        return resolveView(activeView.columns, catalogueFields, standardColumns).columns.filter(
            (column) => column.available && dormant.has(toDormantKey(activeView.uuid, column)),
        );
    }, [activeView, dormant, catalogueFields, standardColumns]);

    /**
     * The active view's stored ordering when it is on a held-back column, published again or not. The table drops an
     * ordering on a column it is not showing, so this one is not an unsaved edit, and a save or a confirmation keeps it.
     */
    const heldSort = useMemo(() => {
        const stored = toColumnSort(activeView?.sort);
        return activeView && stored && dormant.has(toDormantKey(activeView.uuid, stored)) ? stored : undefined;
    }, [activeView, dormant]);

    const heldFilters = useMemo(() => {
        const heldKeys = heldKeysOf(activeView);
        return activeView?.filters?.filter((filter) => heldKeys.has(getColumnKey(filter))) ?? [];
    }, [activeView, heldKeysOf]);

    /**
     * The slice behind the active tab, which drift is measured against.
     *
     * Its filters are put through the same sieve as the live ones. A stored view can carry a filter
     * this client would never write — one from a client that predates the rule — and comparing the
     * sieved live filters against unsieved stored ones would report that view as permanently drifted,
     * offering a Save that changes nothing.
     */
    const storedSlice = useMemo(() => {
        if (!activeView) return toStandardSlice(standardColumns, standardSort);

        const slice = sliceOf(activeView);
        return {
            ...slice,
            filters: toStorableFilters(slice.filters, catalogue, activeView.filters ?? []),
            sort: heldSort ? undefined : slice.sort,
        };
    }, [activeView, sliceOf, standardColumns, standardSort, catalogue, heldSort]);

    const returned = useMemo(() => {
        const shown = new Set(columns.map(getColumnKey));
        return held.filter((column) => !shown.has(getColumnKey(column)));
    }, [held, columns]);

    // Not one the user has filtered by themselves since: the list is then filtered by that field.
    const unfiltered = useMemo(() => {
        const heldKeys = new Set(heldFilters.map(getColumnKey));
        const userKeys = new Set(filters.map(getColumnKey));
        return returned.filter((column) => heldKeys.has(getColumnKey(column)) && !userKeys.has(getColumnKey(column)));
    }, [returned, heldFilters, filters]);

    /** The stored columns this table cannot render, which the notice names. */
    const unavailable = useMemo(() => {
        const heldKeys = new Set(held.map(getColumnKey));
        return resolved?.columns.filter((column) => !column.available && !heldKeys.has(getColumnKey(column))) ?? [];
    }, [resolved, held]);

    // A dismissal holds for the view and the columns it named, so a column that goes missing later is reported again.
    const noticeKey = useMemo(
        () => (activeView ? [activeView.uuid, ...unavailable.map(getColumnKey)].join('|') : undefined),
        [activeView, unavailable],
    );

    /**
     * The live filters minus the ones a view must not carry, which is what a view is compared against
     * and what a save writes back. See {@link toStorableFilters}: a filter value typed against secret
     * content would otherwise be copied into storage that does not protect it, and a filter on a field
     * that has left the catalogue is refused unless the active view already filters on it.
     */
    const storableFilters = useMemo(
        () => toStorableFilters(filters, catalogue, activeView?.filters ?? []),
        [filters, catalogue, activeView],
    );

    const currentSlice = useMemo<ViewSlice>(() => ({ columns, filters: storableFilters, sort }), [columns, storableFilters, sort]);
    const isDirty = isSliceDirty(storedSlice, currentSlice, activeView ? 'view' : 'standard');
    const liveFiltersKey = filtersKey(filters);
    const isDrillDown = activeId === STANDARD_VIEW_ID && drillDownFilters !== undefined && liveFiltersKey === filtersKey(drillDownFilters);

    // An edit makes the filters the user's own for good, so editing them back does not hand them to the Dashboard again.
    // Only on a filter change: a failed create can put the snapshot back a render before the filters it matches.
    useEffect(() => {
        setDrillDownFilters((snapshot) => (snapshot && filtersKey(snapshot) !== liveFiltersKey ? undefined : snapshot));
    }, [liveFiltersKey]);

    // `onApply` is typically an inline callback, so holding it in a ref keeps the load effect below
    // from re-running — and re-applying the view — on every render of the page around it.
    const applyRef = useRef(onApply);
    applyRef.current = onApply;

    /**
     * The table's slice, moved on by every apply an effect makes. Effects of one commit share a render's props, and an
     * apply replaces the whole slice, so a second one built from those props would put back what the first took off.
     */
    const liveSlice = useRef<ViewSlice>({ columns, filters, sort });
    liveSlice.current = { columns, filters, sort };
    const applyFromEffect = useCallback((slice: ViewSlice) => {
        liveSlice.current = slice;
        applyRef.current(slice);
    }, []);

    /**
     * A save that confirms held-back columns puts them on the table only once it succeeds: the duck releases them then,
     * and one put on the table earlier would stay there unconfirmed if the save failed.
     *
     * They go into the table as it is by then, not as it was at Save, so an edit made while the save was out stays. The
     * rest of the table is left as the user had it, which is what the save stored, except for the `suppressed` filters on
     * them that reopening the view withheld while the save was out.
     */
    const pendingConfirmation = useRef<{ uuid: string; confirmed: StoredField[]; sort?: ColumnSort; suppressed?: string[] } | undefined>(
        undefined,
    );

    const apply = useCallback(
        (view: ListViewModel | undefined) => {
            const slice = view ? sliceOf(view) : toStandardSlice(standardColumns, standardSort);
            const pending = pendingConfirmation.current;
            if (pending) {
                const keys = new Set(pending.confirmed.map(getColumnKey));
                const withheld = (view?.uuid === pending.uuid ? (view.filters ?? []) : []).filter(
                    (filter) => keys.has(getColumnKey(filter)) && !slice.filters.includes(filter),
                );
                pending.suppressed = withheld.map(getFilterKey);
            }
            applyRef.current(slice);
        },
        [sliceOf, standardColumns, standardSort],
    );

    const select = useCallback(
        (id: string) => {
            setDrillDownFilters(undefined);
            setActiveId(id);
            apply(views.find((view) => view.uuid === id));
        },
        [apply, views],
    );

    useEffect(() => {
        dispatch(listViewActions.listViews({ resource }));
        setRequestedFor(resource);
    }, [dispatch, resource]);

    useEffect(() => {
        if (requestedFor === resource && isStale && !isMutating) dispatch(listViewActions.listViews({ resource }));
    }, [dispatch, resource, requestedFor, isStale, isMutating]);

    /**
     * Keeps the open view's table off fields it has not confirmed. A column whose field goes while it is on the table comes
     * off it, or the table would keep it through the field's return and show whatever attribute answers under that key.
     * A filter comes off when its field turns held, as a freshly applied view would leave it out.
     */
    const previousHeldKeys = useRef<ReadonlySet<string>>(NO_KEYS);
    useEffect(() => {
        const heldKeys = heldKeysOf(activeView);
        const wasHeld = previousHeldKeys.current;
        previousHeldKeys.current = heldKeys;

        const gone = isReady
            ? goneAttributeKeys(views, catalogue).filter((key) => !dormant.has(key) || confirmingFields.includes(key))
            : [];
        if (gone.length > 0) dispatch(listViewActions.markFieldsDormant({ resource, keys: gone }));
        if (!activeView) return;

        const goneHere = new Set(gone);
        const keptColumns = columns.filter((column) => !goneHere.has(toDormantKey(activeView.uuid, column)));
        const keptFilters = filters.filter((filter) => !heldKeys.has(getColumnKey(filter)) || wasHeld.has(getColumnKey(filter)));
        if (keptColumns.length < columns.length || keptFilters.length < filters.length) {
            applyFromEffect({ columns: keptColumns.length > 0 ? keptColumns : [...standardColumns], filters: keptFilters, sort });
        }
    }, [
        dispatch,
        resource,
        isReady,
        views,
        catalogue,
        dormant,
        confirmingFields,
        activeView,
        heldKeysOf,
        columns,
        filters,
        sort,
        standardColumns,
        applyFromEffect,
    ]);

    // A column the user confirms directly is theirs from then on, so the save must not put it back after they remove it.
    const forgetDirectlyConfirmed = useCallback((uuid: string, keys: ReadonlySet<string>) => {
        const pending = pendingConfirmation.current;
        if (pending?.uuid !== uuid) return;

        const confirmed = pending.confirmed.filter((column) => !keys.has(getColumnKey(column)));
        const sort = pending.sort && !keys.has(getSortKey(pending.sort)) ? pending.sort : undefined;
        pendingConfirmation.current = confirmed.length > 0 ? { ...pending, confirmed, sort } : undefined;
    }, []);

    /** `live` with the stored filters and ordering on the confirmed column keys put back, unless the user set their own. */
    const withConfirmed = useCallback(
        (keys: ReadonlySet<string>, live: ViewSlice): ViewSlice => ({
            ...live,
            filters: reinsertStoredFilters(
                live.filters,
                heldFilters.filter((filter) => keys.has(getColumnKey(filter))),
                activeView?.filters ?? [],
            ),
            sort: live.sort ?? (heldSort && keys.has(getSortKey(heldSort)) ? heldSort : undefined),
        }),
        [heldFilters, heldSort, activeView],
    );

    // Putting a held-back field on the table of its view, from the column menu or otherwise, is the user's confirmation
    // of it. Only a column that arrives on the table counts: one that was already there was never chosen.
    const previousColumns = useRef(columns);
    useEffect(() => {
        const before = new Set(previousColumns.current.map(getColumnKey));
        previousColumns.current = columns;
        if (!isReady || !activeView || dormant.size === 0) return;

        const published = new Set(catalogueFields.map(getColumnKey));
        const arrived = columns.filter(
            (column) =>
                !before.has(getColumnKey(column)) &&
                published.has(getColumnKey(column)) &&
                dormant.has(toDormantKey(activeView.uuid, column)),
        );
        if (arrived.length === 0) return;

        dispatch(listViewActions.releaseDormantFields({ resource, keys: arrived.map((column) => toDormantKey(activeView.uuid, column)) }));
        const arrivedKeys = new Set(arrived.map(getColumnKey));
        forgetDirectlyConfirmed(activeView.uuid, arrivedKeys);
        const live = liveSlice.current;
        const confirmed = withConfirmed(arrivedKeys, live);
        if (confirmed.filters.length !== live.filters.length || confirmed.sort !== live.sort) applyFromEffect(confirmed);
    }, [
        dispatch,
        resource,
        isReady,
        activeView,
        dormant,
        catalogueFields,
        columns,
        withConfirmed,
        forgetDirectlyConfirmed,
        applyFromEffect,
    ]);

    // The pinned view opens on load, and Standard when none is pinned. Once only: a later list read —
    // after a rename, say — must not throw the user back to the tab they started on.
    const hasOpened = useRef<Resource | undefined>(undefined);
    useEffect(() => {
        if (hasOpened.current === resource || !isReady) return;
        hasOpened.current = resource;

        const position = handedIn?.source === 'return' ? handedIn.position : undefined;
        const isDrillDown = handedIn?.source === 'drill-down' || position?.isDrillDown === true;
        // Handed-in filters only ever land on Standard or on the view they were left on. Put on any other
        // view, they would read as that view's unsaved changes and Save to view would write them into it.
        const returnsToView = !isDrillDown && position !== undefined && views.some((view) => view.uuid === position.viewId);
        const initial = handedIn ? (returnsToView ? position.viewId : STANDARD_VIEW_ID) : resolveInitialViewId(views);
        const opening =
            initial === STANDARD_VIEW_ID
                ? toStandardSlice(standardColumns, standardSort)
                : sliceOf(views.find((view) => view.uuid === initial) as ListViewModel);
        setActiveId(initial);
        setDrillDownFilters(isDrillDown ? liveSlice.current.filters : undefined);
        applyRef.current(handedIn ? { ...opening, filters: liveSlice.current.filters } : opening);
    }, [resource, isReady, views, sliceOf, standardColumns, standardSort, handedIn]);

    const positionRef = useRef(onPositionChange);
    positionRef.current = onPositionChange;
    // `isReady` is a dependency so the opening position is recorded even when the strip opens on the tab it started on.
    useEffect(() => {
        if (!isReady || hasOpened.current !== resource || activeId === PENDING_VIEW_UUID) return;
        positionRef.current?.({ viewId: activeId, isDrillDown });
    }, [resource, isReady, activeId, isDrillDown]);

    // The tab the strip was on when a create started, so a create that fails has somewhere to go back
    // to instead of leaving the strip pointing at a row the rollback has taken away. A create that
    // changed the table's slice as it started also holds how its failure turns the live slice back.
    const tabBeforeCreate = useRef<{ id: string; drillDownFilters?: SearchFilterModel[]; restore?: (live: ViewSlice) => ViewSlice }>({
        id: STANDARD_VIEW_ID,
    });

    // A created view arrives with the uuid the API gave it, replacing the optimistic row the strip
    // has been showing, and the tab under the cursor has to follow it rather than vanish. A failed
    // create takes that row away instead, which would leave every tab unselected.
    useEffect(() => {
        if (activeId !== PENDING_VIEW_UUID) return;

        if (createdUuid) {
            setActiveId(createdUuid);
            return;
        }

        if (!views.some((view) => view.uuid === PENDING_VIEW_UUID)) {
            // A create that kept the table as it was is deliberately not re-applied: the columns, filters
            // and ordering it was trying to keep are still on the table, and a failure is not a reason to
            // drop them.
            const { id, drillDownFilters: wasDrillDown, restore } = tabBeforeCreate.current;
            setActiveId(views.some((view) => view.uuid === id) ? id : STANDARD_VIEW_ID);
            setDrillDownFilters(wasDrillDown);
            if (restore) applyRef.current(restore(liveSlice.current));
        }
    }, [activeId, createdUuid, views]);

    const create = useCallback(
        (view: ListViewRequestModel, restore?: (live: ViewSlice) => ViewSlice) => {
            tabBeforeCreate.current = { id: activeId, drillDownFilters, restore };
            dispatch(listViewActions.createView({ resource, view }));
            setDrillDownFilters(undefined);
            setActiveId(PENDING_VIEW_UUID);
        },
        [dispatch, resource, activeId, drillDownFilters],
    );

    // A create leaves out display-only columns and filters on a field that is gone, and the table follows at
    // once, or it keeps listing under a filter and showing a column the view does not hold, which reopening
    // the view would not. Following at once rather than on success leaves an edit made while the create is
    // out in place, and a failure puts back only what was left out, so it keeps that edit too.
    const createFromCurrent = useCallback(
        (name: string) => {
            const view = toCreateRequest(name, resource, currentSlice, schema);
            const storedKeys = new Set(view.columns.map(getColumnKey));
            const keptColumns = columns.filter((column) => storedKeys.has(getColumnKey(column)));
            const keptFilters = withoutMissingFieldFilters(filters, catalogue);
            const isTrimmed = keptFilters.length !== filters.length || keptColumns.length !== columns.length;

            const droppedColumns = columns.filter((column) => !keptColumns.includes(column));
            const droppedFilters = filters.filter((filter) => !keptFilters.includes(filter));
            const putBack = (live: ViewSlice): ViewSlice => ({
                ...live,
                columns: reinsert(live.columns, droppedColumns, columns, getColumnKey),
                filters: reinsert(live.filters, droppedFilters, filters, getFilterKey),
            });

            create(view, isTrimmed ? putBack : undefined);
            if (isTrimmed) applyRef.current({ columns: keptColumns, filters: keptFilters, sort });
        },
        [create, resource, currentSlice, schema, filters, catalogue, columns, sort],
    );

    // Unsorted on purpose: Standard's ordering is the page's default, not a choice the new view has made.
    // The table takes the columns the request stores, not Standard's: a display-only column is dropped
    // from the request, and the table should show the view it now names.
    const createFromStandard = useCallback(
        (name: string) => {
            const slice = toStandardSlice(standardColumns);
            const view = toCreateRequest(name, resource, slice, schema);
            // The failure goes back to the tab the create started from, so that tab's slice is what comes back.
            create(view, () => ({ columns, filters, sort }));
            applyRef.current({ ...slice, columns: resolveView(view.columns, catalogueFields, standardColumns).renderable });
        },
        [create, resource, schema, standardColumns, catalogueFields, columns, filters, sort],
    );

    const patchView = useCallback(
        (view: ListViewModel, patch: Parameters<typeof toUpdateRequest>[2], confirms?: string[]) => {
            dispatch(listViewActions.updateView({ resource, uuid: view.uuid, view: toUpdateRequest(view, schema, patch), confirms }));
        },
        [dispatch, resource, schema],
    );

    const patchActive = useCallback(
        (patch: Parameters<typeof toUpdateRequest>[2]) => {
            if (activeView) patchView(activeView, patch);
        },
        [patchView, activeView],
    );

    // The view the rename and delete dialogs act on: the active one from its tab, any other from the overflow.
    const targetView = useMemo(() => views.find((view) => view.uuid === targetId), [views, targetId]);

    const openDialogFor = useCallback((kind: PendingDialog, uuid: string) => {
        setTargetId(uuid);
        setDialog(kind);
    }, []);

    // The view a delete took off the strip, and the tab the strip moved to instead. A delete is
    // optimistic, so a failure puts the row back — and the tab under the cursor has to go back with
    // it rather than leave the user on another view's rows under a message saying nothing was deleted.
    const pendingDelete = useRef<{ uuid: string; fallbackId: string } | undefined>(undefined);

    useEffect(() => {
        const pending = pendingDelete.current;
        if (!pending) return;

        const restored = views.find((view) => view.uuid === pending.uuid);
        if (!restored) {
            // Gone once the mutation settles is a delete that succeeded; while it is in flight the row
            // is only optimistically absent, and the rollback may still bring it back.
            if (!isMutating) pendingDelete.current = undefined;
            return;
        }

        pendingDelete.current = undefined;
        // Only if the strip is still where the delete left it: a tab the user has since picked is
        // their choice, not the fallback's.
        if (activeId !== pending.fallbackId) return;

        setActiveId(restored.uuid);
        applyRef.current(sliceOf(restored));
    }, [views, activeId, isMutating, sliceOf]);

    const onDelete = useCallback(() => {
        if (!targetView) return;

        dispatch(listViewActions.deleteView({ resource, uuid: targetView.uuid }));
        setDialog(undefined);

        // A view deleted from the overflow was never applied, so the table has nothing to leave.
        if (targetView.uuid !== activeId) return;

        // Never to an empty table: the pinned view if one survives, otherwise Standard.
        const remaining = views.filter((view) => view.uuid !== targetView.uuid);
        const fallback = resolveInitialViewId(remaining);
        pendingDelete.current = { uuid: targetView.uuid, fallbackId: fallback };
        setActiveId(fallback);
        apply(remaining.find((view) => view.uuid === fallback));
    }, [dispatch, resource, targetView, activeId, views, apply]);

    /** The table with held-back columns of the active view put on it, with their stored filters and ordering. */
    const confirmedSlice = useCallback(
        (confirmed: readonly PickerColumn[]): ViewSlice | undefined => {
            if (!activeView || confirmed.length === 0) return undefined;

            const keys = new Set(confirmed.map(getColumnKey));
            const released = resolveView(
                activeView.columns,
                catalogueFields.filter((field) => keys.has(getColumnKey(field)) || !dormant.has(toDormantKey(activeView.uuid, field))),
                standardColumns,
            ).renderable;
            // A table on the platform fallback gives it up for the view, keeping only what the user added to it.
            const fallback = new Set(resolved?.fellBackToStandard ? resolved.renderable.map(getColumnKey) : []);
            const shown = reinsert(
                columns.filter((column) => !fallback.has(getColumnKey(column))),
                resolved?.fellBackToStandard ? released : released.filter((column) => keys.has(getColumnKey(column))),
                released,
                getColumnKey,
            );
            return withConfirmed(keys, { columns: shown, filters, sort });
        },
        [activeView, catalogueFields, dormant, standardColumns, resolved, columns, filters, sort, withConfirmed],
    );

    useEffect(() => {
        const pending = pendingConfirmation.current;
        if (!pending || isMutating) return;

        pendingConfirmation.current = undefined;
        if (activeView?.uuid !== pending.uuid) return;
        // Judged by the keys rather than the slice's error, which any read or write of any resource can set: only a
        // successful save releases them, and one seen gone again during the save stays held.
        const released = pending.confirmed.filter((column) => !dormant.has(toDormantKey(pending.uuid, column)));
        if (released.length === 0) return;

        const keys = new Set(released.map(getColumnKey));
        const { columns, filters, sort } = liveSlice.current;
        const stored = resolveView(activeView.columns, fieldsFor(activeView), standardColumns).renderable;
        const shown = reinsert(
            columns,
            stored.filter((column) => keys.has(getColumnKey(column))),
            stored,
            getColumnKey,
        );
        const suppressed = new Set(pending.suppressed);
        const storedFilters = activeView.filters ?? [];
        const restored = storedFilters.filter((filter) => keys.has(getColumnKey(filter)) && suppressed.has(getFilterKey(filter)));
        const releasedSort = pending.sort && keys.has(getSortKey(pending.sort)) ? pending.sort : undefined;
        const confirmed = { columns: shown, filters: reinsertStoredFilters(filters, restored, storedFilters), sort: sort ?? releasedSort };
        // A field the listing cannot display has no column to put on the table, and an apply would reset the page for nothing.
        if (shown.length !== columns.length || confirmed.filters.length !== filters.length || confirmed.sort !== sort)
            applyFromEffect(confirmed);
    }, [isMutating, dormant, activeView, fieldsFor, standardColumns, applyFromEffect]);

    const onSaveDrift = useCallback(() => {
        if (!activeView) {
            // Standard has nothing to save into, so the offer is to keep the change as a new view.
            setDialog('create');
            return;
        }

        // Saving a filter of the user's own on a held-back field confirms the field, as adding its column would: held, the
        // view would withhold the filter just saved. The user's filters on it replace the stored ones they never saw apply.
        const filtered = new Set(storableFilters.map(getColumnKey));
        const confirmedKeys = new Set([...heldKeysOf(activeView)].filter((key) => filtered.has(key)));
        const confirmed = activeView.columns.filter((column) => confirmedKeys.has(getColumnKey(column)));
        const stillHeld = heldFilters.filter((filter) => !confirmedKeys.has(getColumnKey(filter)));

        // The stored columns this table cannot render go back in: the user never saw them, so saving a
        // filter or an ordering is not the moment to drop them.
        patchView(
            activeView,
            {
                columns: toStoredColumnsKeepingUnavailable(columns, resolved?.columns ?? []),
                filters: reinsert(storableFilters, stillHeld, activeView.filters ?? [], getFilterKey),
                sort: toStoredSort(sort ?? heldSort),
            },
            confirmed.map((column) => toDormantKey(activeView.uuid, column)),
        );

        if (confirmed.length > 0) {
            const confirmedSort = heldSort && confirmedKeys.has(getSortKey(heldSort)) ? heldSort : undefined;
            pendingConfirmation.current = { uuid: activeView.uuid, confirmed, sort: confirmedSort };
        }
    }, [activeView, patchView, columns, resolved, storableFilters, heldKeysOf, heldFilters, sort, heldSort]);

    const onShowReturned = useCallback(() => {
        const slice = confirmedSlice(returned);
        if (!activeView || !slice) return;

        dispatch(listViewActions.releaseDormantFields({ resource, keys: returned.map((column) => toDormantKey(activeView.uuid, column)) }));
        forgetDirectlyConfirmed(activeView.uuid, new Set(returned.map(getColumnKey)));
        applyRef.current(slice);
    }, [confirmedSlice, returned, activeView, dispatch, resource, forgetDirectlyConfirmed]);

    // Withheld when every stored column is held back: Core refuses a view with no columns.
    const remainingAfterReturned = useMemo(() => {
        const keys = new Set(returned.map(getColumnKey));
        return activeView?.columns.filter((column) => !keys.has(getColumnKey(column))) ?? [];
    }, [returned, activeView]);

    // The filters and ordering on a removed column go with it: kept, they would act on the attribute the user just refused.
    const onRemoveReturned = useCallback(() => {
        const keys = new Set(returned.map(getColumnKey));
        patchActive({
            columns: remainingAfterReturned,
            filters: activeView?.filters?.filter((filter) => !keys.has(getColumnKey(filter))),
            ...(heldSort && keys.has(getSortKey(heldSort)) ? { sort: undefined } : {}),
        });
    }, [patchActive, remainingAfterReturned, returned, activeView, heldSort]);

    // A held-back field the listing cannot display is named only here, so its filters go with it as they do there.
    const onRemoveUnavailable = useCallback(() => {
        if (!resolved) return;
        const removed = new Set(unavailable.map(getColumnKey));
        const refused = new Set([...heldKeysOf(activeView)].filter((key) => removed.has(key)));
        patchActive({
            columns: toStoredColumns(resolved.columns.filter((column) => !removed.has(getColumnKey(column)))),
            ...(refused.size > 0 ? { filters: activeView?.filters?.filter((filter) => !refused.has(getColumnKey(filter))) } : {}),
        });
    }, [patchActive, resolved, unavailable, heldKeysOf, activeView]);

    const takenNames = useMemo(() => [STANDARD_VIEW_NAME, ...views.map((view) => view.name)], [views]);

    const viewActions = useCallback(
        (view: ListViewModel) => ({
            rename: { title: 'Rename…', onClick: () => openDialogFor('rename', view.uuid) },
            pin: view.defaultView
                ? { title: 'Stop opening this view by default', onClick: () => patchView(view, { defaultView: false }) }
                : { title: 'Open this view by default', onClick: () => patchView(view, { defaultView: true }) },
            remove: { title: 'Delete view', color: 'danger' as const, onClick: () => openDialogFor('delete', view.uuid) },
        }),
        [openDialogFor, patchView],
    );

    const menuItems = useMemo<DropdownItem[]>(() => {
        const duplicate: DropdownItem = {
            title: 'Duplicate',
            onClick: () => createFromCurrent(duplicateName(activeTab.name, takenNames)),
        };

        // On Standard the rest are absent rather than disabled: they will never become available,
        // because Standard has no stored row to rename, pin, edit or delete.
        if (!activeView) return [duplicate];

        const { rename, pin, remove } = viewActions(activeView);
        return [rename, duplicate, pin, remove];
    }, [activeView, activeTab, takenNames, createFromCurrent, viewActions]);

    const overflowActions = useCallback(
        (tab: ViewTabModel): DropdownItem[] => {
            const view = views.find((each) => each.uuid === tab.id);
            if (!view) return [];

            const { rename, pin, remove } = viewActions(view);
            return [rename, pin, remove];
        },
        [views, viewActions],
    );

    // Roving focus: the tab being left becomes `tabIndex={-1}`, so focus has to travel with the
    // selection. Left behind, it sits on an element the strip no longer treats as reachable, and what
    // a screen reader reports then disagrees with `aria-selected`.
    const selectByKeyboard = useCallback(
        (id: string) => {
            select(id);
            document.getElementById(`view-tab-${id}`)?.focus();
        },
        [select],
    );

    const onStripKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            // Keys pressed in a menu bubble here through the React tree even though the menu is portalled out.
            if (!(event.target instanceof HTMLElement) || event.target.getAttribute('role') !== 'tab') return;

            const keys: Record<string, number | undefined> = {
                ArrowLeft: -1,
                ArrowRight: 1,
            };
            const step = keys[event.key];
            const index = visible.findIndex((tab) => tab.id === activeId);

            if (step !== undefined && index !== -1) {
                event.preventDefault();
                selectByKeyboard(visible[(index + step + visible.length) % visible.length].id);
                return;
            }

            if (event.key === 'Home' || event.key === 'End') {
                const target = event.key === 'Home' ? visible.at(0) : visible.at(-1);
                if (!target) return;
                event.preventDefault();
                selectByKeyboard(target.id);
            }
        },
        [visible, activeId, selectByKeyboard],
    );

    if (!isReady) return null;

    return (
        <div className="flex flex-col gap-y-1" data-testid={dataTestId}>
            <SimpleBar forceVisible="x">
                <div
                    role="tablist"
                    aria-label="Saved views"
                    className="flex items-center gap-x-1"
                    onKeyDown={onStripKeyDown}
                    // Keyboard reachability does not depend on this: focus sits on the tabs and the keydown bubbles
                    // up. It is here because an element carrying an interactive role and a key handler has to be
                    // focusable, and -1 satisfies that while leaving the tabs as the only tab stops.
                    tabIndex={-1}
                    data-testid={`${dataTestId}-strip`}
                >
                    {visible.map((tab) => (
                        <ViewTab
                            key={tab.id}
                            tab={tab}
                            isActive={tab.id === activeId}
                            isDirty={tab.id === activeId && isDirty}
                            onSelect={() => select(tab.id)}
                            dataTestId={`${dataTestId}-tab-${tab.id}`}
                            menu={
                                tab.id === activeId ? (
                                    <Dropdown
                                        btnStyle="transparent"
                                        hideArrow
                                        disabled={isMutating}
                                        ariaLabel={`Actions for ${tab.name}`}
                                        className="pr-1"
                                        title={<ChevronDown className="size-4" />}
                                        items={menuItems}
                                    />
                                ) : undefined
                            }
                        />
                    ))}

                    {overflow.length > 0 && (
                        <OverflowViewsMenu
                            tabs={overflow}
                            viewCount={views.length}
                            onSelect={select}
                            actionsFor={overflowActions}
                            isBusy={isMutating}
                            dataTestId={`${dataTestId}-overflow`}
                        />
                    )}

                    <button
                        type="button"
                        onClick={() => setDialog('new')}
                        disabled={isMutating}
                        aria-label="New view"
                        title="New view"
                        data-testid={`${dataTestId}-new`}
                        className="inline-flex items-center rounded-lg p-3 text-content-subtle hover:bg-surface-hover hover:text-content focus:outline-hidden disabled:opacity-50"
                    >
                        <Plus className="size-4" />
                    </button>
                </div>
            </SimpleBar>

            <ReturnedColumnsNotice
                returned={returned}
                unfiltered={unfiltered}
                onShow={onShowReturned}
                onRemove={remainingAfterReturned.length > 0 ? onRemoveReturned : undefined}
                isBusy={isMutating}
                dataTestId={`${dataTestId}-returned`}
            />

            {/* A view whose only missing columns are held back is described by the returned-columns notice alone. */}
            {resolved && (unavailable.length > 0 || held.length === 0) && !(noticeKey && dismissedNotices.has(noticeKey)) && (
                <UnresolvedColumnsNotice
                    unavailable={unavailable}
                    storedCount={resolved.columns.length}
                    withheld={held.length}
                    fellBackToStandard={resolved.fellBackToStandard}
                    // Written from the stored side, not from the table: the table is showing the platform
                    // fallback when nothing resolved, and carries unsaved changes besides, so saving it
                    // here would overwrite the view with columns the user never chose. Withheld on a
                    // fallback with nothing held back either, where there is no column list left to write.
                    onRemove={activeView && (!resolved.fellBackToStandard || held.length > 0) ? onRemoveUnavailable : undefined}
                    onDismiss={() => {
                        if (noticeKey) setDismissedNotices((dismissed) => new Set(dismissed).add(noticeKey));
                    }}
                    isBusy={isMutating}
                    dataTestId={`${dataTestId}-notice`}
                />
            )}

            <ViewSummaryBar
                columns={columns}
                sort={sort}
                isDirty={isDirty}
                isStandard={activeView === undefined}
                isBusy={isMutating}
                onRevert={() => {
                    setDrillDownFilters(undefined);
                    apply(activeView);
                }}
                onSave={onSaveDrift}
                isDrillDown={isDrillDown}
                dataTestId={`${dataTestId}-summary`}
            />

            <NameViewDialog
                isOpen={dialog === 'create' || dialog === 'new'}
                caption="New view"
                confirmLabel="Create view"
                initialName={dialog === 'new' ? newViewName(takenNames) : duplicateName(activeTab.name, takenNames)}
                takenNames={takenNames}
                isBusy={isMutating}
                onClose={() => setDialog(undefined)}
                onSubmit={(name) => {
                    setDialog(undefined);
                    if (dialog === 'new') createFromStandard(name);
                    else createFromCurrent(name);
                }}
                dataTestId={`${dataTestId}-create`}
            />

            <NameViewDialog
                isOpen={dialog === 'rename' && targetView !== undefined}
                caption="Rename view"
                confirmLabel="Rename"
                initialName={targetView?.name ?? ''}
                takenNames={takenNames}
                isBusy={isMutating}
                onClose={() => setDialog(undefined)}
                onSubmit={(name) => {
                    setDialog(undefined);
                    if (targetView) patchView(targetView, { name });
                }}
                dataTestId={`${dataTestId}-rename`}
            />

            <Dialog
                isOpen={dialog === 'delete' && targetView !== undefined}
                toggle={() => setDialog(undefined)}
                caption="Delete view"
                icon="delete"
                body={`You are about to delete the view "${targetView?.name}". Is this what you want to do?`}
                dataTestId={`${dataTestId}-delete`}
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setDialog(undefined), body: 'Cancel' },
                    { color: 'danger', onClick: onDelete, body: 'Delete' },
                ]}
            />
        </div>
    );
}
