import AttributeEditor from 'components/Attributes/AttributeEditor';
import { Resource } from 'types/openapi';
import { IDENTIFY_ATTRIBUTES_FORM_ID, type IdentifyAttributes } from './useIdentifyAttributes';

type Props = Readonly<{
    identify: IdentifyAttributes;
}>;

export default function IdentifyAttributesEditor({ identify }: Props) {
    if (identify.isFetching || identify.descriptors.length === 0) return null;
    return (
        <AttributeEditor
            id={IDENTIFY_ATTRIBUTES_FORM_ID}
            attributeDescriptors={identify.descriptors}
            callbackParentUuid={identify.raProfileUuid}
            callbackResource={Resource.Certificates}
            groupAttributesCallbackAttributes={identify.callbackAttributes}
            setGroupAttributesCallbackAttributes={identify.setCallbackAttributes}
        />
    );
}
