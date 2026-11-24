import { useCallback, useEffect, useMemo } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';

import Button from 'components/Button';
import Container from 'components/Container';
import ProgressButton from 'components/ProgressButton';
import Spinner from 'components/Spinner';
import Switch from 'components/Switch';
import TextInput from 'components/TextInput';
import { actions, selectors } from 'ducks/ra-profiles';
import type { RaProfileResponseModel } from 'types/ra-profiles';
import { useAreDefaultValuesSame } from 'utils/common-hooks';
import { composeValidators, validatePositiveInteger, validateRange } from 'utils/validators';

type FormValues = {
    windowEnabled: boolean;
    windowStartPercent?: number;
    windowEndPercent?: number;
    useAuthorityRenewalInfo: boolean;
    autoRenewalEnabled: boolean;
    autoRenewalMaxAttempts?: number;
};

type Props = Readonly<{
    raProfile?: RaProfileResponseModel;
    onClose: () => void;
}>;

const DEFAULT_START_PERCENT = 67;
const DEFAULT_END_PERCENT = 80;
const DEFAULT_MAX_ATTEMPTS = 5;

const validateRequired = (value: unknown) => (value === undefined || value === null || value === '' ? 'Required Field' : undefined);

const validatePercent = composeValidators(validateRequired, validatePositiveInteger(), validateRange(1, 99));

const validateMaxAttempts = composeValidators(validateRequired, validatePositiveInteger(), validateRange(1, 20));

const isValidWindow = (start?: number, end?: number) => !validatePercent(start) && !validatePercent(end) && Number(end) > Number(start);

export default function RenewalSettingsDialogBody({ raProfile, onClose }: Props) {
    const dispatch = useDispatch();
    const isUpdating = useSelector(selectors.isUpdatingRenewalSettings);

    const renewalSettings = raProfile?.renewalSettings;
    const authorityRenewalInfoSupported = !!renewalSettings?.authorityRenewalInfoSupported;

    const defaultValues: FormValues = useMemo(
        () => ({
            windowEnabled: renewalSettings?.windowEnabled ?? false,
            windowStartPercent: renewalSettings?.windowStartPercent ?? DEFAULT_START_PERCENT,
            windowEndPercent: renewalSettings?.windowEndPercent ?? DEFAULT_END_PERCENT,
            useAuthorityRenewalInfo: renewalSettings?.useAuthorityRenewalInfo ?? false,
            autoRenewalEnabled: renewalSettings?.autoRenewalEnabled ?? false,
            autoRenewalMaxAttempts: renewalSettings?.autoRenewalMaxAttempts ?? DEFAULT_MAX_ATTEMPTS,
        }),
        [renewalSettings],
    );

    const methods = useForm<FormValues>({ mode: 'onTouched', defaultValues });
    const { control, handleSubmit, formState, reset } = methods;

    useEffect(() => {
        reset(defaultValues);
    }, [raProfile?.uuid, reset, defaultValues]);

    const onSubmit = useCallback(
        (values: FormValues) => {
            if (!raProfile?.authorityInstanceUuid) return;

            const storedMaxAttempts = renewalSettings?.autoRenewalMaxAttempts ?? DEFAULT_MAX_ATTEMPTS;
            const maxAttempts =
                values.autoRenewalEnabled || !validateMaxAttempts(values.autoRenewalMaxAttempts)
                    ? values.autoRenewalMaxAttempts
                    : storedMaxAttempts;

            const useStoredWindow = !values.windowEnabled && !isValidWindow(values.windowStartPercent, values.windowEndPercent);
            const windowStartPercent = useStoredWindow ? renewalSettings?.windowStartPercent : values.windowStartPercent;
            const windowEndPercent = useStoredWindow ? renewalSettings?.windowEndPercent : values.windowEndPercent;

            dispatch(
                actions.updateRaProfileRenewalSettings({
                    profileUuid: raProfile.uuid,
                    authorityInstanceUuid: raProfile.authorityInstanceUuid,
                    renewalSettings: {
                        windowEnabled: values.windowEnabled,
                        windowStartPercent: windowStartPercent ?? DEFAULT_START_PERCENT,
                        windowEndPercent: windowEndPercent ?? DEFAULT_END_PERCENT,
                        useAuthorityRenewalInfo: values.useAuthorityRenewalInfo,
                        autoRenewalEnabled: values.autoRenewalEnabled,
                        autoRenewalMaxAttempts: maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
                    },
                }),
            );
            onClose();
        },
        [dispatch, raProfile, renewalSettings, onClose],
    );

    const watchedValues = useWatch({ control });
    const areDefaultValuesSame = useAreDefaultValuesSame(defaultValues);
    const windowEnabled = useWatch({ control, name: 'windowEnabled' });
    const useAuthorityRenewalInfo = useWatch({ control, name: 'useAuthorityRenewalInfo' });
    const autoRenewalEnabled = useWatch({ control, name: 'autoRenewalEnabled' });

    if (!raProfile) return <></>;

    return (
        <>
            <FormProvider {...methods}>
                <form onSubmit={handleSubmit(onSubmit)} className="mt-2">
                    <Controller
                        name="windowEnabled"
                        control={control}
                        render={({ field }) => (
                            <Switch
                                id="windowEnabled"
                                secondaryLabel="Enable Renewal Window"
                                checked={field.value}
                                onChange={field.onChange}
                                className="!mb-4"
                            />
                        )}
                    />

                    <Controller
                        name="windowStartPercent"
                        control={control}
                        rules={{
                            deps: ['windowEndPercent'],
                            validate: (value, allValues) => (allValues.windowEnabled ? validatePercent(value) : undefined),
                        }}
                        render={({ field, fieldState }) => (
                            <TextInput
                                id="windowStartPercent"
                                label="Window Start (% of validity)"
                                type="number"
                                disabled={!windowEnabled}
                                value={field.value?.toString() ?? ''}
                                onChange={(value) => field.onChange(value ? Number(value) : undefined)}
                                onBlur={field.onBlur}
                                invalid={!!fieldState.error && fieldState.isTouched}
                                error={fieldState.error?.message}
                            />
                        )}
                    />
                    <Controller
                        name="windowEndPercent"
                        control={control}
                        rules={{
                            validate: (value, allValues) => {
                                if (!allValues.windowEnabled) return undefined;
                                const error = validatePercent(value);
                                if (error) return error;
                                const start = allValues.windowStartPercent;
                                return start !== undefined && Number(value) <= start ? 'End must be greater than start' : undefined;
                            },
                        }}
                        render={({ field, fieldState }) => (
                            <TextInput
                                id="windowEndPercent"
                                label="Window End (% of validity)"
                                type="number"
                                disabled={!windowEnabled}
                                value={field.value?.toString() ?? ''}
                                onChange={(value) => field.onChange(value ? Number(value) : undefined)}
                                onBlur={field.onBlur}
                                invalid={!!fieldState.error && fieldState.isTouched}
                                error={fieldState.error?.message}
                            />
                        )}
                    />
                    <p className="mb-4 text-sm text-content-muted">
                        Share of the certificate validity period after which renewal becomes due. Both values are between 1 and 99 and the
                        start must be lower than the end.
                    </p>

                    <Controller
                        name="useAuthorityRenewalInfo"
                        control={control}
                        render={({ field }) => (
                            <Switch
                                id="useAuthorityRenewalInfo"
                                secondaryLabel="Use Renewal Window From Certificate Authority"
                                checked={field.value}
                                onChange={field.onChange}
                                disabled={!authorityRenewalInfoSupported && !field.value}
                            />
                        )}
                    />
                    {!authorityRenewalInfoSupported && !useAuthorityRenewalInfo && (
                        <p className="mt-1 text-sm text-content-muted" data-testid="authority-renewal-info-unsupported">
                            Renewal information is not supported by the authority.
                        </p>
                    )}

                    <Controller
                        name="autoRenewalEnabled"
                        control={control}
                        render={({ field }) => (
                            <Switch
                                id="autoRenewalEnabled"
                                secondaryLabel="Enable Automatic Renewal"
                                checked={field.value}
                                onChange={field.onChange}
                                className="!mt-4 !mb-4"
                            />
                        )}
                    />
                    <Controller
                        name="autoRenewalMaxAttempts"
                        control={control}
                        rules={{
                            validate: (value, allValues) => (allValues.autoRenewalEnabled ? validateMaxAttempts(value) : undefined),
                        }}
                        render={({ field, fieldState }) => (
                            <TextInput
                                id="autoRenewalMaxAttempts"
                                label="Maximum Renewal Attempts"
                                type="number"
                                disabled={!autoRenewalEnabled}
                                value={field.value?.toString() ?? ''}
                                onChange={(value) => field.onChange(value ? Number(value) : undefined)}
                                onBlur={field.onBlur}
                                invalid={!!fieldState.error && fieldState.isTouched}
                                error={fieldState.error?.message}
                            />
                        )}
                    />
                    <p className="mb-4 text-sm text-content-muted">
                        Certificates of this RA profile are renewed automatically once their renewal is due. Between 1 and 20 attempts are
                        made per certificate.
                    </p>

                    <Container className="flex-row justify-end modal-footer" gap={4}>
                        <Button type="button" variant="outline" disabled={formState.isSubmitting} onClick={onClose}>
                            Cancel
                        </Button>
                        <ProgressButton
                            title="Save"
                            inProgressTitle="Saving..."
                            disabled={
                                !raProfile.authorityInstanceUuid ||
                                formState.isSubmitting ||
                                isUpdating ||
                                areDefaultValuesSame(watchedValues)
                            }
                            inProgress={formState.isSubmitting || isUpdating}
                            type="submit"
                        />
                    </Container>
                </form>
            </FormProvider>

            <Spinner active={isUpdating} />
        </>
    );
}
