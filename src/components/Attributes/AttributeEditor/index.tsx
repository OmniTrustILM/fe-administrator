import Widget from 'components/Widget';

import { actions as connectorActions, selectors as connectorSelectors } from 'ducks/connectors';
import { selectors as userInterfaceSelectors } from 'ducks/user-interface';
import debounce from 'lodash.debounce';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import {
    type AttributeCallbackMappingModel,
    type AttributeDescriptorModel,
    type AttributeResponseModel,
    type CodeBlockAttributeContentDataModel,
    type CustomAttributeModel,
    type DataAttributeModel,
    type FileAttributeContentModel,
    type GroupAttributeModel,
    type InfoAttributeModel,
    isAttributeDescriptorModel,
    isCustomAttributeModel,
    isDataAttributeModel,
    isGroupAttributeModel,
    isInfoAttributeModel,
} from 'types/attributes';
import type { CallbackAttributeModel } from 'types/connectors';
import { AttributeContentType, AttributeValueTarget, type FunctionGroupCode, type Resource } from 'types/openapi';
import { base64ToUtf8 } from 'utils/common-utils';
import { Attribute } from './Attribute';
import CustomAttributeAddSelect from 'components/Attributes/AttributeEditor/CustomAttributeAddSelect';
import { mapAttributeContentToOptionValue } from 'utils/attributes/attributes';
import { deepEqual } from 'utils/deep-equal';
import Button from 'components/Button';
import { Trash } from 'lucide-react';

/* c8 ignore start */
function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null) return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

function cloneForCompare<T>(value: T): T {
    if (Array.isArray(value)) return value.map((v) => cloneForCompare(v)) as T;
    if (isPlainObject(value)) {
        const out: Record<string, unknown> = {};
        Object.keys(value).forEach((k) => {
            out[k] = cloneForCompare((value as Record<string, unknown>)[k]);
        });
        return out as T;
    }
    return value;
}
/* c8 ignore stop */

// same empty array is used to prevent re-rendering of the component
// !!! never modify the attributes field inside of the component !!!
const emptyAttributes: AttributeResponseModel[] = [];
const emptyGroupAttributesCallbackAttributes: AttributeDescriptorModel[] = [];

export type Props = {
    id: string;
    attributeDescriptors: AttributeDescriptorModel[];
    groupAttributesCallbackAttributes?: AttributeDescriptorModel[];
    setGroupAttributesCallbackAttributes?: React.Dispatch<React.SetStateAction<AttributeDescriptorModel[]>>;
    attributes?: AttributeResponseModel[];
    connectorUuid?: string;
    functionGroupCode?: FunctionGroupCode;
    kind?: string;
    callbackResource?: Resource;
    callbackParentUuid?: string;
    withRemoveAction?: boolean;
};

function AttributeEditorInner({
    id,
    attributeDescriptors,
    attributes = emptyAttributes,
    connectorUuid,
    functionGroupCode,
    kind,
    callbackResource,
    callbackParentUuid,
    groupAttributesCallbackAttributes = emptyGroupAttributesCallbackAttributes,
    setGroupAttributesCallbackAttributes = () => emptyGroupAttributesCallbackAttributes,
    withRemoveAction = true,
}: Readonly<Props>) {
    const dispatch = useDispatch();

    const { setValue, watch } = useFormContext<Record<string, any>>();
    const formValues = watch();

    const isRunningCallback = useSelector(connectorSelectors.isRunningCallback);
    const initiateAttributeCallback = useSelector(userInterfaceSelectors.selectInitiateAttributeCallback);
    // data from callbacks
    const callbackData = useSelector(connectorSelectors.callbackData);

    // used to check if descriptors have changed
    const [prevDescriptors, setPrevDescriptors] = useState<AttributeDescriptorModel[]>();

    // used to check if attributes have changed
    const [prevAttributes, setPrevAttributes] = useState<AttributeResponseModel[]>();

    const [prevGroupDescriptors, setPrevGroupDescriptors] = useState<AttributeDescriptorModel[]>();

    // options for selects
    const [options, setOptions] = useState<{ [attributeName: string]: { label: string; value: any }[] }>({});

    const previousAttributesRef = useRef<Record<string, any>>({});
    // stores previous callback data in order to be possible to detect what data changed
    const [previousCallbackData, setPreviousCallbackData] = useState<{ [callbackId: string]: any }>({});

    // used to store custom attributes which user has selected
    const [prevShownCustomAttributes, setPrevShownCustomAttributes] = useState<AttributeDescriptorModel[]>([]);
    const [shownCustomAttributes, setShownCustomAttributes] = useState<AttributeDescriptorModel[]>([]);

    // State to track deleted attributes
    const [deletedAttributes, setDeletedAttributes] = useState<string[]>([]);
    // State to track attributes that were deleted and re-added in this session (to prevent using old backend values)
    const [reAddedAttributes, setReAddedAttributes] = useState<string[]>([]);
    const userInteractedRef = useRef<boolean>(false);

    // workaround to be possible to set options from multiple places;
    // multiple effects can modify opts during single render call
    let opts: { [attributeName: string]: { label: string; value: any }[] } = {};

    useEffect(() => {
        dispatch(connectorActions.clearCallbackData());
    }, [dispatch]);
    /**
     * Handles deletion of an attribute from the grouped attributes
     */
    /* c8 ignore start */
    const handleDeleteAttribute = useCallback(
        (attributeName: string) => {
            // Create a unique key for this AttributeEditor instance
            const deletedAttributesKey = `deletedAttributes_${id}`;

            // Add to deletedAttributes in form state using the unique key
            const currentDeleted = formValues[deletedAttributesKey] || [];
            setValue(deletedAttributesKey, [...currentDeleted, attributeName]);

            // Remove from form values
            setValue(`__attributes__${id}__.${attributeName}`, undefined);

            // Remove from options
            const newOptions = { ...options };
            delete newOptions[`__attributes__${id}__.${attributeName}`];
            setOptions(newOptions);

            // Remove from shown custom attributes if it's a custom attribute
            setShownCustomAttributes((prev) => prev.filter((attr) => attr.name !== attributeName));

            // Remove from group attributes callback attributes if it exists there
            if (groupAttributesCallbackAttributes.some((attr) => attr.name === attributeName)) {
                setGroupAttributesCallbackAttributes((prev) => prev.filter((attr) => attr.name !== attributeName));
            }

            // Add to deletedAttributes to filter them out from rendering
            // Custom attributes will still be available for re-adding through notYetShownCustomAttributeDescriptors
            setDeletedAttributes((prev) => [...prev, attributeName]);
        },
        [setValue, formValues, id, options, groupAttributesCallbackAttributes, setGroupAttributesCallbackAttributes],
    );
    /* c8 ignore stop */

    /**
     * Gets the value from the object property identified by path
     */
    /* c8 ignore start */
    const getObjectPropertyValue = useCallback((object: any, path: string) => {
        const pathParts = path.split('.');

        let currentObject = object;

        for (const pathPart of pathParts) {
            if (currentObject === undefined) {
                return undefined;
            }

            if (Array.isArray(currentObject)) {
                if (currentObject.length > 0) {
                    currentObject = currentObject[0][pathPart];
                } else {
                    return undefined;
                }
            } else {
                currentObject = currentObject[pathPart];
            }
        }

        return currentObject;
    }, []);
    /* c8 ignore stop */

    const isRunningCb: boolean = useMemo((): boolean => {
        let isRunningCb = false;
        for (const k in isRunningCallback) isRunningCb = isRunningCb || isRunningCallback[k];
        return isRunningCb;
    }, [isRunningCallback]);

    /* c8 ignore start */
    /**
     * Gets the value of the attribute identified by the path (attributeName.propertyName.propertyName...)
     */
    /* istanbul ignore next */
    const getAttributeValue = useCallback(
        (attributes: AttributeResponseModel[], path: string | undefined): any => {
            if (!path) return undefined;

            if (!path.includes('.')) return getObjectPropertyValue(attributes.find((a) => a.name === path)?.content, 'value');

            const spath = path.split('.');

            return getObjectPropertyValue(attributes.find((a) => a.name === spath[0])?.content, spath.slice(1).join('.'));
        },
        [getObjectPropertyValue],
    );

    /**
     * Gets the value from the current input state or from the attribute or from the default value of the attribute descriptor.
     */
    /* istanbul ignore next */
    const getCurrentFromMappingValue = useCallback(
        (mapping: AttributeCallbackMappingModel): any => {
            const attributeFromValue = getAttributeValue(attributes, mapping.from);
            const formAttributes = formValues[`__attributes__${id}__`] ?? undefined;
            const formMappingName = mapping.from?.includes('.') ? mapping.from.split('.')[0] : (mapping.from ?? '');
            const formAttribute = formAttributes
                ? Object.keys(formAttributes).find((key) => key.startsWith(`${formMappingName}`))
                : undefined;

            // only lists are supported now, because of this the 'value' is added to the path as the list selected option is { label: "", value: "" }
            const formMappingPath = mapping.from?.includes('.') ? 'value.' + mapping.from.split('.').slice(1).join('.') : 'value';
            const currentContent = formAttribute
                ? (getObjectPropertyValue(formAttributes[formAttribute], formMappingPath) ?? formAttributes[formAttribute])
                : undefined;

            const depDescriptor = attributeDescriptors.find((d) => d.name === formMappingName);
            const depDescriptorValue = depDescriptor ? getObjectPropertyValue(depDescriptor, `content.${formMappingPath}`) : undefined;

            const groupDescriptor = groupAttributesCallbackAttributes.find((d) => d.name === formMappingName);
            const groupDescriptorValue = groupDescriptor
                ? getObjectPropertyValue(groupDescriptor, `content.${formMappingPath}`)
                : undefined;

            return currentContent || attributeFromValue || depDescriptorValue || groupDescriptorValue;
        },

        [attributeDescriptors, groupAttributesCallbackAttributes, attributes, formValues, getAttributeValue, getObjectPropertyValue, id],
    );

    /**
     * Builds mapping of values taken from the form, attribute or attribute descriptor
     * for the callback as defined by the API
     */
    /* istanbul ignore next */
    const buildCallbackMappings = useCallback(
        (descriptor: AttributeDescriptorModel): CallbackAttributeModel | undefined => {
            let hasUndefinedMapping = false;

            const data: CallbackAttributeModel = {
                uuid: '',
                name: '',
                pathVariable: {},
                requestParameter: {},
                body: {},
                filter: {},
            };

            if (isDataAttributeModel(descriptor) || isGroupAttributeModel(descriptor)) {
                descriptor.attributeCallback?.mappings.forEach((mapping) => {
                    let value = mapping.value || getCurrentFromMappingValue(mapping);
                    if (typeof value === 'object' && value !== null) {
                        // Resolve dot path from mapping.from (e.g. "endEntityProfile.data.id" -> extract value at data.id)
                        if (mapping.from?.includes('.')) {
                            const pathParts = mapping.from.split('.').slice(1);
                            const tryResolve = (obj: any, parts: string[]): any => {
                                let resolved = obj;
                                for (const part of parts) {
                                    if (resolved === undefined || resolved === null) return undefined;
                                    resolved = Array.isArray(resolved) ? resolved[0]?.[part] : resolved[part];
                                }
                                return resolved;
                            };
                            const resolved =
                                tryResolve(value, pathParts) ??
                                (value?.value === undefined ? undefined : tryResolve(value, ['value', ...pathParts]));
                            if (resolved !== undefined && (typeof resolved !== 'object' || resolved === null)) {
                                value = resolved;
                            }
                        }
                        if (typeof value === 'object' && value !== null && Object.hasOwn(value, 'data')) value = value.data;
                        if (typeof value === 'object' && value !== null && Object.hasOwn(value, 'uuid') && typeof value.uuid === 'string') {
                            value = value.uuid;
                        }
                    }
                    if (value === undefined) hasUndefinedMapping = true;

                    mapping.targets.forEach((target) => {
                        if (target === AttributeValueTarget.PathVariable) {
                            data.pathVariable![mapping.to] = value;
                        }
                        if (target === AttributeValueTarget.Body) {
                            data.body![mapping.to] = value;
                        }
                        if (target === AttributeValueTarget.RequestParameter) {
                            data.requestParameter![mapping.to] = value;
                        }
                        if (target === AttributeValueTarget.Filter) {
                            data.filter![mapping.to] = value;
                        }
                    });
                });
            }

            return hasUndefinedMapping ? undefined : data;
        },
        [getCurrentFromMappingValue],
    );

    /* istanbul ignore next */
    const executeCallback = useCallback(
        (mappings: CallbackAttributeModel, descriptor: AttributeDescriptorModel, formAttributeName: string) => {
            mappings.name = descriptor.name;
            mappings.uuid = descriptor.uuid;

            dispatch(
                callbackParentUuid && callbackResource
                    ? connectorActions.callbackResource({
                          callbackId: formAttributeName,
                          callbackResource: {
                              parentObjectUuid: callbackParentUuid,
                              resource: callbackResource,
                              requestAttributeCallback: mappings,
                          },
                      })
                    : connectorActions.callbackConnector({
                          callbackId: formAttributeName,
                          callbackConnector: {
                              uuid: connectorUuid!,
                              kind: kind!,
                              functionGroup: functionGroupCode!,
                              requestAttributeCallback: mappings,
                          },
                      }),
            );
        },
        [callbackParentUuid, callbackResource, connectorUuid, dispatch, functionGroupCode, kind],
    );
    /* c8 ignore stop */

    /*
     * Get non-required custom attributes, without a value assigned
     */
    const initiallyHiddenCustomAttributeDescriptors = useMemo(
        () =>
            attributeDescriptors.filter((descriptor) => {
                if (isCustomAttributeModel(descriptor)) {
                    const attribute = attributes.find((el) => el.name === descriptor.name);
                    return !descriptor.properties.required && !attribute?.content;
                }
                return false;
            }),
        [attributeDescriptors, attributes],
    );

    /*
     * Get all non-required custom attributes that can be added (including deleted ones)
     */
    const availableCustomAttributeDescriptors = useMemo(
        () =>
            attributeDescriptors
                .filter((descriptor) => {
                    if (isCustomAttributeModel(descriptor)) {
                        return !descriptor.properties.required;
                    }
                    return false;
                })
                .filter((descriptor) => !shownCustomAttributes.some((el) => el.uuid === descriptor.uuid)),
        [attributeDescriptors, shownCustomAttributes],
    );

    /*
     * Get non-required custom attributes which weren't shown by user or were deleted and can be re-added
     */
    const notYetShownCustomAttributeDescriptors = useMemo(
        () =>
            availableCustomAttributeDescriptors
                .filter((descriptor) => !shownCustomAttributes.some((el) => el.uuid === descriptor.uuid))
                .filter((descriptor) => {
                    // For custom attributes, allow them to be re-added even if deleted
                    // For non-custom attributes, filter out deleted ones
                    if (isCustomAttributeModel(descriptor)) {
                        return true; // Always allow custom attributes to be re-added
                    }
                    return !deletedAttributes.includes(descriptor.name);
                }),
        [availableCustomAttributeDescriptors, shownCustomAttributes, deletedAttributes],
    );

    /*
     * Filter and order custom attributes which should be rendered
     */
    const orderedAttributeDescriptors = useMemo(() => {
        const initiallyShownDescriptors = [...attributeDescriptors, ...groupAttributesCallbackAttributes]
            .filter((descriptor) => !initiallyHiddenCustomAttributeDescriptors.some((el) => el.uuid === descriptor.uuid))
            .filter((descriptor) => {
                // For all attributes (including custom ones), filter out deleted ones from rendering
                return !deletedAttributes.includes(descriptor.name);
            });

        const ordered = [
            ...initiallyShownDescriptors,
            ...initiallyHiddenCustomAttributeDescriptors
                .filter((descriptor) => shownCustomAttributes.some((el) => el.uuid === descriptor.uuid))
                .filter((descriptor) => !deletedAttributes.includes(descriptor.name)) // Also filter out deleted ones from shown custom attributes
                .sort(
                    (a, b) =>
                        shownCustomAttributes.findIndex((el) => el.uuid === a.uuid) -
                        shownCustomAttributes.findIndex((el) => el.uuid === b.uuid),
                ),
        ];
        return ordered;
    }, [
        initiallyHiddenCustomAttributeDescriptors,
        shownCustomAttributes,
        groupAttributesCallbackAttributes,
        attributeDescriptors,
        deletedAttributes,
    ]);

    /**
     * Groups attributes for rendering according to the attribute descriptor group property
     */
    /* c8 ignore start */
    const groupedAttributesDescriptors: { [key: string]: (DataAttributeModel | InfoAttributeModel | CustomAttributeModel)[] } =
        useMemo(() => {
            const grouped: { [key: string]: (DataAttributeModel | InfoAttributeModel | CustomAttributeModel)[] } = {};

            orderedAttributeDescriptors.forEach((descriptor) => {
                if (isDataAttributeModel(descriptor) || isInfoAttributeModel(descriptor) || isCustomAttributeModel(descriptor)) {
                    const groupName = descriptor.properties.group || '__';
                    if (grouped[groupName]) {
                        grouped[groupName].push(descriptor);
                    } else {
                        grouped[groupName] = [descriptor];
                    }
                }
            });
            return grouped;
        }, [orderedAttributeDescriptors]);
    /* c8 ignore stop */

    const descriptorsKey = useMemo(() => attributeDescriptors.map((d) => d.uuid).join(','), [attributeDescriptors]);
    const attributesKey = useMemo(() => attributes.map((a) => a.uuid).join(','), [attributes]);

    /**
     * Clean form attributes, callback data and previous form state whenever passed attribute descriptors or attributes changed
     */
    useEffect(() => {
        // Clear all attributes that start with __attributes__${id}__
        const currentValues = watch();
        const keysToClear = Object.keys(currentValues).filter((k) => k.startsWith(`__attributes__${id}__`));
        keysToClear.forEach((key) => {
            setValue(key, undefined, { shouldDirty: false, shouldValidate: false });
        });
        dispatch(connectorActions.clearCallbackData());
    }, [descriptorsKey, attributesKey, dispatch, setValue, watch, id]);

    /**
     * Synchronize local deletedAttributes state with form state after clearAttributes
     */
    useEffect(() => {
        // After clearAttributes, ensure deletedAttributes are preserved in form state
        if (deletedAttributes.length > 0) {
            setValue(`deletedAttributes_${id}`, deletedAttributes);
        }
    }, [deletedAttributes, setValue, id]);

    /**
     * Synchronize local deletedAttributes state with form state to maintain consistency
     */
    useEffect(() => {
        const formDeletedAttributes = formValues[`deletedAttributes_${id}`] || [];
        if (
            formDeletedAttributes.length !== deletedAttributes.length ||
            !formDeletedAttributes.every((attr: string) => deletedAttributes.includes(attr))
        ) {
            setDeletedAttributes(formDeletedAttributes);
        }
    }, [formValues, deletedAttributes, id]);

    /* c8 ignore start */
    const setAttributeFormValue = useCallback(
        (
            descriptor: DataAttributeModel | CustomAttributeModel,
            attribute: AttributeResponseModel | undefined,
            formAttributeName: string,
            setDefaultOnRequiredValuesOnly: boolean,
            forceDefaultDescriptorValue: boolean,
            wasDeletedLocally: boolean = false,
        ) => {
            let formAttributeValue;
            // For re-added attributes, we want empty values but still need access to descriptor options for selects
            // So we use a separate flag for value setting vs options access
            const shouldUseAttributeValues = !wasDeletedLocally;
            const contentFromValues = forceDefaultDescriptorValue ? descriptor?.content : attribute?.content;
            const appliedContent = shouldUseAttributeValues ? contentFromValues : undefined;

            function handleFileAttributeContentType() {
                if (appliedContent) {
                    setValue(`${formAttributeName}.content`, (appliedContent as FileAttributeContentModel[])[0].reference);
                    setValue(
                        `${formAttributeName}.fileName`,
                        (appliedContent as FileAttributeContentModel[])[0].data.fileName || 'unknown',
                    );
                    setValue(
                        `${formAttributeName}.mimeType`,
                        (appliedContent as FileAttributeContentModel[])[0].data.mimeType || 'unknown',
                    );
                } else if (descriptor.content) {
                    setValue(`${formAttributeName}.content`, (descriptor.content as FileAttributeContentModel[])[0].reference);
                    setValue(
                        `${formAttributeName}.fileName`,
                        (descriptor.content as FileAttributeContentModel[])[0].data.fileName || 'unknown',
                    );
                    setValue(
                        `${formAttributeName}.mimeType`,
                        (descriptor.content as FileAttributeContentModel[])[0].data.mimeType || 'unknown',
                    );
                }
            }

            if (descriptor.contentType === AttributeContentType.File) {
                handleFileAttributeContentType();
                return;
            }

            function setMultiSelectListAttributeValue() {
                if (Array.isArray(appliedContent)) {
                    formAttributeValue = appliedContent.map((content) => mapAttributeContentToOptionValue(content, descriptor));
                } else {
                    formAttributeValue = undefined;
                }
            }

            function setSelectListAttributeValue() {
                if (appliedContent) {
                    formAttributeValue = mapAttributeContentToOptionValue(appliedContent[0], descriptor);
                } else {
                    formAttributeValue = undefined;
                }
            }

            function setBooleanAttributeValue() {
                if (appliedContent?.[0]?.data !== undefined) {
                    formAttributeValue = appliedContent[0].data;
                } else if (descriptor.properties.required) {
                    // set value to false, if attribute is required, has no value, and no default value are provided
                    // otherwise allow the value to be undefined
                    formAttributeValue = descriptor.content?.[0]?.data ?? false;
                } else {
                    formAttributeValue = descriptor.content?.[0]?.data;
                }
            }

            if (descriptor.properties.list && descriptor.properties.multiSelect) {
                setMultiSelectListAttributeValue();
            } else if (descriptor.properties.list || descriptor.contentType === AttributeContentType.Resource) {
                setSelectListAttributeValue();
            } else if (appliedContent) {
                const firstApplied = appliedContent[0] as any;
                formAttributeValue = firstApplied?.reference ?? firstApplied?.data;
            } else if (
                descriptor.content &&
                descriptor.content.length > 0 &&
                (!setDefaultOnRequiredValuesOnly || descriptor.properties.required)
            ) {
                // This acts as a fallback for the case when the attribute has no value, but has a default value in the descriptor
                const firstDescriptorContent = descriptor.content[0] as any;
                formAttributeValue = firstDescriptorContent?.data ?? firstDescriptorContent?.reference;
            }

            if (descriptor.contentType === AttributeContentType.Codeblock && formAttributeValue !== undefined) {
                if ((formAttributeValue as CodeBlockAttributeContentDataModel).code === undefined) {
                    formAttributeValue = {
                        language: (formAttributeValue as CodeBlockAttributeContentDataModel).language,
                    };
                } else {
                    formAttributeValue = {
                        code: base64ToUtf8((formAttributeValue as CodeBlockAttributeContentDataModel).code),
                        language: (formAttributeValue as CodeBlockAttributeContentDataModel).language,
                    };
                }
            }
            if (descriptor.contentType === AttributeContentType.Boolean) {
                setBooleanAttributeValue();
            }

            setValue(formAttributeName, formAttributeValue, { shouldValidate: true });
        },
        [setValue],
    );
    /* c8 ignore stop */

    // Track which descriptors have already had their initial callback executed,
    // to avoid infinite callback loops when callback responses update descriptors/values.
    const initialCallbackRunRef = useRef<Set<string>>(new Set());

    /* c8 ignore start */
    const getAttributeStaticOptions = useCallback(
        (descriptor: DataAttributeModel | CustomAttributeModel | GroupAttributeModel, formAttributeName: string) => {
            let newOptions = {};

            if (isDataAttributeModel(descriptor) || isCustomAttributeModel(descriptor)) {
                const typedDescriptor = descriptor;
                const hasArrayContent = Array.isArray(typedDescriptor.content);
                const shouldHaveStaticOptions =
                    hasArrayContent && (typedDescriptor.properties.list || typedDescriptor.contentType === AttributeContentType.Resource);

                if (shouldHaveStaticOptions && Array.isArray(typedDescriptor.content)) {
                    const safeOptions = typedDescriptor.content
                        .filter((item: any) => item != null)
                        .map((data: any) => {
                            const ref = data?.reference;
                            const val = data?.data;
                            const label = ref ?? (val == null ? '' : String(val));
                            return { label, value: data };
                        });

                    newOptions = {
                        ...newOptions,
                        [formAttributeName]: safeOptions,
                    };
                }
            }

            if (isDataAttributeModel(descriptor) || isGroupAttributeModel(descriptor)) {
                // Perform initial callbacks based on "static" mappings only once per descriptor
                if (descriptor.attributeCallback) {
                    const key = `${connectorUuid ?? 'global'}:${descriptor.uuid}:${formAttributeName}`;
                    if (!initialCallbackRunRef.current.has(key)) {
                        const mappings = buildCallbackMappings(descriptor);
                        if (mappings) {
                            executeCallback(mappings, descriptor, formAttributeName);
                            initialCallbackRunRef.current.add(key);
                        }
                    }
                }
            }
            return newOptions;
        },
        [buildCallbackMappings, executeCallback, connectorUuid],
    );
    /* c8 ignore stop */
    /**
     * Called on first render
     * Setups final form values and initial values (based on descriptors and attributes passed)
     * Setups "static" options for selects from the attribute descriptors
     * Performs initial callbacks
     */
    useEffect(() => {
        // run this effect only when attribute descriptors or attributes changes
        if (
            attributeDescriptors === prevDescriptors &&
            attributes === prevAttributes &&
            groupAttributesCallbackAttributes === prevGroupDescriptors
        )
            return;

        let newOptions: { [attributeName: string]: { label: string; value: any }[] } = {};

        const descriptorsToLoad =
            attributeDescriptors === prevDescriptors && attributes === prevAttributes
                ? (groupAttributesCallbackAttributes ?? [])
                : [...attributeDescriptors, ...groupAttributesCallbackAttributes];

        setPrevGroupDescriptors(groupAttributesCallbackAttributes);
        setPrevDescriptors(attributeDescriptors);
        setPrevAttributes(attributes);
        setShownCustomAttributes(
            attributeDescriptors.filter(
                (descriptor) => isCustomAttributeModel(descriptor) && attributes.some((attr) => attr.uuid === descriptor.uuid),
            ),
        );

        descriptorsToLoad.forEach((descriptor) => {
            if (isDataAttributeModel(descriptor) || isGroupAttributeModel(descriptor) || isCustomAttributeModel(descriptor)) {
                const formAttributeName = `__attributes__${id}__.${descriptor.name}`;

                // Skip if this attribute was deleted
                if (deletedAttributes.includes(descriptor.name)) {
                    return;
                }

                const attribute = attributes.find((a) => a.name === descriptor.name);

                // Build "static" options from the descriptor
                newOptions = {
                    ...newOptions,
                    ...getAttributeStaticOptions(descriptor, formAttributeName),
                };

                // Set initial values from the attribute
                if (isDataAttributeModel(descriptor) || isCustomAttributeModel(descriptor)) {
                    setAttributeFormValue(
                        descriptor,
                        attribute,
                        formAttributeName,
                        true,
                        // If the attribute has been set more than once, consider it not being initial update call, so set the default value instead (see Issue: #915)
                        userInteractedRef.current,
                        // Check if this attribute was deleted locally
                        reAddedAttributes.includes(descriptor.name),
                    );
                }
            }
        });
        // multiple effects can modify opts during single render call
        // eslint-disable-next-line react-hooks/exhaustive-deps
        opts = { ...opts, ...newOptions };
        setOptions({ ...options, ...opts });
    }, [
        id,
        attributeDescriptors,
        groupAttributesCallbackAttributes,
        attributes,
        options,
        dispatch,
        prevDescriptors,
        prevAttributes,
        prevGroupDescriptors,
        buildCallbackMappings,
        setAttributeFormValue,
        getAttributeStaticOptions,
        deletedAttributes,
        reAddedAttributes,
    ]);

    /**
     * Setups default values of shown custom attributes attributes
     */
    useEffect(() => {
        // run this effect only when the list of shown attributes changes
        if (prevShownCustomAttributes === shownCustomAttributes) return;

        setPrevShownCustomAttributes(shownCustomAttributes);

        let newOptions: { [attributeName: string]: { label: string; value: any }[] } = {};

        shownCustomAttributes.forEach((descriptor) => {
            if (isCustomAttributeModel(descriptor)) {
                const formAttributeName = `__attributes__${id}__.${descriptor.name}`;
                const attribute = attributes.find((a) => a.name === descriptor.name);

                // Set up options for select fields (always needed for re-added attributes)
                newOptions = {
                    ...newOptions,
                    ...getAttributeStaticOptions(descriptor, formAttributeName),
                };

                // Only set the value for attributes whose value was not yet modified
                if (!getObjectPropertyValue(formValues, formAttributeName)) {
                    setAttributeFormValue(
                        descriptor,
                        attribute,
                        formAttributeName,
                        false,
                        false,
                        reAddedAttributes.includes(descriptor.name),
                    );
                }
            }
        });

        // Update options if we added any new ones
        if (Object.keys(newOptions).length > 0) {
            setOptions((prevOptions) => ({ ...prevOptions, ...newOptions }));
        }
    }, [
        id,
        formValues,
        attributes,
        prevShownCustomAttributes,
        shownCustomAttributes,
        setAttributeFormValue,
        getObjectPropertyValue,
        deletedAttributes,
        reAddedAttributes,
        getAttributeStaticOptions,
    ]);

    /* c8 ignore start */
    /**
     * Called on every form change
     * Evaluates changed attributes and eventually performs a callback whenever necessary
     */
    /* istanbul ignore next */
    const doCallbacks = useCallback(() => {
        const attributesKey = `__attributes__${id}__`;
        const currentAttributes = (formValues?.[attributesKey] ?? {}) as Record<string, any>;
        const previousAttributes = previousAttributesRef.current;

        if (deepEqual(previousAttributes, currentAttributes)) return;

        previousAttributesRef.current = cloneForCompare(currentAttributes);

        // I am not really sure about this. It is currently preventing other callbacks when the form is open in "edit" mode and data loaded to it
        // It works, but this state should be managed in a different way
        if (isRunningCb) return;

        const changedAttributes: { [name: string]: { previous: any; current: any } } = {};

        // get changed attributes and their current values
        const keys = new Set([...Object.keys(previousAttributes || {}), ...Object.keys(currentAttributes || {})]);
        keys.forEach((attrKey) => {
            const prev = previousAttributes?.[attrKey];
            const cur = currentAttributes?.[attrKey];
            if (!deepEqual(prev, cur)) {
                changedAttributes[attrKey] = { previous: prev, current: cur };
            }
        });

        // for each changed attribute check if there are mappings depending on it and if so perform the callback
        [...attributeDescriptors, ...groupAttributesCallbackAttributes].forEach((descriptor) => {
            if (isDataAttributeModel(descriptor) || isGroupAttributeModel(descriptor)) {
                // list all 'from' mappings (get attribute names from the descriptor)
                const fromNames: string[] = [];
                descriptor.attributeCallback?.mappings?.forEach((mapping) => {
                    if (mapping.from) {
                        fromNames.push(mapping.from);
                    }
                });

                // check if any of the changed attributes is in the 'from' list
                for (const fromName in fromNames) {
                    const attributeName = fromNames[fromName].includes('.') ? fromNames[fromName].split('.')[0] : fromNames[fromName];

                    // if there is any attribute changed on which the current descriptor depends, clear the form field and perform the callback
                    if (changedAttributes[attributeName]) {
                        const mappings = buildCallbackMappings(descriptor);

                        if (mappings) {
                            const formAttributeName = `__attributes__${id}__.${descriptor.name}`;
                            // removed it as it was causing form value to be cleared  , it does not seem to be necessary and other places it is working without it
                            // form.mutators.setAttribute(formAttributeName, undefined);
                            executeCallback(mappings, descriptor, formAttributeName);
                        }
                    }
                }
            }
        });
    }, [attributeDescriptors, groupAttributesCallbackAttributes, buildCallbackMappings, formValues, id, isRunningCb, executeCallback]);

    const doCallbacksLatestRef = useRef(doCallbacks);
    /* istanbul ignore next */
    useEffect(() => {
        doCallbacksLatestRef.current = doCallbacks;
    }, [doCallbacks]);

    /* istanbul ignore next */
    const debouncedDoCallbacksRef = useRef(debounce(() => doCallbacksLatestRef.current(), 600));

    /* istanbul ignore next */
    useEffect(() => {
        const debouncedDoCallbacks = debouncedDoCallbacksRef.current;
        debouncedDoCallbacks();

        return () => {
            debouncedDoCallbacks.cancel();
        };
    }, [formValues]);

    /* istanbul ignore next */
    useEffect(() => {
        if (!initiateAttributeCallback) return;

        const descriptorsToLoad = [...attributeDescriptors, ...groupAttributesCallbackAttributes];
        setPrevGroupDescriptors(groupAttributesCallbackAttributes);
        setPrevDescriptors(attributeDescriptors);
        setPrevAttributes(attributes);
        descriptorsToLoad.forEach((descriptor) => {
            if (isDataAttributeModel(descriptor) || isGroupAttributeModel(descriptor) || isCustomAttributeModel(descriptor)) {
                const formAttributeName = `__attributes__${id}__.${descriptor.name}`;

                // Clear the callback cache for credential-type attributes so the callback is
                // re-executed and the options list is refreshed after a new credential is created.
                if (isDataAttributeModel(descriptor) && descriptor.contentType === AttributeContentType.Credential) {
                    const key = `${connectorUuid ?? 'global'}:${descriptor.uuid}:${formAttributeName}`;
                    initialCallbackRunRef.current.delete(key);
                }

                getAttributeStaticOptions(descriptor, formAttributeName);
            }
        });
        // This effect should only be called if the initiateAttributeCallback value is updated
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initiateAttributeCallback]);

    /**
     * Obtains values from attribute callbacks and updates the form values / options accordingly
     * Sets groupAttributeCallbackAttributes from callbackData
     */
    /* istanbul ignore next */
    useEffect(() => {
        if (previousCallbackData === callbackData) return;

        /* istanbul ignore next */
        function updateValueFromCallbackData(callbackId: string, callbackDescriptor: AttributeDescriptorModel) {
            if (!callbackDescriptor) return;
            if (!isDataAttributeModel(callbackDescriptor) && !isCustomAttributeModel(callbackDescriptor)) return;

            const rawCallbackValues = callbackData[callbackId];
            if (!Array.isArray(rawCallbackValues) || rawCallbackValues.length === 0) return;

            // Filter out group attribute descriptors — they are additional fields added to the form,
            // not content values for the current attribute. Without this filter, a callback that
            // returns only descriptors (e.g. Algorithm returning RSA key size descriptor) would
            // incorrectly clear the parent attribute's own value.
            const callbackValues = rawCallbackValues.filter((v: any) => !isAttributeDescriptorModel(v));
            if (callbackValues.length === 0) return;

            if (!callbackDescriptor.properties.list && callbackDescriptor.contentType !== AttributeContentType.Resource) {
                const first = callbackValues[0];
                if (!first) return;
                const value = first.reference ?? first.data;
                if (value === undefined) return;
                setValue(callbackId, value, { shouldValidate: true });
            } else if (userInteractedRef.current) {
                setValue(callbackId, undefined, { shouldValidate: true });
            }
        }

        for (const callbackId in callbackData) {
            if (callbackData[callbackId] === previousCallbackData[callbackId]) continue;
            if (!callbackData[callbackId]) continue;
            if (!Array.isArray(callbackData[callbackId])) continue;
            const groupCallbackAttributes: AttributeDescriptorModel[] = callbackData[callbackId].filter(isAttributeDescriptorModel);

            const descriptors = [...attributeDescriptors, ...groupAttributesCallbackAttributes];
            const callbackDescriptor = descriptors.find((d) => `__attributes__${id}__.${d.name}` === callbackId);

            const groupCallbackAttributesContentOpts = groupCallbackAttributes.reduce((acc, attr) => {
                if (isDataAttributeModel(attr) || isInfoAttributeModel(attr)) {
                    const formAttributeName = `__attributes__${id}__.${attr.name}`;
                    const optionsFromGroupCallback = attr.content?.map((value: any) => ({
                        label: value.reference ?? value.data.toString(),
                        value,
                    }));
                    const callbackContentOpts = optionsFromGroupCallback ? { [formAttributeName]: optionsFromGroupCallback } : {};
                    return { ...acc, ...callbackContentOpts };
                }

                return { ...acc };
            }, {});

            const mapCallbackItemToOption = (value: any) => {
                return { label: value.reference ?? value.data?.toString?.() ?? String(value.data), value };
            };
            // Only update options for callbackId when the callback returned actual content values,
            // not just group attribute descriptors. An empty update would overwrite existing options with [].
            const nonDescriptorCallbackValues = callbackData[callbackId].filter((v: any) => !isAttributeDescriptorModel(v));
            const callbackContentOpts =
                nonDescriptorCallbackValues.length > 0 ? { [callbackId]: nonDescriptorCallbackValues.map(mapCallbackItemToOption) } : {};

            // multiple effects can modify opts during single render call
            // eslint-disable-next-line react-hooks/exhaustive-deps
            opts = {
                ...opts,
                ...callbackContentOpts,
                ...groupCallbackAttributesContentOpts,
            };

            setOptions({ ...options, ...opts });

            // Set groupAttributesCallbackDescriptors inside the loop, to only run this if the callbackData fields have actually been changed.
            if (callbackDescriptor) {
                const newGroupCallbackDescriptors = Object.values(callbackData)
                    .filter(Array.isArray)
                    .flatMap((callbackDataArray) => callbackDataArray.filter(isAttributeDescriptorModel));

                setGroupAttributesCallbackAttributes(newGroupCallbackDescriptors);
                updateValueFromCallbackData(callbackId, callbackDescriptor);
            }
        }

        setPreviousCallbackData(callbackData);
    }, [callbackData, options, previousCallbackData, setValue, id, attributeDescriptors, groupAttributesCallbackAttributes]);
    /* c8 ignore stop */

    /*
      Attribute Form Rendering
    */

    const deleteButton = useCallback(
        (descriptor: AttributeDescriptorModel) => (
            <Button
                variant="transparent"
                onClick={() => handleDeleteAttribute(descriptor.name)}
                title={`Delete ${descriptor.name}`}
                className="ml-2"
            >
                <Trash size={16} />
            </Button>
        ),
        [handleDeleteAttribute],
    );

    /* c8 ignore start */
    const attrs = useMemo(() => {
        const attrs: React.ReactNode[] = [];

        const attributeSelector = (
            <CustomAttributeAddSelect
                onAdd={(attribute) => {
                    setShownCustomAttributes((state) => [...state, attribute]);

                    // Check if this attribute was previously deleted
                    const wasPreviouslyDeleted = deletedAttributes.includes(attribute.name);

                    // Remove from deletedAttributes when re-adding
                    setDeletedAttributes((prev) => prev.filter((name) => name !== attribute.name));

                    // If it was previously deleted, add it to reAddedAttributes to prevent using old backend values
                    if (wasPreviouslyDeleted) {
                        setReAddedAttributes((prev) => [...prev, attribute.name]);
                    }

                    // Also remove from form state
                    const deletedAttributesKey = `deletedAttributes_${id}`;
                    const currentDeleted = formValues[deletedAttributesKey] || [];
                    setValue(
                        deletedAttributesKey,
                        currentDeleted.filter((name: string) => name !== attribute.name),
                    );
                }}
                attributeDescriptors={notYetShownCustomAttributeDescriptors}
            />
        );

        const groupedAttributesDescriptorsKeys = Object.keys(groupedAttributesDescriptors);

        // Show the attribute selector even when there no attributes are displayed, but some non required attributes exist
        if (groupedAttributesDescriptorsKeys.length === 0 && notYetShownCustomAttributeDescriptors.length > 0) {
            return (
                <Widget busy={isRunningCb} noBorder>
                    {attributeSelector}
                </Widget>
            );
        }

        groupedAttributesDescriptorsKeys.forEach((group, i, arr) => {
            attrs.push(
                <Widget noBorder key={group} title={group === '__' ? '' : group} busy={isRunningCb}>
                    {groupedAttributesDescriptors[group].map((descriptor, index) => (
                        <div key={descriptor.name} className="mb-4">
                            <Attribute
                                busy={isRunningCb}
                                name={`__attributes__${id}__.${descriptor.name}`}
                                descriptor={descriptor}
                                options={options[`__attributes__${id}__.${descriptor.name}`]}
                                userInteractedRef={userInteractedRef}
                                deleteButton={
                                    withRemoveAction && isCustomAttributeModel(descriptor) && !descriptor.properties.required
                                        ? deleteButton(descriptor)
                                        : undefined
                                }
                            />
                        </div>
                    ))}
                    {i === arr.length - 1 && notYetShownCustomAttributeDescriptors.length > 0 && attributeSelector}
                </Widget>,
            );
        });
        return attrs;
    }, [
        notYetShownCustomAttributeDescriptors,
        groupedAttributesDescriptors,
        isRunningCb,
        id,
        options,
        withRemoveAction,
        deleteButton,
        setValue,
        formValues,
        deletedAttributes,
    ]);
    /* c8 ignore stop */

    return <>{attrs}</>;
}

function AttributeEditorFormBridge({ children }: Readonly<{ children: React.ReactNode }>) {
    return <>{children}</>;
}

export default function AttributeEditor(props: Readonly<Props>) {
    useFormContext<Record<string, any>>();

    return (
        <AttributeEditorFormBridge>
            <AttributeEditorInner {...props} />
        </AttributeEditorFormBridge>
    );
}
