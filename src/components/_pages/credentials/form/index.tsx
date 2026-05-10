import AttributeEditor from 'components/Attributes/AttributeEditor';
import ProgressButton from 'components/ProgressButton';
import Widget from 'components/Widget';
import { actions as connectorActions, actions as connectorsActions } from 'ducks/connectors';

import { actions, selectors } from 'ducks/credentials';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';

import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';

import Select from 'components/Select';
import Button from 'components/Button';
import Container from 'components/Container';
import TextInput from 'components/TextInput';
import type { AttributeDescriptorModel } from 'types/attributes';
import type { ConnectorResponseModel } from 'types/connectors';
import type { CredentialResponseModel } from 'types/credentials';

import { collectFormAttributes } from 'utils/attributes/attributes';

import { validateAlphaNumericWithSpecialChars, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import { actions as customAttributesActions, selectors as customAttributesSelectors } from '../../../../ducks/customAttributes';
import { actions as userInterfaceActions } from '../../../../ducks/user-interface';
import { FunctionGroupCode, Resource } from '../../../../types/openapi';
import TabLayout from '../../../Layout/TabLayout';

type CredentialFormProps = Readonly<{
    credentialId?: string;
    onCancel?: () => void;
    onSuccess?: () => void;
    usesGlobalModal?: boolean;
}>;

interface FormValues {
    name: string;
    credentialProvider: string;
    storeKind: string;
}

export default function CredentialForm({ credentialId, onCancel, onSuccess, usesGlobalModal = false }: CredentialFormProps) {
    const dispatch = useDispatch();

    const { id: routeId } = useParams();
    const id = credentialId || routeId;

    const editMode = useMemo(() => !!id, [id]);

    const credentialSelector = useSelector(selectors.credential);
    const credentialProviders = useSelector(selectors.credentialProviders);
    const credentialProviderAttributeDescriptors = useSelector(selectors.credentialProviderAttributeDescriptors);
    const resourceCustomAttributes = useSelector(customAttributesSelectors.resourceCustomAttributes);
    const isFetchingResourceCustomAttributes = useSelector(customAttributesSelectors.isFetchingResourceCustomAttributes);

    const isFetchingCredentialDetail = useSelector(selectors.isFetchingDetail);
    const isFetchingCredentialProviders = useSelector(selectors.isFetchingCredentialProviders);
    const isFetchingAttributeDescriptors = useSelector(selectors.isFetchingCredentialProviderAttributeDescriptors);
    const isCreating = useSelector(selectors.isCreating);
    const isUpdating = useSelector(selectors.isUpdating);
    const createCredentialSucceeded = useSelector(selectors.createCredentialSucceeded);
    const updateCredentialSucceeded = useSelector(selectors.updateCredentialSucceeded);

    const [groupAttributesCallbackAttributes, setGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);
    const [attributeValuesMap] = useState<Record<string, Record<string, any>>>({});

    const [credential, setCredential] = useState<CredentialResponseModel>();
    const [credentialProvider, setCredentialProvider] = useState<ConnectorResponseModel>();

    const isBusy = useMemo(
        () =>
            isFetchingCredentialDetail ||
            isFetchingCredentialProviders ||
            isCreating ||
            isUpdating ||
            isFetchingAttributeDescriptors ||
            isFetchingResourceCustomAttributes,
        [
            isFetchingCredentialDetail,
            isFetchingCredentialProviders,
            isCreating,
            isUpdating,
            isFetchingAttributeDescriptors,
            isFetchingResourceCustomAttributes,
        ],
    );

    const previousIdRef = useRef<string | undefined>(undefined);
    const fetchedDescriptorsKeyRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (editMode && id) {
            // Fetch if id changed or if we don't have the correct credential loaded
            if (previousIdRef.current !== id || credentialSelector?.uuid !== id) {
                dispatch(actions.getCredentialDetail({ uuid: id }));
                previousIdRef.current = id;
            }
        } else {
            previousIdRef.current = undefined;
        }
    }, [dispatch, editMode, id, credentialSelector]);

    useEffect(() => {
        dispatch(actions.listCredentialProviders());
        dispatch(connectorsActions.clearCallbackData());
        dispatch(customAttributesActions.listResourceCustomAttributes(Resource.Credentials));
    }, [dispatch]);

    useEffect(() => {
        if (editMode && id === credentialSelector?.uuid) {
            setCredential(credentialSelector);
        }
    }, [editMode, id, credentialSelector]);

    useEffect(() => {
        if (editMode && credentialProviders && credentialProviders.length > 0 && credential?.uuid === id) {
            if (!credential?.connectorUuid) return;
            const provider = credentialProviders.find((p) => p.uuid === credential.connectorUuid);
            if (!provider) return;

            setCredentialProvider(provider);

            dispatch(
                actions.getCredentialProviderAttributesDescriptors({
                    uuid: credential.connectorUuid,
                    kind: credential.kind,
                }),
            );
        }
    }, [credential, credentialProviders, dispatch, editMode, id]);

    const onCredentialProviderChange = useCallback(
        (value: string) => {
            if (!value || !credentialProviders) return;
            dispatch(connectorActions.clearCallbackData());
            setGroupAttributesCallbackAttributes([]);
            const provider = credentialProviders.find((p) => p.uuid === value);

            if (!provider) return;
            setCredentialProvider(provider);
        },
        [credentialProviders, dispatch],
    );

    const combinedAttributeValues = useMemo(
        () =>
            Object.values(attributeValuesMap).reduce<Record<string, any>>((acc, current) => {
                return { ...acc, ...current };
            }, {}),
        [attributeValuesMap],
    );

    const onSubmit = useCallback(
        (values: FormValues) => {
            const combinedValues = { ...values, ...combinedAttributeValues };

            if (editMode) {
                dispatch(
                    actions.updateCredential({
                        uuid: id!,
                        credentialRequest: {
                            attributes: collectFormAttributes(
                                'credential',
                                [...(credentialProviderAttributeDescriptors ?? []), ...groupAttributesCallbackAttributes],
                                combinedValues,
                            ),
                            customAttributes: collectFormAttributes('customCredential', resourceCustomAttributes, combinedValues),
                        },
                    }),
                );
            } else {
                dispatch(
                    actions.createCredential({
                        usesGlobalModal,
                        credentialRequest: {
                            name: values.name,
                            connectorUuid: values.credentialProvider,
                            kind: values.storeKind,
                            attributes: collectFormAttributes(
                                'credential',
                                [...(credentialProviderAttributeDescriptors ?? []), ...groupAttributesCallbackAttributes],
                                combinedValues,
                            ),
                            customAttributes: collectFormAttributes('customCredential', resourceCustomAttributes, combinedValues),
                        },
                    }),
                );
            }
        },
        [
            editMode,
            dispatch,
            id,
            credentialProviderAttributeDescriptors,
            groupAttributesCallbackAttributes,
            resourceCustomAttributes,
            usesGlobalModal,
            combinedAttributeValues,
        ],
    );

    const handleCancel = useCallback(() => {
        if (onCancel) {
            onCancel();
        } else if (usesGlobalModal) {
            dispatch(userInterfaceActions.hideGlobalModal());
        }
    }, [onCancel, usesGlobalModal, dispatch]);

    const submitTitle = useMemo(() => (editMode ? 'Save' : 'Create'), [editMode]);

    const inProgressTitle = useMemo(() => (editMode ? 'Saving...' : 'Creating...'), [editMode]);

    const optionsForCredentialProviders = useMemo(
        () =>
            credentialProviders?.map((provider) => ({
                label: provider.name,
                value: provider.uuid,
            })),
        [credentialProviders],
    );

    const optionsForKinds = useMemo(
        () =>
            credentialProvider?.functionGroups
                .find((fg) => fg.functionGroupCode === FunctionGroupCode.CredentialProvider)
                ?.kinds.map((kind) => ({
                    label: kind,
                    value: kind,
                })) ?? [],
        [credentialProvider],
    );

    const defaultValues: FormValues = useMemo(
        () => ({
            name: editMode ? credential?.name || '' : '',
            credentialProvider: editMode ? credential?.connectorUuid || '' : '',
            storeKind: editMode ? credential?.kind || '' : '',
        }),
        [editMode, credential],
    );

    const methods = useForm<FormValues>({
        defaultValues,
        mode: 'onChange',
    });

    const {
        handleSubmit,
        control,
        formState: { isSubmitting, isValid, isDirty },
        reset,
    } = methods;

    const watchedStoreKind = useWatch({
        control,
        name: 'storeKind',
    });

    const watchedCredentialProvider = useWatch({
        control,
        name: 'credentialProvider',
    });

    useEffect(() => {
        if (watchedCredentialProvider && !editMode) {
            onCredentialProviderChange(watchedCredentialProvider);
        }
    }, [watchedCredentialProvider, onCredentialProviderChange, editMode]);

    useEffect(() => {
        if (watchedStoreKind && watchedCredentialProvider && !editMode && credentialProviders) {
            const provider = credentialProviders.find((p) => p.uuid === watchedCredentialProvider);
            if (provider) {
                const key = `${provider.uuid}-${watchedStoreKind}`;
                if (fetchedDescriptorsKeyRef.current !== key) {
                    dispatch(connectorActions.clearCallbackData());
                    setGroupAttributesCallbackAttributes([]);
                    dispatch(actions.getCredentialProviderAttributesDescriptors({ uuid: provider.uuid, kind: watchedStoreKind }));
                    fetchedDescriptorsKeyRef.current = key;
                }
            }
        }
    }, [watchedStoreKind, watchedCredentialProvider, credentialProviders, dispatch, editMode]);

    // Reset form values when credential is loaded in edit mode
    useEffect(() => {
        if (editMode && id && credential?.uuid === id && !isFetchingCredentialDetail) {
            const newDefaultValues: FormValues = {
                name: credential.name || '',
                credentialProvider: credential.connectorUuid || '',
                storeKind: credential.kind || '',
            };
            reset(newDefaultValues, { keepDefaultValues: false });
        } else if (!editMode) {
            // Reset form when switching to create mode
            reset({
                name: '',
                credentialProvider: '',
                storeKind: '',
            });
        }
    }, [editMode, credential, id, reset, isFetchingCredentialDetail]);

    const renderCustomAttributesEditor = useCallback(() => {
        if (isBusy) return <></>;
        return (
            <AttributeEditor
                id="customCredential"
                attributeDescriptors={resourceCustomAttributes}
                attributes={credential?.customAttributes}
            />
        );
    }, [resourceCustomAttributes, credential, isBusy]);

    useRunOnSuccessfulFinish(isCreating, createCredentialSucceeded, onSuccess);
    useRunOnSuccessfulFinish(isUpdating, updateCredentialSucceeded, onSuccess);

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Widget noBorder busy={isBusy}>
                    <div className="space-y-4">
                        <Controller
                            name="name"
                            control={control}
                            rules={buildValidationRules([validateRequired(), validateAlphaNumericWithSpecialChars()])}
                            render={({ field, fieldState }) => (
                                <TextInput
                                    {...field}
                                    id="name"
                                    type="text"
                                    label="Credential Name"
                                    required
                                    placeholder="Enter the Credential Name"
                                    disabled={editMode}
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                />
                            )}
                        />

                        {editMode ? (
                            <TextInput
                                id="credentialProvider"
                                type="text"
                                label="Credential Provider"
                                value={credential?.connectorName || ''}
                                disabled={true}
                                onChange={() => {}}
                            />
                        ) : (
                            <div>
                                <Controller
                                    name="credentialProvider"
                                    control={control}
                                    rules={buildValidationRules([validateRequired()])}
                                    render={({ field, fieldState }) => (
                                        <>
                                            <Select
                                                id="credentialProviderSelect"
                                                label="Credential Provider"
                                                value={field.value || ''}
                                                onChange={(value) => {
                                                    field.onChange(value);
                                                    onCredentialProviderChange(value as string);
                                                }}
                                                options={optionsForCredentialProviders || []}
                                                placeholder="Select Credential Provider"
                                                placement="bottom"
                                            />
                                            {fieldState.error && fieldState.isTouched && (
                                                <p className="mt-1 text-sm text-red-600">
                                                    {typeof fieldState.error === 'string'
                                                        ? fieldState.error
                                                        : fieldState.error?.message || 'Invalid value'}
                                                </p>
                                            )}
                                        </>
                                    )}
                                />
                            </div>
                        )}

                        {!editMode && optionsForKinds?.length ? (
                            <div>
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
                                                    field.onChange(value);
                                                    // onKindChange will be triggered by useEffect when credentialProvider is set
                                                }}
                                                options={optionsForKinds || []}
                                                placeholder="Select Kind"
                                                placement="bottom"
                                            />
                                            {fieldState.error && fieldState.isTouched && (
                                                <p className="mt-1 text-sm text-red-600">Required Field</p>
                                            )}
                                        </>
                                    )}
                                />
                            </div>
                        ) : null}

                        {editMode && credential?.kind ? (
                            <TextInput
                                id="storeKind"
                                type="text"
                                label="Kind"
                                value={credential.kind}
                                disabled={true}
                                onChange={() => {}}
                            />
                        ) : null}

                        <TabLayout
                            noBorder
                            onlyActiveTabContent={false}
                            tabs={[
                                {
                                    title: 'Connector Attributes',
                                    content:
                                        credentialProvider &&
                                        watchedStoreKind &&
                                        credentialProviderAttributeDescriptors &&
                                        credentialProviderAttributeDescriptors.length > 0 ? (
                                            <AttributeEditor
                                                id="credential"
                                                attributeDescriptors={credentialProviderAttributeDescriptors}
                                                attributes={credential?.attributes}
                                                groupAttributesCallbackAttributes={groupAttributesCallbackAttributes}
                                                setGroupAttributesCallbackAttributes={setGroupAttributesCallbackAttributes}
                                            />
                                        ) : (
                                            <></>
                                        ),
                                },
                                {
                                    title: 'Custom Attributes',
                                    content: renderCustomAttributesEditor(),
                                },
                            ]}
                        />

                        <Container className="flex-row justify-end modal-footer" gap={4}>
                            <Button variant="outline" onClick={handleCancel} disabled={isSubmitting} type="button">
                                Cancel
                            </Button>
                            <ProgressButton
                                title={submitTitle}
                                inProgressTitle={inProgressTitle}
                                inProgress={isSubmitting}
                                disabled={(editMode ? !isDirty : false) || !isValid}
                                type="submit"
                            />
                        </Container>
                    </div>
                </Widget>
            </form>
        </FormProvider>
    );
}
