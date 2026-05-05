import { useCallback, useMemo } from 'react';
import { attributeFieldNameTransform, getAttributeContent } from 'utils/attributes/attributes';

import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { useSelector } from 'react-redux';
import { type AttributeDescriptorModel, isDataAttributeModel, isInfoAttributeModel } from 'types/attributes';
import { AttributeConstraintType, PlatformEnum } from 'types/openapi';

export type Props = Readonly<{
    attributeDescriptors: AttributeDescriptorModel[];
}>;

export default function AttributeDescriptorViewer({ attributeDescriptors }: Props) {
    const attributeTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.AttributeType));
    const attributeContentTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.AttributeContentType));
    const headers: TableHeader[] = useMemo(
        () => [
            {
                id: 'name',
                content: 'Label/Name',
                width: '20%',
                sortable: true,
            },
            {
                id: 'type',
                content: 'Type',
                width: '15%',
                sortable: true,
            },
            {
                id: 'required',
                content: 'Required',
                width: '10%',
                sortable: true,
            },
            {
                id: 'description',
                content: 'Description',
                width: '20%',
                sortable: true,
            },
            {
                id: 'defaultValue',
                content: 'Default Value',
                width: '35%',
                sortable: true,
            },
        ],
        [],
    );

    const getColumns = useCallback(
        (attr: AttributeDescriptorModel) => {
            if (isDataAttributeModel(attr) || isInfoAttributeModel(attr)) {
                const requiredText = isDataAttributeModel(attr) ? (attr.properties.required ? 'Yes' : 'No') : 'n/a';
                return [
                    attr.properties.label || attributeFieldNameTransform[attr.name] || attr.name,
                    getEnumLabel(attributeTypeEnum, attr.type),
                    requiredText,
                    attr.description ?? 'Not set',
                    getAttributeContent(attr.contentType, attr.content),
                ];
            } else {
                return [attr.name, attr.type, 'n/a', attr.description ?? 'Not set', ''];
            }
        },
        [attributeTypeEnum],
    );

    const getDetailColumns = useCallback(
        (attr: AttributeDescriptorModel) => {
            let columns: TableDataRow[] = [];

            if (isDataAttributeModel(attr)) {
                const regex = attr.constraints?.find((c) => c.type === AttributeConstraintType.RegExp);
                columns = [
                    { id: 'required', columns: [<b>Required</b>, attr.properties.required ? 'Yes' : 'No'] },
                    { id: 'readOnly', columns: [<b>Read Only</b>, attr.properties.readOnly ? 'Yes' : 'No'] },
                    { id: 'list', columns: [<b>List</b>, attr.properties.list ? 'Yes' : 'No'] },
                    { id: 'multiValue', columns: [<b>Multiple Values</b>, attr.properties.multiSelect ? 'Yes' : 'No'] },
                    { id: 'validationRegex', columns: [<b>Validation Regex</b>, regex?.data?.toString() ?? 'Not set'] },
                ];
            }

            if (isDataAttributeModel(attr) || isInfoAttributeModel(attr)) {
                columns = [
                    { id: 'label', columns: [<b>Label</b>, attr.properties.label] },
                    { id: 'group', columns: [<b>Group</b>, attr.properties.group || 'Not set'] },
                    { id: 'contentType', columns: [<b>Content Type</b>, getEnumLabel(attributeContentTypeEnum, attr.contentType)] },
                    ...columns,
                    { id: 'defaults', columns: [<b>Defaults</b>, getAttributeContent(attr.contentType, attr.content)] },
                ];
            }

            return [
                <CustomTable
                    headers={[
                        { id: 'name', content: 'Name' },
                        { id: 'value', content: 'Value' },
                    ]}
                    data={[
                        { id: 'name', columns: [<b>Name</b>, attr.name] },
                        { id: 'desc', columns: [<b>Description</b>, attr.description || 'Not set'] },
                        ...columns,
                    ]}
                    hasHeader={false}
                />,
            ];
        },
        [attributeContentTypeEnum],
    );

    const data: TableDataRow[] = useMemo(
        () =>
            attributeDescriptors.map((attributeDescriptor) => {
                return {
                    id: attributeDescriptor.name,
                    columns: getColumns(attributeDescriptor),
                    detailColumns: getDetailColumns(attributeDescriptor),
                };
            }),
        [attributeDescriptors, getColumns, getDetailColumns],
    );

    return <CustomTable headers={headers} data={data} hasDetails={true} />;
}
