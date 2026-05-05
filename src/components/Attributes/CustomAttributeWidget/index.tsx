import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller, FormProvider } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import Select from 'components/Select';
import { LockWidgetNameEnum } from 'types/user-interface';
import { actions as customAttributesActions, selectors as customAttributesSelectors } from '../../../ducks/customAttributes';
import type { AttributeResponseModel, BaseAttributeContentModel } from '../../../types/attributes';
import type { Resource } from '../../../types/openapi';
import ContentValueField from '../../Input/DynamicContent/ContentValueField';
import Widget from '../../Widget';
import AttributeViewer, { ATTRIBUTE_VIEWER_TYPE } from '../AttributeViewer';

export type Props = Readonly<{
    resource: Resource;
    resourceUuid: string;
    attributes: AttributeResponseModel[] | undefined;
    className?: string;
    noBorder?: boolean;
}>;

export default function CustomAttributeWidget({ resource, resourceUuid, attributes, className, noBorder }: Props) {
    const dispatch = useDispatch();
    const [isAttributeContentLoaded, setIsAttributeContentLoaded] = useState<boolean>(false);

    const resourceCustomAttributesContents = useSelector(
        customAttributesSelectors.resourceCustomAttributesContents(resource, resourceUuid),
    );

    const resourceCustomAttributes = useSelector(customAttributesSelectors.resourceCustomAttributes);
    const isFetchingResourceCustomAttributes = useSelector(customAttributesSelectors.isFetchingResourceCustomAttributes);
    const isUpdatingContent = useSelector(customAttributesSelectors.isUpdatingContent);

    const prevAttributesRef = useRef<AttributeResponseModel[] | undefined>(undefined);

    useEffect(() => {
        if (prevAttributesRef.current !== attributes) {
            setIsAttributeContentLoaded(false);
        }
        prevAttributesRef.current = attributes;
    }, [attributes]);

    useEffect(() => {
        if (attributes && !isAttributeContentLoaded) {
            dispatch(
                customAttributesActions.loadCustomAttributeContent({
                    resource: resource,
                    resourceUuid: resourceUuid,
                    customAttributes: attributes,
                }),
            );

            setIsAttributeContentLoaded(true);
        }
    }, [attributes, resource, resourceUuid, isAttributeContentLoaded, dispatch]);

    const addCustomAttribute = (attributeUuid: string, content: BaseAttributeContentModel[] | undefined) => {
        if (content) {
            dispatch(
                customAttributesActions.updateCustomAttributeContent({
                    resource: resource,
                    resourceUuid: resourceUuid,
                    attributeUuid: attributeUuid,
                    content: content,
                }),
            );
        }
    };

    const removeCustomAttribute = (attributeUuid: string) => {
        dispatch(
            customAttributesActions.removeCustomAttributeContent({
                resource: resource,
                resourceUuid: resourceUuid,
                attributeUuid: attributeUuid,
            }),
        );
    };

    useEffect(() => {
        dispatch(customAttributesActions.listResourceCustomAttributes(resource));
    }, [dispatch, resource]);

    const [selectedAttributeUuid, setSelectedAttributeUuid] = useState<string>('');

    const methods = useForm<any>({
        defaultValues: {
            selectCustomAttribute: '',
        },
    });

    const { control, reset } = methods;

    const loadedAttributes = useMemo(() => resourceCustomAttributesContents ?? attributes, [resourceCustomAttributesContents, attributes]);

    const availableAttributes = useMemo(
        () => resourceCustomAttributes.filter((r) => !loadedAttributes?.find((a) => a.uuid === r.uuid)),
        [resourceCustomAttributes, loadedAttributes],
    );

    const selectedAttribute = useMemo(
        () => availableAttributes.find((attr) => attr.uuid === selectedAttributeUuid),
        [availableAttributes, selectedAttributeUuid],
    );

    const options = useMemo(
        () =>
            availableAttributes.map((r) => ({
                label: r.properties.label,
                value: r.uuid,
            })),
        [availableAttributes],
    );

    return (
        <Widget
            id={`${resourceUuid}-customAttributeWidget`}
            title={'Custom Attributes'}
            busy={isFetchingResourceCustomAttributes || isUpdatingContent}
            titleSize="large"
            widgetLockName={LockWidgetNameEnum.CustomAttributeWidget}
            className={className}
            noBorder={noBorder}
        >
            <AttributeViewer
                attributes={loadedAttributes}
                descriptors={resourceCustomAttributes}
                viewerType={ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE_EDIT}
                onSubmit={addCustomAttribute}
                onRemove={removeCustomAttribute}
            />
            {options && options.length > 0 && (
                <div className="mt-4">
                    <div className="mb-2">Add custom attribute</div>
                    <FormProvider {...methods}>
                        <form onSubmit={(e) => e.preventDefault()}>
                            <div className="space-y-4">
                                <Controller
                                    name="selectCustomAttribute"
                                    control={control}
                                    render={({ field }: { field: any }) => (
                                        <Select
                                            id="selectCustomAttribute"
                                            options={options}
                                            placeholder="Add..."
                                            value={field.value}
                                            onChange={(value) => {
                                                field.onChange(value);
                                                setSelectedAttributeUuid(value as string);
                                            }}
                                        />
                                    )}
                                />
                                {selectedAttribute && (
                                    <div>
                                        <ContentValueField
                                            id={resourceUuid}
                                            descriptor={selectedAttribute}
                                            onSubmit={(uuid, content) => {
                                                reset({ selectCustomAttribute: '' });
                                                setSelectedAttributeUuid('');
                                                addCustomAttribute(uuid, content);
                                            }}
                                            onCancel={() => {
                                                reset({ selectCustomAttribute: '' });
                                                setSelectedAttributeUuid('');
                                            }}
                                        />
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">{selectedAttribute.description}</p>
                                    </div>
                                )}
                            </div>
                        </form>
                    </FormProvider>
                </div>
            )}
        </Widget>
    );
}
