import { testInitialState } from 'ducks/test-reducers';
import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { PlatformEnum, Resource, ResourceEvent, TriggerType } from 'types/openapi';
import { createMockStore } from 'utils/test-helpers';
import TriggerEditorWidget from './index';

type TriggerFixture = {
    uuid: string;
    name: string;
    resource: Resource;
    ignoreTrigger: boolean;
    type?: TriggerType;
    event?: ResourceEvent;
    description?: string;
};

export type TriggerEditorWidgetWithStoreProps = Readonly<{
    resource?: Resource;
    event?: ResourceEvent;
    triggers?: TriggerFixture[];
    initialSelectedTriggers?: string[];
}>;

// Two event-bound triggers on the Certificate Discovered event, one bound to a different event, and
// one with no event at all — the shape the backend returns for a resource that has both kinds.
const defaultTriggers: TriggerFixture[] = [
    {
        uuid: 'trigger-event-bound',
        name: 'Event Bound Trigger',
        resource: Resource.Certificates,
        ignoreTrigger: false,
        type: TriggerType.Event,
        event: ResourceEvent.CertificateDiscovered,
    },
    {
        uuid: 'trigger-no-event',
        name: 'Unbound Trigger',
        resource: Resource.Certificates,
        ignoreTrigger: false,
    },
    {
        uuid: 'trigger-other-event',
        name: 'Other Event Trigger',
        resource: Resource.Certificates,
        ignoreTrigger: false,
        type: TriggerType.Event,
        event: ResourceEvent.CertificateExpiring,
    },
];

export default function TriggerEditorWidgetWithStore({
    resource = Resource.Certificates,
    event,
    triggers = defaultTriggers,
    initialSelectedTriggers = [],
}: TriggerEditorWidgetWithStoreProps) {
    const store = createMockStore({
        rules: { ...testInitialState.rules, triggers },
        enums: {
            platformEnums: {
                [PlatformEnum.Resource]: {
                    [Resource.Certificates]: { label: 'Certificate', value: Resource.Certificates },
                },
                [PlatformEnum.TriggerType]: {
                    [TriggerType.Event]: { label: 'Event', value: TriggerType.Event },
                },
                [PlatformEnum.ResourceEvent]: {
                    [ResourceEvent.CertificateDiscovered]: {
                        label: 'Certificate Discovered',
                        value: ResourceEvent.CertificateDiscovered,
                    },
                    [ResourceEvent.CertificateExpiring]: {
                        label: 'Certificate Expiring',
                        value: ResourceEvent.CertificateExpiring,
                    },
                },
            },
        },
    });

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/events/detail/CERTIFICATE_DISCOVERED']}>
                <StatefulTriggerEditorWidget resource={resource} event={event} initialSelectedTriggers={initialSelectedTriggers} />
            </MemoryRouter>
        </Provider>
    );
}

// The widget is controlled — without a state holder nothing an "add" produces is ever rendered back.
function StatefulTriggerEditorWidget({
    resource,
    event,
    initialSelectedTriggers,
}: Readonly<{ resource?: Resource; event?: ResourceEvent; initialSelectedTriggers: string[] }>) {
    const [selectedTriggers, setSelectedTriggers] = useState<string[]>(initialSelectedTriggers);

    return (
        <>
            <TriggerEditorWidget
                resource={resource}
                event={event}
                selectedTriggers={selectedTriggers}
                onSelectedTriggersChange={setSelectedTriggers}
            />
            <div data-testid="selected-triggers-probe">{selectedTriggers.join(',')}</div>
        </>
    );
}
