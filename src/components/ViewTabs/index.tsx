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
    toStoredColumns,
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
 * The saved-view tab strip: one tab per view, above the filter widget because a view now contains
 * its filter rather than sitting inside it.
 *
 * The first tab is Standard — the platform column set the page ships with. It is deliberately not a
 * stored row, which is what makes "always present and never removable" fall out of the model rather
 * than needing a protected-row rule: there is nothing to delete, and nothing to hold a rename.
 */
export default function ViewTabs({
    resource,
    catalogue,
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
    const isMutating = useSelector(listViewSelectors.isMutating(resource));
    const createdUuid = useSelector(listViewSelectors.createdUuid(resource));

    const [activeId, setActiveId] = useState(STANDARD_VIEW_ID);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [dialog, setDialog] = useState<PendingDialog | undefined>(undefined);

    const fields = useMemo(() => toCatalogueFields(catalogue), [catalogue]);

    const activeView = useMemo(() => views.find((view) => view.uuid === activeId), [views, activeId]);
    const tabs = useMemo(() => toTabs(views), [views]);
    const { visible, overflow } = useMemo(() => splitTabs(tabs, activeId), [tabs, activeId]);
    const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeId) ?? tabs[0], [tabs, activeId]);

    const resolved = useMemo(
        () => (activeView ? resolveView(activeView.columns, fields, standardColumns) : undefined),
        [activeView, fields, standardColumns],
    );

    const storedSlice = useMemo(
        () => (activeView ? toViewSlice(activeView, fields, standardColumns) : toStandardSlice(standardColumns)),
        [activeView, fields, standardColumns],
    );

    // The picker edits what the view *stores*, which is not what the table renders: a column whose
    // field the catalogue has dropped is skipped on render, and handing the picker the rendered list
    // would leave the stale column unreachable — invisible in the dialog the notice sends the user
    // to, and silently discarded by the next save.
    const pickerColumns = useMemo<ColumnDefinition[]>(() => resolved?.columns ?? storedSlice.columns, [resolved, storedSlice]);

    const currentSlice = useMemo<ViewSlice>(() => ({ columns, filters, sort }), [columns, filters, sort]);
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
        if (hasOpened.current === resource || views.length === 0) return;
        hasOpened.current = resource;

        const initial = resolveInitialViewId(views);
        setActiveId(initial);
        applyRef.current(
            initial === STANDARD_VIEW_ID
                ? toStandardSlice(standardColumns)
                : toViewSlice(views.find((view) => view.uuid === initial) as ListViewModel, fields, standardColumns),
        );
    }, [resource, views, fields, standardColumns]);

    // A created view arrives with the uuid the API gave it, replacing the optimistic row the strip
    // has been showing. The tab under the cursor has to follow it rather than vanish.
    useEffect(() => {
        if (activeId === PENDING_VIEW_UUID && createdUuid) setActiveId(createdUuid);
    }, [activeId, createdUuid]);

    const createFromCurrent = useCallback(
        (name: string) => {
            dispatch(listViewActions.createView({ resource, view: toCreateRequest(name, resource, currentSlice) }));
            setActiveId(PENDING_VIEW_UUID);
        },
        [dispatch, resource, currentSlice],
    );

    const patchActive = useCallback(
        (patch: Parameters<typeof toUpdateRequest>[1]) => {
            if (!activeView) return;
            dispatch(listViewActions.updateView({ resource, uuid: activeView.uuid, view: toUpdateRequest(activeView, patch) }));
        },
        [dispatch, resource, activeView],
    );

    const onDelete = useCallback(() => {
        if (!activeView) return;

        dispatch(listViewActions.deleteView({ resource, uuid: activeView.uuid }));
        setDialog(undefined);

        // Never to an empty table: the pinned view if one survives, otherwise Standard.
        const remaining = views.filter((view) => view.uuid !== activeView.uuid);
        const fallback = resolveInitialViewId(remaining);
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

        patchActive({ columns: toStoredColumns(columns), filters, sort: toStoredSort(sort) });
    }, [activeView, patchActive, columns, filters, sort]);

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
                select(visible[(index + step + visible.length) % visible.length].id);
                return;
            }

            if (event.key === 'Home' || event.key === 'End') {
                event.preventDefault();
                select(event.key === 'Home' ? visible[0].id : visible[visible.length - 1].id);
            }
        },
        [visible, activeId, select],
    );

    return (
        <div className="flex flex-col gap-y-1" data-testid={dataTestId}>
            <SimpleBar forceVisible="x">
                <div
                    role="tablist"
                    aria-label="Saved views"
                    className="flex items-center gap-x-1"
                    onKeyDown={onStripKeyDown}
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
                    unavailable={resolved.unavailable}
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
