import AttributeEditor from 'components/Attributes/AttributeEditor';
import ProgressButton from 'components/ProgressButton';
import Widget from 'components/Widget';
import TextInput from 'components/TextInput';

import { actions, selectors } from 'ducks/certificateGroups';
import { actions as customAttributesActions, selectors as customAttributesSelectors } from 'ducks/customAttributes';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';

import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';
import Button from 'components/Button';
import Container from 'components/Container';
import type { CertificateGroupResponseModel } from 'types/certificateGroups';
import { Resource } from 'types/openapi';
import { collectFormAttributes } from 'utils/attributes/attributes';
import { validateAlphaNumericWithSpecialChars, validateEmail, validateLength, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import TabLayout from '../../../Layout/TabLayout';

type GroupFormProps = Readonly<{
    groupId?: string;
    onCancel?: () => void;
    onSuccess?: () => void;
}>;

interface FormValues {
    name: string;
    description: string;
    email: string;
}

export default function GroupForm({ groupId, onCancel, onSuccess }: GroupFormProps) {
    const dispatch = useDispatch();

    const { id: routeId } = useParams();
    const id = groupId || routeId;

    const editMode = useMemo(() => !!id, [id]);

    const groupSelector = useSelector(selectors.certificateGroup);
    const resourceCustomAttributes = useSelector(customAttributesSelectors.resourceCustomAttributes);
    const isFetchingResourceCustomAttributes = useSelector(customAttributesSelectors.isFetchingResourceCustomAttributes);
    const isFetchingDetail = useSelector(selectors.isFetchingDetail);
    const isCreating = useSelector(selectors.isCreating);
    const isUpdating = useSelector(selectors.isUpdating);
    const createGroupSucceeded = useSelector(selectors.createGroupSucceeded);
    const updateGroupSucceeded = useSelector(selectors.updateGroupSucceeded);

    const [group, setGroup] = useState<CertificateGroupResponseModel>();

    const isBusy = useMemo(
        () => isFetchingDetail || isCreating || isUpdating || isFetchingResourceCustomAttributes,
        [isCreating, isFetchingDetail, isUpdating, isFetchingResourceCustomAttributes],
    );

    const onSubmit = useCallback(
        (values: FormValues) => {
            if (editMode) {
                dispatch(
                    actions.updateGroup({
                        groupUuid: id!,
                        editGroupRequest: {
                            name: values.name,
                            description: values.description,
                            email: values.email,
                            customAttributes: collectFormAttributes('customGroup', resourceCustomAttributes, values),
                        },
                    }),
                );
            } else {
                dispatch(
                    actions.createGroup({
                        name: values.name,
                        description: values.description,
                        email: values.email,
                        customAttributes: collectFormAttributes('customGroup', resourceCustomAttributes, values),
                    }),
                );
            }
        },
        [dispatch, editMode, id, resourceCustomAttributes],
    );

    useEffect(() => {
        dispatch(customAttributesActions.listResourceCustomAttributes(Resource.Groups));
    }, [dispatch]);

    const previousIdRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (editMode && id) {
            // Fetch if id changed or if we don't have the correct group loaded
            if (previousIdRef.current !== id || groupSelector?.uuid !== id) {
                dispatch(actions.getGroupDetail({ uuid: id }));
                previousIdRef.current = id;
            }
        } else {
            previousIdRef.current = undefined;
        }
    }, [dispatch, editMode, id, groupSelector]);

    useEffect(() => {
        if (editMode && groupSelector?.uuid === id) {
            setGroup(groupSelector);
        }
    }, [dispatch, editMode, group?.uuid, groupSelector, id]);

    const defaultValues: FormValues = useMemo(
        () => ({
            name: editMode ? group?.name || '' : '',
            description: editMode ? group?.description || '' : '',
            email: editMode ? group?.email || '' : '',
        }),
        [editMode, group],
    );

    const methods = useForm<FormValues>({
        defaultValues,
        mode: 'onChange',
    });

    const {
        handleSubmit,
        control,
        formState: { isDirty, isSubmitting, isValid },
        reset,
    } = methods;

    const title = useMemo(() => (editMode ? 'Edit Group' : 'Add Group'), [editMode]);
    const renderCustomAttributesEditor = useMemo(() => {
        if (isBusy) return <></>;
        return (
            <TabLayout
                noBorder
                tabs={[
                    {
                        title: 'Custom Attributes',
                        content: (
                            <AttributeEditor
                                id="customGroup"
                                attributeDescriptors={resourceCustomAttributes}
                                attributes={group?.customAttributes}
                            />
                        ),
                    },
                ]}
            />
        );
    }, [resourceCustomAttributes, group, isBusy]);

    // Reset form values when group is loaded in edit mode
    useEffect(() => {
        if (editMode && id && group?.uuid === id && !isFetchingDetail) {
            const newDefaultValues: FormValues = {
                name: group.name || '',
                description: group.description || '',
                email: group.email || '',
            };
            reset(newDefaultValues, { keepDefaultValues: false });
        } else if (!editMode) {
            // Reset form when switching to create mode
            reset({
                name: '',
                description: '',
                email: '',
            });
        }
    }, [editMode, group, id, reset, isFetchingDetail]);

    useRunOnSuccessfulFinish(isCreating, createGroupSucceeded, onSuccess);
    useRunOnSuccessfulFinish(isUpdating, updateGroupSucceeded, onSuccess);

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
                                    value={field.value}
                                    onChange={(value) => field.onChange(value)}
                                    onBlur={field.onBlur}
                                    id="name"
                                    type="text"
                                    placeholder="Group Name"
                                    disabled={editMode}
                                    label="Group Name"
                                    required
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
                                    value={field.value}
                                    onChange={(value) => field.onChange(value)}
                                    onBlur={field.onBlur}
                                    id="description"
                                    type="text"
                                    placeholder="Group Description"
                                    label="Group Description"
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
                                    value={field.value}
                                    onChange={(value) => field.onChange(value)}
                                    onBlur={field.onBlur}
                                    id="email"
                                    type="email"
                                    placeholder="Group E-mail"
                                    label="Group E-mail"
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                />
                            )}
                        />

                        {renderCustomAttributesEditor}

                        <Container className="flex-row justify-end modal-footer" gap={4}>
                            <Button variant="outline" onClick={onCancel} disabled={isSubmitting} type="button">
                                Cancel
                            </Button>
                            <ProgressButton
                                title={editMode ? 'Update' : 'Create'}
                                inProgressTitle={editMode ? 'Updating...' : 'Creating...'}
                                inProgress={isSubmitting}
                                disabled={!isDirty || isSubmitting || !isValid}
                                type="submit"
                            />
                        </Container>
                    </div>
                </Widget>
            </form>
        </FormProvider>
    );
}
