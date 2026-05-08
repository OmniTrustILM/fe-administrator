import ProgressButton from 'components/ProgressButton';
import Widget from 'components/Widget';
import { selectors as enumSelectors } from 'ducks/enums';
import { actions as settingsActions, selectors as settingsSelectors } from 'ducks/settings';

import { actions as resourceActions, selectors as resourceSelectors } from 'ducks/resource';
import { useCallback, useEffect, useMemo } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router';
import Select from 'components/Select';
import Button from 'components/Button';
import Container from 'components/Container';
import Breadcrumb from 'components/Breadcrumb';
import { useAreDefaultValuesSame } from 'utils/common-hooks';
import { type EventSettingsDto, PlatformEnum, Resource, type ResourceEvent } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import TriggerEditorWidget from 'components/TriggerEditorWidget';
import Label from 'components/Label';

interface FormValues {
    event: string;
    resource: string;
    triggers: string[];
}

export default function EventForm() {
    const { event } = useParams();

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const eventsSettings = useSelector(settingsSelectors.eventsSettings);
    const resourceEvents = useSelector(resourceSelectors.resourceEvents);

    const isFetchingResourcesList = useSelector(resourceSelectors.isFetchingResourcesList);
    const isFetchingEventsSetting = useSelector(settingsSelectors.isFetchingEventsSetting);
    const isUpdatingEventsSetting = useSelector(settingsSelectors.isUpdatingEventsSetting);

    const isBusy = useMemo(
        () => isFetchingEventsSetting || isUpdatingEventsSetting || isFetchingResourcesList,
        [isFetchingEventsSetting, isUpdatingEventsSetting, isFetchingResourcesList],
    );

    const eventSettings: EventSettingsDto | undefined = useMemo(() => {
        if (!event || !eventsSettings) return undefined;
        return {
            event: event as ResourceEvent,
            triggerUuids: eventsSettings.eventsMapping[event] ?? [],
        };
    }, [eventsSettings, event]);

    useEffect(() => {
        if (!event) return;
        dispatch(settingsActions.getEventsSettings());
    }, [dispatch, event]);

    useEffect(() => {
        dispatch(resourceActions.listAllResourceEvents());
    }, [dispatch]);

    const defaultValues: FormValues = useMemo(() => {
        if (!eventSettings) {
            return {
                event: '',
                resource: '',
                triggers: [],
            };
        }
        const resource = resourceEvents.find((event) => event.event === eventSettings.event)?.producedResource;
        return {
            event: eventSettings.event,
            resource: resource ?? Resource.None,
            triggers: eventSettings.triggerUuids ?? [],
        };
    }, [eventSettings, resourceEvents]);

    const onCancel = useCallback(() => {
        navigate(-1);
    }, [navigate]);

    const methods = useForm<FormValues>({
        defaultValues,
        mode: 'onChange',
    });

    const {
        handleSubmit,
        control,
        formState: { isSubmitting },
    } = methods;

    const formValues = useWatch({ control });

    const onSubmit = useCallback(
        (values: FormValues) => {
            if (!event) return;
            dispatch(
                settingsActions.updateEventSettings({
                    eventSettings: {
                        event: event as ResourceEvent,
                        triggerUuids: values.triggers ?? [],
                    },
                    redirect: `../events/detail/${event}`,
                }),
            );
        },
        [dispatch, event],
    );

    const areDefaultValuesSame = useAreDefaultValuesSame(defaultValues as unknown as Record<string, unknown>);

    return (
        <>
            <Breadcrumb
                items={[
                    { label: 'Events Settings', href: '/notifications/events-settings' },
                    { label: 'Edit Event', href: '' },
                ]}
            />
            <FormProvider {...methods}>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Widget title={'Edit Event'} busy={isBusy} widgetLockName={LockWidgetNameEnum.EventSettings}>
                        <div>
                            <Label htmlFor="event" className="block text-sm font-medium mb-2 text-gray-700 dark:text-white">
                                Event Name
                            </Label>
                            <Select
                                id="event"
                                value={formValues.event || ''}
                                onChange={() => {}}
                                options={[]}
                                placeholder="Event Name"
                                disabled
                            />
                        </div>

                        <div>
                            <Label htmlFor="resource" className="block text-sm font-medium mb-2 text-gray-700 dark:text-white">
                                Resource
                            </Label>
                            <Select
                                id="resource"
                                value={formValues.resource || ''}
                                onChange={() => {}}
                                options={[]}
                                placeholder="Resource"
                                disabled
                            />
                        </div>

                        <Controller
                            name="triggers"
                            control={control}
                            render={({ field }) => (
                                <TriggerEditorWidget
                                    resource={formValues.resource as Resource}
                                    selectedTriggers={field.value ?? []}
                                    onSelectedTriggersChange={(newTriggers) => {
                                        field.onChange(newTriggers);
                                    }}
                                    noteText={`Only Triggers associated with the same Resource as the Event are shown`}
                                />
                            )}
                        />

                        <Container className="flex-row justify-end mt-4">
                            <ProgressButton
                                title={'Save'}
                                inProgressTitle={'Saving...'}
                                inProgress={isSubmitting}
                                disabled={areDefaultValuesSame(formValues) || isBusy}
                                type="submit"
                            />

                            <Button variant="outline" onClick={onCancel} disabled={isSubmitting} type="button">
                                Cancel
                            </Button>
                        </Container>
                    </Widget>
                </form>
            </FormProvider>
        </>
    );
}
