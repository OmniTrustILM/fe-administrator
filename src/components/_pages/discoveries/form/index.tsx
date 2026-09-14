import AttributeEditor from 'components/Attributes/AttributeEditor';
import TabLayout from 'components/Layout/TabLayout';
import ProgressButton from 'components/ProgressButton';
import Widget from 'components/Widget';
import Switch from 'components/Switch';
import { actions as connectorActions } from 'ducks/connectors';
import { actions as customAttributesActions, selectors as customAttributesSelectors } from 'ducks/customAttributes';
import { actions as discoveryActions, selectors as discoverySelectors } from 'ducks/discoveries';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { actions as rulesActions } from 'ducks/rules';
import { actions as userInterfaceActions } from 'ducks/user-interface';

import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import Select from 'components/Select';
import Button from 'components/Button';
import Container from 'components/Container';
import Label from 'components/Label';
import CronBuilder from 'components/CronBuilder';
import CronScheduleHint from 'components/CronScheduleHint';
import { Clock } from 'lucide-react';

import type { AttributeDescriptorModel } from 'types/attributes';
import type { ConnectorResponseModel } from 'types/connectors';
import { ConnectorInterface, FunctionGroupCode, PlatformEnum, Resource } from 'types/openapi';

import { collectFormAttributes } from 'utils/attributes/attributes';
import { validateAlphaNumericWithSpecialChars, validateQuartzCronExpression, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import TriggerEditorWidget from 'components/TriggerEditorWidget';
import TextInput from 'components/TextInput';

type DiscoveryFormProps = Readonly<{
    onSuccess?: () => void;
    onCancel?: () => void;
}>;

interface FormValues {
    name: string;
    triggers: string[] | undefined;
    discoveryProvider: string | undefined;
    storeKind: string | undefined;
    // Which of the connector's DISCOVERY interfaces the run binds to; bound silently when there is exactly one.
    interfaceUuid: string | undefined;
    // Resource wire codes the run should discover; only a v2 connector has this dimension.
    resources: Resource[];
    jobName: string | undefined;
    cronExpression: string | undefined;
    scheduled: boolean;
    oneTime: boolean;
    // Attribute fields are registered dynamically by AttributeEditor.
    [attributeField: `__attributes__${string}`]: unknown;
}

const DEFAULT_CRON_EXPRESSION = '0 0 00 1/1 * ? *';

const NO_DESCRIPTORS: AttributeDescriptorModel[] = [];

/** The AttributeEditor id for one resource's own attributes; its form fields are prefixed with it. */
export const resourceEditorId = (resource: Resource) => `discovery-${resource}`;

export default function DiscoveryForm({ onSuccess, onCancel }: DiscoveryFormProps) {
    const dispatch = useDispatch();

    const discoveryProviders = useSelector(discoverySelectors.discoveryProviders);
    const discoveryProviderAttributeDescriptors = useSelector(discoverySelectors.discoveryProviderAttributeDescriptors);
    const resourceAttributeDescriptors = useSelector(discoverySelectors.discoveryProviderResourceAttributeDescriptors);
    const fetchingResourceAttributeDescriptors = useSelector(discoverySelectors.fetchingResourceAttributeDescriptors);
    const discoveryResources = useSelector(discoverySelectors.discoveryResources);
    const resourceCustomAttributes = useSelector(customAttributesSelectors.resourceCustomAttributes);
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
    const isFetchingResourceCustomAttributes = useSelector(customAttributesSelectors.isFetchingResourceCustomAttributes);
    const isFetchingDiscoveryDetail = useSelector(discoverySelectors.isFetchingDetail);
    const isFetchingDiscoveryProviders = useSelector(discoverySelectors.isFetchingDiscoveryProviders);
    const isFetchingAttributeDescriptors = useSelector(discoverySelectors.isFetchingDiscoveryProviderAttributeDescriptors);
    const isFetchingDiscoveryResources = useSelector(discoverySelectors.isFetchingDiscoveryResources);
    const isCreating = useSelector(discoverySelectors.isCreating);
    const [init, setInit] = useState(true);
    const [groupAttributesCallbackAttributes, setGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);
    const [resourceGroupCallbackAttributes, setResourceGroupCallbackAttributes] = useState<Record<string, AttributeDescriptorModel[]>>({});
    const [discoveryProvider, setDiscoveryProvider] = useState<ConnectorResponseModel>();
    const cronBuilderValueRef = useRef<string>('');

    const isBusy = useMemo(
        () =>
            isFetchingDiscoveryDetail ||
            isFetchingDiscoveryProviders ||
            isCreating ||
            isFetchingAttributeDescriptors ||
            isFetchingDiscoveryResources ||
            isFetchingResourceCustomAttributes,
        [
            isFetchingDiscoveryDetail,
            isFetchingDiscoveryProviders,
            isCreating,
            isFetchingAttributeDescriptors,
            isFetchingDiscoveryResources,
            isFetchingResourceCustomAttributes,
        ],
    );

    useEffect(() => {
        if (init) {
            setInit(false);
            dispatch(connectorActions.clearCallbackData());
            dispatch(discoveryActions.listDiscoveryProviders());
            dispatch(customAttributesActions.listResourceCustomAttributes(Resource.Discoveries));
            dispatch(rulesActions.listTriggers({ resource: Resource.Certificates }));
        }
    }, [dispatch, init]);

    // A connector that exposes a DISCOVERY interface is driven through the v2 contract; one that exposes none is a
    // legacy v1 connector, for which the interface and resource fields do not exist.
    const discoveryInterfaces = useMemo(
        () => discoveryProvider?.interfaces?.filter((iface) => iface.code === ConnectorInterface.Discovery) ?? [],
        [discoveryProvider],
    );
    const isV2Provider = discoveryInterfaces.length > 0;

    const optionsForInterfaces = useMemo(
        () =>
            discoveryInterfaces.map((iface) => ({
                label: `Discovery (${iface.version})`,
                value: iface.uuid,
            })),
        [discoveryInterfaces],
    );

    const defaultValues: FormValues = useMemo(
        () => ({
            name: '',
            triggers: undefined,
            discoveryProvider: undefined,
            storeKind: undefined,
            interfaceUuid: undefined,
            resources: [],
            jobName: undefined,
            cronExpression: undefined,
            scheduled: false,
            oneTime: false,
        }),
        [],
    );

    const methods = useForm<FormValues>({
        defaultValues,
        mode: 'onChange',
    });

    const {
        handleSubmit,
        control,
        formState: { isDirty, isSubmitting, isValid },
        setValue,
        getValues,
    } = methods;

    const watchedScheduled = useWatch({
        control,
        name: 'scheduled',
    });

    const watchedStoreKind = useWatch({
        control,
        name: 'storeKind',
    });

    const watchedInterfaceUuid = useWatch({
        control,
        name: 'interfaceUuid',
    });

    const watchedResources = useWatch({
        control,
        name: 'resources',
    });

    const watchedCronExpression = useWatch({
        control,
        name: 'cronExpression',
    });

    const clearAttributeValues = useCallback(
        (prefix: string) => {
            const formValues = getValues();
            Object.keys(formValues).forEach((key) => {
                if (key.startsWith(prefix)) {
                    setValue(key as `__attributes__${string}`, undefined);
                }
            });
        },
        [getValues, setValue],
    );

    const onDiscoveryProviderChange = useCallback(
        (providerUuid: string | undefined) => {
            dispatch(discoveryActions.clearDiscoveryProviderAttributeDescriptors());
            dispatch(discoveryActions.clearDiscoveryResourceAttributeDescriptors({}));
            dispatch(discoveryActions.clearDiscoveryResources());
            dispatch(connectorActions.clearCallbackData());
            setGroupAttributesCallbackAttributes([]);
            setResourceGroupCallbackAttributes({});
            setValue('interfaceUuid', undefined);
            setValue('resources', []);

            if (!providerUuid || !discoveryProviders) return;
            const provider = discoveryProviders.find((p) => p.uuid === providerUuid);

            if (!provider) return;
            setDiscoveryProvider(provider);

            const interfaces = provider.interfaces?.filter((iface) => iface.code === ConnectorInterface.Discovery) ?? [];
            if (interfaces.length === 0) return;

            dispatch(discoveryActions.listDiscoveryResources({ connectorUuid: provider.uuid }));
            // With exactly one interface there is nothing to choose: bind it and show no field.
            if (interfaces.length === 1) {
                setValue('interfaceUuid', interfaces[0].uuid, { shouldValidate: true });
            }
        },
        [dispatch, discoveryProviders, setValue],
    );

    // v1 only: a kind is what scopes the function-group attribute endpoint. A v2 provider has no kinds.
    const onKindChange = useCallback(
        (kind: string | undefined) => {
            if (!kind || !discoveryProvider || isV2Provider) return;
            dispatch(connectorActions.clearCallbackData());
            setGroupAttributesCallbackAttributes([]);
            dispatch(discoveryActions.getDiscoveryProviderAttributesDescriptors({ uuid: discoveryProvider.uuid, kind }));
        },
        [dispatch, discoveryProvider, isV2Provider],
    );

    // v2: the run-level definitions come through the connector relay as soon as the run is bound to an interface.
    useEffect(() => {
        if (!isV2Provider || !discoveryProvider || !watchedInterfaceUuid) return;
        dispatch(connectorActions.clearCallbackData());
        setGroupAttributesCallbackAttributes([]);
        dispatch(discoveryActions.getDiscoveryInterfaceAttributesDescriptors({ connectorUuid: discoveryProvider.uuid }));
    }, [dispatch, isV2Provider, discoveryProvider, watchedInterfaceUuid]);

    // Selecting a resource fetches its attribute definitions and adds its tab; deselecting drops both, along with
    // whatever the user had typed into that tab.
    const previousResourcesRef = useRef<Resource[]>([]);
    useEffect(() => {
        const current = watchedResources ?? [];
        const previous = previousResourcesRef.current;
        previousResourcesRef.current = current;

        const removed = previous.filter((resource) => !current.includes(resource));
        removed.forEach((resource) => {
            dispatch(discoveryActions.clearDiscoveryResourceAttributeDescriptors({ resource }));
            clearAttributeValues(`__attributes__${resourceEditorId(resource)}__`);
            setResourceGroupCallbackAttributes((prev) => {
                const { [resource]: _dropped, ...rest } = prev;
                return rest;
            });
        });

        if (!discoveryProvider || !isV2Provider) return;
        current
            .filter((resource) => !previous.includes(resource))
            .forEach((resource) => {
                dispatch(discoveryActions.getDiscoveryResourceAttributesDescriptors({ connectorUuid: discoveryProvider.uuid, resource }));
            });
    }, [watchedResources, discoveryProvider, isV2Provider, dispatch, clearAttributeValues]);

    // One stable setter per resource, shaped like React's own so AttributeEditor can pass functional updates.
    const resourceGroupCallbackSetters = useMemo(() => {
        const setters: Record<string, Dispatch<SetStateAction<AttributeDescriptorModel[]>>> = {};
        (watchedResources ?? []).forEach((resource) => {
            setters[resource] = (update) =>
                setResourceGroupCallbackAttributes((prev) => {
                    const current = prev[resource] ?? NO_DESCRIPTORS;
                    const next = typeof update === 'function' ? update(current) : update;
                    return { ...prev, [resource]: next };
                });
        });
        return setters;
    }, [watchedResources]);

    // Triggers fire on newly discovered certificates, so the widget is only offered when certificates are targeted.
    const showCertificateTriggers = !isV2Provider || (watchedResources ?? []).includes(Resource.Certificates);

    const onSubmit = useCallback(
        (values: FormValues) => {
            const resources = isV2Provider ? values.resources : undefined;
            dispatch(
                discoveryActions.createDiscovery({
                    request: {
                        name: values.name,
                        triggers: showCertificateTriggers && selectedTriggers.length ? selectedTriggers : undefined,
                        connectorUuid: values.discoveryProvider!,
                        kind: isV2Provider ? undefined : values.storeKind,
                        interfaceUuid: isV2Provider ? values.interfaceUuid : undefined,
                        resources,
                        attributes: collectFormAttributes(
                            'discovery',
                            [...(discoveryProviderAttributeDescriptors ?? []), ...groupAttributesCallbackAttributes],
                            values,
                        ),
                        resourceAttributes: resources
                            ? Object.fromEntries(
                                  resources.map((resource) => [
                                      resource,
                                      collectFormAttributes(
                                          resourceEditorId(resource),
                                          [
                                              ...(resourceAttributeDescriptors[resource] ?? []),
                                              ...(resourceGroupCallbackAttributes[resource] ?? []),
                                          ],
                                          values,
                                      ),
                                  ]),
                              )
                            : undefined,
                        customAttributes: collectFormAttributes('customDiscovery', resourceCustomAttributes, values),
                    },
                    scheduled: values.scheduled,
                    jobName: values.jobName,
                    cronExpression: values.cronExpression,
                    oneTime: values.oneTime,
                }),
            );
        },
        [
            dispatch,
            discoveryProviderAttributeDescriptors,
            groupAttributesCallbackAttributes,
            resourceAttributeDescriptors,
            resourceGroupCallbackAttributes,
            resourceCustomAttributes,
            selectedTriggers,
            isV2Provider,
            showCertificateTriggers,
        ],
    );

    const optionsForDiscoveryProviders = useMemo(
        () =>
            discoveryProviders?.map((provider) => ({
                label: provider.name,
                value: provider.uuid,
            })),
        [discoveryProviders],
    );

    const optionsForKinds = useMemo(
        () =>
            discoveryProvider?.functionGroups
                .find((fg) => fg.functionGroupCode === FunctionGroupCode.DiscoveryProvider)
                ?.kinds.map((kind) => ({
                    label: kind,
                    value: kind,
                })) ?? [],
        [discoveryProvider],
    );

    const optionsForResources = useMemo(
        () =>
            (discoveryResources ?? []).map((resource) => ({
                label: getEnumLabel(resourceEnum, resource),
                value: resource,
            })),
        [discoveryResources, resourceEnum],
    );

    // Automatically load attributes when kind changes
    useEffect(() => {
        if (watchedStoreKind && discoveryProvider) {
            onKindChange(watchedStoreKind);
        }
    }, [watchedStoreKind, discoveryProvider, onKindChange]);

    const onOpenCronModal = useCallback(() => {
        const initialValue = watchedCronExpression || DEFAULT_CRON_EXPRESSION;
        cronBuilderValueRef.current = initialValue;
        dispatch(
            userInterfaceActions.showGlobalModal({
                isOpen: true,
                size: 'xl',
                title: 'Select CRON Expression',
                content: (
                    <CronBuilder
                        value={initialValue}
                        onChange={(v) => {
                            cronBuilderValueRef.current = v;
                        }}
                    />
                ),
                showOkButton: true,
                showCancelButton: true,
                okButtonCallback: () => {
                    setValue('cronExpression', cronBuilderValueRef.current);
                    dispatch(userInterfaceActions.hideGlobalModal());
                },
                cancelButtonCallback: () => {
                    dispatch(userInterfaceActions.hideGlobalModal());
                },
            }),
        );
    }, [dispatch, setValue, watchedCronExpression, cronBuilderValueRef]);

    const resourceTabs = useMemo(
        () =>
            isV2Provider && discoveryProvider
                ? (watchedResources ?? []).map((resource) => {
                      const descriptors = resourceAttributeDescriptors[resource];
                      const loaded = descriptors !== undefined && !fetchingResourceAttributeDescriptors.includes(resource);
                      return {
                          tabKey: `resource-${resource}`,
                          title: getEnumLabel(resourceEnum, resource),
                          content: (
                              <div data-testid={`resource-attributes-${resource}`}>
                                  {loaded && descriptors.length === 0 ? (
                                      <p className="text-sm text-content-muted">
                                          {getEnumLabel(resourceEnum, resource)} has no attributes of its own to configure on this Discovery
                                          Provider.
                                      </p>
                                  ) : null}
                                  <AttributeEditor
                                      id={resourceEditorId(resource)}
                                      attributeDescriptors={descriptors ?? NO_DESCRIPTORS}
                                      connectorUuid={discoveryProvider.uuid}
                                      interfaceUuid={watchedInterfaceUuid}
                                      groupAttributesCallbackAttributes={resourceGroupCallbackAttributes[resource] ?? NO_DESCRIPTORS}
                                      setGroupAttributesCallbackAttributes={resourceGroupCallbackSetters[resource]}
                                  />
                              </div>
                          ),
                      };
                  })
                : [],
        [
            isV2Provider,
            discoveryProvider,
            watchedResources,
            resourceAttributeDescriptors,
            fetchingResourceAttributeDescriptors,
            resourceEnum,
            watchedInterfaceUuid,
            resourceGroupCallbackAttributes,
            resourceGroupCallbackSetters,
        ],
    );

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Widget
                    title="Schedule"
                    widgetExtraTopNode={
                        <div className="flex items-start ml-2 w-full">
                            <Controller
                                name="scheduled"
                                control={control}
                                render={({ field }) => <Switch id="scheduled" checked={field.value} onChange={field.onChange} />}
                            />
                        </div>
                    }
                >
                    {watchedScheduled && (
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="jobName" required>
                                    Job Name
                                </Label>
                                <Controller
                                    name="jobName"
                                    control={control}
                                    rules={buildValidationRules([validateRequired(), validateAlphaNumericWithSpecialChars()])}
                                    render={({ field, fieldState }) => (
                                        <TextInput
                                            {...field}
                                            id="jobName"
                                            placeholder="Enter Job Name"
                                            invalid={fieldState.error && fieldState.isTouched}
                                            error={getFieldErrorMessage(fieldState)}
                                        />
                                    )}
                                />
                            </div>

                            <Controller
                                name="cronExpression"
                                control={control}
                                rules={buildValidationRules([validateRequired(), validateQuartzCronExpression()])}
                                render={({ field, fieldState }) => (
                                    <div className="mb-4 space-y-4">
                                        <TextInput
                                            id="cronExpression"
                                            label="Cron Expression (UTC)"
                                            value={field.value}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            invalid={!!fieldState.error && fieldState.isTouched}
                                            error={fieldState.error?.message}
                                            required
                                            placeholder="Enter Cron Expression"
                                            buttonRight={
                                                <button
                                                    type="button"
                                                    onClick={onOpenCronModal}
                                                    aria-label="Open cron expression builder"
                                                    title="Open cron expression builder"
                                                >
                                                    <Clock size={16} />
                                                </button>
                                            }
                                        />
                                        <CronScheduleHint cronExpression={watchedCronExpression} />
                                    </div>
                                )}
                            />

                            <Controller
                                name="oneTime"
                                control={control}
                                render={({ field }) => (
                                    <Switch id="oneTime" checked={field.value} onChange={field.onChange} label="One Time Only" />
                                )}
                            />
                        </div>
                    )}
                </Widget>

                {showCertificateTriggers && (
                    <TriggerEditorWidget
                        resource={Resource.Certificates}
                        selectedTriggers={selectedTriggers}
                        onSelectedTriggersChange={setSelectedTriggers}
                        noteText="Triggers will be executed on newly discovered certificate when handling Certificate Discovered event"
                    />
                )}

                <Widget title="Add discovery" busy={isBusy}>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name" required>
                                Discovery Name
                            </Label>
                            <Controller
                                name="name"
                                control={control}
                                rules={buildValidationRules([validateRequired(), validateAlphaNumericWithSpecialChars()])}
                                render={({ field, fieldState }) => (
                                    <TextInput
                                        {...field}
                                        id="name"
                                        placeholder="Enter the Discovery Name"
                                        invalid={fieldState.error && fieldState.isTouched}
                                        error={getFieldErrorMessage(fieldState)}
                                    />
                                )}
                            />
                        </div>

                        <Controller
                            name="discoveryProvider"
                            control={control}
                            rules={buildValidationRules([validateRequired()])}
                            render={({ field, fieldState }) => (
                                <>
                                    <Select
                                        id="discoveryProviderSelect"
                                        label="Discovery Provider"
                                        value={field.value || ''}
                                        onChange={(value) => {
                                            // Both the run-level editor ("discovery") and the per-resource editors
                                            // ("discovery-<resource>") register under this prefix; "customDiscovery" does not.
                                            clearAttributeValues('__attributes__discovery');
                                            setValue('storeKind', undefined);
                                            setValue('triggers', undefined);
                                            onDiscoveryProviderChange(value as string);
                                            field.onChange(value);
                                        }}
                                        options={optionsForDiscoveryProviders || []}
                                        placeholder="Select Discovery Provider"
                                        placement="bottom"
                                    />
                                    {fieldState.error && fieldState.isTouched && (
                                        <p className="mt-1 text-sm text-danger">
                                            {typeof fieldState.error === 'string'
                                                ? fieldState.error
                                                : fieldState.error?.message || 'Invalid value'}
                                        </p>
                                    )}
                                </>
                            )}
                        />

                        {discoveryProvider && !isV2Provider && (
                            <Controller
                                name="storeKind"
                                control={control}
                                rules={buildValidationRules([validateRequired()])}
                                render={({ field, fieldState }) => (
                                    <>
                                        <Select
                                            id="storeKindSelect"
                                            label="Kind"
                                            value={field.value || ''}
                                            onChange={(value) => {
                                                onKindChange(value as string);
                                                field.onChange(value);
                                            }}
                                            options={optionsForKinds}
                                            placeholder="Select Kind"
                                            placement="bottom"
                                        />
                                        {fieldState.error && fieldState.isTouched && (
                                            <p className="mt-1 text-sm text-danger">Required Field</p>
                                        )}
                                    </>
                                )}
                            />
                        )}

                        {discoveryProvider && discoveryInterfaces.length > 1 && (
                            <Controller
                                name="interfaceUuid"
                                control={control}
                                rules={buildValidationRules([validateRequired()])}
                                render={({ field, fieldState }) => (
                                    <Select
                                        id="interfaceSelect"
                                        label="Interface"
                                        value={field.value ?? ''}
                                        onChange={(value) => field.onChange(value)}
                                        options={optionsForInterfaces}
                                        placeholder="Select Interface"
                                        placement="bottom"
                                        error={getFieldErrorMessage(fieldState)}
                                    />
                                )}
                            />
                        )}

                        {discoveryProvider && isV2Provider && (
                            <Controller
                                name="resources"
                                control={control}
                                rules={{ validate: (value) => (value && value.length > 0) || 'Select at least one resource' }}
                                render={({ field, fieldState }) => (
                                    <Select
                                        id="resourcesSelect"
                                        isMulti
                                        label="Resources"
                                        value={(field.value ?? []).map((resource) => ({
                                            value: resource,
                                            label: getEnumLabel(resourceEnum, resource),
                                        }))}
                                        onChange={(selected) => field.onChange((selected ?? []).map((option) => option.value as Resource))}
                                        options={optionsForResources}
                                        placeholder="Select Resources"
                                        placement="bottom"
                                        error={getFieldErrorMessage(fieldState)}
                                    />
                                )}
                            />
                        )}

                        <TabLayout
                            noBorder
                            onlyActiveTabContent={false}
                            tabs={[
                                {
                                    title: 'Connector Attributes',
                                    content:
                                        discoveryProvider &&
                                        (isV2Provider ? watchedInterfaceUuid : watchedStoreKind) &&
                                        discoveryProviderAttributeDescriptors &&
                                        discoveryProviderAttributeDescriptors.length > 0 ? (
                                            <AttributeEditor
                                                id="discovery"
                                                attributeDescriptors={discoveryProviderAttributeDescriptors}
                                                connectorUuid={discoveryProvider.uuid}
                                                functionGroupCode={isV2Provider ? undefined : FunctionGroupCode.DiscoveryProvider}
                                                kind={isV2Provider ? undefined : watchedStoreKind}
                                                interfaceUuid={isV2Provider ? watchedInterfaceUuid : undefined}
                                                groupAttributesCallbackAttributes={groupAttributesCallbackAttributes}
                                                setGroupAttributesCallbackAttributes={setGroupAttributesCallbackAttributes}
                                            />
                                        ) : (
                                            <></>
                                        ),
                                },
                                ...resourceTabs,
                                {
                                    title: 'Custom Attributes',
                                    content: (
                                        <AttributeEditor
                                            id="customDiscovery"
                                            attributeDescriptors={resourceCustomAttributes}
                                            attributes={discoveryProvider?.customAttributes}
                                        />
                                    ),
                                },
                            ]}
                        />
                    </div>
                </Widget>

                <Container className="flex-row justify-end modal-footer" gap={4}>
                    <Button variant="outline" onClick={onCancel} disabled={isSubmitting} type="button">
                        Cancel
                    </Button>
                    <ProgressButton
                        title="Create"
                        inProgressTitle="Creating..."
                        inProgress={isSubmitting}
                        disabled={!isDirty || !isValid}
                        type="submit"
                    />
                </Container>
            </form>
        </FormProvider>
    );
}
