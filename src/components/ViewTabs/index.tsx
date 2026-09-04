import ColumnPicker from 'components/ColumnPicker';
import Dialog from 'components/Dialog';
import Dropdown, { type DropdownItem } from 'components/Dropdown';
import SimpleBar from 'components/SimpleBar';
import { actions as listViewActions, PENDING_VIEW_UUID, selectors as listViewSelectors } from 'ducks/listViews';
import { ChevronDown, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { SearchFilterModel } from 'types/certificate';
import type { ListViewModel, ViewSlice } from 'types/listViews';
import type { FilterFieldSource, Resource, SearchFieldDataByGroupDto } from 'types/openapi';
import type { ColumnDefinition } from 'types/tableColumns';
import { toCatalogueFields } from 'utils/columnPicker';
import {
    STANDARD_VIEW_ID,
    duplicateName,
    isSliceDirty,
    resolveInitialViewId,
    resolveView,
    splitTabs,
    toCreateRequest,
    toStandardSlice,
    toStorableFilters,
    toStoredColumns,
    toStoredColumnsKeepingUnavailable,
    toStoredSort,
    toTabs,
    toUpdateRequest,
    toViewSlice,
} from 'utils/listViews';
import type { ColumnSort } from 'utils/tableColumns';
import NameViewDialog from './NameViewDialog';
import UnresolvedColumnsNotice from './UnresolvedColumnsNotice';
import ViewSummaryBar from './ViewSummaryBar';
import ViewTab from './ViewTab';

export type ViewTabsProps = Readonly<{
    resource: Resource;
    /** The column catalogue for the resource, i.e. `GET /v1/{resource}/search`. */
    catalogue: SearchFieldDataByGroupDto[];
    /**
     * Whether the catalogue read has settled. The strip waits for it, because until then every stored
     * column resolves to nothing.
     *
     * A page that tracks its own fetch state should say so here. The fallback reads a non-empty
     * catalogue as an arrived one, which cannot tell a read still in flight from a resource that
     * publishes no filter fields at all — but a catalogue that arrived carrying only fields the
     * listing cannot display is a settled read either way, and the strip must not hide behind it.
     */
    isCatalogueLoaded?: boolean;
    /** The platform default column set for this page, which is what the Standard tab shows. */
    standardColumns: ColumnDefinition[];
    /** The columns the table is showing, which a saved view may since have drifted from. */
    columns: ColumnDefinition[];
    /** The filters the table is listing under. A view carries its filters, so they can drift too. */
    filters: SearchFilterModel[];
    /** The ordering the table is listing under. */
    sort?: ColumnSort;
    /**
     * Applies a view: its columns, its filters and its ordering, together. The caller is expected to
     * return to page 1 and clear its row selection — the filters change which rows exist, so a
     * carried-over selection would span rows the user can no longer see.
     */
    onApply: (slice: ViewSlice) => void;
    /** Named in the column dialog's caption, e.g. "Certificates". */
    resourceLabel?: string;
    getSourceLabel?: (source: FilterFieldSource) => string;
    dataTestId?: string;
}>;

type PendingDialog = 'rename' | 'create' | 'delete';

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
    columns,
    filters,
    sort,
    onApply,
    resourceLabel,
    getSourceLabel,
    dataTestId = 'view-tabs',
}: ViewTabsProps) {
    const dispatch = useDispatch();

    const views = useSelector(listViewSelectors.views(resource));
    const hasLoaded = useSelector(listViewSelectors.hasLoaded(resource));
    const isMutating = useSelector(listViewSelectors.isMutating(resource));
    const createdUuid = useSelector(listViewSelectors.createdUuid(resource));

    const [activeId, setActiveId] = useState(STANDARD_VIEW_ID);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [dialog, setDialog] = useState<PendingDialog | undefined>(undefined);

    const fields = useMemo(() => toCatalogueFields(catalogue), [catalogue]);

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
     */
    const isReady = hasLoaded && (isCatalogueLoaded ?? catalogue.length > 0);

    const activeView = useMemo(() => views.find((view) => view.uuid === activeId), [views, activeId]);
    const tabs = useMemo(() => toTabs(views), [views]);
    const { visible, overflow } = useMemo(() => splitTabs(tabs, activeId), [tabs, activeId]);
    const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeId) ?? tabs[0], [tabs, activeId]);

    const resolved = useMemo(
        () => (activeView ? resolveView(activeView.columns, fields, standardColumns) : undefined),
        [activeView, fields, standardColumns],
    );

    /**
     * The slice behind the active tab, which drift is measured against.
     *
     * Its filters are put through the same sieve as the live ones. A stored view can carry a filter
     * this client would never write — one from a client that predates the rule — and comparing the
     * sieved live filters against unsieved stored ones would report that view as permanently drifted,
     * offering a Save that changes nothing.
     */
    const storedSlice = useMemo(() => {
        if (!activeView) return toStandardSlice(standardColumns);

        const slice = toViewSlice(activeView, fields, standardColumns);
        return { ...slice, filters: toStorableFilters(slice.filters, catalogue) };
    }, [activeView, fields, standardColumns, catalogue]);

    /** The stored columns this table cannot render, which the notice names and the picker can remove. */
    const unavailable = useMemo(() => resolved?.columns.filter((column) => !column.available) ?? [], [resolved]);

    /**
     * What the column dialog edits.
     *
     * The stored list, unavailable columns included — handing over only what the table renders would
     * leave a column the listing cannot display unreachable in the very dialog the notice about it
     * sends the user to, and it would then be dropped by the next save without ever being shown.
     * Except when nothing rendered at all: the table is showing the platform set, so that is what the
     * dialog opens with, and Save produces a usable view rather than an empty one.
     */
    const pickerColumns = useMemo<ColumnDefinition[]>(() => {
        if (!resolved) return storedSlice.columns;
        return resolved.fellBackToStandard ? resolved.renderable : resolved.columns;
    }, [resolved, storedSlice]);

    /**
     * The live filters minus the ones a view must not carry, which is what a view is compared against
     * and what a save writes back. See {@link toStorableFilters}: a filter value typed against secret
     * content would otherwise be copied into storage that does not protect it.
     */
    const storableFilters = useMemo(() => toStorableFilters(filters, catalogue), [filters, catalogue]);

    const currentSlice = useMemo<ViewSlice>(() => ({ columns, filters: storableFilters, sort }), [columns, storableFilters, sort]);
    const isDirty = isSliceDirty(storedSlice, currentSlice);

    // `onApply` is typically an inline callback, so holding it in a ref keeps the load effect below
    // from re-running — and re-applying the view — on every render of the page around it.
    const applyRef = useRef(onApply);
    applyRef.current = onApply;

    const apply = useCallback(
        (view: ListViewModel | undefined) => {
            applyRef.current(view ? toViewSlice(view, fields, standardColumns) : toStandardSlice(standardColumns));
        },
        [fields, standardColumns],
    );

    const select = useCallback(
        (id: string) => {
            setActiveId(id);
            apply(views.find((view) => view.uuid === id));
        },
        [apply, views],
    );

    useEffect(() => {
        dispatch(listViewActions.listViews({ resource }));
    }, [dispatch, resource]);

    // The pinned view opens on load, and Standard when none is pinned. Once only: a later list read —
    // after a rename, say — must not throw the user back to the tab they started on.
    const hasOpened = useRef<Resource | undefined>(undefined);
    useEffect(() => {
        if (hasOpened.current === resource || !isReady) return;
        hasOpened.current = resource;

        const initial = resolveInitialViewId(views);
        setActiveId(initial);
        applyRef.current(
            initial === STANDARD_VIEW_ID
                ? toStandardSlice(standardColumns)
                : toViewSlice(views.find((view) => view.uuid === initial) as ListViewModel, fields, standardColumns),
        );
    }, [resource, isReady, views, fields, standardColumns]);

    // The tab the strip was on when a create started, so a create that fails has somewhere to go back
    // to instead of leaving the strip pointing at a row the rollback has taken away.
    const tabBeforeCreate = useRef(STANDARD_VIEW_ID);

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
            // The slice is deliberately not re-applied: the columns, filters and ordering the create
            // was trying to keep are still on the table, and a failure is not a reason to drop them.
            setActiveId(views.some((view) => view.uuid === tabBeforeCreate.current) ? tabBeforeCreate.current : STANDARD_VIEW_ID);
        }
    }, [activeId, createdUuid, views]);

    const createFromCurrent = useCallback(
        (name: string) => {
            tabBeforeCreate.current = activeId;
            dispatch(listViewActions.createView({ resource, view: toCreateRequest(name, resource, currentSlice) }));
            setActiveId(PENDING_VIEW_UUID);
        },
        [dispatch, resource, currentSlice, activeId],
    );

    const patchActive = useCallback(
        (patch: Parameters<typeof toUpdateRequest>[2]) => {
            if (!activeView) return;
            dispatch(listViewActions.updateView({ resource, uuid: activeView.uuid, view: toUpdateRequest(activeView, catalogue, patch) }));
        },
        [dispatch, resource, activeView, catalogue],
    );

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
        applyRef.current(toViewSlice(restored, fields, standardColumns));
    }, [views, activeId, isMutating, fields, standardColumns]);

    const onDelete = useCallback(() => {
        if (!activeView) return;

        dispatch(listViewActions.deleteView({ resource, uuid: activeView.uuid }));
        setDialog(undefined);

        // Never to an empty table: the pinned view if one survives, otherwise Standard.
        const remaining = views.filter((view) => view.uuid !== activeView.uuid);
        const fallback = resolveInitialViewId(remaining);
        pendingDelete.current = { uuid: activeView.uuid, fallbackId: fallback };
        setActiveId(fallback);
        apply(remaining.find((view) => view.uuid === fallback));
    }, [dispatch, resource, activeView, views, apply]);

    const onColumnsSaved = useCallback(
        (saved: ColumnDefinition[]) => {
            setIsPickerOpen(false);
            patchActive({ columns: toStoredColumns(saved) });
            // The live filters and ordering are kept: the dialog edits the columns of the view, and
            // re-applying the stored slice here would silently drop an unsaved filter beside it.
            applyRef.current({ columns: saved, filters, sort });
        },
        [patchActive, filters, sort],
    );

    const onSaveDrift = useCallback(() => {
        if (!activeView) {
            // Standard has nothing to save into, so the offer is to keep the change as a new view.
            setDialog('create');
            return;
        }

        // The stored columns this table cannot render go back in: the user never saw them, so saving a
        // filter or an ordering is not the moment to drop them. The picker is where they are removed.
        patchActive({
            columns: toStoredColumnsKeepingUnavailable(columns, resolved?.columns ?? []),
            filters: storableFilters,
            sort: toStoredSort(sort),
        });
    }, [activeView, patchActive, columns, resolved, storableFilters, sort]);

    const takenNames = useMemo(() => views.map((view) => view.name), [views]);

    const menuItems = useMemo<DropdownItem[]>(() => {
        const duplicate: DropdownItem = {
            title: 'Duplicate',
            onClick: () => createFromCurrent(duplicateName(activeTab.name, takenNames)),
        };

        // On Standard the rest are absent rather than disabled: they will never become available,
        // because Standard has no stored row to rename, pin, edit or delete.
        if (!activeView) return [duplicate];

        return [
            { title: 'Edit columns…', onClick: () => setIsPickerOpen(true) },
            { title: 'Rename…', onClick: () => setDialog('rename') },
            duplicate,
            ...(activeView.defaultView ? [] : [{ title: 'Open this view by default', onClick: () => patchActive({ defaultView: true }) }]),
            { title: 'Delete view', color: 'danger' as const, onClick: () => setDialog('delete') },
        ];
    }, [activeView, activeTab, takenNames, createFromCurrent, patchActive]);

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
                        <Dropdown
                            btnStyle="transparent"
                            ariaLabel="More saved views"
                            title={`${overflow.length} more`}
                            menuClassName="max-h-80 overflow-y-auto"
                            items={overflow.map((tab) => ({ title: tab.name, onClick: () => select(tab.id) }))}
                        />
                    )}

                    <button
                        type="button"
                        onClick={() => setDialog('create')}
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

            {resolved && (
                <UnresolvedColumnsNotice
                    unavailable={unavailable}
                    storedCount={resolved.columns.length}
                    fellBackToStandard={resolved.fellBackToStandard}
                    onReview={() => setIsPickerOpen(true)}
                    dataTestId={`${dataTestId}-notice`}
                />
            )}

            <ViewSummaryBar
                columns={columns}
                sort={sort}
                isDirty={isDirty}
                isStandard={activeView === undefined}
                isBusy={isMutating}
                onRevert={() => apply(activeView)}
                onSave={onSaveDrift}
                dataTestId={`${dataTestId}-summary`}
            />

            <ColumnPicker
                isOpen={isPickerOpen}
                onClose={() => setIsPickerOpen(false)}
                onSave={onColumnsSaved}
                catalogue={catalogue}
                columns={pickerColumns}
                standardColumns={standardColumns}
                resourceLabel={resourceLabel}
                getSourceLabel={getSourceLabel}
                dataTestId={`${dataTestId}-picker`}
            />

            <NameViewDialog
                isOpen={dialog === 'create'}
                caption="New view"
                confirmLabel="Create view"
                initialName={duplicateName(activeTab.name, takenNames)}
                takenNames={takenNames}
                isBusy={isMutating}
                onClose={() => setDialog(undefined)}
                onSubmit={(name) => {
                    setDialog(undefined);
                    createFromCurrent(name);
                }}
                dataTestId={`${dataTestId}-create`}
            />

            <NameViewDialog
                isOpen={dialog === 'rename'}
                caption="Rename view"
                confirmLabel="Rename"
                initialName={activeTab.name}
                takenNames={takenNames}
                isBusy={isMutating}
                onClose={() => setDialog(undefined)}
                onSubmit={(name) => {
                    setDialog(undefined);
                    patchActive({ name });
                }}
                dataTestId={`${dataTestId}-rename`}
            />

            <Dialog
                isOpen={dialog === 'delete'}
                toggle={() => setDialog(undefined)}
                caption="Delete view"
                icon="delete"
                body={`You are about to delete the view "${activeTab.name}". Is this what you want to do?`}
                dataTestId={`${dataTestId}-delete`}
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setDialog(undefined), body: 'Cancel' },
                    { color: 'danger', onClick: onDelete, body: 'Delete' },
                ]}
            />
        </div>
    );
}
