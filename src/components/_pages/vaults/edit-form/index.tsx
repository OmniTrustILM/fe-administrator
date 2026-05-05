import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';

import AttributeEditor from 'components/Attributes/AttributeEditor';
import Button from 'components/Button';
import Container from 'components/Container';
import ProgressButton from 'components/ProgressButton';
import TabLayout from 'components/Layout/TabLayout';
import TextArea from 'components/TextArea';

import { actions as customAttributesActions, selectors as customAttributesSelectors } from 'ducks/customAttributes';
import { actions as vaultActions, selectors as vaultSelectors } from 'ducks/vaults';
import { actions as connectorsActions } from 'ducks/connectors';

import type { AttributeDescriptorModel } from 'types/attributes';
import { FunctionGroupCode, Resource, type VaultInstanceDetailDto } from 'types/openapi';
import { collectFormAttributes } from 'utils/attributes/attributes';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';

type VaultEditFormProps = Readonly<{
    vault?: VaultInstanceDetailDto | null;
    onCancel?: () => void;
    onSuccess?: () => void;
}>;

interface FormValues {
    description: string;
    [key: string]: unknown;
}

export default function VaultEditForm({ vault, onCancel, onSuccess }: VaultEditFormProps) {
    const dispatch = useDispatch();

    const resourceCustomAttributes = useSelector(customAttributesSelectors.resourceCustomAttributes);
    const vaultInstanceAttributeDescriptors = useSelector(vaultSelectors.vaultInstanceAttributeDescriptors);
    const vaultInstanceAttributesConnectorUuid = useSelector(vaultSelectors.vaultInstanceAttributesConnectorUuid);
    const isFetchingVaultInstanceAttributes = useSelector(vaultSelectors.isFetchingVaultInstanceAttributes);
    const isUpdating = useSelector(vaultSelectors.isUpdating);
    const updateVaultSucceeded = useSelector(vaultSelectors.updateVaultSucceeded);

    const connectorUuid = vault?.connector?.uuid;

    const [groupAttributesCallbackAttributes, setGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);

    useEffect(() => {
        dispatch(customAttributesActions.listResourceCustomAttributes(Resource.Vaults));
    }, [dispatch]);

    useEffect(() => {
        if (!connectorUuid) return;
        dispatch(vaultActions.getVaultInstanceAttributes({ connectorUuid }));
        dispatch(connectorsActions.getConnectorDetail({ uuid: connectorUuid }));
    }, [dispatch, connectorUuid]);

    const vaultAttributeDescriptors = useMemo(() => {
        if (vaultInstanceAttributesConnectorUuid !== connectorUuid) return [];
        return vaultInstanceAttributeDescriptors;
    }, [vaultInstanceAttributeDescriptors, vaultInstanceAttributesConnectorUuid, connectorUuid]);

    const defaultValues: FormValues = useMemo(
        () => ({
            description: vault?.description ?? '',
        }),
        [vault],
    );

    const methods = useForm<FormValues>({
        defaultValues,
        mode: 'onChange',
    });

    const {
        handleSubmit,
        control,
        formState: { isDirty, isSubmitting },
    } = methods;

    const onSubmit = useCallback(
        (values: FormValues) => {
            if (!vault) return;
            if (!vault) return;

            dispatch(
                vaultActions.updateVault({
                    uuid: vault.uuid,
                    request: {
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
        [dispatch, resourceCustomAttributes, vault, vaultAttributeDescriptors, groupAttributesCallbackAttributes],
    );

    const handleUpdateSuccess = useCallback(() => {
        onSuccess?.();
    }, [onSuccess]);

    useRunOnSuccessfulFinish(isUpdating, updateVaultSucceeded, handleUpdateSuccess);

    const attributeTabs = useMemo(
        () => [
            {
                title: 'Attributes',
                content:
                    vaultAttributeDescriptors.length > 0 ? (
                        <AttributeEditor
                            id="vault"
                            attributeDescriptors={vaultAttributeDescriptors}
                            attributes={vault?.attributes ?? []}
                            connectorUuid={connectorUuid}
                            functionGroupCode={FunctionGroupCode.CredentialProvider}
                            kind="vaultManagement"
                            groupAttributesCallbackAttributes={groupAttributesCallbackAttributes}
                            setGroupAttributesCallbackAttributes={setGroupAttributesCallbackAttributes}
                        />
                    ) : (
                        <div className="text-sm text-gray-500">
                            {connectorUuid && isFetchingVaultInstanceAttributes
                                ? 'Loading attributes...'
                                : 'No connector attributes configured for vaults.'}
                        </div>
                    ),
            },
            {
                title: 'Custom Attributes',
                content: (
                    <AttributeEditor
                        id="customVault"
                        attributeDescriptors={resourceCustomAttributes}
                        attributes={vault?.customAttributes ?? []}
                    />
                ),
            },
        ],
        [
            connectorUuid,
            isFetchingVaultInstanceAttributes,
            resourceCustomAttributes,
            vault,
            vaultAttributeDescriptors,
            groupAttributesCallbackAttributes,
        ],
    );

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-4">
                    <Controller
                        name="description"
                        control={control}
                        render={({ field }) => (
                            <TextArea
                                id="vault-edit-description"
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
                        <Button variant="outline" onClick={onCancel} type="button">
                            Cancel
                        </Button>
                        <ProgressButton
                            inProgress={isSubmitting || isUpdating}
                            disabled={!isDirty || isSubmitting || isUpdating}
                            title="Save"
                            inProgressTitle="Saving..."
                            type="submit"
                            color="primary"
                        />
                    </Container>
                </div>
            </form>
        </FormProvider>
    );
}
