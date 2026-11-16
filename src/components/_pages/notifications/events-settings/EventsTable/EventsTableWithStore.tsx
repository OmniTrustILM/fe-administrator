import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { createObjectPermissionStore } from 'components/_pages/test-utils/objectPermissionStore';
import { testInitialState } from 'ducks/test-reducers';
import { Resource, ResourceEvent, type ResourceAction } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import EventsTable from './index';

type Props = Readonly<{
    mode: 'platform' | 'association';
    /** Actions the user holds on whole resources. */
    resourceGrants: { resource: Resource; actions: ResourceAction[] }[];
}>;

const events = [{ event: ResourceEvent.CertificateDiscovered, producedResource: Resource.Certificates }];

export default function EventsTableWithStore({ mode, resourceGrants }: Props) {
    const [store] = useState(() =>
        createObjectPermissionStore({
            resource: Resource.Groups,
            uuid: 'group-1',
            allowedActions: [],
            resourceGrants,
            preloadedState: {
                resource: { ...testInitialState.resource, allResourceEvents: events, resourceEvents: events },
            },
        }),
    );

    return (
        <Provider store={store}>
            <MemoryRouter>
                {mode === 'platform' ? (
                    <EventsTable mode="platform" widgetLocks={[LockWidgetNameEnum.EventSettings]} />
                ) : (
                    <EventsTable
                        mode="association"
                        resource={Resource.Groups}
                        resourceUuid="group-1"
                        widgetLocks={[LockWidgetNameEnum.EventSettings]}
                    />
                )}
            </MemoryRouter>
        </Provider>
    );
}
