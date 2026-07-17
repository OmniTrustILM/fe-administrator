import Dialog from 'components/Dialog';
import { Fragment, useMemo } from 'react';
import type { TriggerHistoryObjectTriggerSummaryDto } from 'types/openapi';

type Props = {
    isOpen: boolean;
    onClose: () => void;
    objectLabel: string;
    trigger?: TriggerHistoryObjectTriggerSummaryDto;
};

type Row = { label: string; value: string };
type Section = { id: string; rows: Row[] };

export default function EvaluationDetailsDialog({ isOpen, onClose, objectLabel, trigger }: Readonly<Props>) {
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
            const reasonRows: Row[] = record.message ? [{ label: 'Reason', value: record.message }] : [];

            return {
                id: `record-${index}`,
                rows: [...conditionRows, ...executionRows, ...reasonRows],
            };
        });

        return [header, ...recordSections];
    }, [trigger, objectLabel]);

    return (
        <Dialog
            isOpen={isOpen}
            toggle={onClose}
            caption="Evaluation details"
            size="xl"
            body={
                <div className="divide-y divide-gray-200 text-sm">
                    {sections.map((section) => (
                        <div key={section.id} className="grid grid-cols-[200px_1fr] gap-y-2 py-4 first:pt-0 last:pb-0">
                            {section.rows.map((row) => (
                                <Fragment key={row.label}>
                                    <div className="text-gray-600">{row.label}</div>
                                    <div className="text-gray-900">{row.value}</div>
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
