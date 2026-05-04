import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';

import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { actions as rulesActions, selectors as rulesSelectors } from 'ducks/rules';
import { actions as settingsActions, selectors as settingsSelectors } from 'ducks/settings';
import { actions as resourceActions, selectors as resourceSelectors } from 'ducks/resource';

import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router';

import { PlatformEnum, type ResourceEvent } from 'types/openapi';
import type { EventSettingsDto } from 'types/settings';
import { LockWidgetNameEnum } from 'types/user-interface';
import type { TriggerDto } from 'types/rules';
import Container from 'components/Container';
import Breadcrumb from 'components/Breadcrumb';
import DetailPageSkeleton from 'components/DetailPageSkeleton';

export default function EventDetail() {
    const { event } = useParams();

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const resourceEvents = useSelector(resourceSelectors.resourceEvents);
    const eventsSettings = useSelector(settingsSelectors.eventsSettings);
    const triggers = useSelector(rulesSelectors.triggers);

    const isFetchingResourcesList = useSelector(resourceSelectors.isFetchingResourcesList);
    const isFetchingEventsSetting = useSelector(settingsSelectors.isFetchingEventsSetting);
    const isFetchingTriggers = useSelector(rulesSelectors.isFetchingTriggers);

    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const resourceTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const resourceEventEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ResourceEvent));
    const triggerTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.TriggerType));
    const isBusy = useMemo(
        () => isFetchingEventsSetting || isFetchingTriggers || isFetchingResourcesList,
        [isFetchingEventsSetting, isFetchingTriggers, isFetchingResourcesList],
    );

    const eventSettings: EventSettingsDto | undefined = useMemo(() => {
        if (!event || !eventsSettings) return undefined;
        return {
            event: event as ResourceEvent,
            triggerUuids: eventsSettings.eventsMapping[event] ?? [],
        };
    }, [eventsSettings, event]);

    const getFreshData = useCallback(() => {
        if (!event) return;
        dispatch(settingsActions.getEventsSettings());
        dispatch(rulesActions.listTriggers({}));
    }, [dispatch, event]);

    useEffect(() => {
        getFreshData();
    }, [getFreshData]);

    useEffect(() => {
        dispatch(resourceActions.listAllResourceEvents());
    }, [dispatch]);

    const onEditEvent = useCallback(() => {
        if (!event) return;
        navigate(`../events/edit/${event}/`);
    }, [navigate, event]);

    const widgetButtons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'pencil',
                disabled: false,
                tooltip: 'Edit',
                onClick: () => {
                    onEditEvent();
                },
            },
        ],
        [onEditEvent],
    );
    const headers: TableHeader[] = useMemo(
        () => [
            {
                id: 'property',
                content: 'Property',
            },
            {
                id: 'value',
                content: 'Value',
            },
        ],
        [],
    );

    const profileData: TableDataRow[] = useMemo(
        () =>
            !eventSettings
                ? []
                : [
                      {
                          id: 'name',
                          columns: ['Name', getEnumLabel(resourceEventEnum, eventSettings.event)],
                      },
                      {
                          id: 'resource',
                          columns: [
                              'Produced by Resource',
                              getEnumLabel(resourceEnum, resourceEvents.find((el) => el.event === event)?.producedResource ?? ''),
                          ],
                      },
                      {
                          id: 'triggersCount',
                          columns: ['Triggers Count', eventSettings.triggerUuids.length.toString()],
                      },
                  ],
        [event, resourceEvents, eventSettings, resourceEventEnum, resourceEnum],
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
    ];

    const triggerTableData: TableDataRow[] = useMemo(
        () =>
            triggers.length
                ? (eventSettings?.triggerUuids.map((uuid) => triggers.find((el) => el.uuid === uuid)) as TriggerDto[]).map((trigger) => ({
                      id: trigger.uuid,
                      columns: [
                          <Link key={trigger.uuid} to={`../../triggers/detail/${trigger.uuid}`}>
                              {trigger.name}
                          </Link>,
                          getEnumLabel(triggerTypeEnum, trigger.type ?? ''),
                          trigger.ignoreTrigger ? 'Yes' : 'No',
                          getEnumLabel(resourceEventEnum, trigger.event ?? ''),
                          getEnumLabel(resourceTypeEnum, trigger.resource ?? ''),
                          trigger.description ?? '',
                      ],
                  }))
                : [],
        [eventSettings, triggers, triggerTypeEnum, resourceTypeEnum, resourceEventEnum],
    );
    if (isFetchingEventsSetting) {
        return <DetailPageSkeleton layout="simple" buttonsCount={1} />;
    }

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: 'Events Settings', href: '/eventssettings' },
                    { label: eventSettings?.event || 'Event Settings', href: '' },
                ]}
            />
            <Container>
                <Widget
                    title="Event Settings"
                    busy={isBusy}
                    widgetButtons={widgetButtons}
                    widgetLockName={LockWidgetNameEnum.EventSettings}
                    titleSize="large"
                    refreshAction={getFreshData}
                >
                    <CustomTable headers={headers} data={profileData} />
                </Widget>
                <Widget title="Assigned Triggers" busy={isBusy} widgetLockName={LockWidgetNameEnum.EventSettings} titleSize="large">
                    <CustomTable headers={triggerHeaders} data={triggerTableData} />
                </Widget>
            </Container>
        </div>
    );
}
