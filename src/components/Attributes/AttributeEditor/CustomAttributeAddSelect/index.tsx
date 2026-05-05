import { useMemo, useState } from 'react';
import Select from 'components/Select';
import { type AttributeDescriptorModel, type CustomAttributeModel, isCustomAttributeModel } from '../../../../types/attributes';
import Label from 'components/Label';

export type Props = Readonly<{
    attributeDescriptors: AttributeDescriptorModel[] | undefined;
    onAdd: (attribute: CustomAttributeModel) => void;
}>;

export default function CustomAttributeAddSelect({ attributeDescriptors, onAdd }: Props) {
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

    const [selectedValues, setSelectedValues] = useState<{ value: string | number; label: string }[]>([]);

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
                value={selectedValues}
                onChange={(values) => {
                    const newValues = values || [];
                    setSelectedValues(newValues);

                    // Find newly added attributes (ones that weren't in the previous selection)
                    const previousUuids = new Set(selectedValues.map((v) => v.value.toString()));
                    const newlyAdded = newValues.filter((v) => !previousUuids.has(v.value.toString()));

                    // Call onAdd for each newly added attribute
                    newlyAdded.forEach((selected) => {
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
