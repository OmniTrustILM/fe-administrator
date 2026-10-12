import eventHistoryReducer, { actions as eventHistoryActions } from 'ducks/event-history';
import { useMemo, useRef, useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import {
    ConditionType,
    FilterConditionOperator,
    FilterFieldSource,
    Resource,
    type TriggerHistoryObjectTriggerSummaryDto,
} from 'types/openapi';
import { createRecordingStore, overlaySliceReducer } from 'utils/test-helpers';
import EvaluationDetailsDialog from './index';

const fetchActions = [
    eventHistoryActions.getConditionFilterFields,
    eventHistoryActions.getConditionFilterFieldsSuccess,
    eventHistoryActions.getConditionFilterFieldsFailure,
];
const reducer = overlaySliceReducer('eventHistory', eventHistoryReducer as never, fetchActions);

const trigger: TriggerHistoryObjectTriggerSummaryDto = {
    triggerUuid: 't-1',
    triggerName: 'cert_status_trigger',
    triggeredAt: '2026-05-14T10:24:13Z',
    records: [
        {
            message: "Condition item 'property NOT_AFTER GREATER 2026-08-31T22:00:00.000Z' is false.",
            condition: {
                uuid: 'c-1',
                name: 'expires after September',
                type: ConditionType.CheckField,
                resource: Resource.Certificates,
                items: [
                    {
                        fieldSource: FilterFieldSource.Property,
                        fieldIdentifier: 'NOT_AFTER',
                        operator: FilterConditionOperator.Greater,
                        value: '2026-08-31T22:00:00.000Z',
                    },
                ],
            },
        },
    ],
};

/** Every field read the dialog asks for is recorded and answered with a failure, as a persistently failing API would. */
export default function EvaluationDetailsDialogRecordingWrapper() {
    const [isOpen, setIsOpen] = useState(true);
    const [reads, setReads] = useState(0);
    const storeRef = useRef<ReturnType<typeof createRecordingStore>>(undefined);
    const store = useMemo(
        () =>
            createRecordingStore(
                undefined,
                ({ type }) => {
                    if (type !== eventHistoryActions.getConditionFilterFields.type) return;
                    setReads((count) => count + 1);
                    setTimeout(() => {
                        storeRef.current?.dispatch(
                            eventHistoryActions.getConditionFilterFieldsFailure({ resource: Resource.Certificates, error: 'boom' }),
                        );
                    }, 0);
                },
                reducer,
            ),
        [],
    );
    storeRef.current = store;

    return (
        <Provider store={store}>
            <MemoryRouter>
                <EvaluationDetailsDialog isOpen={isOpen} onClose={() => setIsOpen(false)} objectLabel="yahoo.com" trigger={trigger} />
                <output data-testid="field-reads">{reads}</output>
                <button type="button" onClick={() => setIsOpen(true)}>
                    Open again
                </button>
            </MemoryRouter>
        </Provider>
    );
}
