import ProgressButton from 'components/ProgressButton';
import Widget from 'components/Widget';
import { actions, selectors } from 'ducks/notification-profiles';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { actions as groupAction, selectors as groupSelectors } from 'ducks/certificateGroups';
import { actions as rolesActions, selectors as rolesSelectors } from 'ducks/roles';
import { actions as userAction, selectors as userSelectors } from 'ducks/users';
import { actions as notificationsActions, selectors as notificationsSelectors } from 'ducks/notifications';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Controller, FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';
import Select from 'components/Select';
import Button from 'components/Button';
import Container from 'components/Container';
import Switch from 'components/Switch';
import { useAreDefaultValuesSame } from 'utils/common-hooks';
import Label from 'components/Label';
import {
    validateAlphaNumericWithSpecialChars,
    validatePositiveInteger,
    validateRequired,
    validateNonZeroInteger,
    validateDuration,
} from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import { PlatformEnum, RecipientType } from 'types/openapi';
import type { NotificationProfileUpdateRequestModel } from 'types/notification-profiles';
import { LockWidgetNameEnum } from 'types/user-interface';
import { getInputStringFromIso8601String, getIso8601StringFromInputString } from 'utils/duration';
import TextInput from 'components/TextInput';
import TextArea from 'components/TextArea';

type NotificationProfileFormProps = Readonly<{
    notificationProfileId?: string;
    version?: string;
    onCancel?: () => void;
    onSuccess?: () => void;
}>;

interface FormValues {
    name: string;
    recipients: { value: string; label: string }[];
    recipientType: string;
    internalNotification: boolean;
    description: string;
    frequency: string;
    repetitions: string;
    notificationInstance: string;
}

export default function NotificationProfileForm({
    notificationProfileId,
    version: propVersion,
    onCancel,
    onSuccess,
}: NotificationProfileFormProps) {
    const { id: routeId, version: routeVersion } = useParams();
    const id = notificationProfileId || routeId;
    const version = propVersion || routeVersion;
    const editMode = id !== undefined && version !== undefined;

    const dispatch = useDispatch();

    const isFetchingDetail = useSelector(selectors.isFetchingDetail);
    const isUpdating = useSelector(selectors.isUpdating);
    const isCreating = useSelector(selectors.isCreating);

    const notificationProfile = useSelector(selectors.notificationProfile);

    const notificationInstances = useSelector(notificationsSelectors.notificationInstances);
    const isFetchingNotificationInstances = useSelector(notificationsSelectors.isFetchingNotificationInstances);

    const isBusy = useMemo(
        () => isFetchingDetail || isFetchingNotificationInstances || isUpdating || isCreating,
        [isFetchingDetail, isFetchingNotificationInstances, isUpdating, isCreating],
    );

    useEffect(() => {
        dispatch(userAction.list());
        dispatch(groupAction.listGroups());
        dispatch(rolesActions.list());
        dispatch(notificationsActions.listNotificationInstances());
    }, [dispatch]);

    const previousIdRef = useRef<string | undefined>(undefined);
    const previousVersionRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (editMode && id && version) {
            // Fetch if id or version changed or if we don't have the correct profile loaded
            if (
                previousIdRef.current !== id ||
                previousVersionRef.current !== version ||
                notificationProfile?.uuid !== id ||
                notificationProfile?.version !== Number(version)
            ) {
                dispatch(actions.resetState());
                dispatch(actions.getNotificationProfileDetail({ uuid: id, version: Number(version) }));
                previousIdRef.current = id;
                previousVersionRef.current = version;
            }
        } else {
            previousIdRef.current = undefined;
            previousVersionRef.current = undefined;
        }
    }, [dispatch, editMode, id, version, notificationProfile]);

    const defaultValues: FormValues = useMemo(() => {
        if (editMode && notificationProfile) {
            return {
                name: notificationProfile.name || '',
                recipientType: notificationProfile.recipientType || RecipientType.None,
                recipients:
                    notificationProfile.recipients?.map((recipient) => ({
                        label: recipient.name,
                        value: recipient.uuid,
                    })) || [],
                internalNotification: notificationProfile.internalNotification || false,
                description: notificationProfile.description || '',
                frequency: notificationProfile.frequency ? getInputStringFromIso8601String(notificationProfile.frequency) : '',
                repetitions: notificationProfile.repetitions?.toString() || '',
                notificationInstance: notificationProfile.notificationInstance?.uuid || '',
            };
        } else {
            return {
                name: '',
                recipientType: RecipientType.None,
                recipients: [],
                internalNotification: false,
                description: '',
                frequency: '',
                repetitions: '',
                notificationInstance: '',
            };
        }
    }, [editMode, notificationProfile]);

    const methods = useForm<FormValues>({
        defaultValues,
        mode: 'onChange',
    });

    const {
        handleSubmit,
        control,
        formState: { isSubmitting },
    } = methods;

    const formValues = useWatch({ control });

    const onSubmit = useCallback(
        (values: FormValues) => {
            const recipients = {
                recipientType: (values.recipientType as RecipientType) ?? RecipientType.None,
            };
            switch (values.recipientType) {
                case RecipientType.User:
                case RecipientType.Group:
                case RecipientType.Role:
                    Object.assign(recipients, { recipientUuids: values.recipients.map((recipient) => recipient.value) });
                    break;
            }
            const updateNotificationProfileRequest: NotificationProfileUpdateRequestModel = {
                description: values.description,
                frequency: values.frequency ? getIso8601StringFromInputString(values.frequency) : undefined,
                repetitions: values.repetitions ? Number.parseInt(values.repetitions, 10) : undefined,
                internalNotification: values.internalNotification ?? false,
                notificationInstanceUuid: values.notificationInstance,
                ...recipients,
            };

            if (editMode) {
                dispatch(
                    actions.updateNotificationProfile({
                        uuid: id,
                        notificationProfileEditRequest: updateNotificationProfileRequest,
                    }),
                );
            } else {
                dispatch(
                    actions.createNotificationProfile({
                        notificationProfileAddRequest: {
                            name: values.name ?? '',
                            ...updateNotificationProfileRequest,
                        },
                    }),
                );
            }
        },
        [dispatch, id, editMode],
    );

    const areDefaultValuesSame = useAreDefaultValuesSame(defaultValues as unknown as Record<string, unknown>);

    const notificationInstanceOptions = useMemo(
        () =>
            notificationInstances.map((instance) => ({
                label: instance.name,
                value: instance.uuid,
            })),
        [notificationInstances],
    );

    const type = formValues.recipientType;
    const isNotificationInstanceRequired =
        type === RecipientType.Default ||
        type === RecipientType.None ||
        ((type === RecipientType.User || type === RecipientType.Role || type === RecipientType.Group) && !formValues.internalNotification);

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Widget busy={isBusy} widgetLockName={LockWidgetNameEnum.NotificationProfileDetails} noBorder>
                    <div className="space-y-4">
                        {!editMode && (
                            <Controller
                                name="name"
                                control={control}
                                rules={buildValidationRules([validateRequired(), validateAlphaNumericWithSpecialChars()])}
                                render={({ field, fieldState }) => (
                                    <TextInput
                                        {...field}
                                        id="name"
                                        type="text"
                                        label="Profile Name"
                                        required
                                        disabled={editMode}
                                        invalid={fieldState.error && fieldState.isTouched}
                                        error={getFieldErrorMessage(fieldState)}
                                    />
                                )}
                            />
                        )}

                        <Controller
                            name="description"
                            control={control}
                            render={({ field, fieldState }) => (
                                <TextArea
                                    {...field}
                                    id="description"
                                    label="Description"
                                    rows={3}
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                />
                            )}
                        />

                        <RecipientTypeFields />

                        <div>
                            <Controller
                                name="notificationInstance"
                                control={control}
                                rules={isNotificationInstanceRequired ? buildValidationRules([validateRequired()]) : {}}
                                render={({ field, fieldState }) => (
                                    <>
                                        <Select
                                            id="notificationInstance"
                                            label="Notification Instance"
                                            required
                                            value={field.value || ''}
                                            onChange={(value) => {
                                                field.onChange(value);
                                            }}
                                            options={notificationInstanceOptions}
                                            placeholder="Select Notification Instance"
                                            isClearable
                                            placement="bottom"
                                        />
                                        {fieldState.error && fieldState.isTouched && (
                                            <p className="mt-1 text-sm text-red-600">
                                                Notification Instance is required if Recipient Type is Default or None, or if the send
                                                internal notifications is false
                                            </p>
                                        )}
                                    </>
                                )}
                            />
                        </div>

                        <Controller
                            name="internalNotification"
                            control={control}
                            render={({ field }) => (
                                <Switch
                                    id="internalNotification"
                                    checked={field.value}
                                    onChange={field.onChange}
                                    label="Send internal notifications"
                                    disabled={type === RecipientType.Default || type === RecipientType.None}
                                />
                            )}
                        />

                        <Controller
                            name="frequency"
                            control={control}
                            rules={buildValidationRules([validateDuration(['d', 'h'])])}
                            render={({ field, fieldState }) => (
                                <>
                                    <TextInput
                                        {...field}
                                        id="frequency"
                                        type="text"
                                        label="Frequency"
                                        placeholder="ex: 5d 4h"
                                        invalid={fieldState.error && fieldState.isTouched}
                                        error={getFieldErrorMessage(fieldState)}
                                    />
                                    {!fieldState.error && <p className="mt-1 text-sm text-gray-500">Enter duration in format: 0d 0h</p>}
                                </>
                            )}
                        />

                        <div>
                            <p className="text-sm text-gray-500 mb-2">Maximum number of repetitions of the same notification</p>
                            <Controller
                                name="repetitions"
                                control={control}
                                rules={buildValidationRules([validatePositiveInteger(), validateNonZeroInteger()])}
                                render={({ field, fieldState }) => (
                                    <TextInput
                                        {...field}
                                        id="repetitions"
                                        type="number"
                                        label="Repetitions"
                                        invalid={fieldState.error && fieldState.isTouched}
                                        error={getFieldErrorMessage(fieldState)}
                                    />
                                )}
                            />
                        </div>

                        <Container className="flex-row justify-end modal-footer" gap={4}>
                            <Button variant="outline" onClick={onCancel} disabled={isSubmitting} type="button">
                                Cancel
                            </Button>
                            <ProgressButton
                                title={editMode ? 'Save' : 'Create'}
                                inProgressTitle={editMode ? 'Saving...' : 'Creating...'}
                                inProgress={isSubmitting}
                                disabled={areDefaultValuesSame(formValues) || isBusy}
                                type="submit"
                            />
                        </Container>
                    </div>
                </Widget>
            </form>
        </FormProvider>
    );
}

function RecipientTypeFields() {
    const { control, setValue } = useFormContext<FormValues>();
    const recipientTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.RecipientType));

    const users = useSelector(userSelectors.users);
    const roles = useSelector(rolesSelectors.roles);
    const groups = useSelector(groupSelectors.certificateGroups);

    const watchedRecipientType = useWatch({
        control,
        name: 'recipientType',
    });

    const recipientTypeOptions = useMemo(
        () =>
            Object.values(RecipientType).map((el) => ({
                label: getEnumLabel(recipientTypeEnum, el),
                value: el,
            })),
        [recipientTypeEnum],
    );

    const renderRecipientField = useCallback(() => {
        let props: { options: { value: string; label: string }[]; description: string; placeholder: string } | null = null;
        switch (watchedRecipientType) {
            case RecipientType.User:
                props = {
                    options: users.map((user) => ({ label: user.username, value: user.uuid })),
                    description: 'Selected Users will be receiving the notifications.',
                    placeholder: 'Select Users',
                };
                break;
            case RecipientType.Group:
                props = {
                    options: groups.map((group) => ({ label: group.name, value: group.uuid })),
                    description: 'Users in the selected Groups will be receiving the notifications.',
                    placeholder: 'Select Groups',
                };
                break;
            case RecipientType.Role:
                props = {
                    options: roles.map((role) => ({ label: role.name, value: role.uuid })),
                    description: 'Users with the selected Roles will be receiving the notifications.',
                    placeholder: 'Select Roles',
                };
                break;
        }
        if (!props) return null;
        return (
            <div>
                <Label required>Notification Recipients</Label>
                <p className="text-sm text-gray-500 mb-2">{props.description}</p>
                <Controller
                    name="recipients"
                    control={control}
                    rules={buildValidationRules([validateRequired()])}
                    render={({ field, fieldState }) => (
                        <>
                            <Select
                                id="recipients"
                                isMulti
                                value={field.value || []}
                                onChange={(value) => {
                                    field.onChange(value);
                                }}
                                options={props.options}
                                placeholder={props.placeholder}
                                placement="bottom"
                            />
                            {fieldState.error && fieldState.isTouched && (
                                <p className="mt-1 text-sm text-red-600">At least one recipient is required</p>
                            )}
                        </>
                    )}
                />
            </div>
        );
    }, [watchedRecipientType, users, roles, groups, control]);

    return (
        <>
            <div>
                <Label htmlFor="recipientType" required>
                    Recipient Type
                </Label>
                <p className="text-sm text-gray-500 mb-2">Recipient type of notifications managed by profile.</p>
                <Controller
                    name="recipientType"
                    control={control}
                    rules={buildValidationRules([validateRequired()])}
                    render={({ field, fieldState }) => (
                        <>
                            <Select
                                id="recipientType"
                                value={field.value || ''}
                                onChange={(value) => {
                                    field.onChange(value);
                                    setValue('recipients', []);
                                    setValue('notificationInstance', '');
                                    switch (value) {
                                        case RecipientType.None:
                                        case RecipientType.Default:
                                            setValue('internalNotification', false);
                                            break;
                                    }
                                }}
                                options={recipientTypeOptions}
                                placeholder="Select Recipient Type"
                                placement="bottom"
                            />
                            {fieldState.error && fieldState.isTouched && (
                                <p className="mt-1 text-sm text-red-600">
                                    {typeof fieldState.error === 'string' ? fieldState.error : fieldState.error?.message || 'Invalid value'}
                                </p>
                            )}
                        </>
                    )}
                />
            </div>
            {renderRecipientField()}
        </>
    );
}
