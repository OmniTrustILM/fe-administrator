import AttributeEditor from 'components/Attributes/AttributeEditor';
import { Resource } from 'types/openapi';
import type { OperationAttributes } from './useOperationAttributes';

type Props = Readonly<{
    attributes: OperationAttributes;
}>;

export default function OperationAttributesEditor({ attributes }: Props) {
    if (attributes.isFetching || attributes.descriptors.length === 0) return null;
    return (
        <AttributeEditor
            id={attributes.operation}
            attributeDescriptors={attributes.descriptors}
            callbackParentUuid={attributes.raProfileUuid}
            callbackResource={Resource.Certificates}
            groupAttributesCallbackAttributes={attributes.callbackAttributes}
            setGroupAttributesCallbackAttributes={attributes.setCallbackAttributes}
        />
    );
}
