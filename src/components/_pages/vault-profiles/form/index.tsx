import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';

import AttributeEditor from 'components/Attributes/AttributeEditor';
import Button from 'components/Button';
import Container from 'components/Container';
import TabLayout from 'components/Layout/TabLayout';
import ProgressButton from 'components/ProgressButton';
import Select from 'components/Select';
import TextInput from 'components/TextInput';
import TextArea from 'components/TextArea';
import Widget from 'components/Widget';

import { actions as customAttributesActions, selectors as customAttributesSelectors } from 'ducks/customAttributes';
import { actions as vaultActions, selectors as vaultSelectors } from 'ducks/vaults';
import { actions as vaultProfileActions, selectors as vaultProfileSelectors } from 'ducks/vault-profiles';

import { validateAlphaNumericWithSpecialChars, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import { collectFormAttributes } from 'utils/attributes/attributes';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';

import type { AttributeDescriptorModel } from 'types/attributes';
import type { SearchRequestModel } from 'types/certificate';
import { FunctionGroupCode, Resource, type VaultInstanceDto, type VaultProfileRequestDto } from 'types/openapi';

type VaultProfileFormProps = Readonly<{
    onCancel?: () => void;
    onSuccess?: () => void;
}>;

type SelectOption = {
    value: string;
    label: string;
};

interface FormValues {
    name: string;
    vaultUuid?: string;
    description: string;
}

const listVaultsPayload: SearchRequestModel = { itemsPerPage: 1000, pageNumber: 1, filters: [] };

export default function VaultProfileForm({ onCancel, onSuccess }: VaultProfileFormProps) {
    const dispatch = useDispatch();
    const hasLoadedRef = useRef(false);

    const vaults = useSelector(vaultSelectors.vaults);
    const isCreating = useSelector(vaultProfileSelectors.isCreating);
    const createVaultProfileSucceeded = useSelector(vaultProfileSelectors.createVaultProfileSucceeded);
    const resourceCustomAttributes = useSelector(customAttributesSelectors.resourceCustomAttributes);
    const vaultProfileAttributeDescriptors = useSelector(vaultProfileSelectors.vaultProfileAttributeDescriptors);
    const isFetchingVaultProfileAttributes = useSelector(vaultProfileSelectors.isFetchingVaultProfileAttributes);

    const [groupAttributesCallbackAttributes, setGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);

    useEffect(() => {
        if (hasLoadedRef.current) return;
        hasLoadedRef.current = true;
        dispatch(vaultActions.listVaults(listVaultsPayload));
        dispatch(customAttributesActions.listResourceCustomAttributes(Resource.VaultProfiles));
    }, [dispatch]);

    const optionsForVaults = useMemo<SelectOption[]>(
        () =>
            vaults.map((vault: VaultInstanceDto) => ({
                value: vault.uuid,
                label: vault.name,
            })),
        [vaults],
    );

    const defaultValues: FormValues = useMemo(
        () => ({
            name: '',
            vaultUuid: undefined,
            description: '',
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
        getValues,
    } = methods;

    const selectedVaultUuid = useWatch({ control, name: 'vaultUuid' });

    const connectorUuid = useMemo(
        () => vaults.find((v: VaultInstanceDto) => v.uuid === selectedVaultUuid)?.connector?.uuid,
        [vaults, selectedVaultUuid],
    );

    useEffect(() => {
        if (!selectedVaultUuid) return;
        dispatch(vaultProfileActions.getVaultProfileAttributes({ vaultUuid: selectedVaultUuid }));
        setGroupAttributesCallbackAttributes([]);
    }, [dispatch, selectedVaultUuid]);

    const onSubmit = useCallback(
        (values: FormValues) => {
            if (!values.vaultUuid) return;

            const allValues = getValues();
            const request: VaultProfileRequestDto = {
                name: values.name,
                description: values.description || undefined,
                attributes: collectFormAttributes(
                    'vaultProfile',
                    [...vaultProfileAttributeDescriptors, ...groupAttributesCallbackAttributes],
                    allValues,
                ),
                customAttributes: collectFormAttributes('customVaultProfile', resourceCustomAttributes, allValues),
            };

            dispatch(
                vaultProfileActions.createVaultProfile({
                    vaultUuid: values.vaultUuid,
                    request,
                }),
            );
        },
        [dispatch, getValues, resourceCustomAttributes, vaultProfileAttributeDescriptors, groupAttributesCallbackAttributes],
    );

    const handleCreateSuccess = useCallback(() => {
        onSuccess?.();
    }, [onSuccess]);

    useRunOnSuccessfulFinish(isCreating, createVaultProfileSucceeded, handleCreateSuccess);

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
                    selectedVaultUuid && vaultProfileAttributeDescriptors.length > 0 ? (
                        <AttributeEditor
                            id="vaultProfile"
                            attributeDescriptors={vaultProfileAttributeDescriptors}
                            connectorUuid={connectorUuid}
                            functionGroupCode={FunctionGroupCode.CredentialProvider}
                            kind="vaultManagement"
                            groupAttributesCallbackAttributes={groupAttributesCallbackAttributes}
                            setGroupAttributesCallbackAttributes={setGroupAttributesCallbackAttributes}
                        />
                    ) : (
                        <div className="text-sm text-gray-500">
                            {selectedVaultUuid && isFetchingVaultProfileAttributes
                                ? 'Loading attributes...'
                                : 'No vault profile attributes configured.'}
                        </div>
                    ),
            },
            {
                title: 'Custom Attributes',
                content: <AttributeEditor id="customVaultProfile" attributeDescriptors={resourceCustomAttributes} />,
            },
        ],
        [
            connectorUuid,
            groupAttributesCallbackAttributes,
            isFetchingVaultProfileAttributes,
            resourceCustomAttributes,
            selectedVaultUuid,
            vaultProfileAttributeDescriptors,
        ],
    );

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <Widget busy={isCreating || (!!selectedVaultUuid && isFetchingVaultProfileAttributes)} noBorder>
                    <div className="space-y-4">
                        <Controller
                            name="name"
                            control={control}
                            rules={buildValidationRules([validateRequired(), validateAlphaNumericWithSpecialChars()])}
                            render={({ field, fieldState }) => (
                                <TextInput
                                    id="vault-profile-name"
                                    label="Name"
                                    placeholder="Enter the vault profile name"
                                    value={field.value}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    error={getFieldErrorMessage(fieldState)}
                                    required
                                />
                            )}
                        />

                        <Controller
                            name="vaultUuid"
                            control={control}
                            rules={buildValidationRules([validateRequired()])}
                            render={({ field, fieldState }) => (
                                <Select
                                    id="vault-profile-vault"
                                    label="Vault"
                                    placeholder="Select vault"
                                    options={optionsForVaults}
                                    value={field.value || ''}
                                    onChange={field.onChange}
                                    error={getFieldErrorMessage(fieldState)}
                                    required
                                />
                            )}
                        />

                        <Controller
                            name="description"
                            control={control}
                            render={({ field }) => (
                                <TextArea
                                    id="vault-profile-description"
                                    label="Description"
                                    placeholder="Describe the vault profile"
                                    value={field.value}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                />
                            )}
                        />

                        <TabLayout tabs={attributeTabs} />

                        <Container className="flex-row justify-end modal-footer" gap={4}>
                            <Button variant="outline" onClick={handleCancel} type="button">
                                Cancel
                            </Button>
                            <ProgressButton
                                inProgress={isSubmitting || isCreating}
                                disabled={!isDirty || !isValid || isSubmitting || isCreating}
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
