import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';

import AttributeEditor from 'components/Attributes/AttributeEditor';
import Button from 'components/Button';
import Container from 'components/Container';
import TabLayout from 'components/Layout/TabLayout';
import ProgressButton from 'components/ProgressButton';
import TextArea from 'components/TextArea';

import { actions as customAttributesActions, selectors as customAttributesSelectors } from 'ducks/customAttributes';
import { actions as vaultProfileActions, selectors as vaultProfileSelectors } from 'ducks/vault-profiles';
import { actions as vaultActions, selectors as vaultSelectors } from 'ducks/vaults';

import type { AttributeDescriptorModel } from 'types/attributes';
import type { SearchRequestModel } from 'types/certificate';
import { FunctionGroupCode, Resource, type VaultInstanceDto, type VaultProfileDetailDto } from 'types/openapi';
import { collectFormAttributes } from 'utils/attributes/attributes';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';

type VaultProfileEditFormProps = Readonly<{
    profile: VaultProfileDetailDto;
    vaultUuid: string;
    onCancel?: () => void;
    onSuccess?: () => void;
}>;

interface FormValues {
    description: string;
    [key: string]: unknown;
}

const listVaultsPayload: SearchRequestModel = { itemsPerPage: 1000, pageNumber: 1, filters: [] };

export default function VaultProfileEditForm({ profile, vaultUuid, onCancel, onSuccess }: VaultProfileEditFormProps) {
    const dispatch = useDispatch();

    const vaults = useSelector(vaultSelectors.vaults);
    const resourceCustomAttributes = useSelector(customAttributesSelectors.resourceCustomAttributes);
    const vaultProfileAttributeDescriptors = useSelector(vaultProfileSelectors.vaultProfileAttributeDescriptors);
    const isFetchingVaultProfileAttributes = useSelector(vaultProfileSelectors.isFetchingVaultProfileAttributes);
    const isUpdating = useSelector(vaultProfileSelectors.isUpdating);
    const updateVaultProfileSucceeded = useSelector(vaultProfileSelectors.updateVaultProfileSucceeded);

    const [groupAttributesCallbackAttributes, setGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);

    const connectorUuid = useMemo(
        () => vaults.find((v: VaultInstanceDto) => v.uuid === profile.vaultInstance?.uuid)?.connector?.uuid,
        [profile.vaultInstance.uuid, vaults],
    );

    useEffect(() => {
        dispatch(customAttributesActions.listResourceCustomAttributes(Resource.VaultProfiles));
        dispatch(vaultActions.listVaults(listVaultsPayload));
        dispatch(vaultProfileActions.getVaultProfileAttributes({ vaultUuid: profile.vaultInstance.uuid }));
    }, [dispatch, profile.vaultInstance.uuid]);

    const defaultValues: FormValues = useMemo(
        () => ({
            description: profile.description ?? '',
        }),
        [profile.description],
    );

    const methods = useForm<FormValues>({
        defaultValues,
        mode: 'onChange',
    });

    const {
        handleSubmit,
        control,
        formState: { isDirty, isSubmitting, isValid },
        getValues,
    } = methods;

    const onSubmit = useCallback(
        (values: FormValues) => {
            const allValues = getValues();
            dispatch(
                vaultProfileActions.updateVaultProfile({
                    vaultUuid,
                    vaultProfileUuid: profile.uuid,
                    request: {
                        description: values.description ?? '',
                        attributes: collectFormAttributes(
                            'vaultProfile',
                            [...vaultProfileAttributeDescriptors, ...groupAttributesCallbackAttributes],
                            allValues,
                        ),
                        customAttributes: collectFormAttributes('customVaultProfile', resourceCustomAttributes, allValues),
                    },
                }),
            );
        },
        [
            dispatch,
            getValues,
            profile.uuid,
            resourceCustomAttributes,
            vaultUuid,
            vaultProfileAttributeDescriptors,
            groupAttributesCallbackAttributes,
        ],
    );

    const attributeTabs = useMemo(
        () => [
            {
                title: 'Attributes',
                content:
                    vaultProfileAttributeDescriptors.length > 0 ? (
                        <AttributeEditor
                            id="vaultProfile"
                            attributeDescriptors={vaultProfileAttributeDescriptors}
                            attributes={profile.attributes ?? []}
                            connectorUuid={connectorUuid}
                            functionGroupCode={FunctionGroupCode.CredentialProvider}
                            kind="vaultManagement"
                            groupAttributesCallbackAttributes={groupAttributesCallbackAttributes}
                            setGroupAttributesCallbackAttributes={setGroupAttributesCallbackAttributes}
                        />
                    ) : (
                        <div className="text-sm text-gray-500">
                            {isFetchingVaultProfileAttributes ? 'Loading attributes...' : 'No vault profile attributes configured.'}
                        </div>
                    ),
            },
            {
                title: 'Custom Attributes',
                content: (
                    <AttributeEditor
                        id="customVaultProfile"
                        attributeDescriptors={resourceCustomAttributes}
                        attributes={profile.customAttributes ?? []}
                    />
                ),
            },
        ],
        [
            connectorUuid,
            groupAttributesCallbackAttributes,
            isFetchingVaultProfileAttributes,
            profile.attributes,
            profile.customAttributes,
            resourceCustomAttributes,
            vaultProfileAttributeDescriptors,
        ],
    );

    const handleUpdateSuccess = useCallback(() => {
        onSuccess?.();
    }, [onSuccess]);

    useRunOnSuccessfulFinish(isUpdating, updateVaultProfileSucceeded, handleUpdateSuccess);

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-4">
                    <Controller
                        name="description"
                        control={control}
                        render={({ field }) => (
                            <TextArea
                                id="vault-profile-edit-description"
                                label="Description"
                                placeholder="Describe the vault profile"
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
                            disabled={!isDirty || !isValid || isSubmitting || isUpdating}
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
