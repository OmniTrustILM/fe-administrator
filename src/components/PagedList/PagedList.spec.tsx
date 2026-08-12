import { test, expect } from '../../../playwright/ct-test';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { of } from 'rxjs';

import PagedList from './PagedList';
import pagingReducer from 'ducks/paging';
import filtersReducer, { EntityType } from 'ducks/filters';
import userInterfaceReducer from 'ducks/user-interface';

const reducer = combineReducers({
    pagings: pagingReducer,
    filters: filtersReducer,
    userInterface: userInterfaceReducer,
});

type RootState = ReturnType<typeof reducer>;

const headers = [{ id: 'name', content: 'Name', sortable: true }];
const rows = [
    { id: 'row-1', columns: ['First row'] },
    { id: 'row-2', columns: ['Second row'] },
    { id: 'row-3', columns: ['Third row'] },
];

const preloadedDeleteState = {
    pagings: {
        pagings: [
            {
                entity: EntityType.CBOM,
                paging: {
                    totalItems: 10,
                    checkedRows: ['row-1', 'row-2'],
                    isFetchingList: false,
                    pageNumber: 1,
                    pageSize: 10,
                },
            },
        ],
    } as any,
};

function createStore(preloadedState?: Partial<RootState>) {
    return configureStore({
        reducer,
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({
                serializableCheck: false,
            }),
        preloadedState: preloadedState as RootState,
    });
}

function renderPagedList(options?: {
    preloadedState?: Partial<RootState>;
    addHidden?: boolean;
    hideWidgetButtons?: boolean;
    isBusy?: boolean;
    onDeleteCallback?: (uuids: string[], filters: any[]) => void;
    onListCallback?: (filters: any) => void;
    additionalButtons?: any[];
    filterTitle?: string;
    getAvailableFiltersApi?: any;
    hasCheckboxes?: boolean;
    hasDetails?: boolean;
    columnForDetail?: string;
}) {
    const store = createStore(options?.preloadedState);

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/cboms/list']}>
                <PagedList
                    entity={EntityType.CBOM}
                    headers={headers as any}
                    data={rows as any}
                    title="CBOMs"
                    entityNameSingular="CBOM"
                    entityNamePlural="CBOMs"
                    addHidden={options?.addHidden ?? true}
                    hideWidgetButtons={options?.hideWidgetButtons ?? false}
                    isBusy={options?.isBusy ?? false}
                    filterTitle={options?.filterTitle}
                    getAvailableFiltersApi={options?.getAvailableFiltersApi}
                    onListCallback={options?.onListCallback ?? (() => {})}
                    onDeleteCallback={options?.onDeleteCallback as any}
                    additionalButtons={options?.additionalButtons as any}
                    hasCheckboxes={options?.hasCheckboxes ?? true}
                    hasDetails={options?.hasDetails ?? false}
                    columnForDetail={options?.columnForDetail}
                />
            </MemoryRouter>
        </Provider>
    );
}

test.describe('PagedList', () => {
    test('mounts with default props', async ({ mount }) => {
        const component = await mount(renderPagedList());

        await expect(component.getByText('CBOMs')).toBeVisible();
        await expect(component.getByText('First row')).toBeVisible();
        await expect(component.getByText('Third row')).toBeVisible();
    });

    test('mounts with busy state', async ({ mount, page }) => {
        const component = await mount(renderPagedList({ isBusy: true }));

        await expect(page.getByTestId('spinner')).toBeVisible();
        await expect(component.getByTestId('widget-busy-overlay')).toBeVisible();
    });

    test('mounts with create and delete controls enabled', async ({ mount }) => {
        const component = await mount(
            renderPagedList({
                addHidden: false,
                onDeleteCallback: () => {},
                preloadedState: {
                    pagings: {
                        pagings: [
                            {
                                entity: EntityType.CBOM,
                                paging: {
                                    totalItems: 10,
                                    checkedRows: ['row-1'],
                                    isFetchingList: false,
                                    pageNumber: 1,
                                    pageSize: 10,
                                },
                            },
                        ],
                    } as any,
                },
            }),
        );

        await expect(component.getByTestId('create-button')).toBeVisible();
        // Delete renders but starts disabled: PagedList's initial load clears any preloaded selection.
        await expect(component.getByTestId('delete-button')).toBeDisabled();
    });

    test('hides widget action icons when hideWidgetButtons is true', async ({ mount }) => {
        const component = await mount(
            renderPagedList({
                addHidden: false,
                hideWidgetButtons: true,
                onDeleteCallback: () => {},
            }),
        );

        await expect(component.locator('button:has(svg.lucide-plus)')).toHaveCount(0);
        await expect(component.locator('button:has(svg[class*="lucide-trash"])')).toHaveCount(0);
    });

    test('renders selectable rows with delete wired up', async ({ mount }) => {
        const component = await mount(
            renderPagedList({
                onDeleteCallback: () => {},
                preloadedState: preloadedDeleteState,
            }),
        );

        await expect(component.getByTestId('delete-button')).toBeVisible();
        await expect(component.locator('input[type="checkbox"]')).toHaveCount(rows.length + 1);

        await component.locator('#row-1__checkbox__').click();
        await expect(component.locator('#row-1__checkbox__')).toBeChecked();
    });

    test('mounts with additional action buttons', async ({ mount }) => {
        const component = await mount(
            renderPagedList({
                additionalButtons: [
                    {
                        icon: 'sync',
                        disabled: false,
                        tooltip: 'Sync',
                        onClick: () => {},
                    },
                ],
            }),
        );

        await expect(component.getByTestId('sync-button')).toBeVisible();
        await expect(component.getByTestId('sync-button')).toBeEnabled();
    });

    test('mounts filter widget when filter title and API are provided', async ({ mount }) => {
        const component = await mount(
            renderPagedList({
                filterTitle: 'CBOM Filters',
                getAvailableFiltersApi: () => of([]),
            }),
        );

        await expect(component.getByText('CBOM Filters')).toBeVisible();
    });

    test('mounts with details enabled and checkboxes disabled', async ({ mount }) => {
        const component = await mount(
            renderPagedList({
                hasCheckboxes: false,
                hasDetails: true,
                columnForDetail: 'name',
            }),
        );

        await expect(component.locator('input[type="checkbox"]')).toHaveCount(0);
        await expect(component.getByText('First row')).toBeVisible();
    });

    test('does not show delete confirmation dialog by default', async ({ mount }) => {
        const component = await mount(
            renderPagedList({
                addHidden: false,
                onDeleteCallback: () => {},
                preloadedState: preloadedDeleteState,
            }),
        );

        await expect(component.locator('text=You are about to delete')).toHaveCount(0);
    });

    test('does not show the reset-view button when the view is at its defaults', async ({ mount, page }) => {
        await mount(renderPagedList());
        await expect(page.getByTestId('reset-view-icon')).toHaveCount(0);
    });
});
