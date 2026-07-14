import Switch from 'components/Switch';
import ProgressButton from 'components/ProgressButton';
import TextInput from 'components/TextInput';
import Container from 'components/Container';
import Button from 'components/Button';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { actions, selectors } from 'ducks/settings';
import { useAreDefaultValuesSame } from 'utils/common-hooks';
import { validateNonZeroInteger, validatePositiveInteger } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';

type FormValues = {
    enabled: boolean;
    frequency?: string;
    expiringThreshold?: string;
    defaultIssuanceWindowDays?: string;
    maxFailedAttempts?: string;
};

interface CertificateSettingsFormProps {
    onCancel?: () => void;
    onSuccess?: () => void;
}

const CertificateSettingsForm = ({ onCancel, onSuccess }: CertificateSettingsFormProps) => {
    const DEFAULT_FREQUENCY = '1';
    const DEFAULT_EXPIRING_THRESHOLD = '30';
    const DEFAULT_ISSUANCE_WINDOW_DAYS = '7';
    const DEFAULT_MAX_FAILED_ATTEMPTS = '5';

    const dispatch = useDispatch();

    const platformSettings = useSelector(selectors.platformSettings);
    const isFetching = useSelector(selectors.isFetchingPlatform);
    const isUpdating = useSelector(selectors.isUpdatingPlatform);

    const getFreshSettings = useCallback(() => {
        dispatch(actions.getPlatformSettings());
    }, [dispatch]);

    useEffect(() => {
        getFreshSettings();
    }, [getFreshSettings]);

    const isBusy = useMemo(() => isFetching || isUpdating, [isFetching, isUpdating]);

    const defaultValues = useMemo(() => {
        const validationSettings = platformSettings?.certificates?.validation;
        const registrationSettings = platformSettings?.certificates?.registration;

        const registrationDefaults = {
            defaultIssuanceWindowDays: registrationSettings?.defaultIssuanceWindowDays?.toString() || DEFAULT_ISSUANCE_WINDOW_DAYS,
            maxFailedAttempts: registrationSettings?.maxFailedAttempts?.toString() || DEFAULT_MAX_FAILED_ATTEMPTS,
        };

        if (!validationSettings) {
            return {
                enabled: false,
                expiringThreshold: DEFAULT_EXPIRING_THRESHOLD,
                frequency: DEFAULT_FREQUENCY,
                ...registrationDefaults,
            };
        }

        return {
            enabled: validationSettings.enabled,
            expiringThreshold: validationSettings.expiringThreshold?.toString() || DEFAULT_EXPIRING_THRESHOLD,
            frequency: validationSettings.frequency?.toString() || DEFAULT_FREQUENCY,
            ...registrationDefaults,
        };
    }, [platformSettings?.certificates?.validation, platformSettings?.certificates?.registration]);

    const methods = useForm<FormValues>({
        defaultValues,
        mode: 'onChange',
    });

    const {
        handleSubmit,
        control,
        formState: { isSubmitting },
        reset,
    } = methods;

    const watchedEnabled = useWatch({
        control,
        name: 'enabled',
    });

    const formValues = useWatch({ control });

    // Reset form when platformSettings change
    useEffect(() => {
        reset(defaultValues);
    }, [defaultValues, reset]);

    const onSubmit = useCallback(
        (values: FormValues) => {
            dispatch(
                actions.updatePlatformSettings({
                    certificates: {
                        validation: {
                            enabled: values.enabled,
                            frequency: values.frequency ? Number.parseInt(values.frequency, 10) : undefined,
                            expiringThreshold: values.expiringThreshold ? Number.parseInt(values.expiringThreshold, 10) : undefined,
                        },
                        registration: {
                            defaultIssuanceWindowDays: values.defaultIssuanceWindowDays
                                ? Number.parseInt(values.defaultIssuanceWindowDays, 10)
                                : undefined,
                            maxFailedAttempts: values.maxFailedAttempts ? Number.parseInt(values.maxFailedAttempts, 10) : undefined,
                        },
                    },
                }),
            );
        },
        [dispatch],
    );

    const wasUpdating = useRef(isUpdating);

    useEffect(() => {
        if (wasUpdating.current && !isUpdating) {
            if (onSuccess) {
                onSuccess();
            }
        }
        wasUpdating.current = isUpdating;
    }, [isUpdating, onSuccess]);

    const areDefaultValuesSame = useAreDefaultValuesSame(defaultValues);

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="mt-2 space-y-4">
                <div className="rounded-xl border border-gray-200 dark:border-neutral-700 p-4 md:p-5 shadow-2xs bg-white dark:bg-neutral-900 space-y-4">
                    <h3 className="text-lg font-bold text-[var(--dark-gray-color)] dark:text-neutral-200">Validation</h3>
                    <Controller
                        name="enabled"
                        control={control}
                        render={({ field }) => (
                            <Switch id="enabled" checked={field.value} onChange={field.onChange} label="Enable Certificate Validation" />
                        )}
                    />
                    {watchedEnabled && (
                        <>
                            <div>
                                <Controller
                                    name="frequency"
                                    control={control}
                                    rules={buildValidationRules([validateNonZeroInteger(), validatePositiveInteger()])}
                                    render={({ field, fieldState }) => (
                                        <TextInput
                                            {...field}
                                            id="frequency"
                                            type="number"
                                            label="Validation Frequency"
                                            invalid={fieldState.error && fieldState.isTouched}
                                            error={getFieldErrorMessage(fieldState)}
                                        />
                                    )}
                                />
                                <p className="text-sm text-gray-500 mt-2">Validation frequency of certificates specified in days.</p>
                            </div>
                            <div>
                                <Controller
                                    name="expiringThreshold"
                                    control={control}
                                    rules={buildValidationRules([validateNonZeroInteger(), validatePositiveInteger()])}
                                    render={({ field, fieldState }) => (
                                        <TextInput
                                            {...field}
                                            id="expiringThreshold"
                                            type="number"
                                            label="Expiring Threshold"
                                            invalid={fieldState.error && fieldState.isTouched}
                                            error={getFieldErrorMessage(fieldState)}
                                        />
                                    )}
                                />
                                <p className="text-sm text-gray-500 mt-2">
                                    How many days before expiration should certificate's validation status change to Expiring.
                                </p>
                            </div>
                        </>
                    )}
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-neutral-700 p-4 md:p-5 shadow-2xs bg-white dark:bg-neutral-900 space-y-4">
                    <h3 className="text-lg font-bold text-[var(--dark-gray-color)] dark:text-neutral-200">Registration</h3>
                    <div>
                        <Controller
                            name="defaultIssuanceWindowDays"
                            control={control}
                            rules={buildValidationRules([validateNonZeroInteger(), validatePositiveInteger()])}
                            render={({ field, fieldState }) => (
                                <TextInput
                                    {...field}
                                    id="defaultIssuanceWindowDays"
                                    type="number"
                                    label="Default Issuance Window (days)"
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                />
                            )}
                        />
                        <p className="text-sm text-gray-500 mt-2">
                            Default issuance window in days, applied when a pre-registration omits an explicit expiry.
                        </p>
                    </div>
                    <div>
                        <Controller
                            name="maxFailedAttempts"
                            control={control}
                            rules={buildValidationRules([validateNonZeroInteger(), validatePositiveInteger()])}
                            render={({ field, fieldState }) => (
                                <TextInput
                                    {...field}
                                    id="maxFailedAttempts"
                                    type="number"
                                    label="Max Failed Attempts"
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                />
                            )}
                        />
                        <p className="text-sm text-gray-500 mt-2">
                            Maximum failed challenge-verification attempts before the registration authorization locks.
                        </p>
                    </div>
                </div>
                <Container className="flex-row justify-end modal-footer" gap={4}>
                    <Button variant="outline" onClick={onCancel} disabled={isSubmitting || isBusy} type="button">
                        Cancel
                    </Button>
                    <ProgressButton
                        title={'Save'}
                        inProgressTitle={'Saving...'}
                        inProgress={isSubmitting || isBusy}
                        disabled={isSubmitting || isBusy || areDefaultValuesSame(formValues)}
                        type="submit"
                    />
                </Container>
            </form>
        </FormProvider>
    );
};

export default CertificateSettingsForm;
