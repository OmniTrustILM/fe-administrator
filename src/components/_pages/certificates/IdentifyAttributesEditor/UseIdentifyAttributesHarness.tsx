import { useMemo, useState } from 'react';
import { Provider } from 'react-redux';
import type { AttributeDescriptorModel } from 'types/attributes';
import { createMockStore } from 'utils/test-helpers';
import { useIdentifyAttributes } from './useIdentifyAttributes';

type Props = Readonly<{
    schema: AttributeDescriptorModel[];
    callbackDescriptor: AttributeDescriptorModel;
}>;

function Probe({ callbackDescriptor }: Readonly<{ callbackDescriptor: AttributeDescriptorModel }>) {
    const [raProfileUuid, setRaProfileUuid] = useState('ra-1');
    const identify = useIdentifyAttributes(raProfileUuid, 'auth-1');
    const [collected, setCollected] = useState<unknown>(null);

    return (
        <>
            <button type="button" onClick={() => identify.setCallbackAttributes([callbackDescriptor])}>
                Add callback field
            </button>
            <button type="button" onClick={() => setRaProfileUuid('ra-2')}>
                Switch profile
            </button>
            <button
                type="button"
                onClick={() => setCollected(identify.collect({ __attributes__identify__: { [callbackDescriptor.name]: 'typed' } }))}
            >
                Collect
            </button>
            <div data-testid="collected">{JSON.stringify(collected)}</div>
        </>
    );
}

export default function UseIdentifyAttributesHarness({ schema, callbackDescriptor }: Props) {
    const store = useMemo(() => createMockStore({ certificates: { identifyAttributes: schema } } as never), [schema]);
    return (
        <Provider store={store}>
            <Probe callbackDescriptor={callbackDescriptor} />
        </Provider>
    );
}
