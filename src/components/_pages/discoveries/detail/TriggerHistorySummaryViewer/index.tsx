import { useCallback, useMemo } from 'react';
import type { TriggerHistoryObjectSummaryModel, TriggerHistoryObjectTriggerSummaryModel } from 'types/rules';
interface TriggerHistorySummaryProps {
    triggerHistoryObjectSummary: TriggerHistoryObjectSummaryModel;
}

import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import TabLayout from 'components/Layout/TabLayout';
import Widget from 'components/Widget';
import { actions as userInterfaceActions } from 'ducks/user-interface';
import { useDispatch } from 'react-redux';
import Button from 'components/Button';
import { X, Check, Ban, Info } from 'lucide-react';

const TriggerHistorySummaryViewer = ({ triggerHistoryObjectSummary }: TriggerHistorySummaryProps) => {
    const dispatch = useDispatch();

    const triggerHistoryHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'failSource',
                content: 'Fail Source',
                width: '15%',
            },
            {
                id: 'name',
                content: 'Name',
                width: '15%',
            },
            {
                id: 'message',
                content: 'Message',
                width: '70%',
            },
        ],
        [],
    );

    const getTriggerHistoryTable = useCallback(
        (trigger: TriggerHistoryObjectTriggerSummaryModel) => {
            const recordData: TableDataRow[] = trigger?.records?.length
                ? trigger.records.map((r, i) => ({
                      id: i,
                      columns: [
                          (() => {
                              const failSource = r?.execution ? 'Execution' : '';
                              return r?.condition ? 'Condition' : failSource;
                          })(),
                          r.condition?.name || r.execution?.name || '',
                          r.message || '',
                      ],
                  }))
                : [];
            return (
                <Widget>
                    <CustomTable headers={triggerHistoryHeaders} data={recordData} />
                </Widget>
            );
        },
        [triggerHistoryHeaders],
    );

    const onIconClick = useCallback(() => {
        const triggers = triggerHistoryObjectSummary.triggers;
        dispatch(
            userInterfaceActions.showGlobalModal({
                isOpen: true,
                size: 'xl',
                content: (
                    <div>
                        <TabLayout
                            tabs={
                                triggers.length
                                    ? triggers.map((trigger, i) => ({
                                          content: getTriggerHistoryTable(trigger),
                                          title: trigger.triggerName,
                                          onClick: () => {},
                                      }))
                                    : []
                            }
                        />
                    </div>
                ),
                title: 'Trigger History Summary Details',
                showCloseButton: true,
            }),
        );
    }, [triggerHistoryObjectSummary, dispatch, getTriggerHistoryTable]);

    // check if there are some records are present atleast in one trigger object of trigger array

    const hasRecords = useMemo(() => {
        return triggerHistoryObjectSummary.triggers.some((trigger) => trigger.records.length);
    }, [triggerHistoryObjectSummary.triggers]);

    const getIcon = useMemo(() => {
        if (!triggerHistoryObjectSummary.matched) {
            return (
                <span title="Not Matched">
                    <X size={16} aria-hidden />
                </span>
            );
        } else if (triggerHistoryObjectSummary.matched && !triggerHistoryObjectSummary.ignored) {
            return (
                <span title="Matched">
                    <Check size={16} aria-hidden />
                </span>
            );
        } else {
            return (
                <span title="Ignored">
                    <Ban size={16} aria-hidden />
                </span>
            );
        }
    }, [triggerHistoryObjectSummary.matched, triggerHistoryObjectSummary.ignored]);
    return (
        <div className="flex justify-start" style={{ marginBottom: '4px' }}>
            <div className="p-2">{getIcon}</div>
            {hasRecords && (
                <Button variant="transparent" onClick={onIconClick}>
                    <Info size={16} />
                </Button>
            )}
        </div>
    );
};

export default TriggerHistorySummaryViewer;
