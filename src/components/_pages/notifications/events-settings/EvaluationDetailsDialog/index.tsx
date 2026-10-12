import Dialog from 'components/Dialog';
import { selectors as enumSelectors } from 'ducks/enums';
import { actions as eventHistoryActions, selectors as eventHistorySelectors } from 'ducks/event-history';
import { Fragment, type ReactNode, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { PlatformEnum, type TriggerHistoryObjectTriggerSummaryDto } from 'types/openapi';
import { findConditionField, renderConditionItems } from 'utils/condition-badges';
import { findUnmetConditionItem } from 'utils/trigger-history';

type Props = {
    isOpen: boolean;
    onClose: () => void;
    objectLabel: string;
    trigger?: TriggerHistoryObjectTriggerSummaryDto;
};

type Row = { label: string; value: ReactNode };
type Section = { id: string; rows: Row[] };

const unmetItemReason = (item: ReactNode) => (
    <span className="inline-flex flex-wrap items-center gap-1">
        Condition item
        {item}
        is false.
    </span>
);

export default function EvaluationDetailsDialog({ isOpen, onClose, objectLabel, trigger }: Readonly<Props>) {
    const dispatch = useDispatch();
    const fieldSourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.FilterFieldSource));
    const operatorEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.FilterConditionOperator));
    const platformEnums = useSelector(enumSelectors.platformEnums);
    const filtersResource = useMemo(
        () => trigger?.records.find((record) => findUnmetConditionItem(record, fieldSourceEnum, operatorEnum))?.condition?.resource,
        [trigger, fieldSourceEnum, operatorEnum],
    );
    const selectFilterFields = useMemo(() => eventHistorySelectors.conditionFilterFields(filtersResource), [filtersResource]);
    const selectIsFetchingFilterFields = useMemo(
        () => eventHistorySelectors.isFetchingConditionFilterFields(filtersResource),
        [filtersResource],
    );
    const availableFilters = useSelector(selectFilterFields);
    const isFetchingFilterFields = useSelector(selectIsFetchingFilterFields);

    useEffect(() => {
        if (!isOpen || !filtersResource || availableFilters || isFetchingFilterFields) return;
        dispatch(eventHistoryActions.getConditionFilterFields({ resource: filtersResource }));
    }, [dispatch, isOpen, filtersResource, availableFilters, isFetchingFilterFields]);

    const sections: Section[] = useMemo(() => {
        if (!trigger) return [];

        const headerRows: Row[] = [
            { label: 'Object', value: objectLabel },
            { label: 'Trigger', value: trigger.triggerName },
        ];
        if (trigger.notificationsSent !== undefined) {
            headerRows.push({ label: 'Notification sent', value: trigger.notificationsSent ? 'Yes' : 'No' });
        }
        const header: Section = { id: 'header', rows: headerRows };

        const recordSections: Section[] = trigger.records.map((record, index) => {
            const conditionRows: Row[] = record.condition
                ? [
                      { label: 'Condition', value: record.condition.name },
                      { label: 'Result', value: 'Not met' },
                  ]
                : [];
            const executionRows: Row[] = record.execution
                ? [
                      { label: 'Action', value: record.execution.name },
                      { label: 'Result', value: 'Failed' },
                  ]
                : [];
            const unmetItem = findUnmetConditionItem(record, fieldSourceEnum, operatorEnum);
            const isUnmetItemReadable =
                !!unmetItem &&
                record.condition?.resource === filtersResource &&
                !!availableFilters &&
                !!findConditionField(availableFilters, unmetItem);
            const reason = isUnmetItemReadable
                ? unmetItemReason(
                      renderConditionItems([unmetItem], availableFilters ?? [], platformEnums, fieldSourceEnum, operatorEnum, {
                          className: '',
                      }),
                  )
                : record.message;
            const reasonRows: Row[] = record.message ? [{ label: 'Reason', value: reason }] : [];

            return {
                id: `record-${index}`,
                rows: [...conditionRows, ...executionRows, ...reasonRows],
            };
        });

        return [header, ...recordSections];
    }, [trigger, objectLabel, fieldSourceEnum, operatorEnum, platformEnums, availableFilters, filtersResource]);

    return (
        <Dialog
            isOpen={isOpen}
            toggle={onClose}
            caption="Evaluation details"
            size="xl"
            body={
                <div className="divide-y divide-divider text-sm">
                    {sections.map((section) => (
                        <div key={section.id} className="grid grid-cols-[200px_1fr] gap-y-2 py-4 first:pt-0 last:pb-0">
                            {section.rows.map((row) => (
                                <Fragment key={row.label}>
                                    <div className="text-content-muted">{row.label}</div>
                                    <div className="text-content">{row.value}</div>
                                </Fragment>
                            ))}
                        </div>
                    ))}
                </div>
            }
            buttons={[{ color: 'primary', body: 'Close', onClick: onClose }]}
        />
    );
}
