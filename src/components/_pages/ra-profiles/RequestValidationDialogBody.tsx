import { useCallback, useEffect, useMemo } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import Button from 'components/Button';

import Spinner from 'components/Spinner';

import { actions, selectors } from 'ducks/ra-profiles';
import type { RaProfileResponseModel } from 'types/ra-profiles';
import Switch from 'components/Switch';
import Container from 'components/Container';
import Label from 'components/Label';
import ProgressButton from 'components/ProgressButton';
import RadioRow from 'components/RadioRow';
import { useAreDefaultValuesSame } from 'utils/common-hooks';
import type { SettingsPlatformModel } from 'types/settings';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import {
    externalCsrValidationModeDescription,
    externalCsrValidationModeLabel,
    requestValidationDefaultFormValues,
    requestValidationFormValuesToUpdateDto,
    resolveExternalCsrStrict,
    type RequestValidationFormValues,
} from 'utils/raProfileValidation';

type Props = Readonly<{
    platformSettings?: SettingsPlatformModel;
    raProfile?: RaProfileResponseModel;
    onClose: () => void;
}>;

export default function RequestValidationDialogBody({ raProfile, platformSettings, onClose }: Props) {
    const dispatch = useDispatch();

    const isUpdating = useSelector(selectors.isUpdating);

    const platformStrict = platformSettings?.certificates?.requestAttributes?.externalCsrValidationStrict;

    const defaultValues: RequestValidationFormValues = useMemo(
        () => requestValidationDefaultFormValues(raProfile?.certificateRequestAttributes?.externalCsrValidationStrict, platformStrict),
        [raProfile, platformStrict],
    );

    const methods = useForm<RequestValidationFormValues>({
        mode: 'onTouched',
        defaultValues,
    });

    const { control, handleSubmit, formState, reset } = methods;

    useEffect(() => {
        reset(defaultValues);
    }, [reset, defaultValues]);

    const onSubmit = useCallback(
        (values: RequestValidationFormValues) => {
            if (!raProfile) return;

            dispatch(
                actions.updateRaProfileRequestAttributes({
                    profileUuid: raProfile.uuid,
                    authorityInstanceUuid: raProfile.authorityInstanceUuid ?? 'unknown',
                    requestAttributes: requestValidationFormValuesToUpdateDto(values, raProfile.certificateRequestAttributes),
                }),
            );
            onClose();
        },
        [dispatch, raProfile, onClose],
    );

    const watchedValues = useWatch({ control });
    const areDefaultValuesSame = useAreDefaultValuesSame(defaultValues);

    const requestValidationHeaders: TableHeader[] = useMemo(
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

    const requestValidationData: TableDataRow[] = useMemo(() => {
        if (!platformSettings) return [];

        const platformResolvedStrict = resolveExternalCsrStrict(undefined, platformStrict);

        return [
            {
                id: 'requestValidationMode',
                columns: ['Request Validation', externalCsrValidationModeLabel(platformResolvedStrict)],
            },
        ];
    }, [platformSettings, platformStrict]);

    const watchedUsePlatformSettings = useWatch({ control, name: 'usePlatformSettings' });

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
                                id="requestValidationUsePlatformSettingsEdit"
                                secondaryLabel="Use Platform Request Validation Settings"
                                checked={field.value ?? false}
                                onChange={field.onChange}
                                className="!mb-4"
                            />
                        )}
                    />
                    {watchedUsePlatformSettings ? (
                        <>
                            <Label className="!text-base">Current Platform Settings</Label>
                            <CustomTable headers={requestValidationHeaders} data={requestValidationData} />
                        </>
                    ) : (
                        <div className="space-y-2">
                            <Label className="!text-base">Request validation</Label>
                            <Controller
                                name="strict"
                                control={control}
                                render={({ field }) => (
                                    <>
                                        <RadioRow checked={field.value} onSelect={() => field.onChange(true)}>
                                            <span
                                                className="font-medium text-[var(--dark-gray-color)] dark:text-white"
                                                data-testid="request-validation-strict"
                                            >
                                                {externalCsrValidationModeLabel(true)}
                                            </span>
                                            <span className="text-gray-500 dark:text-neutral-400">
                                                {externalCsrValidationModeDescription(true)}
                                            </span>
                                        </RadioRow>
                                        <RadioRow checked={!field.value} onSelect={() => field.onChange(false)}>
                                            <span
                                                className="font-medium text-[var(--dark-gray-color)] dark:text-white"
                                                data-testid="request-validation-lenient"
                                            >
                                                {externalCsrValidationModeLabel(false)}
                                            </span>
                                            <span className="text-gray-500 dark:text-neutral-400">
                                                {externalCsrValidationModeDescription(false)}
                                            </span>
                                        </RadioRow>
                                    </>
                                )}
                            />
                        </div>
                    )}
                    <Container className="flex-row justify-end modal-footer mt-2" gap={4}>
                        <Button type="button" variant="outline" disabled={formState.isSubmitting} onClick={onClose}>
                            Cancel
                        </Button>
                        <ProgressButton
                            title="Save"
                            inProgressTitle="Saving..."
                            disabled={formState.isSubmitting || isUpdating || areDefaultValuesSame(watchedValues)}
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
