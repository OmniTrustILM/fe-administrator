import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { EnumColumnDescription } from 'components/EnumDescription';
import { actions, selectors } from 'ducks/scheduler';

import type { TableDataRow, TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import PagedList from 'components/PagedList/PagedList';
import { EntityType } from 'ducks/filters';
import { useNavigate } from 'react-router';
import Button from 'components/Button';
import Badge from 'components/Badge';
import type { SearchRequestModel } from 'types/certificate';
import { PlatformEnum, SchedulerJobExecutionStatus } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import { Info, ArrowRight } from 'lucide-react';
import { dateFormatter, timeFormatter } from 'utils/dateUtil';

type Props = Readonly<{
    uuid: string;
}>;

function SchedulerJobHistory({ uuid }: Props) {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const schedulerJobHistory = useSelector(selectors.schedulerJobHistory);
    const schedulerJobExecutionStatusEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.SchedulerJobExecutionStatus));

    const [showMessage, setShowMessage] = useState<boolean>(false);
    const [message, setMessage] = useState<string>();

    const schedulerJobHistoryRowHeaders: TableHeader[] = useMemo(
        () => [
            {
                content: 'Start',
                sortable: true,
                id: 'start',
                width: 'auto',
            },
            {
                content: 'End',
                sortable: true,
                id: 'end',
                width: 'auto',
            },
            {
                content: 'Duration',
                sortable: true,
                id: 'duration',
                width: 'auto',
            },
            {
                content: 'Status',
                info: <EnumColumnDescription platformEnum={PlatformEnum.SchedulerJobExecutionStatus} title="Status" />,
                sortable: true,
                id: 'status',
                width: 'auto',
            },
        ],
        [],
    );

    const schedulerJobHistoryData: TableDataRow[] = useMemo(
        () =>
            schedulerJobHistory.map((history) => ({
                id: history.jobUuid ?? '',
                columns: [
                    history.startTime ? dateFormatter(history.startTime) : '',
                    history.endTime ? dateFormatter(history.endTime) : '',
                    history.startTime && history.endTime
                        ? timeFormatter(new Date(history.endTime).valueOf() - new Date(history.startTime).valueOf())
                        : '',
                    <div key="status-actions" className="flex items-center gap-1">
                        <Badge
                            color={(() => {
                                if (history.status === SchedulerJobExecutionStatus.Failed) return 'danger';
                                return history.status === SchedulerJobExecutionStatus.Succeeded ? 'success' : 'primary';
                            })()}
                        >
                            {getEnumLabel(schedulerJobExecutionStatusEnum, history.status)}
                        </Badge>
                        {history.resultMessage && (
                            <Button
                                variant="transparent"
                                title="Show message"
                                className="!p-1"
                                onClick={() => {
                                    setMessage(history.resultMessage ?? '');
                                    setShowMessage(true);
                                }}
                            >
                                <Info size={16} strokeWidth={1.5} />
                            </Button>
                        )}
                        {history.resultObjectType && history.resultObjectIdentification ? (
                            <Button
                                variant="transparent"
                                title="Go to details"
                                className="!p-1"
                                onClick={() => {
                                    navigate(
                                        `../../${history.resultObjectType}/detail/${history.resultObjectIdentification?.reduce(
                                            (prev, curr) => prev + '/' + curr,
                                        )}`,
                                    );
                                }}
                            >
                                <ArrowRight size={16} strokeWidth={1.5} />
                            </Button>
                        ) : (
                            ''
                        )}
                    </div>,
                ],
            })),
        [schedulerJobHistory, schedulerJobExecutionStatusEnum, navigate],
    );

    const onListCallback = useCallback(
        (pagination: SearchRequestModel) => dispatch(actions.listSchedulerJobHistory({ uuid, pagination })),
        [dispatch, uuid],
    );

    return (
        <>
            <PagedList
                entity={EntityType.SCHEDULER_HISTORY}
                onListCallback={onListCallback}
                headers={schedulerJobHistoryRowHeaders}
                data={schedulerJobHistoryData}
                title="Scheduled Job History"
                pageWidgetLockName={LockWidgetNameEnum.ListOfSchedulerHistory}
                hideWidgetButtons={true}
                hasCheckboxes={false}
            />
            <Dialog
                isOpen={showMessage}
                size={'lg'}
                caption="Result Message"
                body={message}
                toggle={() => setShowMessage(false)}
                buttons={[{ color: 'primary', onClick: () => setShowMessage(false), body: 'Close' }]}
            />
        </>
    );
}

export default SchedulerJobHistory;
