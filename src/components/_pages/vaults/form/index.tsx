import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';

import Widget from 'components/Widget';
import Container from 'components/Container';
import TabLayout from 'components/Layout/TabLayout';
import TextInput from 'components/TextInput';
import TextArea from 'components/TextArea';
import Select from 'components/Select';
import ProgressButton from 'components/ProgressButton';
import Button from 'components/Button';

import { actions as connectorsActions, selectors as connectorsSelectors } from 'ducks/connectors';
import { actions as vaultActions, selectors as vaultSelectors } from 'ducks/vaults';
import { actions as customAttributesActions, selectors as customAttributesSelectors } from 'ducks/customAttributes';
import AttributeEditor from 'components/Attributes/AttributeEditor';

import { validateAlphaNumericWithSpecialChars, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';

import type { AttributeDescriptorModel } from 'types/attributes';
import type { ConnectorResponseModel } from 'types/connectors';
import { ConnectorInterface, FilterConditionOperator, FilterFieldSource, FunctionGroupCode, Resource } from 'types/openapi';
import { collectFormAttributes } from 'utils/attributes/attributes';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';

type VaultFormProps = Readonly<{
    onCancel?: () => void;
    onSuccess?: () => void;
}>;

interface FormValues {
    name: string;
    description: string;
    connectorUuid?: string;
    interfaceUuid?: string;
}

export default function VaultForm({ onCancel, onSuccess }: VaultFormProps) {
    const dispatch = useDispatch();

    const connectors = useSelector(connectorsSelectors.connectors);
    const isCreating = useSelector(vaultSelectors.isCreating);
    const createdVault = useSelector(vaultSelectors.vault);
    const createVaultSucceeded = useSelector(vaultSelectors.createVaultSucceeded);
    const resourceCustomAttributes = useSelector(customAttributesSelectors.resourceCustomAttributes);
    const vaultInstanceAttributesConnectorUuid = useSelector(vaultSelectors.vaultInstanceAttributesConnectorUuid);
    const vaultInstanceAttributeDescriptors = useSelector(vaultSelectors.vaultInstanceAttributeDescriptors);
    const isFetchingVaultInstanceAttributes = useSelector(vaultSelectors.isFetchingVaultInstanceAttributes);

    useEffect(() => {
        dispatch(
            connectorsActions.listConnectors({
                pageNumber: 1,
                itemsPerPage: 1000,
                filters: [
                    {
                        fieldSource: FilterFieldSource.Property,
                        fieldIdentifier: 'CONNECTOR_INTERFACE',
                        condition: FilterConditionOperator.Equals,
                        value: ConnectorInterface.Secret,
                    },
                ],
            }),
        );
    }, [dispatch]);
    const optionsForConnectors = useMemo(
        () =>
            connectors.map((connector: ConnectorResponseModel) => ({
                value: connector.uuid,
                label: connector.name,
            })),
        [connectors],
    );

    const defaultValues: FormValues = useMemo(
        () => ({
            name: '',
            description: '',
            connectorUuid: undefined,
            interfaceUuid: undefined,
        }),
        [],
    );

    const methods = useForm<FormValues>({
        defaultValues,
        mode: 'onChange',
    });

    useEffect(() => {
        dispatch(customAttributesActions.listResourceCustomAttributes(Resource.Vaults));
    }, [dispatch]);

    const {
        handleSubmit,
        control,
        setValue,
        formState: { isDirty, isSubmitting },
    } = methods;

    const selectedConnectorUuid = useWatch({
        control,
        name: 'connectorUuid',
    });

    useEffect(() => {
        if (!selectedConnectorUuid) return;
        dispatch(vaultActions.getVaultInstanceAttributes({ connectorUuid: selectedConnectorUuid }));
    }, [dispatch, selectedConnectorUuid]);

    const connectorInterfaces = useMemo(() => {
        const connector = connectors.find((c) => c.uuid === selectedConnectorUuid);
        return connector?.interfaces ?? [];
    }, [connectors, selectedConnectorUuid]);

    const [groupAttributesCallbackAttributes, setGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);

    const vaultAttributeDescriptors = useMemo(() => {
        if (vaultInstanceAttributesConnectorUuid !== selectedConnectorUuid) return [];
        return vaultInstanceAttributeDescriptors;
    }, [vaultInstanceAttributeDescriptors, vaultInstanceAttributesConnectorUuid, selectedConnectorUuid]);

    useEffect(() => {
        if (!selectedConnectorUuid) return;
        dispatch(connectorsActions.clearCallbackData());
        setGroupAttributesCallbackAttributes([]);
    }, [dispatch, selectedConnectorUuid]);

    const optionsForVersions = useMemo(() => {
        return connectorInterfaces
            .filter((iface) => iface.code === ConnectorInterface.Secret)
            .map((iface) => ({
                value: iface.uuid,
                label: `Secret (${iface.version})`,
            }));
    }, [connectorInterfaces]);

    useEffect(() => {
        if (optionsForVersions.length > 0 && selectedConnectorUuid) {
            setValue('interfaceUuid', optionsForVersions[0].value, { shouldValidate: true });
        }
    }, [optionsForVersions, selectedConnectorUuid, setValue]);

    const onSubmit = useCallback(
        (values: FormValues) => {
            if (!values.connectorUuid || !values.interfaceUuid) return;

            dispatch(
                vaultActions.createVault({
                    request: {
                        connectorUuid: values.connectorUuid,
                        interfaceUuid: values.interfaceUuid,
                        name: values.name,
                        description: values.description ?? '',
                        attributes: collectFormAttributes(
                            'vault',
                            [...vaultAttributeDescriptors, ...groupAttributesCallbackAttributes],
                            values,
                        ),
                        customAttributes: collectFormAttributes('customVault', resourceCustomAttributes, values),
                    },
                }),
            );
        },
        [dispatch, resourceCustomAttributes, vaultAttributeDescriptors, groupAttributesCallbackAttributes],
    );

    const handleCreateSuccess = useCallback(() => {
        if (createdVault) onSuccess?.();
    }, [createdVault, onSuccess]);

    useRunOnSuccessfulFinish(isCreating, createVaultSucceeded, handleCreateSuccess);

    const handleCancel = useCallback(() => {
        onCancel?.();
    }, [onCancel]);

    const submitTitle = useMemo(() => 'Create', []);
    const inProgressTitle = useMemo(() => 'Creating...', []);

    const attributeTabs = useMemo(
        () => [
            {
                title: 'Attributes',
                content:
                    selectedConnectorUuid && vaultAttributeDescriptors.length > 0 ? (
                        <AttributeEditor
                            id="vault"
                            attributeDescriptors={vaultAttributeDescriptors}
                            connectorUuid={selectedConnectorUuid}
                            functionGroupCode={FunctionGroupCode.CredentialProvider}
                            kind="vaultManagement"
                            groupAttributesCallbackAttributes={groupAttributesCallbackAttributes}
                            setGroupAttributesCallbackAttributes={setGroupAttributesCallbackAttributes}
                        />
                    ) : (
                        <div className="text-sm text-gray-500">No connector attributes configured for vaults.</div>
                    ),
            },
            {
                title: 'Custom Attributes',
                content: <AttributeEditor id="customVault" attributeDescriptors={resourceCustomAttributes} attributes={[]} />,
            },
        ],
        [resourceCustomAttributes, selectedConnectorUuid, vaultAttributeDescriptors, groupAttributesCallbackAttributes],
    );

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <Widget busy={isCreating || (!!selectedConnectorUuid && isFetchingVaultInstanceAttributes)} noBorder>
                    <div className="space-y-4">
                        <Controller
                            name="name"
                            control={control}
                            rules={buildValidationRules([validateRequired(), validateAlphaNumericWithSpecialChars()])}
                            render={({ field, fieldState }) => (
                                <TextInput
                                    id="vault-name"
                                    label="Name"
                                    placeholder="Enter the vault name"
                                    value={field.value}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    error={getFieldErrorMessage(fieldState)}
                                    required
                                />
                            )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <Controller
                                name="connectorUuid"
                                control={control}
                                rules={buildValidationRules([validateRequired()])}
                                render={({ field, fieldState }) => (
                                    <Select
                                        id="vault-connector"
                                        label="Connector"
                                        placeholder="Select connector"
                                        options={optionsForConnectors}
                                        value={field.value || ''}
                                        onChange={field.onChange}
                                        error={getFieldErrorMessage(fieldState)}
                                        required
                                    />
                                )}
                            />
                            {selectedConnectorUuid && (
                                <Controller
                                    name="interfaceUuid"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            id="vault-version"
                                            label="Version"
                                            placeholder="Select version"
                                            options={optionsForVersions}
                                            value={field.value || optionsForVersions[0]?.value || ''}
                                            onChange={field.onChange}
                                            isDisabled={optionsForVersions.length <= 1}
                                        />
                                    )}
                                />
                            )}
                        </div>
                        <Controller
                            name="description"
                            control={control}
                            render={({ field }) => (
                                <TextArea
                                    id="vault-description"
                                    label="Description"
                                    placeholder="Describe the vault"
                                    value={field.value}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                />
                            )}
                        />

                        <TabLayout tabs={attributeTabs} onlyActiveTabContent={false} />

                        <Container className="flex-row justify-end modal-footer" gap={4}>
                            <Button variant="outline" onClick={handleCancel} type="button">
                                Cancel
                            </Button>
                            <ProgressButton
                                inProgress={isSubmitting || isCreating}
                                disabled={!isDirty || isSubmitting || isCreating}
                                title={submitTitle}
                                inProgressTitle={inProgressTitle}
                                type="submit"
                                color="primary"
                            />
                        </Container>
                    </div>
                </Widget>
            </form>
        </FormProvider>
    );
}
