import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import React, { act } from 'react';
import { Provider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { createRoot, type Root } from 'react-dom/client';
import PagedList from 'components/PagedList/PagedList';
import pagingReducer, { actions as pagingActions } from './paging';
import filtersReducer, { actions as filterActions, EntityType } from './filters';

const navigateMock = vi.fn();

vi.mock('react-router', () => ({
    useNavigate: () => navigateMock,
    useLocation: () => ({ pathname: '/test-list' }),
}));

vi.mock('components/FilterWidget', () => ({
    default: () => React.createElement('div', { 'data-testid': 'mock-filter-widget' }),
}));

vi.mock('components/Dialog', () => ({
    default: ({ isOpen, caption, buttons }: any) =>
        isOpen
            ? React.createElement(
                  'div',
                  { 'data-testid': 'mock-dialog' },
                  React.createElement('div', null, caption),
                  ...(buttons || []).map((button: any, index: number) =>
                      React.createElement(
                          'button',
                          {
                              key: `${button.body}-${index}`,
                              type: 'button',
                              onClick: () => button.onClick(),
                          },
                          button.body,
                      ),
                  ),
              )
            : null,
}));

vi.mock('components/Widget', () => ({
    default: ({ title, children, widgetButtons, busy, hideWidgetButtons }: any) =>
        React.createElement(
            'section',
            { 'data-testid': 'mock-widget', 'data-busy': String(!!busy), 'data-hide-widget-buttons': String(!!hideWidgetButtons) },
            React.createElement('h2', null, title),
            hideWidgetButtons
                ? null
                : React.createElement(
                      'div',
                      { 'data-testid': 'mock-widget-buttons' },
                      ...(widgetButtons || []).map((button: any, index: number) =>
                          React.createElement(
                              'button',
                              {
                                  key: `${button.tooltip}-${index}`,
                                  type: 'button',
                                  title: button.tooltip,
                                  disabled: !!button.disabled,
                                  onClick: (event) => button.onClick(event),
                              },
                              button.tooltip,
                          ),
                      ),
                  ),
            children,
        ),
}));

vi.mock('components/CustomTable', () => ({
    default: ({ onPageChanged, onPageSizeChanged, hasCheckboxes, multiSelect, hasDetails }: any) =>
        React.createElement(
            'div',
            {
                'data-testid': 'mock-custom-table',
                'data-has-checkboxes': String(!!hasCheckboxes),
                'data-multi-select': String(!!multiSelect),
                'data-has-details': String(!!hasDetails),
            },
            React.createElement(
                'button',
                {
                    type: 'button',
                    'data-testid': 'mock-page-3',
                    onClick: () => onPageChanged?.(3),
                },
                'Page 3',
            ),
            React.createElement(
                'button',
                {
                    type: 'button',
                    'data-testid': 'mock-size-50',
                    onClick: () => onPageSizeChanged?.(50),
                },
                'Page size 50',
            ),
        ),
}));

type MockStore = ReturnType<typeof createStore>;

const reducer = combineReducers({
    pagings: pagingReducer,
    filters: filtersReducer,
});

function createStore(preloadedState?: Partial<ReturnType<typeof reducer>>) {
    return configureStore({
        reducer,
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({
                serializableCheck: false,
            }),
        preloadedState: preloadedState as ReturnType<typeof reducer>,
    });
}

function renderPagedList({
    store,
    onListCallback,
    onDeleteCallback,
    props,
}: {
    store: MockStore;
    onListCallback: (filters: any) => void;
    onDeleteCallback?: (uuids: string[], filters: any[]) => void;
    props?: Partial<React.ComponentProps<typeof PagedList>>;
}) {
    return React.createElement(
        Provider as any,
        { store },
        React.createElement(PagedList, {
            entity: EntityType.CBOM,
            headers: [{ id: 'name', content: 'Name' }] as any,
            data: [{ id: 'row-1', columns: ['First row'] }] as any,
            title: 'CBOMs',
            onListCallback,
            onDeleteCallback,
            addHidden: true,
            ...props,
        }),
    );
}

async function flushEffects() {
    await act(async () => {
        await Promise.resolve();
    });
}

describe('PagedList (redux pagination logic)', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        vi.clearAllMocks();
        navigateMock.mockReset();
    });

    test('uses default values for busy, multiSelect, hideWidgetButtons, hasCheckboxes and hasDetails', async () => {
        const onListCallback = vi.fn();
        const store = createStore();

        await act(async () => {
            root.render(
                renderPagedList({
                    store,
                    onListCallback,
                    props: {
                        addHidden: false,
                    },
                }),
            );
        });
        await flushEffects();

        const widget = container.querySelector('[data-testid="mock-widget"]') as HTMLElement;
        expect(widget).toBeTruthy();
        expect(widget.dataset.busy).toBe('false');
        expect(widget.dataset.hideWidgetButtons).toBe('false');

        const table = container.querySelector('[data-testid="mock-custom-table"]') as HTMLElement;
        expect(table).toBeTruthy();
        expect(table.dataset.hasCheckboxes).toBe('true');
        expect(table.dataset.multiSelect).toBe('true');
        expect(table.dataset.hasDetails).toBe('false');
    });

    test('mount list refresh clears checked rows through onCheckedRowsChanged', async () => {
        const onListCallback = vi.fn();
        const store = createStore({
            pagings: {
                pagings: [
                    {
                        entity: EntityType.CBOM,
                        paging: {
                            totalItems: 100,
                            checkedRows: ['row-1'],
                            isFetchingList: false,
                            pageNumber: 1,
                            pageSize: 10,
                        },
                    },
                ],
            },
        });

        await act(async () => {
            root.render(renderPagedList({ store, onListCallback }));
        });
        await flushEffects();

        expect((store.getState() as any).pagings.pagings[0].paging.checkedRows).toEqual([]);
    });

    test('initial list call uses redux pagination values', async () => {
        const onListCallback = vi.fn();

        const store = createStore({
            pagings: {
                pagings: [
                    {
                        entity: EntityType.CBOM,
                        paging: {
                            totalItems: 100,
                            checkedRows: [],
                            isFetchingList: false,
                            pageNumber: 2,
                            pageSize: 20,
                        },
                    },
                ],
            },
        });

        await act(async () => {
            root.render(renderPagedList({ store, onListCallback }));
        });
        await flushEffects();

        expect(onListCallback).toHaveBeenCalled();
        expect(onListCallback).toHaveBeenLastCalledWith({ itemsPerPage: 20, pageNumber: 2, filters: [] });
    });

    test('page change updates redux page number and triggers list callback', async () => {
        const onListCallback = vi.fn();
        const store = createStore();

        await act(async () => {
            root.render(renderPagedList({ store, onListCallback }));
        });
        await flushEffects();

        const pageButton = container.querySelector('[data-testid="mock-page-3"]') as HTMLButtonElement;
        expect(pageButton).toBeTruthy();

        await act(async () => {
            pageButton.click();
        });
        await flushEffects();

        expect((store.getState() as any).pagings.pagings[0].paging.pageNumber).toBe(3);
        expect(onListCallback).toHaveBeenLastCalledWith({ itemsPerPage: 10, pageNumber: 3, filters: [] });
    });

    test('page size change resets page to 1, stores new page size, and lists again', async () => {
        const onListCallback = vi.fn();
        const store = createStore({
            pagings: {
                pagings: [
                    {
                        entity: EntityType.CBOM,
                        paging: {
                            totalItems: 100,
                            checkedRows: [],
                            isFetchingList: false,
                            pageNumber: 4,
                            pageSize: 20,
                        },
                    },
                ],
            },
        });

        await act(async () => {
            root.render(renderPagedList({ store, onListCallback }));
        });
        await flushEffects();

        const sizeButton = container.querySelector('[data-testid="mock-size-50"]') as HTMLButtonElement;
        expect(sizeButton).toBeTruthy();

        await act(async () => {
            sizeButton.click();
        });
        await flushEffects();

        const pagingState = (store.getState() as any).pagings.pagings[0].paging;
        expect(pagingState.pageSize).toBe(50);
        expect(pagingState.pageNumber).toBe(1);
        expect(onListCallback).toHaveBeenLastCalledWith({ itemsPerPage: 50, pageNumber: 1, filters: [] });
    });

    test('changing filters resets page number to 1', async () => {
        const onListCallback = vi.fn();
        const store = createStore({
            pagings: {
                pagings: [
                    {
                        entity: EntityType.CBOM,
                        paging: {
                            totalItems: 100,
                            checkedRows: [],
                            isFetchingList: false,
                            pageNumber: 5,
                            pageSize: 20,
                        },
                    },
                ],
            },
        });

        await act(async () => {
            root.render(renderPagedList({ store, onListCallback }));
        });
        await flushEffects();

        await act(async () => {
            store.dispatch(
                filterActions.setCurrentFilters({
                    entity: EntityType.CBOM,
                    currentFilters: [
                        {
                            fieldSource: 'METADATA' as any,
                            fieldIdentifier: 'serialNumber',
                            condition: 'EQUALS' as any,
                            value: 'SN-100',
                        },
                    ] as any,
                }),
            );
        });
        await flushEffects();

        expect((store.getState() as any).pagings.pagings[0].paging.pageNumber).toBe(1);
        expect(onListCallback).toHaveBeenLastCalledWith({
            itemsPerPage: 20,
            pageNumber: 1,
            filters: [
                {
                    fieldSource: 'METADATA',
                    fieldIdentifier: 'serialNumber',
                    condition: 'EQUALS',
                    value: 'SN-100',
                },
            ],
        });
    });

    test('same filter content does not reset page', async () => {
        const onListCallback = vi.fn();
        const currentFilters = [
            {
                fieldSource: 'METADATA' as any,
                fieldIdentifier: 'serialNumber',
                condition: 'EQUALS' as any,
                value: 'SN-200',
            },
        ] as any;

        const store = createStore({
            pagings: {
                pagings: [
                    {
                        entity: EntityType.CBOM,
                        paging: {
                            totalItems: 100,
                            checkedRows: [],
                            isFetchingList: false,
                            pageNumber: 4,
                            pageSize: 20,
                        },
                    },
                ],
            },
            filters: {
                filters: [
                    {
                        entity: EntityType.CBOM,
                        filter: {
                            availableFilters: [],
                            currentFilters,
                            preservedFilters: [],
                            isFetchingFilters: false,
                        },
                    },
                ],
            },
        });

        await act(async () => {
            root.render(renderPagedList({ store, onListCallback }));
        });
        await flushEffects();

        await act(async () => {
            store.dispatch(
                filterActions.setCurrentFilters({
                    entity: EntityType.CBOM,
                    currentFilters: [...currentFilters],
                }),
            );
        });
        await flushEffects();

        expect((store.getState() as any).pagings.pagings[0].paging.pageNumber).toBe(4);
        expect(onListCallback).toHaveBeenLastCalledWith({ itemsPerPage: 20, pageNumber: 4, filters: currentFilters });
    });

    test('create button is hidden when addHidden is true', async () => {
        const onListCallback = vi.fn();
        const store = createStore();

        await act(async () => {
            root.render(renderPagedList({ store, onListCallback }));
        });
        await flushEffects();

        const createButton = container.querySelector('button[title="Create"]');
        expect(createButton).toBeNull();
    });

    test('create button is shown when addHidden is false and navigates to add route', async () => {
        const onListCallback = vi.fn();
        const store = createStore();

        await act(async () => {
            root.render(
                renderPagedList({
                    store,
                    onListCallback,
                    props: {
                        addHidden: false,
                    },
                }),
            );
        });
        await flushEffects();

        const createButton = container.querySelector('button[title="Create"]') as HTMLButtonElement;
        expect(createButton).toBeTruthy();

        await act(async () => {
            createButton.click();
        });
        await flushEffects();

        expect(navigateMock).toHaveBeenCalledWith('./add');
    });

    test('delete dialog supports cancel and confirm flows', async () => {
        const onListCallback = vi.fn();
        const onDeleteCallback = vi.fn();

        const store = createStore({
            pagings: {
                pagings: [
                    {
                        entity: EntityType.CBOM,
                        paging: {
                            totalItems: 100,
                            checkedRows: ['row-1', 'row-2'],
                            isFetchingList: false,
                            pageNumber: 1,
                            pageSize: 10,
                        },
                    },
                ],
            },
            filters: {
                filters: [
                    {
                        entity: EntityType.CBOM,
                        filter: {
                            availableFilters: [],
                            currentFilters: [{ fieldSource: 'METADATA', fieldIdentifier: 'serialNumber', condition: 'EQUALS', value: 'x' }],
                            preservedFilters: [],
                            isFetchingFilters: false,
                        },
                    },
                ],
            },
        } as any);

        await act(async () => {
            root.render(renderPagedList({ store, onListCallback, onDeleteCallback }));
        });
        await flushEffects();

        await act(async () => {
            store.dispatch(
                pagingActions.setCheckedRows({
                    entity: EntityType.CBOM,
                    checkedRows: ['row-1', 'row-2'],
                }),
            );
        });
        await flushEffects();

        const openDeleteDialogButton = container.querySelector('button[title="Delete"]') as HTMLButtonElement;
        expect(openDeleteDialogButton).toBeTruthy();

        await act(async () => {
            openDeleteDialogButton.click();
        });
        await flushEffects();

        expect(container.querySelector('[data-testid="mock-dialog"]')).toBeTruthy();

        const dialogButtons = Array.from(container.querySelectorAll('[data-testid="mock-dialog"] button')) as HTMLButtonElement[];
        const cancelButton = dialogButtons.find((button) => button.textContent === 'Cancel') as HTMLButtonElement;
        expect(cancelButton).toBeTruthy();

        await act(async () => {
            cancelButton.click();
        });
        await flushEffects();

        expect(container.querySelector('[data-testid="mock-dialog"]')).toBeNull();
        expect(onDeleteCallback).not.toHaveBeenCalled();

        await act(async () => {
            openDeleteDialogButton.click();
        });
        await flushEffects();

        const confirmButtons = Array.from(container.querySelectorAll('[data-testid="mock-dialog"] button')) as HTMLButtonElement[];
        const confirmDeleteButton = confirmButtons.find((button) => button.textContent === 'Delete') as HTMLButtonElement;
        expect(confirmDeleteButton).toBeTruthy();

        await act(async () => {
            confirmDeleteButton.click();
        });
        await flushEffects();

        expect(onDeleteCallback).toHaveBeenCalledWith(
            ['row-1', 'row-2'],
            [{ fieldSource: 'METADATA', fieldIdentifier: 'serialNumber', condition: 'EQUALS', value: 'x' }],
        );
    });

    test('renders filter widget only when filter props are provided', async () => {
        const onListCallback = vi.fn();
        const store = createStore();

        await act(async () => {
            root.render(
                renderPagedList({
                    store,
                    onListCallback,
                    props: {
                        filterTitle: 'Filters',
                        getAvailableFiltersApi: (() => ({ subscribe: () => ({ unsubscribe: () => {} }) })) as any,
                        addHidden: true,
                    },
                }),
            );
        });
        await flushEffects();

        expect(container.querySelector('[data-testid="mock-filter-widget"]')).toBeTruthy();
    });
});
