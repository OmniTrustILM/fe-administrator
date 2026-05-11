import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { getEnumLabel, selectors as enumSelectors } from 'ducks/enums';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { actions as resourceActions, selectors as resourceSelectors } from 'ducks/resource';
import { actions as settingsActions, selectors as settingsSelectors } from 'ducks/settings';
import { actions as rulesActions, selectors as rulesSelectors } from 'ducks/rules';
import { useDispatch, useSelector } from 'react-redux';
import { PlatformEnum, Resource, type ResourceEvent } from 'types/openapi';
import type { LockWidgetNameEnum } from 'types/user-interface';
import Dialog from 'components/Dialog';
import { useForm, Controller, FormProvider, useWatch } from 'react-hook-form';
import Button from 'components/Button';
import ProgressButton from 'components/ProgressButton';
import Select from 'components/Select';
import { Edit } from 'lucide-react';
import TriggerEditorWidget from 'components/TriggerEditorWidget';
import { useAreDefaultValuesSame } from 'utils/common-hooks';
import Container from 'components/Container';

type Props = (
    | {
          mode: 'association';
          resource: Resource;
          resourceUuid: string;
      }
    | { mode: 'platform'; resource?: never; resourceUuid?: never }
) & {
    widgetLocks: LockWidgetNameEnum[];
};

type OptionType = {
    value: string;
    label: string;
};
type FormValues = {
    event?: OptionType;
    resource?: OptionType;
    triggerUuids?: string[];
};
const EventsTable = ({ mode, resource, resourceUuid, widgetLocks }: Props) => {
    const dispatch = useDispatch();

    const allResourceEvents = useSelector(resourceSelectors.allResourceEvents);
    const eventsSettings = useSelector(settingsSelectors.eventsSettings);

    const resourceEvents = useSelector(resourceSelectors.resourceEvents);
    const eventTriggerAssociation = useSelector(rulesSelectors.eventTriggerAssociation);
    const isFetchingResourcesList = useSelector(resourceSelectors.isFetchingResourcesList);
    const isFetchingEventTriggersAssociation = useSelector(rulesSelectors.isFetchingEventTriggersAssociation);
    const isUpdatingEventTriggersAssociation = useSelector(rulesSelectors.isUpdatingEventTriggersAssociation);
    const isFetchingEventsSetting = useSelector(settingsSelectors.isFetchingEventsSetting);

    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const resourceEventEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ResourceEvent));

    const [isTriggersDialogOpen, setIsTriggersDialogOpen] = useState(false);
    const [editedEvent, setEditedEvent] = useState<ResourceEvent | null>(null);

    const isBusy = useMemo(
        () =>
            isFetchingResourcesList || isFetchingEventTriggersAssociation || isUpdatingEventTriggersAssociation || isFetchingEventsSetting,
        [isFetchingResourcesList, isFetchingEventTriggersAssociation, isUpdatingEventTriggersAssociation, isFetchingEventsSetting],
    );

    const fetchEventAssociations = useCallback(() => {
        if (mode === 'association') {
            dispatch(rulesActions.getEventTriggersAssociations({ resource, associationObjectUuid: resourceUuid }));
        }
    }, [dispatch, mode, resource, resourceUuid]);

    const fetchEventsSettings = useCallback(() => {
        if (mode === 'platform') {
            dispatch(settingsActions.getEventsSettings());
        }
    }, [dispatch, mode]);

    const fetchResources = useCallback(() => {
        if (mode === 'association') {
            dispatch(resourceActions.listResourceEvents({ resource: resource }));
        } else if (mode === 'platform') {
            dispatch(resourceActions.listAllResourceEvents());
        }
    }, [dispatch, mode, resource]);

    useEffect(() => {
        fetchEventAssociations();
    }, [fetchEventAssociations]);

    useEffect(() => {
        fetchEventsSettings();
    }, [fetchEventsSettings]);

    useEffect(() => {
        fetchResources();
    }, [fetchResources]);

    useEffect(() => {}, [dispatch, mode, resource]);

    const onClose = useCallback(() => {
        setEditedEvent(null);
        setIsTriggersDialogOpen(false);
    }, []);

    const onEdit = useCallback((event: ResourceEvent) => {
        setEditedEvent(event);
        setIsTriggersDialogOpen(true);
    }, []);

    const onSubmit = useCallback(
        (values: FormValues) => {
            if (!values.event) return;
            if (mode === 'association') {
                dispatch(
                    rulesActions.associateEventTriggers({
                        triggerEventAssociationRequestModel: {
                            event: values.event.value as ResourceEvent,
                            objectUuid: resourceUuid,
                            resource: resource,
                            triggerUuids: values.triggerUuids ?? [],
                        },
                    }),
                );
            } else {
                dispatch(
                    settingsActions.updateEventSettings({
                        eventSettings: {
                            event: values.event.value as ResourceEvent,
                            triggerUuids: values.triggerUuids ?? [],
                        },
                    }),
                );
            }
            onClose();
        },
        [dispatch, onClose, mode, resource, resourceUuid],
    );
    const getResourceEventModel = useCallback(
        (event?: ResourceEvent | string | null) => {
            return mode === 'association'
                ? resourceEvents.find((el) => el.event === event)
                : allResourceEvents.find((el) => el.event === event);
        },
        [allResourceEvents, mode, resourceEvents],
    );
    const textContent: {
        title: string;
        dialogTitle: string;
        description: string;
        addTooltip: string;
        confirmDialogButtonText: string;
    } = useMemo(() => {
        if (mode === 'association') {
            return {
                title: 'Associated Events',
                dialogTitle: 'Associate Event Triggers',
                description: `When an Event is produced on Resources related to this ${getEnumLabel(resourceEnum, resource)}, assigned Triggers are fired`,
                addTooltip: 'Associate Event',
                confirmDialogButtonText: 'Associate',
            };
        }
        return {
            title: 'Platform Events',
            dialogTitle: 'Configure Event Triggers',
            description: 'When an Event is produced, assigned Triggers are fired',
            addTooltip: 'Add Event',
            confirmDialogButtonText: 'Add',
        };
    }, [mode, resource, resourceEnum]);

    const headers: TableHeader[] = useMemo(
        () => [
            {
                id: 'eventName',
                content: 'Event Name',
                sortable: true,
            },
            {
                id: 'resource',
                content: 'Resource',
                sort: 'asc',
                sortable: true,
            },
            {
                id: 'triggersCount',
                content: 'Triggers Count',
                sortable: true,
            },
            {
                id: 'edit',
                content: '',
                width: '40px',
            },
        ],
        [],
    );

    const dataRows: TableDataRow[] = useMemo(() => {
        const eventTriggerEntries =
            mode === 'association' ? Object.entries(eventTriggerAssociation ?? {}) : Object.entries(eventsSettings?.eventsMapping ?? {});

        return eventTriggerEntries
            .filter(([_, triggerUuids]) => triggerUuids.length > 0)
            .map(([event, triggerUuids]) => {
                const resourceEvent = getResourceEventModel(event);
                return {
                    id: event,
                    columns: [
                        getEnumLabel(resourceEventEnum, event),
                        resourceEvent?.producedResource ? getEnumLabel(resourceEnum, resourceEvent.producedResource) : '',
                        (triggerUuids?.length ?? 0).toString(),
                        <Button
                            variant="transparent"
                            color="primary"
                            title="Edit"
                            key="edit"
                            onClick={() => onEdit(event as ResourceEvent)}
                        >
                            <Edit size={16} />
                        </Button>,
                    ],
                };
            });
    }, [mode, eventTriggerAssociation, eventsSettings, getResourceEventModel, resourceEventEnum, resourceEnum, onEdit]);

    const eventOptions = useMemo(() => {
        if (mode === 'association') {
            return resourceEvents
                .filter((event) => !eventTriggerAssociation?.[event.event])
                .map((event) => ({
                    value: event.event,
                    label: getEnumLabel(resourceEventEnum, event.event),
                }));
        }
        return allResourceEvents
            .filter((event) => !eventsSettings?.eventsMapping?.[event.event])
            .map((event) => ({
                value: event.event,
                label: getEnumLabel(resourceEventEnum, event.event),
            }));
    }, [mode, allResourceEvents, resourceEvents, eventTriggerAssociation, resourceEventEnum, eventsSettings]);

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'plus',
                disabled: !eventOptions.length,
                tooltip: textContent.addTooltip,
                onClick: () => setIsTriggersDialogOpen(true),
            },
        ],
        [eventOptions.length, textContent.addTooltip],
    );

    const defaultValues: FormValues = useMemo(() => {
        const resourceEvent = getResourceEventModel(editedEvent);

        if (!resourceEvent) return {};

        return {
            event: {
                label: getEnumLabel(resourceEventEnum, resourceEvent.event),
                value: resourceEvent.event,
            },
            resource: {
                label: getEnumLabel(resourceEnum, resourceEvent.producedResource ?? Resource.None),
                value: resourceEvent.producedResource ?? Resource.None,
            },
            triggerUuids:
                mode === 'association'
                    ? eventTriggerAssociation?.[resourceEvent.event]
                    : (eventsSettings?.eventsMapping?.[resourceEvent.event] ?? []),
        };
    }, [editedEvent, eventTriggerAssociation, eventsSettings, getResourceEventModel, mode, resourceEnum, resourceEventEnum]);

    const methods = useForm<FormValues>({
        defaultValues,
        mode: 'onChange',
    });

    const {
        handleSubmit,
        control,
        setValue,
        formState: { isSubmitting, isValid },
        reset,
    } = methods;

    const formValues = useWatch({ control });

    // Reset form when editedEvent or defaultValues change
    useEffect(() => {
        reset(defaultValues);
    }, [defaultValues, reset]);

    const areDefaultValuesSame = useAreDefaultValuesSame(defaultValues);

    return (
        <>
            <Widget
                noBorder
                title={textContent.title}
                refreshAction={mode === 'association' ? fetchEventAssociations : fetchEventsSettings}
                titleSize="large"
                widgetButtons={buttons}
                widgetLockName={widgetLocks}
                lockSize="large"
                busy={isBusy}
                widgetInfoCard={{
                    title: 'Information',
                    description: textContent.description,
                }}
            >
                <CustomTable headers={headers} data={dataRows} />
            </Widget>
            <Dialog
                isOpen={isTriggersDialogOpen}
                caption={textContent.dialogTitle}
                size="xl"
                body={
                    <FormProvider {...methods}>
                        <form onSubmit={handleSubmit(onSubmit)}>
                            <div className="space-y-4">
                                <Controller
                                    name="event"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            id="event"
                                            label="Event"
                                            options={eventOptions}
                                            value={field.value?.value ?? ''}
                                            onChange={(value: string | number) => {
                                                const selectedOption = eventOptions.find((opt) => opt.value === value);
                                                if (selectedOption) {
                                                    field.onChange(selectedOption);
                                                    const producedResource = getResourceEventModel(String(value))?.producedResource;

                                                    if (producedResource) {
                                                        setValue('resource', {
                                                            value: producedResource,
                                                            label: getEnumLabel(resourceEnum, producedResource),
                                                        });
                                                    }
                                                }
                                            }}
                                            isDisabled={!!editedEvent}
                                            required
                                        />
                                    )}
                                />
                                {formValues.event?.value && (
                                    <>
                                        <Controller
                                            name="resource"
                                            control={control}
                                            render={({ field }) => (
                                                <Select
                                                    id="resource"
                                                    label="Resource"
                                                    options={
                                                        field.value
                                                            ? [
                                                                  {
                                                                      value: field.value.value,
                                                                      label: field.value.label,
                                                                  },
                                                              ]
                                                            : []
                                                    }
                                                    value={field.value?.value ?? ''}
                                                    onChange={() => {}}
                                                    isDisabled
                                                />
                                            )}
                                        />
                                        <Controller
                                            name="triggerUuids"
                                            control={control}
                                            render={({ field }) => (
                                                <TriggerEditorWidget
                                                    resource={formValues.resource?.value as Resource}
                                                    selectedTriggers={field.value ?? []}
                                                    onSelectedTriggersChange={(e) => {
                                                        field.onChange(e);
                                                    }}
                                                    noteText={`Only Triggers associated with the same Resource as the Event are shown`}
                                                />
                                            )}
                                        />
                                    </>
                                )}
                                <Container className="flex-row justify-end modal-footer" gap={4}>
                                    <Button
                                        variant="outline"
                                        color="secondary"
                                        disabled={isBusy || isSubmitting}
                                        onClick={onClose}
                                        type="button"
                                    >
                                        Cancel
                                    </Button>
                                    <ProgressButton
                                        title={editedEvent ? 'Save' : textContent.confirmDialogButtonText}
                                        inProgress={isSubmitting}
                                        disabled={isBusy || isSubmitting || !isValid || areDefaultValuesSame(formValues)}
                                        type="submit"
                                    />
                                </Container>
                            </div>
                        </form>
                    </FormProvider>
                }
                toggle={() => setIsTriggersDialogOpen(false)}
            />
        </>
    );
};

export default EventsTable;
