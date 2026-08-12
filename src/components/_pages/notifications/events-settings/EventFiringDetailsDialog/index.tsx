import Button from 'components/Button';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import EvaluationDetailsDialog from 'components/_pages/notifications/events-settings/EvaluationDetailsDialog';
import { Check, Info, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { EventHistoryDto, TriggerHistoryObjectSummaryDto, TriggerHistoryObjectTriggerSummaryDto } from 'types/openapi';
import { dateFormatter } from 'utils/dateUtil';

type Props = {
    isOpen: boolean;
    onClose: () => void;
    entry?: EventHistoryDto;
};

type SelectedDetails = {
    objectLabel: string;
    trigger: TriggerHistoryObjectTriggerSummaryDto;
};

const booleanIcon = (value: boolean) => (value ? <Check size={16} className="text-success" /> : <X size={16} className="text-danger" />);

const allConditionsMatched = (trigger: TriggerHistoryObjectTriggerSummaryDto) => !trigger.records.some((r) => r.condition);
const allActionsPerformed = (trigger: TriggerHistoryObjectTriggerSummaryDto) =>
    allConditionsMatched(trigger) && !trigger.records.some((r) => r.execution);

export default function EventFiringDetailsDialog({ isOpen, onClose, entry }: Readonly<Props>) {
    const [selectedDetails, setSelectedDetails] = useState<SelectedDetails | undefined>(undefined);

    const headers: TableHeader[] = useMemo(
        () => [
            { id: 'object', content: 'Object' },
            { id: 'trigger', content: 'Trigger' },
            { id: 'conditions', content: 'Conditions' },
            { id: 'actions', content: 'Actions' },
            { id: 'triggeredAt', content: 'Triggered at' },
            { id: 'message', content: 'Message' },
            { id: 'details', content: 'Details', width: '60px' },
        ],
        [],
    );

    const data: TableDataRow[] = useMemo(() => {
        const objects: TriggerHistoryObjectSummaryDto[] = entry?.objectHistories.items ?? [];
        const resourcePath = entry?.resource?.toLowerCase();
        return objects.flatMap((obj, objIdx) => {
            const objectLabel = obj.objectUuid ?? obj.referenceObjectUuid ?? '';
            const objectLink =
                objectLabel && resourcePath ? (
                    <Link key="object" to={`/${resourcePath}/detail/${objectLabel}`}>
                        {objectLabel}
                    </Link>
                ) : (
                    objectLabel
                );
            return obj.triggers.map((trigger, trIdx) => ({
                id: `${objectLabel || objIdx}-${trigger.triggerUuid}-${trIdx}`,
                columns: [
                    objectLink,
                    <Link key="trigger" to={`/triggers/detail/${trigger.triggerUuid}`}>
                        {trigger.triggerName}
                    </Link>,
                    booleanIcon(allConditionsMatched(trigger)),
                    booleanIcon(allActionsPerformed(trigger)),
                    dateFormatter(trigger.triggeredAt),
                    trigger.message ?? '',
                    <Button
                        key="details"
                        variant="transparent"
                        color="primary"
                        className="!p-1"
                        title="Details"
                        onClick={() => setSelectedDetails({ objectLabel, trigger })}
                    >
                        <Info size={16} />
                    </Button>,
                ],
            }));
        });
    }, [entry]);

    return (
        <>
            <Dialog
                isOpen={isOpen}
                toggle={onClose}
                caption="Event firing details"
                size="xxl"
                body={<CustomTable headers={headers} data={data} />}
                buttons={[{ color: 'primary', body: 'Close', onClick: onClose }]}
            />
            <EvaluationDetailsDialog
                isOpen={!!selectedDetails}
                onClose={() => setSelectedDetails(undefined)}
                objectLabel={selectedDetails?.objectLabel ?? ''}
                trigger={selectedDetails?.trigger}
            />
        </>
    );
}
