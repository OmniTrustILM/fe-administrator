import type { UnknownAction } from '@reduxjs/toolkit';
import { actions as filterActions, EntityType } from 'ducks/filters';
import { type FiltersTestState, testReducers } from 'ducks/test-reducers';
import { useState } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { FilterConditionOperator, FilterFieldSource, Resource } from 'types/openapi';
import { createRecordingStore } from 'utils/test-helpers';
import ConditionAndSetFieldExecutionItemsViewer from '.';

const condition = {
    uuid: 'condition-1',
    name: 'Condition',
    description: '',
    resource: Resource.Certificates,
    items: [
        {
            fieldSource: FilterFieldSource.Meta,
            fieldIdentifier: 'owners',
            operator: FilterConditionOperator.Equals,
            value: ['Alice', 'Bob'],
        },
    ],
};

const isConditionRead = (action: UnknownAction): action is UnknownAction & { payload: { condition: unknown } } =>
    action.type === 'rules/getConditionSuccess';

const answeringConditionReads: typeof testReducers = (state, action) => {
    const next = testReducers(state, action);
    if (!isConditionRead(action)) return next;
    return { ...next, rules: { ...next.rules, conditionDetails: action.payload.condition } };
};

function Controls() {
    const dispatch = useDispatch();
    const currentFilters = useSelector(
        (state: { filters: FiltersTestState }) =>
            state.filters.filters.find((entry) => entry.entity === EntityType.CONDITIONS)?.filter.currentFilters ?? [],
    );

    return (
        <>
            <button
                type="button"
                data-testid="remove-bob-locally"
                onClick={() =>
                    dispatch(
                        filterActions.setCurrentFilters({
                            entity: EntityType.CONDITIONS,
                            currentFilters: [{ ...condition.items[0], condition: condition.items[0].operator, value: ['Alice'] }],
                        }),
                    )
                }
            >
                Remove Bob
            </button>
            <button
                type="button"
                data-testid="refetch-condition"
                onClick={() => dispatch({ type: 'rules/getConditionSuccess', payload: { condition: structuredClone(condition) } })}
            >
                Refetch
            </button>
            <div data-testid="current-filters">{JSON.stringify(currentFilters)}</div>
        </>
    );
}

/** Mounts the condition-items viewer on a condition detail route, with a store that answers condition reads. */
export default function ConditionItemsViewerWithStore() {
    const [store] = useState(() =>
        createRecordingStore(
            {
                rules: { ...testReducers(undefined, { type: '@@init' }).rules, conditionDetails: condition },
                filters: {
                    filters: [
                        {
                            entity: EntityType.CONDITIONS,
                            filter: { availableFilters: [], currentFilters: [], isFetchingFilters: false, hasLoadedFilters: true },
                        },
                    ],
                },
            },
            () => {},
            answeringConditionReads,
        ),
    );

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={[`/conditions/detail/${condition.uuid}`]}>
                <Routes>
                    <Route
                        path="/conditions/detail/:id"
                        element={
                            <>
                                <ConditionAndSetFieldExecutionItemsViewer resource={Resource.Certificates} formType="conditionItems" />
                                <Controls />
                            </>
                        }
                    />
                </Routes>
            </MemoryRouter>
        </Provider>
    );
}
