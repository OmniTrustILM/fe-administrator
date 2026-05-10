import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { useCallback, useMemo, useState } from 'react';
import * as ReactHookForm from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import {
    type AttributeDescriptorModel,
    type AttributeResponseModel,
    type BaseAttributeContentModel,
    type CustomAttributeModel,
    isCustomAttributeModelArray,
} from 'types/attributes';
import type { MetadataItemModel, MetadataModel } from 'types/locations';
import { AttributeContentType, type NameAndUuidDto, PlatformEnum, type Resource } from 'types/openapi';
import { getAttributeContent, getAttributeCopyValue } from 'utils/attributes/attributes';
import { useCopyToClipboard } from 'utils/common-hooks';
import { actions as userInterfaceActions } from '../../../ducks/user-interface';
import ContentValueField from '../../Input/DynamicContent/ContentValueField';
import WidgetButtons, { type WidgetButtonProps } from '../../WidgetButtons';
import { InfoIcon } from 'lucide-react';
import Button from 'components/Button';

export enum ATTRIBUTE_VIEWER_TYPE {
    ATTRIBUTE,
    METADATA,
    METADATA_FLAT,
    ATTRIBUTE_EDIT,
}

type AttributeEditFormProps = {
    descriptor: CustomAttributeModel;
    initialContent?: BaseAttributeContentModel[];
    onSubmit: (uuid: string, content: BaseAttributeContentModel[]) => void;
    onCancel: () => void;
};

function AttributeEditForm({ descriptor, initialContent, onSubmit, onCancel }: Readonly<AttributeEditFormProps>) {
    const methods = ReactHookForm.useForm<any>({
        defaultValues: {},
    });

    return (
        <ReactHookForm.FormProvider {...methods}>
            <form onSubmit={(e) => e.preventDefault()}>
                <ContentValueField
                    id={descriptor.name}
                    descriptor={descriptor}
                    initialContent={initialContent}
                    onSubmit={onSubmit}
                    onCancel={onCancel}
                />
            </form>
        </ReactHookForm.FormProvider>
    );
}

export type Props = {
    attributes?: AttributeResponseModel[];
    descriptors?: AttributeDescriptorModel[] | CustomAttributeModel[];
    metadata?: MetadataModel[];
    viewerType?: ATTRIBUTE_VIEWER_TYPE;
    hasHeader?: boolean;
    onSubmit?: (attributeUuid: string, content: BaseAttributeContentModel[]) => void;
    onRemove?: (attributeUuid: string) => void;
};

export default function AttributeViewer({
    attributes = [],
    descriptors = [],
    metadata = [],
    hasHeader = true,
    viewerType = ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE,
    onSubmit,
    onRemove,
}: Readonly<Props>) {
    const getContent = getAttributeContent;
    const [editingAttributesNames, setEditingAttributesNames] = useState<string[]>([]);
    const contentTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.AttributeContentType));
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const dispatch = useDispatch();
    const copyToClipboard = useCopyToClipboard();

    const onCopyContentClick = useCallback(
        (attribute: AttributeResponseModel | MetadataItemModel) => {
            if (!attribute?.content?.length) return;

            const textToCopy = getAttributeCopyValue(attribute.contentType, attribute.content);

            if (attribute && textToCopy) {
                copyToClipboard(textToCopy, 'Custom Attribute content was copied to clipboard', 'Failed to copy to clipboard');
            }
        },
        [copyToClipboard],
    );

    const tableHeaders = (viewerType: ATTRIBUTE_VIEWER_TYPE) => {
        const result: TableHeader[] = [];
        if (viewerType === ATTRIBUTE_VIEWER_TYPE.METADATA || viewerType === ATTRIBUTE_VIEWER_TYPE.METADATA_FLAT) {
            result.push(
                {
                    id: 'connector',
                    content: 'Connector',
                    sortable: true,
                },
                {
                    id: 'sourceObject',
                    content: 'Source Object',
                    sortable: true,
                },
            );
        }
        if (
            viewerType === ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE ||
            viewerType === ATTRIBUTE_VIEWER_TYPE.METADATA_FLAT ||
            viewerType === ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE_EDIT
        ) {
            result.push(
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
                    id: 'contentType',
                    content: 'Content Type',
                    sortable: true,
                    width: '20%',
                },
                {
                    id: 'content',
                    content: 'Content',
                    sortable: true,
                    width: '40%',
                },
            );
        }
        if (viewerType === ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE_EDIT) {
            result.push({
                id: 'actions',
                content: 'Actions',
                sortable: false,
                width: '15%',
                align: 'center',
            });
        }
        // We add this action if it doesn't exist to add copy to clipboard button
        if (
            viewerType === ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE ||
            viewerType === ATTRIBUTE_VIEWER_TYPE.METADATA_FLAT ||
            viewerType === ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE_EDIT
        ) {
            if (!result.some((r) => r.id === 'actions')) {
                result.push({
                    id: 'actions',
                    content: 'Actions',
                    sortable: false,
                    align: 'center',
                    width: '15%',
                });
            }
        }

        return result;
    };

    const renderSourceObjectsButton = useCallback(
        (attribute: AttributeResponseModel | MetadataItemModel, resource: Resource) => {
            const headers = [
                { id: 'sourceObject', content: 'Name' },
                { id: 'uuid', content: 'UUID' },
            ];

            const createData = (so: NameAndUuidDto) => ({
                id: so.uuid,
                columns: [
                    <Link key="link" onClick={() => dispatch(userInterfaceActions.resetState())} to={`/${resource}/detail/${so.uuid}`}>
                        {so.name}
                    </Link>,
                    so.uuid,
                ],
            });

            if ('sourceObjects' in attribute && attribute.sourceObjects.length > 0 && resource) {
                return (
                    <Button
                        data-testid="source-button"
                        variant="transparent"
                        title="Show source objects"
                        className="!p-1 ml-1 relative top-[3px]"
                        onClick={() => {
                            dispatch(
                                userInterfaceActions.showGlobalModal({
                                    isOpen: true,
                                    size: 'xl',
                                    title: 'Source objects',
                                    content: <CustomTable headers={headers} data={attribute.sourceObjects.map(createData)} />,
                                    showCloseButton: true,
                                }),
                            );
                        }}
                    >
                        <InfoIcon size={16} />
                    </Button>
                );
            }
            return null;
        },
        [dispatch],
    );

    const getAttributesTableData = useCallback(
        (attribute: AttributeResponseModel | MetadataItemModel, resource?: Resource): TableDataRow => {
            const renderContentCell = () => {
                if (attribute.contentType === AttributeContentType.Resource && attribute.content?.[0]) {
                    const first = attribute.content[0] as any;
                    const data = first?.data as { uuid?: string; name?: string; resource?: Resource } | undefined;
                    if (data?.uuid && data.resource) {
                        return (
                            <Link onClick={() => dispatch(userInterfaceActions.resetState())} to={`/${data.resource}/detail/${data.uuid}`}>
                                {data.name || data.uuid}
                            </Link>
                        );
                    }
                }

                return getContent(attribute.contentType, attribute.content);
            };

            return {
                id: attribute.uuid || attribute.name,
                columns: [
                    attribute.label || attribute.name || '',
                    attribute.version || '',
                    getEnumLabel(contentTypeEnum, attribute.contentType) || attribute.contentType,
                    <>
                        {renderContentCell()}
                        {resource && renderSourceObjectsButton(attribute, resource)}
                    </>,
                    <WidgetButtons
                        key="copy"
                        buttons={[
                            {
                                id: 'copy',
                                icon: 'copy',
                                disabled: AttributeContentType.Secret === attribute.contentType,
                                onClick: () => {
                                    onCopyContentClick(attribute);
                                },
                                tooltip: 'Copy to clipboard',
                            },
                        ]}
                    />,
                ],
            };
        },
        [contentTypeEnum, dispatch, getContent, onCopyContentClick, renderSourceObjectsButton],
    );

    const getMetadataTableData = useCallback(
        (attribute: MetadataModel): TableDataRow => ({
            id: attribute.connectorUuid || '',
            columns: [
                attribute.connectorName || 'No connector',
                attribute.sourceObjectType ? getEnumLabel(resourceEnum, attribute.sourceObjectType) : '',
            ],
            detailColumns: [
                <CustomTable
                    key="metadata-table"
                    headers={tableHeaders(ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE)}
                    data={attribute.items.map((attributeItem) => getAttributesTableData(attributeItem, attribute.sourceObjectType))}
                    hasHeader={true}
                />,
            ],
        }),
        [getAttributesTableData, resourceEnum],
    );

    const getButtons = useCallback(
        (attribute: AttributeResponseModel, descriptor: CustomAttributeModel, attributeName: string) => {
            const buttons: WidgetButtonProps[] = [];
            if (editingAttributesNames.includes(attributeName)) {
                buttons.push({
                    id: 'cancel',
                    icon: 'times',
                    disabled: false,
                    tooltip: 'Cancel',
                    onClick: () => {
                        setEditingAttributesNames(editingAttributesNames.filter((n) => n !== attributeName));
                    },
                });
            } else {
                buttons.push(
                    {
                        id: 'copy',
                        icon: 'copy',
                        disabled: AttributeContentType.Secret === attribute.contentType,
                        tooltip: 'Copy to clipboard',
                        onClick: () => {
                            onCopyContentClick(attribute);
                        },
                    },
                    {
                        id: 'edit',
                        icon: 'pencil',
                        disabled: descriptor.properties.readOnly,
                        tooltip: descriptor.properties.readOnly ? 'Attribute is read only, edit is disabled' : 'Edit',
                        onClick: () => {
                            setEditingAttributesNames([...editingAttributesNames, attributeName]);
                        },
                    },
                );
            }
            onRemove &&
                buttons.push({
                    id: 'delete',
                    icon: 'trash',
                    disabled: descriptor.properties.required,
                    tooltip: descriptor.properties.required ? "Attribute is required, can't be removed" : 'Remove',
                    onClick: () => onRemove(descriptor.uuid),
                });
            return buttons;
        },
        [editingAttributesNames, onRemove, onCopyContentClick],
    );

    const getAttributesEditTableData = useCallback(
        (attributes: AttributeResponseModel[], descriptors: CustomAttributeModel[]): TableDataRow[] => {
            if (!attributes || !descriptors) {
                return [];
            }
            return attributes
                .filter((a) => descriptors.some((d) => d.name === a.name))
                .map((a) => {
                    const descriptor = descriptors.find((d) => d.name === a.name);
                    return {
                        id: a.uuid || '',
                        columns: [
                            a.label || '',
                            a.version || '',
                            getEnumLabel(contentTypeEnum, a.contentType) || a.contentType,
                            onSubmit && descriptor && editingAttributesNames.includes(a.name) ? (
                                <AttributeEditForm
                                    key="edit-form"
                                    descriptor={descriptor}
                                    initialContent={a.content}
                                    onSubmit={(uuid, content) => {
                                        setEditingAttributesNames(editingAttributesNames.filter((n) => n !== descriptor.name));
                                        onSubmit(uuid, content);
                                    }}
                                    onCancel={() => {
                                        setEditingAttributesNames(editingAttributesNames.filter((n) => n !== descriptor.name));
                                    }}
                                />
                            ) : (
                                getContent(a.contentType, a.content)
                            ),
                            <WidgetButtons key="widget-buttons" buttons={getButtons(a, descriptor!, a.name)} />,
                        ],
                    };
                });
        },
        [getContent, getButtons, editingAttributesNames, onSubmit, contentTypeEnum],
    );

    const tableData: TableDataRow[] = useMemo(() => {
        switch (viewerType) {
            case ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE:
                return attributes?.map((attribute) => getAttributesTableData(attribute));
            case ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE_EDIT:
                return isCustomAttributeModelArray(descriptors) ? getAttributesEditTableData(attributes, descriptors) : [];
            case ATTRIBUTE_VIEWER_TYPE.METADATA:
                return metadata?.map(getMetadataTableData);
            case ATTRIBUTE_VIEWER_TYPE.METADATA_FLAT:
                return metadata?.flatMap((m) =>
                    m.items.map((i) => ({
                        ...getAttributesTableData(i),
                        columns: [
                            m.connectorName ?? 'No connector',
                            m.sourceObjectType ? getEnumLabel(resourceEnum, m.sourceObjectType) : 'No Source Object',

                            ...getAttributesTableData(i).columns,
                        ],
                    })),
                );

            default:
                return [];
        }
    }, [
        attributes,
        metadata,
        resourceEnum,
        getAttributesTableData,
        getAttributesEditTableData,
        getMetadataTableData,
        viewerType,
        descriptors,
    ]);

    return tableData ? (
        <CustomTable
            headers={tableHeaders(viewerType)}
            data={tableData}
            hasHeader={hasHeader}
            hasDetails={viewerType === ATTRIBUTE_VIEWER_TYPE.METADATA}
        />
    ) : (
        <></>
    );
}
