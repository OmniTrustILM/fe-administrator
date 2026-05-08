import Widget from 'components/Widget';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { actions as rulesActions, selectors as rulesSelectors } from 'ducks/rules';
import { useCallback, useEffect, useMemo } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';

import { type Resource, type TriggerDto, PlatformEnum, type ResourceEvent } from 'types/openapi';

import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Button from 'components/Button';
import BooleanBadge from 'components/BooleanBadge/BooleanBadge';
import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react';

type OptionType = {
    label: string;
    value: string;
};

type Props = Readonly<{
    resource?: Resource;
    event?: ResourceEvent;
    selectedTriggers: string[];
    onSelectedTriggersChange: (triggerUuids: string[]) => void;
    noteText?: string;
}>;

export default function TriggerEditorWidget({ resource, event, selectedTriggers, onSelectedTriggersChange, noteText }: Props) {
    const dispatch = useDispatch();

    const triggers = useSelector(rulesSelectors.triggers);

    const resourceTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const triggerTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.TriggerType));
    const eventNameEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ResourceEvent));

    const isFetchingTriggers = useSelector(rulesSelectors.isFetchingTriggers);

    const newTriggerOptions = useMemo(
        () =>
            triggers
                .filter((trigger) => event === undefined || trigger.event === event)
                .map((trigger) => ({
                    label: trigger.name,
                    value: trigger.uuid,
                }))
                .filter((trigger) => !selectedTriggers.includes(trigger.value)),
        [triggers, selectedTriggers, event],
    );

    const isBusy = useMemo(() => isFetchingTriggers, [isFetchingTriggers]);

    useEffect(() => {
        dispatch(rulesActions.listTriggers({ resource }));
    }, [dispatch, resource]);

    const sortTriggersByIgnoreTriggerValue = useCallback(
        (selectedTriggers: string[]) =>
            [...selectedTriggers].sort((a, b) => {
                const triggerA = triggers.find((t) => t.uuid === a);
                const triggerB = triggers.find((t) => t.uuid === b);
                if (!triggerA || !triggerB) return 0;
                if (triggerA.ignoreTrigger === triggerB.ignoreTrigger) return 0;
                return triggerA.ignoreTrigger ? -1 : 1;
            }),
        [triggers],
    );
    const onAddTrigger = useCallback(
        (newValues: OptionType[]) => {
            const previousTriggers = selectedTriggers;
            const newTriggers = newValues.map((el) => triggers.find((innerEl) => innerEl.uuid === el.value));
            const allTriggers = [
                ...previousTriggers,
                ...(newTriggers.filter((newValue) => !previousTriggers.includes(newValue?.uuid as string)) as TriggerDto[]).map(
                    (el) => el?.uuid,
                ),
            ];
            onSelectedTriggersChange(sortTriggersByIgnoreTriggerValue(allTriggers));
        },
        [triggers, selectedTriggers, onSelectedTriggersChange, sortTriggersByIgnoreTriggerValue],
    );

    const onDeleteTrigger = useCallback(
        (trigger: TriggerDto) => {
            onSelectedTriggersChange(
                sortTriggersByIgnoreTriggerValue(selectedTriggers.filter((selectedTrigger) => selectedTrigger !== trigger.uuid)),
            );
        },
        [selectedTriggers, onSelectedTriggersChange, sortTriggersByIgnoreTriggerValue],
    );
    const onMoveTriggerUp = useCallback(
        (trigger: TriggerDto) => {
            const index = selectedTriggers.indexOf(trigger.uuid);
            if (index === 0) return;
            const newSelectedTriggers = [...selectedTriggers];
            const temp = newSelectedTriggers[index];
            newSelectedTriggers[index] = newSelectedTriggers[index - 1];
            newSelectedTriggers[index - 1] = temp;
            onSelectedTriggersChange(sortTriggersByIgnoreTriggerValue(newSelectedTriggers));
        },
        [selectedTriggers, onSelectedTriggersChange, sortTriggersByIgnoreTriggerValue],
    );

    const onMoveTriggerDown = useCallback(
        (trigger: TriggerDto) => {
            const index = selectedTriggers.indexOf(trigger.uuid);
            if (index === selectedTriggers.length - 1) return;
            const newSelectedTriggers = [...selectedTriggers];
            const temp = newSelectedTriggers[index];
            newSelectedTriggers[index] = newSelectedTriggers[index + 1];
            newSelectedTriggers[index + 1] = temp;
            onSelectedTriggersChange(sortTriggersByIgnoreTriggerValue(newSelectedTriggers));
        },
        [selectedTriggers, onSelectedTriggersChange, sortTriggersByIgnoreTriggerValue],
    );

    const triggerHeaders: TableHeader[] = [
        {
            id: 'name',
            content: 'Name',
        },
        {
            id: 'triggerType',
            content: 'Trigger Type',
        },
        {
            id: 'ignoreTrigger',
            content: 'Ignore Trigger',
            align: 'center',
        },
        {
            id: 'eventName',
            content: 'Event Name',
        },
        {
            id: 'resource',
            content: 'Resource',
        },
        {
            id: 'description',
            content: 'Description',
        },
        {
            id: 'actions',
            content: 'Actions',
        },
    ];

    const triggerTableData: TableDataRow[] = useMemo(() => {
        const triggerDataListOrderedAsPerSelectedTriggers = triggers
            .filter((trigger) => selectedTriggers.includes(trigger.uuid))
            .sort((a, b) => selectedTriggers.indexOf(a.uuid) - selectedTriggers.indexOf(b.uuid));

        const ignoreTriggerIndexTransition = triggerDataListOrderedAsPerSelectedTriggers.findIndex((el) => !el.ignoreTrigger) - 1;

        return triggerDataListOrderedAsPerSelectedTriggers.map((trigger, i, arr) => {
            const moveUpDisabled = i === 0 || i === ignoreTriggerIndexTransition + 1;
            const moveDownDisabled = i === arr.length - 1 || i === ignoreTriggerIndexTransition;
            return {
                id: trigger.uuid,
                options: {
                    useAccentBottomBorder: i === ignoreTriggerIndexTransition,
                },
                columns: [
                    <Link key="name" to={`../../triggers/detail/${trigger.uuid}`}>
                        {trigger.name}
                    </Link>,
                    getEnumLabel(triggerTypeEnum, trigger.type ?? ''),
                    <BooleanBadge key="ignoreTrigger" value={trigger.ignoreTrigger} />,
                    getEnumLabel(eventNameEnum, trigger.event ?? ''),
                    getEnumLabel(resourceTypeEnum, trigger.resource ?? ''),
                    trigger.description ?? '',
                    <div key="actions" className="flex">
                        <Button variant="transparent" title="Delete Trigger" onClick={() => onDeleteTrigger(trigger)}>
                            <Trash2 size={16} />
                        </Button>
                        <Button
                            variant="transparent"
                            title="Move Trigger Up"
                            disabled={moveUpDisabled}
                            onClick={() => onMoveTriggerUp(trigger)}
                        >
                            <ArrowUp size={16} />
                        </Button>
                        <Button
                            variant="transparent"
                            title="Move Trigger Down"
                            disabled={moveDownDisabled}
                            onClick={() => onMoveTriggerDown(trigger)}
                        >
                            <ArrowDown size={16} />
                        </Button>
                    </div>,
                ],
            };
        }) as TableDataRow[];
    }, [selectedTriggers, triggers, eventNameEnum, resourceTypeEnum, triggerTypeEnum, onDeleteTrigger, onMoveTriggerUp, onMoveTriggerDown]);

    return (
        <Widget title="Triggers">
            {noteText && <p className="text-gray-500 mb-2">Note: {noteText}</p>}
            <CustomTable
                hasHeader={!!triggerTableData.length}
                data={triggerTableData}
                headers={triggerHeaders}
                newRowWidgetProps={{
                    selectHint: 'Select Triggers',
                    immediateAdd: true,
                    newItemsList: newTriggerOptions,
                    isBusy,
                    onAddClick: onAddTrigger,
                }}
            />
        </Widget>
    );
}
