import Button from 'components/Button';
import type { TableDataRow, TableHeader } from 'components/CustomTable';
import PagedCustomTable from 'components/CustomTable/PagedCustomTable';
import { EnumColumnDescription } from 'components/EnumDescription';
import Widget from 'components/Widget';
import EvaluationDetailsDialog from 'components/_pages/notifications/events-settings/EvaluationDetailsDialog';
import { objectEventHistoryHeaders } from 'components/_pages/notifications/events-settings/tableHeaders';
import { getEnumLabel, selectors as enumSelectors } from 'ducks/enums';
import { actions, selectors } from 'ducks/event-history';
import { Check, Info, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { type ObjectEventHistoryDto, PlatformEnum, type Resource, type TriggerHistoryObjectTriggerSummaryDto } from 'types/openapi';
import { dateFormatter } from 'utils/dateUtil';

type Props = {
    resource: Resource;
    uuid: string;
};

const booleanIcon = (value: boolean) => (value ? <Check size={16} className="text-success" /> : <X size={16} className="text-danger" />);

export default function ObjectEventHistoryWidget({ resource, uuid }: Readonly<Props>) {
    const dispatch = useDispatch();
    const objectEventHistory = useSelector(selectors.objectEventHistory);
    const isFetching = useSelector(selectors.isFetchingObjectEventHistory);
    const resourceEventEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ResourceEvent));

    const [selectedEntry, setSelectedEntry] = useState<ObjectEventHistoryDto | undefined>(undefined);

    const headers: TableHeader[] = useMemo(
        () =>
            objectEventHistoryHeaders.map((header) =>
                header.id === 'event'
                    ? {
                          ...header,
                          content: (
                              <span className="inline-flex items-center gap-1">
                                  {header.content}
                                  <EnumColumnDescription platformEnum={PlatformEnum.ResourceEvent} title="Event" />
                              </span>
                          ),
                      }
                    : header,
            ),
        [],
    );

    const onReloadData = useCallback(
        (pageSize: number, pageNumber: number) => {
            dispatch(actions.getObjectEventHistory({ resource, uuid, itemsPerPage: pageSize, pageNumber }));
        },
        [dispatch, resource, uuid],
    );

    const data: TableDataRow[] = useMemo(
        () =>
            (objectEventHistory?.items ?? []).map((entry, index) => ({
                id: `${entry.triggeredAt}-${entry.trigger.uuid}-${index}`,
                columns: [
                    <Link key="event" to={`/events/detail/${entry.event}`}>
                        {getEnumLabel(resourceEventEnum, entry.event)}
                    </Link>,
                    <Link key="trigger" to={`/triggers/detail/${entry.trigger.uuid}`}>
                        {entry.trigger.name}
                    </Link>,
                    booleanIcon(entry.conditionsMatched),
                    booleanIcon(entry.actionsPerformed),
                    dateFormatter(entry.triggeredAt),
                    entry.message ?? '',
                    <Button
                        key="details"
                        variant="transparent"
                        color="primary"
                        className="!p-1"
                        title="Details"
                        onClick={() => setSelectedEntry(entry)}
                    >
                        <Info size={16} />
                    </Button>,
                ],
            })),
        [objectEventHistory, resourceEventEnum],
    );

    const dialogTrigger: TriggerHistoryObjectTriggerSummaryDto | undefined = useMemo(() => {
        if (!selectedEntry) return undefined;
        return {
            triggerUuid: selectedEntry.trigger.uuid,
            triggerName: selectedEntry.trigger.name,
            triggeredAt: selectedEntry.triggeredAt,
            message: selectedEntry.message,
            notificationsSent: selectedEntry.notificationsSent,
            records: selectedEntry.records,
        };
    }, [selectedEntry]);

    const dialogObjectLabel = useMemo(
        () => selectedEntry?.origin?.name ?? selectedEntry?.origin?.objectUuid ?? uuid,
        [selectedEntry, uuid],
    );

    return (
        <Widget title="Event History" titleSize="large">
            <PagedCustomTable
                key={`${resource}-${uuid}`}
                headers={headers}
                data={data}
                totalItems={objectEventHistory?.totalItems}
                onReloadData={onReloadData}
                isLoading={isFetching}
            />
            <EvaluationDetailsDialog
                isOpen={!!selectedEntry}
                onClose={() => setSelectedEntry(undefined)}
                objectLabel={dialogObjectLabel}
                trigger={dialogTrigger}
            />
        </Widget>
    );
}
