import ProgressButton from 'components/ProgressButton';

import Widget from 'components/Widget';

import { actions as rolesActions, selectors as rolesSelectors } from 'ducks/roles';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';

import Button from 'components/Button';
import Container from 'components/Container';
import { validateAlphaNumericWithSpecialChars, validateEmail, validateLength, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import { actions as customAttributesActions, selectors as customAttributesSelectors } from '../../../../ducks/customAttributes';
import { Resource } from '../../../../types/openapi';
import { collectFormAttributes } from '../../../../utils/attributes/attributes';
import AttributeEditor from '../../../Attributes/AttributeEditor';
import TabLayout from '../../../Layout/TabLayout';
import TextInput from 'components/TextInput';

type RoleFormProps = Readonly<{
    roleId?: string;
    onCancel: () => void;
    onSuccess?: () => void;
}>;

interface FormValues {
    name: string;
    description: string;
    email: string;
}

function RoleForm({ roleId, onCancel, onSuccess }: RoleFormProps) {
    const dispatch = useDispatch();

    const { id } = useParams();

    const editMode = useMemo(() => !!id, [id]);

    const roleSelector = useSelector(rolesSelectors.role);
    const isFetchingRoleDetail = useSelector(rolesSelectors.isFetchingDetail);
    const resourceCustomAttributes = useSelector(customAttributesSelectors.resourceCustomAttributes);
    const isFetchingResourceCustomAttributes = useSelector(customAttributesSelectors.isFetchingResourceCustomAttributes);

    const isBusy = useMemo(
        () => isFetchingRoleDetail || isFetchingResourceCustomAttributes,
        [isFetchingRoleDetail, isFetchingResourceCustomAttributes],
    );

    const previousIdRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        dispatch(customAttributesActions.listResourceCustomAttributes(Resource.Roles));
    }, [dispatch]);

    useEffect(() => {
        if (editMode && id) {
            dispatch(rolesActions.getDetail({ uuid: id }));
        }
    }, [dispatch, editMode, id]);

    const defaultValues: FormValues = useMemo(
        () => ({
            name: editMode ? roleSelector?.name || '' : '',
            description: editMode ? roleSelector?.description || '' : '',
            email: editMode ? roleSelector?.email || '' : '',
        }),
        [editMode, roleSelector],
    );

    const methods = useForm<FormValues>({
        defaultValues,
        mode: 'onChange',
    });

    const {
        handleSubmit,
        control,
        formState: { isDirty, isSubmitting },
        reset,
    } = methods;

    // Reset form values when roleSelector is loaded in edit mode
    useEffect(() => {
        if (editMode && id) {
            if (roleSelector?.uuid === id && !isFetchingRoleDetail) {
                const newDefaultValues: FormValues = {
                    name: roleSelector.name || '',
                    description: roleSelector.description || '',
                    email: roleSelector.email || '',
                };
                reset(newDefaultValues, { keepDefaultValues: false });
            } else if (previousIdRef.current !== id && previousIdRef.current !== undefined) {
                // Reset form when id changes (switching between roles)
                reset({
                    name: '',
                    description: '',
                    email: '',
                });
            }
        } else if (!editMode) {
            // Reset form when switching to create mode
            reset({
                name: '',
                description: '',
                email: '',
            });
        }
    }, [editMode, roleSelector, id, reset, isFetchingRoleDetail]);

    const onSubmit = useCallback(
        (values: FormValues) => {
            if (editMode) {
                dispatch(
                    rolesActions.update({
                        uuid: id!,
                        roleRequest: {
                            name: values.name,
                            description: values.description,
                            email: values.email ? values.email : undefined,
                            customAttributes: collectFormAttributes('customRole', resourceCustomAttributes, values),
                        },
                    }),
                );
            } else {
                dispatch(
                    rolesActions.create({
                        name: values.name,
                        description: values.description,
                        email: values.email ? values.email : undefined,
                        customAttributes: collectFormAttributes('customRole', resourceCustomAttributes, values),
                    }),
                );
            }
        },

        [dispatch, editMode, id, resourceCustomAttributes],
    );

    const submitTitle = useMemo(() => (editMode ? 'Save' : 'Create'), [editMode]);

    const inProgressTitle = useMemo(() => (editMode ? 'Saving...' : 'Creating...'), [editMode]);

    const renderCustomAttributesEditor = useMemo(() => {
        if (isBusy) return <></>;
        return (
            <AttributeEditor id="customRole" attributeDescriptors={resourceCustomAttributes} attributes={roleSelector?.customAttributes} />
        );
    }, [roleSelector, resourceCustomAttributes, isBusy]);

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <Widget busy={isBusy} noBorder>
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
                                    label="Role Name"
                                    required
                                    placeholder="Enter name of the role"
                                    disabled={editMode || roleSelector?.systemRole}
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                />
                            )}
                        />

                        <Controller
                            name="description"
                            control={control}
                            rules={buildValidationRules([validateLength(0, 300)])}
                            render={({ field, fieldState }) => (
                                <TextInput
                                    {...field}
                                    id="description"
                                    type="text"
                                    label="Description"
                                    placeholder="Enter description of the role"
                                    disabled={roleSelector?.systemRole}
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                />
                            )}
                        />

                        <Controller
                            name="email"
                            control={control}
                            rules={buildValidationRules([validateEmail()])}
                            render={({ field, fieldState }) => (
                                <TextInput
                                    {...field}
                                    id="email"
                                    type="email"
                                    label="E-mail"
                                    placeholder="Enter e-mail of the role"
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                />
                            )}
                        />

                        <TabLayout
                            noBorder
                            tabs={[
                                {
                                    title: 'Custom Attributes',
                                    content: renderCustomAttributesEditor,
                                },
                            ]}
                        />
                        <Container className="flex-row justify-end modal-footer" gap={4}>
                            <Button variant="outline" onClick={onCancel} disabled={isSubmitting} type="button">
                                Cancel
                            </Button>
                            <ProgressButton
                                title={submitTitle}
                                inProgressTitle={inProgressTitle}
                                inProgress={isSubmitting}
                                disabled={!isDirty || isSubmitting || roleSelector?.systemRole}
                                type="submit"
                            />
                        </Container>
                    </div>
                </Widget>
            </form>
        </FormProvider>
    );
}

export default RoleForm;
