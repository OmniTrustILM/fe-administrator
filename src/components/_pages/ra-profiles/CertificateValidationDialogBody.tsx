import { useCallback, useEffect, useMemo } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import Button from 'components/Button';
import { validateNonZeroInteger, validatePositiveInteger } from 'utils/validators';

import Spinner from 'components/Spinner';

import { actions, selectors } from 'ducks/ra-profiles';
import type { RaProfileResponseModel } from 'types/ra-profiles';
import TextInput from 'components/TextInput';
import Switch from 'components/Switch';
import Container from 'components/Container';
import Label from 'components/Label';
import { buildValidationRules } from 'utils/validators-helper';
import ProgressButton from 'components/ProgressButton';
import { useAreDefaultValuesSame } from 'utils/common-hooks';
import type { SettingsPlatformModel } from 'types/settings';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import { renderExpiringThresholdLabel, renderValidationFrequencyLabel } from 'utils/certificate-validation';

type FormValues = {
    usePlatformSettings: boolean;
    enabled: boolean;
    frequency?: number;
    expiringThreshold?: number;
};

type Props = Readonly<{
    platformSettings?: SettingsPlatformModel;
    raProfile?: RaProfileResponseModel;
    onClose: () => void;
}>;

export default function CertificateValidationDialogBody({ raProfile, platformSettings, onClose }: Props) {
    const dispatch = useDispatch();

    const isUpdating = useSelector(selectors.isUpdating);
    const isBusy = useMemo(() => isUpdating, [isUpdating]);

    const defaultValues: FormValues = useMemo(() => {
        if (!raProfile?.certificateValidationSettings) {
            return {
                usePlatformSettings: false,
                enabled: false,
                frequency: undefined,
                expiringThreshold: undefined,
            };
        }

        return {
            usePlatformSettings: raProfile.certificateValidationSettings.usePlatformSettings,
            enabled: raProfile.certificateValidationSettings.enabled,
            frequency: raProfile.certificateValidationSettings.frequency,
            expiringThreshold: raProfile.certificateValidationSettings.expiringThreshold,
        };
    }, [raProfile]);

    const methods = useForm<FormValues>({
        mode: 'onTouched',
        defaultValues,
    });

    const { control, handleSubmit, formState, reset } = methods;

    useEffect(() => {
        reset(defaultValues);
    }, [raProfile?.uuid, reset, defaultValues]);

    const onSubmit = useCallback(
        (values: FormValues) => {
            if (!raProfile) return;

            dispatch(
                actions.updateRaProfileCertificateValidation({
                    profileUuid: raProfile.uuid,
                    authorityInstanceUuid: raProfile.authorityInstanceUuid ?? 'unknown',
                    validation: {
                        usePlatformSettings: values.usePlatformSettings,
                        enabled: values.enabled,
                        frequency: values.frequency,
                        expiringThreshold: values.expiringThreshold,
                    },
                }),
            );
            onClose();
        },
        [dispatch, raProfile, onClose],
    );

    const watchedValues = useWatch({ control });
    const areDefaultValuesSame = useAreDefaultValuesSame(defaultValues);
    const certificateValidationHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'setting',
                content: 'Setting',
                width: '70%',
            },
            {
                id: 'value',
                content: 'Value',
                width: '30%',
            },
        ],
        [],
    );

    const certificateValidationData: TableDataRow[] = useMemo(() => {
        if (!platformSettings) return [];

        const data = [
            {
                id: 'enabled',
                columns: [
                    'Enable Validation',
                    <Switch
                        key="validationEnabled"
                        id="validationEnabled"
                        disabled
                        checked={platformSettings.certificates?.validation?.enabled}
                        onChange={() => {}}
                    />,
                ],
            },
            {
                id: 'frequency',
                columns: ['Validation Frequency', renderValidationFrequencyLabel(platformSettings.certificates?.validation?.frequency)],
            },
            {
                id: 'expiringThreshold',
                columns: ['Expiring Threshold', renderExpiringThresholdLabel(platformSettings.certificates?.validation?.expiringThreshold)],
            },
        ];

        return data;
    }, [platformSettings]);

    const watchedUsePlatformSettings = useWatch({ control, name: 'usePlatformSettings' });
    const watchedEnabled = useWatch({ control, name: 'enabled' });

    if (!raProfile) return <></>;

    return (
        <>
            <FormProvider {...methods}>
                <form onSubmit={handleSubmit(onSubmit)} className="mt-2">
                    <Controller
                        name="usePlatformSettings"
                        control={control}
                        render={({ field }) => (
                            <Switch
                                id="usePlatformSettingsEdit"
                                secondaryLabel="Use Platform Certificate Validation Settings"
                                checked={field.value || false}
                                onChange={field.onChange}
                                className="!mb-4"
                            />
                        )}
                    />
                    {watchedUsePlatformSettings ? (
                        <>
                            <Label className="!text-base">Current Platform Settings</Label>
                            <CustomTable headers={certificateValidationHeaders} data={certificateValidationData} />
                        </>
                    ) : (
                        <>
                            <Controller
                                name="enabled"
                                control={control}
                                render={({ field }) => (
                                    <Switch
                                        id="enabled"
                                        secondaryLabel="Enable Certificate Validation"
                                        checked={field.value || false}
                                        onChange={field.onChange}
                                    />
                                )}
                            />
                            {watchedEnabled && (
                                <div className="mt-4">
                                    <Controller
                                        name="frequency"
                                        control={control}
                                        rules={buildValidationRules([validateNonZeroInteger(), validatePositiveInteger()])}
                                        render={({ field, fieldState }) => (
                                            <div>
                                                <TextInput
                                                    id="frequency"
                                                    label="Validation Frequency"
                                                    value={field.value?.toString() || ''}
                                                    onChange={(value) => field.onChange(value ? Number(value) : undefined)}
                                                    onBlur={field.onBlur}
                                                    type="number"
                                                    invalid={!!fieldState.error && fieldState.isTouched}
                                                    error={fieldState.error?.message}
                                                />
                                                <p className="mt-1 text-sm text-gray-600">
                                                    Validation frequency of certificates specified in days.
                                                </p>
                                            </div>
                                        )}
                                    />
                                    <Controller
                                        name="expiringThreshold"
                                        control={control}
                                        rules={buildValidationRules([validateNonZeroInteger(), validatePositiveInteger()])}
                                        render={({ field, fieldState }) => (
                                            <div>
                                                <TextInput
                                                    id="expiringThreshold"
                                                    label="Expiring Threshold"
                                                    value={field.value?.toString() || ''}
                                                    onChange={(value) => field.onChange(value ? Number(value) : undefined)}
                                                    onBlur={field.onBlur}
                                                    type="number"
                                                    invalid={!!fieldState.error && fieldState.isTouched}
                                                    error={fieldState.error?.message}
                                                />
                                                <p className="mt-1 text-sm text-gray-600">
                                                    How many days before expiration should certificate's validation status change to
                                                    Expiring.
                                                </p>
                                            </div>
                                        )}
                                    />
                                </div>
                            )}
                        </>
                    )}
                    <Container className="flex-row justify-end modal-footer" gap={4}>
                        <Button type="button" variant="outline" disabled={formState.isSubmitting} onClick={onClose}>
                            Cancel
                        </Button>
                        <ProgressButton
                            title={'Save'}
                            inProgressTitle={'Saving...'}
                            disabled={formState.isSubmitting || isBusy || areDefaultValuesSame(watchedValues)}
                            inProgress={formState.isSubmitting || isBusy}
                            type="submit"
                        />
                    </Container>
                </form>
            </FormProvider>

            <Spinner active={isBusy} />
        </>
    );
}
