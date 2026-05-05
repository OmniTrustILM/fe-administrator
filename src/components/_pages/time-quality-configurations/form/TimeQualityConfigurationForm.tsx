import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router';

import AttributeEditor from 'components/Attributes/AttributeEditor';
import Breadcrumb from 'components/Breadcrumb';
import Button from 'components/Button';
import Container from 'components/Container';
import DurationInput from 'components/Input/DurationInput';
import MultipleValueTextInput from 'components/Input/MultipleValueTextInput';
import ProgressButton from 'components/ProgressButton';
import Switch from 'components/Switch';
import TextInput from 'components/TextInput';
import Widget from 'components/Widget';

import { actions as customAttributesActions, selectors as customAttributesSelectors } from 'ducks/customAttributes';
import { actions as tqcActions, selectors as tqcSelectors } from 'ducks/time-quality-configurations';

import { Resource } from 'types/openapi';
import { collectFormAttributes, mapProfileAttribute, transformAttributes } from 'utils/attributes/attributes';
import {
    validateAlphaNumericWithoutAccents,
    validateIso8601Duration,
    validateNtpServers,
    validatePositiveInteger,
    validateRequired,
} from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';

interface FormValues {
    name: string;
    accuracy: string;
    ntpServers: string[];
    ntpCheckInterval: string;
    ntpCheckTimeout: string;
    ntpSamplesPerServer: string;
    ntpServersMinReachable: string;
    maxClockDrift: string;
    leapSecondGuard: boolean;
}

export const TimeQualityConfigurationForm = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { id } = useParams();
    const editMode = useMemo(() => !!id, [id]);

    const timeQualityConfiguration = useSelector(tqcSelectors.timeQualityConfiguration);
    const isFetchingDetail = useSelector(tqcSelectors.isFetchingDetail);
    const isCreating = useSelector(tqcSelectors.isCreating);
    const isUpdating = useSelector(tqcSelectors.isUpdating);

    const isFetchingResourceCustomAttributes = useSelector(customAttributesSelectors.isFetchingResourceCustomAttributes);
    const multipleResourceCustomAttributes = useSelector(
        customAttributesSelectors.multipleResourceCustomAttributes([Resource.TimeQualityConfigurations]),
    );

    const isBusy = useMemo(
        () => isFetchingDetail || isCreating || isUpdating || isFetchingResourceCustomAttributes,
        [isFetchingDetail, isCreating, isUpdating, isFetchingResourceCustomAttributes],
    );

    useEffect(() => {
        dispatch(
            customAttributesActions.loadMultipleResourceCustomAttributes([
                { resource: Resource.TimeQualityConfigurations, customAttributes: [] },
            ]),
        );
    }, [dispatch]);

    useEffect(() => {
        if (editMode && id) {
            dispatch(tqcActions.getTimeQualityConfiguration({ uuid: id }));
        }
    }, [dispatch, editMode, id]);

    const initialCustomAttributes = useMemo(
        () =>
            mapProfileAttribute(
                timeQualityConfiguration,
                multipleResourceCustomAttributes,
                Resource.TimeQualityConfigurations,
                'customAttributes',
                '__attributes__customTimeQualityConfiguration__',
            ),
        [timeQualityConfiguration, multipleResourceCustomAttributes],
    );

    const defaultValues = useMemo<FormValues>(
        () => ({
            name: '',
            accuracy: '',
            ntpServers: [],
            ntpCheckInterval: '',
            ntpCheckTimeout: '',
            ntpSamplesPerServer: '',
            ntpServersMinReachable: '',
            maxClockDrift: '',
            leapSecondGuard: false,
            ...transformAttributes(initialCustomAttributes ?? []),
        }),
        [initialCustomAttributes],
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

    const lastResetIdRef = useRef<string | undefined>(undefined);

    const valuesToReset = useMemo<FormValues | undefined>(() => {
        if (!editMode || !id || !timeQualityConfiguration || timeQualityConfiguration.uuid !== id || isFetchingDetail) return undefined;

        const attributeInitialValues = mapProfileAttribute(
            timeQualityConfiguration,
            multipleResourceCustomAttributes,
            Resource.TimeQualityConfigurations,
            'customAttributes',
            '__attributes__customTimeQualityConfiguration__',
        );

        return {
            name: timeQualityConfiguration.name || '',
            accuracy: timeQualityConfiguration.accuracy || '',
            ntpServers: timeQualityConfiguration.ntpServers || [],
            ntpCheckInterval: timeQualityConfiguration.ntpCheckInterval || '',
            ntpCheckTimeout: timeQualityConfiguration.ntpCheckTimeout || '',
            ntpSamplesPerServer:
                timeQualityConfiguration.ntpSamplesPerServer !== undefined ? String(timeQualityConfiguration.ntpSamplesPerServer) : '',
            ntpServersMinReachable:
                timeQualityConfiguration.ntpServersMinReachable !== undefined
                    ? String(timeQualityConfiguration.ntpServersMinReachable)
                    : '',
            maxClockDrift: timeQualityConfiguration.maxClockDrift || '',
            leapSecondGuard: timeQualityConfiguration.leapSecondGuard ?? false,
            ...transformAttributes(attributeInitialValues ?? []),
        };
    }, [editMode, id, timeQualityConfiguration, isFetchingDetail, multipleResourceCustomAttributes]);

    useEffect(() => {
        if (valuesToReset && lastResetIdRef.current !== id) {
            reset(valuesToReset);
            lastResetIdRef.current = id;
        }
    }, [valuesToReset, id, reset]);

    const onSubmit = useCallback(
        (values: FormValues) => {
            const requestDto = {
                name: values.name,
                accuracy: values.accuracy,
                ntpServers: values.ntpServers,
                ntpCheckInterval: values.ntpCheckInterval || undefined,
                ntpCheckTimeout: values.ntpCheckTimeout || undefined,
                ntpSamplesPerServer: values.ntpSamplesPerServer ? Number.parseInt(values.ntpSamplesPerServer, 10) : undefined,
                ntpServersMinReachable: values.ntpServersMinReachable ? Number.parseInt(values.ntpServersMinReachable, 10) : undefined,
                maxClockDrift: values.maxClockDrift || undefined,
                leapSecondGuard: values.leapSecondGuard,
                customAttributes: collectFormAttributes(
                    'customTimeQualityConfiguration',
                    multipleResourceCustomAttributes[Resource.TimeQualityConfigurations],
                    values,
                ),
            };

            if (editMode && id) {
                dispatch(
                    tqcActions.updateTimeQualityConfiguration({
                        uuid: id,
                        timeQualityConfigurationRequestDto: requestDto,
                    }),
                );
            } else {
                dispatch(tqcActions.createTimeQualityConfiguration({ timeQualityConfigurationRequestDto: requestDto }));
            }
        },
        [dispatch, editMode, id, multipleResourceCustomAttributes],
    );

    const onCancel = useCallback(() => {
        navigate(-1);
    }, [navigate]);

    return (
        <Container>
            <Breadcrumb
                items={[
                    {
                        label: 'Time Quality Configurations',
                        href: `/${Resource.TimeQualityConfigurations.toLowerCase()}`,
                    },
                    {
                        label: editMode
                            ? timeQualityConfiguration?.name || 'Edit Time Quality Configuration'
                            : 'Create Time Quality Configuration',
                        href: '',
                    },
                ]}
            />

            <FormProvider {...methods}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="flex flex-col gap-4">
                        {/* ── Group 1: General ── */}
                        <Widget
                            title={editMode ? 'Edit Time Quality Configuration' : 'Create Time Quality Configuration'}
                            busy={isBusy}
                            titleSize="large"
                        >
                            <div className="space-y-4">
                                <Controller
                                    name="name"
                                    control={control}
                                    rules={buildValidationRules([validateRequired(), validateAlphaNumericWithoutAccents()])}
                                    render={({ field, fieldState }) => (
                                        <TextInput
                                            {...field}
                                            id="name"
                                            type="text"
                                            label="Name"
                                            required
                                            invalid={fieldState.error && fieldState.isTouched}
                                            error={getFieldErrorMessage(fieldState)}
                                        />
                                    )}
                                />

                                <Controller
                                    name="accuracy"
                                    control={control}
                                    rules={buildValidationRules([validateRequired(), validateIso8601Duration()])}
                                    render={({ field, fieldState }) => (
                                        <DurationInput
                                            id="accuracy"
                                            label="Accuracy"
                                            value={field.value}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            required
                                            invalid={!!(fieldState.error && fieldState.isTouched)}
                                            error={getFieldErrorMessage(fieldState)}
                                        />
                                    )}
                                />

                                <div className="flex flex-col gap-1">
                                    <label htmlFor="leapSecondGuard" className="block text-sm font-medium text-gray-700">
                                        Leap Second Guard
                                    </label>
                                    <Controller
                                        name="leapSecondGuard"
                                        control={control}
                                        render={({ field }) => (
                                            <Switch
                                                id="leapSecondGuard"
                                                label="Guard against leap second anomalies"
                                                checked={Boolean(field.value)}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    />
                                </div>
                            </div>
                        </Widget>

                        {/* ── Group 2: NTP Settings ── */}
                        <Widget title="NTP Settings" busy={isBusy} titleSize="large">
                            <div className="space-y-4">
                                <div className="flex flex-col gap-1">
                                    <label htmlFor="ntpServers" className="block text-sm font-medium text-gray-700">
                                        NTP Servers <span className="text-red-500 ml-1">*</span>
                                    </label>
                                    <Controller
                                        name="ntpServers"
                                        control={control}
                                        rules={{
                                            validate: {
                                                required: validateRequired(),
                                                ntpServers: validateNtpServers(),
                                            },
                                        }}
                                        render={({ field, fieldState }) => (
                                            <>
                                                <MultipleValueTextInput
                                                    id="ntpServers"
                                                    selectedValues={field.value}
                                                    onValuesChange={field.onChange}
                                                    placeholder="Select or add NTP server addresses"
                                                    addPlaceholder="Type hostname or IP and press Enter"
                                                />
                                                {fieldState.error && (
                                                    <p className="text-xs text-red-600 mt-0.5">{fieldState.error.message}</p>
                                                )}
                                            </>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Controller
                                        name="ntpCheckInterval"
                                        control={control}
                                        rules={buildValidationRules([validateIso8601Duration()])}
                                        render={({ field, fieldState }) => (
                                            <DurationInput
                                                id="ntpCheckInterval"
                                                label="Check Interval"
                                                value={field.value}
                                                onChange={field.onChange}
                                                onBlur={field.onBlur}
                                                invalid={!!(fieldState.error && fieldState.isTouched)}
                                                error={getFieldErrorMessage(fieldState)}
                                            />
                                        )}
                                    />

                                    <Controller
                                        name="ntpCheckTimeout"
                                        control={control}
                                        rules={buildValidationRules([validateIso8601Duration()])}
                                        render={({ field, fieldState }) => (
                                            <DurationInput
                                                id="ntpCheckTimeout"
                                                label="Check Timeout"
                                                value={field.value}
                                                onChange={field.onChange}
                                                onBlur={field.onBlur}
                                                invalid={!!(fieldState.error && fieldState.isTouched)}
                                                error={getFieldErrorMessage(fieldState)}
                                            />
                                        )}
                                    />

                                    <div>
                                        <Controller
                                            name="ntpSamplesPerServer"
                                            control={control}
                                            rules={buildValidationRules([validatePositiveInteger()])}
                                            render={({ field, fieldState }) => (
                                                <TextInput
                                                    {...field}
                                                    id="ntpSamplesPerServer"
                                                    type="number"
                                                    label="Samples per Server"
                                                    invalid={fieldState.error && fieldState.isTouched}
                                                    error={getFieldErrorMessage(fieldState)}
                                                />
                                            )}
                                        />
                                    </div>

                                    <div>
                                        <Controller
                                            name="ntpServersMinReachable"
                                            control={control}
                                            rules={buildValidationRules([validatePositiveInteger()])}
                                            render={({ field, fieldState }) => (
                                                <TextInput
                                                    {...field}
                                                    id="ntpServersMinReachable"
                                                    type="number"
                                                    label="Min Reachable Servers"
                                                    invalid={fieldState.error && fieldState.isTouched}
                                                    error={getFieldErrorMessage(fieldState)}
                                                />
                                            )}
                                        />
                                    </div>
                                </div>

                                <Controller
                                    name="maxClockDrift"
                                    control={control}
                                    rules={buildValidationRules([validateIso8601Duration()])}
                                    render={({ field, fieldState }) => (
                                        <DurationInput
                                            id="maxClockDrift"
                                            label="Max Clock Drift"
                                            value={field.value}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            invalid={!!(fieldState.error && fieldState.isTouched)}
                                            error={getFieldErrorMessage(fieldState)}
                                        />
                                    )}
                                />
                            </div>
                        </Widget>

                        {/* ── Group 3: Custom Attributes ── */}
                        <Widget title="Custom Attributes" busy={isFetchingResourceCustomAttributes} titleSize="large">
                            <AttributeEditor
                                id="customTimeQualityConfiguration"
                                attributeDescriptors={multipleResourceCustomAttributes[Resource.TimeQualityConfigurations] || []}
                                attributes={editMode ? timeQualityConfiguration?.customAttributes : undefined}
                            />
                        </Widget>

                        <Container className="flex-row justify-end" gap={4}>
                            <Button variant="outline" onClick={onCancel} disabled={isSubmitting} type="button">
                                Cancel
                            </Button>
                            <ProgressButton
                                title={editMode ? 'Update' : 'Create'}
                                inProgressTitle={editMode ? 'Updating...' : 'Creating...'}
                                inProgress={isSubmitting || isCreating || isUpdating}
                                disabled={!isDirty || isSubmitting || !isValid}
                                type="submit"
                            />
                        </Container>
                    </div>
                </form>
            </FormProvider>
        </Container>
    );
};
