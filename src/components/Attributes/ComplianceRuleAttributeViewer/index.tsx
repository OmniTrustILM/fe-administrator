import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import { useMemo } from 'react';
import { type AttributeDescriptorModel, type AttributeResponseModel, isDataAttributeModel } from 'types/attributes';
import { getAttributeContent } from 'utils/attributes/attributes';

export type Props = Readonly<{
    attributes?: AttributeResponseModel[];
    descriptorAttributes?: AttributeDescriptorModel[];
    hasHeader?: boolean;
}>;

export default function ComplianceRuleAttributeViewer({ attributes, descriptorAttributes, hasHeader = true }: Props) {
    const getContent = getAttributeContent;

    const tableHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'name',
                content: 'Name',
                sortable: true,
                width: '20%',
            },
            {
                id: 'version',
                content: 'Ver',
                sortable: true,
                width: '5%',
            },
            {
                id: 'value',
                content: 'Value',
                sortable: true,
                width: '75%',
            },
        ],
        [],
    );

    const tableData: TableDataRow[] = useMemo(() => {
        const attributeRows = attributes?.map((attribute) => ({
            id: attribute.uuid || attribute.name,
            columns: [attribute.name || '', attribute.version || '', getContent(attribute.contentType, attribute.content)],
        }));
        const descriptorRows = descriptorAttributes?.filter(isDataAttributeModel).map((attribute) => ({
            id: attribute.uuid || attribute.name,
            columns: [attribute.name || '', attribute.version || '', getContent(attribute.contentType, attribute.content)],
        }));
        return [...(attributeRows ?? []), ...(descriptorRows ?? [])];
    }, [attributes, descriptorAttributes, getContent]);

    return <CustomTable headers={tableHeaders} data={tableData} hasHeader={hasHeader} />;
}
