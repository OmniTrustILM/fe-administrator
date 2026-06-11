import { useMemo } from 'react';
import Select from 'components/Select';
import { type AttributeDescriptorModel, type CustomAttributeModel, isCustomAttributeModel } from '../../../../types/attributes';
import Label from 'components/Label';

export type Props = {
    attributeDescriptors: AttributeDescriptorModel[] | undefined;
    onAdd: (attribute: CustomAttributeModel) => void;
};

const EMPTY_VALUE: { value: string | number; label: string }[] = [];

export default function CustomAttributeAddSelect({ attributeDescriptors, onAdd }: Readonly<Props>) {
    const { options, uuidToAttributeMap } = useMemo(() => {
        const customAttributes = attributeDescriptors?.filter<CustomAttributeModel>((el) => isCustomAttributeModel(el)) || [];

        const map = new Map<string, CustomAttributeModel>();
        const opts = customAttributes.map((el) => {
            map.set(el.uuid, el);
            return {
                label: el.properties.label,
                value: el.uuid,
            };
        });

        return {
            options: opts,
            uuidToAttributeMap: map,
        };
    }, [attributeDescriptors]);

    if (options.length === 0) return null;

    return (
        <>
            <Label title="Show custom attribute" />
            <Select
                id="selectAddCustomAttribute"
                options={options}
                placeholder="Show..."
                isClearable
                isMulti
                value={EMPTY_VALUE}
                onChange={(values) => {
                    (values || []).forEach((selected) => {
                        const attribute = uuidToAttributeMap.get(selected.value.toString());
                        if (attribute) {
                            onAdd(attribute);
                        }
                    });
                }}
            />
        </>
    );
}
