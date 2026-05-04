import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { getEnumLabel, selectors as enumSelectors } from 'ducks/enums';
import { actions as settingsActions, selectors as settingsSelectors } from 'ducks/settings';
import { actions as resourceActions, selectors as resourceSelectors } from 'ducks/resource';
import { useCallback, useEffect, useMemo, useState } from 'react';

import Select from 'components/Select';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import { PlatformEnum, type Resource } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import { useHasEventsResourceOptions } from 'utils/rules';

const EventsList = () => {
    const dispatch = useDispatch();

    const eventsSettings = useSelector(settingsSelectors.eventsSettings);
    const resourceEvents = useSelector(resourceSelectors.resourceEvents);
    const isFetchingResourcesList = useSelector(resourceSelectors.isFetchingResourcesList);
    const isFetchingEventsSetting = useSelector(settingsSelectors.isFetchingEventsSetting);

    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const resourceEventEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ResourceEvent));

    const [selectedResource, setSelectedResource] = useState<Resource>();
    const { resourceOptionsWithEvents, isFetchingResourcesList: isFetchingResourcesWithEventsList } = useHasEventsResourceOptions();

    const getEvents = useCallback(() => {
        dispatch(settingsActions.getEventsSettings());
    }, [dispatch]);

    useEffect(() => {
        getEvents();
    }, [getEvents]);

    useEffect(() => {
        dispatch(resourceActions.listAllResourceEvents());
    }, [dispatch]);

    const isBusy = useMemo(
        () => isFetchingEventsSetting || isFetchingResourcesList || isFetchingResourcesWithEventsList,
        [isFetchingEventsSetting, isFetchingResourcesList, isFetchingResourcesWithEventsList],
    );

    const isInitialLoad = isFetchingResourcesList && resourceEvents.length === 0;

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'search',
                disabled: false,
                tooltip: 'Select Resource',
                onClick: () => {},
                custom: (
                    <div className="mx-1">
                        <Select
                            id="eventsResourceSelect"
                            isClearable
                            options={resourceOptionsWithEvents}
                            placeholder="Select Resource"
                            minWidth={180}
                            value={selectedResource || ''}
                            onChange={(value) => {
                                setSelectedResource(value as Resource);
                            }}
                        />
                    </div>
                ),
            },
        ],
        [resourceOptionsWithEvents, selectedResource],
    );
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
        ],
        [],
    );

    const dataRows: TableDataRow[] = useMemo(
        () =>
            !resourceEvents
                ? []
                : resourceEvents
                      .filter((el) => selectedResource === undefined || selectedResource === el.producedResource)
                      .reduce(
                          (acc, event) => [
                              ...acc,
                              {
                                  id: event.event,
                                  columns: [
                                      <Link key="name" to={`./detail/${event.event}`}>
                                          {getEnumLabel(resourceEventEnum, event.event)}
                                      </Link>,
                                      event.producedResource ? getEnumLabel(resourceEnum, event.producedResource) : '',
                                      (eventsSettings?.eventsMapping[event.event]?.length ?? 0).toString(),
                                  ],
                              },
                          ],
                          [] as TableDataRow[],
                      ),
        [resourceEvents, resourceEventEnum, resourceEnum, selectedResource, eventsSettings],
    );

    return (
        <Widget
            title="List of Events"
            refreshAction={getEvents}
            titleSize="large"
            widgetButtons={buttons}
            widgetLockName={LockWidgetNameEnum.EventSettings}
            lockSize="large"
            busy={isBusy && !isInitialLoad}
            widgetInfoCard={{
                title: 'Information',
                description: 'When an Event is produced, assigned Triggers are fired',
            }}
        >
            <br />
            <CustomTable headers={headers} data={dataRows} hasPagination={true} isLoading={isInitialLoad} />
        </Widget>
    );
};

export default EventsList;
