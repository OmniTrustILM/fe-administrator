import ProgressButton from 'components/ProgressButton';

import Widget from 'components/Widget';

import { actions as profileApprovalActions, selectors as profileApprovalSelectors } from 'ducks/approval-profiles';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAreDefaultValuesSame, useRunOnSuccessfulFinish } from 'utils/common-hooks';

import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';
import Button from 'components/Button';
import Container from 'components/Container';
import TextInput from 'components/TextInput';
import type { ApprovalStepRequestModel, ProfileApprovalRequestModel } from 'types/approval-profiles';
import {
    validateAlphaNumericWithSpecialChars,
    validateLength,
    validateNonZeroInteger,
    validatePositiveInteger,
    validateRequired,
} from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import ApprovalStepField from './approval-step-field';

const defaultApprovalSteps: ApprovalStepRequestModel[] = [
    {
        order: 1,
    },
];

type ApprovalProfileFormProps = {
    approvalProfileId?: string;
    onCancel?: () => void;
    onSuccess?: () => void;
};

function ApprovalProfileForm({ approvalProfileId, onCancel, onSuccess }: Readonly<ApprovalProfileFormProps>) {
    const dispatch = useDispatch();

    const isCreating = useSelector(profileApprovalSelectors.isCreating);
    const isUpdating = useSelector(profileApprovalSelectors.isUpdating);
    const createApprovalProfileSucceeded = useSelector(profileApprovalSelectors.createApprovalProfileSucceeded);
    const updateApprovalProfileSucceeded = useSelector(profileApprovalSelectors.updateApprovalProfileSucceeded);
    const isFetchingDetail = useSelector(profileApprovalSelectors.isFetchingDetail);
    const isBusy = useMemo(() => isCreating || isUpdating || isFetchingDetail, [isCreating, isUpdating, isFetchingDetail]);

    const profileApprovalDetail = useSelector(profileApprovalSelectors.profileApprovalDetail);

    const { id: routeId } = useParams();
    const id = approvalProfileId || routeId;

    const editMode = useMemo(() => !!id, [id]);

    const previousIdRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (editMode && id) {
            // Fetch if id changed or if we don't have the correct profile loaded
            if (previousIdRef.current !== id || profileApprovalDetail?.uuid !== id) {
                dispatch(profileApprovalActions.getApprovalProfile({ uuid: id }));
                previousIdRef.current = id;
            }
        } else {
            previousIdRef.current = undefined;
        }
    }, [dispatch, id, editMode, profileApprovalDetail]);

    const defaultValues: ProfileApprovalRequestModel = useMemo(
        () =>
            editMode && profileApprovalDetail
                ? { ...profileApprovalDetail, enabled: false }
                : {
                      name: '',
                      enabled: false,
                      approvalSteps: defaultApprovalSteps,
                  },
        [profileApprovalDetail, editMode],
    );

    const areDefaultValuesSame = useAreDefaultValuesSame(defaultValues as unknown as Record<string, unknown>);

    const methods = useForm<ProfileApprovalRequestModel>({
        defaultValues,
        mode: 'onChange',
    });

    const {
        handleSubmit,
        control,
        formState: { isSubmitting, isValid },
        reset,
    } = methods;

    const formValues = useWatch({ control });

    const onSubmit = useCallback(
        (values: ProfileApprovalRequestModel) => {
            if (editMode) {
                if (!id) return;

                dispatch(profileApprovalActions.editApprovalProfile({ editProfileApproval: values, uuid: id }));
            } else {
                dispatch(profileApprovalActions.createApprovalProfile(values));
            }
        },
        [dispatch, editMode, id],
    );

    // Reset form values when profileApprovalDetail is loaded in edit mode
    useEffect(() => {
        if (editMode && id && profileApprovalDetail?.uuid === id && !isFetchingDetail) {
            const newDefaultValues: ProfileApprovalRequestModel = {
                ...profileApprovalDetail,
                enabled: false,
            };
            reset(newDefaultValues, { keepDefaultValues: false });
        } else if (!editMode) {
            // Reset form when switching to create mode
            reset({
                name: '',
                enabled: false,
                approvalSteps: defaultApprovalSteps,
                expiry: undefined,
                description: '',
            });
        }
    }, [editMode, profileApprovalDetail, id, reset, isFetchingDetail]);

    useRunOnSuccessfulFinish(isCreating, createApprovalProfileSucceeded, onSuccess);
    useRunOnSuccessfulFinish(isUpdating, updateApprovalProfileSucceeded, onSuccess);

    const handleCancel = useCallback(() => {
        onCancel?.();
    }, [onCancel]);

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Widget noBorder busy={isBusy}>
                    <div className="space-y-4">
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
                                        placeholder="Approval Profile Name"
                                        disabled={editMode}
                                        label="Profile Name"
                                        required
                                        invalid={fieldState.error && fieldState.isTouched}
                                        error={getFieldErrorMessage(fieldState)}
                                    />
                                )}
                            />

                            <Controller
                                name="expiry"
                                control={control}
                                rules={buildValidationRules([validateRequired(), validateNonZeroInteger(), validatePositiveInteger()])}
                                render={({ field, fieldState }) => (
                                    <TextInput
                                        value={field.value === undefined ? '' : field.value.toString()}
                                        onChange={(value) => field.onChange(value ? Number.parseInt(value, 10) : undefined)}
                                        onBlur={field.onBlur}
                                        id="expiry"
                                        type="number"
                                        placeholder="Expiry in hours"
                                        label="Expiry"
                                        required
                                        invalid={fieldState.error && fieldState.isTouched}
                                        error={getFieldErrorMessage(fieldState)}
                                    />
                                )}
                            />
                        </div>

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
                                    placeholder="Approval Profile Description"
                                    label="Profile Description"
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                />
                            )}
                        />

                        <ApprovalStepField
                            approvalSteps={useMemo(
                                () =>
                                    formValues.approvalSteps?.map((step, index) => ({
                                        ...step,
                                        order: step.order ?? index + 1,
                                    })) ?? [],
                                [formValues.approvalSteps],
                            )}
                            inProgress={isSubmitting}
                            onCancelClick={handleCancel}
                        />

                        <Container className="flex-row justify-end modal-footer" gap={4}>
                            <Button variant="outline" onClick={handleCancel} disabled={isSubmitting} type="button">
                                Cancel
                            </Button>
                            <ProgressButton
                                title={editMode ? 'Update' : 'Create'}
                                inProgressTitle={editMode ? 'Updating...' : 'Creating...'}
                                inProgress={isSubmitting}
                                disabled={isSubmitting || !isValid || areDefaultValuesSame(formValues)}
                                type="submit"
                            />
                        </Container>
                    </div>
                </Widget>
            </form>
        </FormProvider>
    );
}

export default ApprovalProfileForm;
