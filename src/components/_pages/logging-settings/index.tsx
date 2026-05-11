import TabLayout from 'components/Layout/TabLayout';
import Widget from 'components/Widget';
import { actions, selectors } from 'ducks/settings';
import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Container from 'components/Container';
import { LockWidgetNameEnum } from 'types/user-interface';
import { useForm, Controller, FormProvider, useWatch } from 'react-hook-form';
import { AuditLoggingSettingsDtoOutputEnum, Module, PlatformEnum, Resource } from 'types/openapi';

import Select from 'components/Select';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import ProgressButton from 'components/ProgressButton';
import Switch from 'components/Switch';

type ModuleOptionType = { value: Module; label: string };
type ResourceOptionType = { value: Resource; label: string };

type CommonFormValues = {
    logAllModules: boolean;
    logAllResources: boolean;
    loggedModules?: ModuleOptionType[];
    ignoredModules?: ModuleOptionType[];
    loggedResources?: ResourceOptionType[];
    ignoredResources?: ResourceOptionType[];
    output?: {
        label: string;
        value: AuditLoggingSettingsDtoOutputEnum;
    };
    verbose?: boolean;
};
type AuditFormValues = Omit<CommonFormValues, 'output'> & {
    output: {
        label: string;
        value: AuditLoggingSettingsDtoOutputEnum;
    };
};
type EventFormValues = Omit<CommonFormValues, 'output'>;

const LoggingSetting = () => {
    const dispatch = useDispatch();

    const loggingSettings = useSelector(selectors.loggingSettings);
    const isFetching = useSelector(selectors.isFetchingLoggingSetting);
    const isUpdating = useSelector(selectors.isUpdatingLoggingSetting);

    const moduleEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Module));
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));

    const getFreshLoggingSettings = useCallback(() => {
        dispatch(actions.getLoggingSettings());
    }, [dispatch]);

    useEffect(() => {
        getFreshLoggingSettings();
    }, [getFreshLoggingSettings]);

    const isBusy = useMemo(() => isFetching || isUpdating, [isFetching, isUpdating]);

    const moduleSelectorItems = useMemo(
        () =>
            Object.values(Module)
                .map((el) => ({
                    label: getEnumLabel(moduleEnum, el),
                    value: el,
                }))
                .sort((a, b) => a.label.localeCompare(b.label)),
        [moduleEnum],
    );

    const resourceSelectorItems = useMemo(
        () =>
            Object.values(Resource)
                .map((el) => ({
                    label: getEnumLabel(resourceEnum, el),
                    value: el,
                }))
                .sort((a, b) => a.label.localeCompare(b.label)),
        [resourceEnum],
    );

    const auditLogsOutputOptions = useMemo(
        () => [
            {
                value: AuditLoggingSettingsDtoOutputEnum.All,
                label: AuditLoggingSettingsDtoOutputEnum.All,
            },
            {
                value: AuditLoggingSettingsDtoOutputEnum.Console,
                label: AuditLoggingSettingsDtoOutputEnum.Console,
            },
            {
                value: AuditLoggingSettingsDtoOutputEnum.Database,
                label: AuditLoggingSettingsDtoOutputEnum.Database,
            },
            {
                value: AuditLoggingSettingsDtoOutputEnum.None,
                label: AuditLoggingSettingsDtoOutputEnum.None,
            },
        ],
        [],
    );

    const onAuditFormSubmit = useCallback(
        (values: AuditFormValuesForHook) => {
            if (!values || !loggingSettings) return;
            dispatch(
                actions.updateLoggingSettings({
                    eventLogs: loggingSettings.eventLogs,
                    auditLogs: {
                        logAllModules: values.logAllModules,
                        logAllResources: values.logAllResources,
                        ignoredModules: values.ignoredModules?.map((el) => el.value),
                        ignoredResources: values.ignoredResources?.map((el) => el.value),
                        loggedModules: values.loggedModules?.map((el) => el.value),
                        loggedResources: values.loggedResources?.map((el) => el.value),
                        output: values.output,
                        verbose: values.verbose,
                    },
                }),
            );
        },
        [dispatch, loggingSettings],
    );

    const auditFormDefaultValues = useMemo(() => {
        if (!loggingSettings) return {};
        const auditLogs = loggingSettings.auditLogs;
        return {
            ...auditLogs,
            ignoredModules:
                auditLogs?.ignoredModules?.map((el) => ({
                    value: el,
                    label: getEnumLabel(moduleEnum, el),
                })) || [],
            ignoredResources:
                auditLogs?.ignoredResources?.map((el) => ({
                    value: el,
                    label: getEnumLabel(resourceEnum, el),
                })) || [],
            loggedModules:
                auditLogs?.loggedModules?.map((el) => ({
                    value: el,
                    label: getEnumLabel(moduleEnum, el),
                })) || [],
            loggedResources:
                auditLogs?.loggedResources?.map((el) => ({
                    value: el,
                    label: getEnumLabel(resourceEnum, el),
                })) || [],
            output: loggingSettings.auditLogs.output,
            verbose: loggingSettings.auditLogs.verbose,
        };
    }, [loggingSettings, moduleEnum, resourceEnum]);

    type AuditFormValuesForHook = Omit<AuditFormValues, 'output'> & { output: AuditLoggingSettingsDtoOutputEnum };

    const auditFormMethods = useForm<AuditFormValuesForHook>({
        defaultValues: auditFormDefaultValues,
        mode: 'onChange',
    });

    const {
        handleSubmit: auditHandleSubmit,
        control: auditControl,
        formState: { isDirty: auditIsDirty, isSubmitting: auditIsSubmitting },
        reset: auditReset,
    } = auditFormMethods;

    const auditFormValues = useWatch({ control: auditControl });

    useEffect(() => {
        auditReset(auditFormDefaultValues);
    }, [auditFormDefaultValues, auditReset]);

    const hasAuditFormValuesChanged = useMemo(() => auditIsDirty, [auditIsDirty]);

    const onEventFormSubmit = useCallback(
        (values: EventFormValues) => {
            if (!values || !loggingSettings) return;

            dispatch(
                actions.updateLoggingSettings({
                    auditLogs: loggingSettings.auditLogs,
                    eventLogs: {
                        logAllModules: values.logAllModules,
                        logAllResources: values.logAllResources,
                        ignoredModules: values.ignoredModules?.map((el) => el.value),
                        ignoredResources: values.ignoredResources?.map((el) => el.value),
                        loggedModules: values.loggedModules?.map((el) => el.value),
                        loggedResources: values.loggedResources?.map((el) => el.value),
                    },
                }),
            );
        },
        [dispatch, loggingSettings],
    );

    const eventFormDefaultValues = useMemo(() => {
        if (!loggingSettings) return {};
        const eventLogs = loggingSettings.eventLogs;
        return {
            ...eventLogs,
            ignoredModules:
                eventLogs?.ignoredModules?.map((el) => ({
                    value: el,
                    label: getEnumLabel(moduleEnum, el),
                })) || [],
            ignoredResources:
                eventLogs?.ignoredResources?.map((el) => ({
                    value: el,
                    label: getEnumLabel(resourceEnum, el),
                })) || [],
            loggedModules:
                eventLogs?.loggedModules?.map((el) => ({
                    value: el,
                    label: getEnumLabel(moduleEnum, el),
                })) || [],
            loggedResources:
                eventLogs?.loggedResources?.map((el) => ({
                    value: el,
                    label: getEnumLabel(resourceEnum, el),
                })) || [],
        };
    }, [loggingSettings, moduleEnum, resourceEnum]);

    const eventFormMethods = useForm<EventFormValues>({
        defaultValues: eventFormDefaultValues,
        mode: 'onChange',
    });

    const {
        handleSubmit: eventHandleSubmit,
        control: eventControl,
        formState: { isDirty: eventIsDirty, isSubmitting: eventIsSubmitting },
        reset: eventReset,
    } = eventFormMethods;

    const eventFormValues = useWatch({ control: eventControl });

    useEffect(() => {
        eventReset(eventFormDefaultValues);
    }, [eventFormDefaultValues, eventReset]);

    const hasEventFormValuesChanged = useMemo(() => eventIsDirty, [eventIsDirty]);

    const createAuditForm = useCallback(() => {
        return (
            <FormProvider {...auditFormMethods}>
                <form onSubmit={auditHandleSubmit(onAuditFormSubmit)} className="mt-2 space-y-4">
                    <Widget>
                        <div className="space-y-4">
                            <Controller
                                name="logAllModules"
                                control={auditControl}
                                render={({ field }) => (
                                    <Switch
                                        id="logAllModules"
                                        checked={field.value}
                                        onChange={field.onChange}
                                        secondaryLabel="Collect logs for all modules"
                                    />
                                )}
                            />
                            {auditFormValues.logAllModules ? (
                                <Controller
                                    name="ignoredModules"
                                    control={auditControl}
                                    render={({ field }) => (
                                        <Select
                                            id="ignoredModules"
                                            label="Select Modules to Ignore"
                                            options={moduleSelectorItems.map((item) => ({ value: item.value, label: item.label }))}
                                            value={field.value || []}
                                            onChange={(value) => field.onChange(value)}
                                            isMulti
                                        />
                                    )}
                                />
                            ) : (
                                <Controller
                                    name="loggedModules"
                                    control={auditControl}
                                    render={({ field }) => (
                                        <Select
                                            id="loggedModules"
                                            label="Select Modules to Log"
                                            options={moduleSelectorItems.map((item) => ({ value: item.value, label: item.label }))}
                                            value={field.value || []}
                                            onChange={(value) => field.onChange(value)}
                                            isMulti
                                        />
                                    )}
                                />
                            )}
                        </div>
                    </Widget>
                    <Widget title="Resource Logging">
                        <div className="space-y-4">
                            <Controller
                                name="logAllResources"
                                control={auditControl}
                                render={({ field }) => (
                                    <Switch
                                        id="logAllResources"
                                        checked={field.value}
                                        onChange={field.onChange}
                                        secondaryLabel="Collect logs for all resources"
                                    />
                                )}
                            />
                            {auditFormValues.logAllResources ? (
                                <Controller
                                    name="ignoredResources"
                                    control={auditControl}
                                    render={({ field }) => (
                                        <Select
                                            id="ignoredResources"
                                            label="Select Resources to Ignore"
                                            options={resourceSelectorItems.map((item) => ({ value: item.value, label: item.label }))}
                                            value={field.value || []}
                                            onChange={(value) => field.onChange(value)}
                                            isMulti
                                        />
                                    )}
                                />
                            ) : (
                                <Controller
                                    name="loggedResources"
                                    control={auditControl}
                                    render={({ field }) => (
                                        <Select
                                            id="loggedResources"
                                            label="Select Resources to Log"
                                            options={resourceSelectorItems.map((item) => ({ value: item.value, label: item.label }))}
                                            value={field.value || []}
                                            onChange={(value) => field.onChange(value)}
                                            isMulti
                                        />
                                    )}
                                />
                            )}
                        </div>
                    </Widget>

                    <Controller
                        name="output"
                        control={auditControl}
                        render={({ field }) => (
                            <Select
                                id="output"
                                label="Audit Logs Output Destination"
                                options={auditLogsOutputOptions.map((item) => ({ value: item.value, label: item.label }))}
                                value={field.value || ''}
                                onChange={(value: string | number) => field.onChange(value)}
                                placeholder="Select Output"
                            />
                        )}
                    />
                    <Controller
                        name="verbose"
                        control={auditControl}
                        render={({ field }) => (
                            <Switch id="verbose" checked={field.value} onChange={field.onChange} secondaryLabel="Verbose" />
                        )}
                    />
                    <div className="flex justify-end">
                        <ProgressButton
                            title={'Apply'}
                            inProgressTitle={'Applying..'}
                            disabled={auditIsSubmitting || isBusy || !hasAuditFormValuesChanged}
                            inProgress={isUpdating}
                            type="submit"
                        />
                    </div>
                </form>
            </FormProvider>
        );
    }, [
        auditFormMethods,
        auditHandleSubmit,
        onAuditFormSubmit,
        auditControl,
        auditFormValues.logAllModules,
        auditFormValues.logAllResources,
        moduleSelectorItems,
        resourceSelectorItems,
        auditLogsOutputOptions,
        auditIsSubmitting,
        isBusy,
        hasAuditFormValuesChanged,
        isUpdating,
    ]);

    const createEventForm = useCallback(() => {
        return (
            <FormProvider {...eventFormMethods}>
                <form onSubmit={eventHandleSubmit(onEventFormSubmit)} className="mt-2 space-y-4">
                    <Widget title="Module Logging">
                        <div className="space-y-4">
                            <Controller
                                name="logAllModules"
                                control={eventControl}
                                render={({ field }) => (
                                    <Switch
                                        id="logAllModules"
                                        checked={field.value}
                                        onChange={field.onChange}
                                        secondaryLabel="Collect logs for all modules"
                                    />
                                )}
                            />
                            {eventFormValues.logAllModules ? (
                                <Controller
                                    name="ignoredModules"
                                    control={eventControl}
                                    render={({ field }) => (
                                        <Select
                                            id="ignoredModules"
                                            label="Select Modules to Ignore"
                                            options={moduleSelectorItems.map((item) => ({ value: item.value, label: item.label }))}
                                            value={field.value || []}
                                            onChange={(value) => field.onChange(value)}
                                            isMulti
                                        />
                                    )}
                                />
                            ) : (
                                <Controller
                                    name="loggedModules"
                                    control={eventControl}
                                    render={({ field }) => (
                                        <Select
                                            id="loggedModules"
                                            label="Select Modules to Log"
                                            options={moduleSelectorItems.map((item) => ({ value: item.value, label: item.label }))}
                                            value={field.value || []}
                                            onChange={(value) => field.onChange(value)}
                                            isMulti
                                        />
                                    )}
                                />
                            )}
                        </div>
                    </Widget>
                    <Widget title="Resource Logging">
                        <div className="space-y-4">
                            <Controller
                                name="logAllResources"
                                control={eventControl}
                                render={({ field }) => (
                                    <Switch
                                        id="logAllResources"
                                        checked={field.value}
                                        onChange={field.onChange}
                                        secondaryLabel="Collect logs for all resources"
                                    />
                                )}
                            />
                            {eventFormValues.logAllResources ? (
                                <Controller
                                    name="ignoredResources"
                                    control={eventControl}
                                    render={({ field }) => (
                                        <Select
                                            id="ignoredResources"
                                            label="Select Resources to Ignore"
                                            options={resourceSelectorItems.map((item) => ({ value: item.value, label: item.label }))}
                                            value={field.value || []}
                                            onChange={(value) => field.onChange(value)}
                                            isMulti
                                        />
                                    )}
                                />
                            ) : (
                                <Controller
                                    name="loggedResources"
                                    control={eventControl}
                                    render={({ field }) => (
                                        <Select
                                            id="loggedResources"
                                            label="Select Resources to Log"
                                            options={resourceSelectorItems.map((item) => ({ value: item.value, label: item.label }))}
                                            value={field.value || []}
                                            onChange={(value) => field.onChange(value)}
                                            isMulti
                                        />
                                    )}
                                />
                            )}
                        </div>
                    </Widget>
                    <div className="flex justify-end mt-4">
                        <ProgressButton
                            title={'Apply'}
                            inProgressTitle={'Applying..'}
                            disabled={eventIsSubmitting || isBusy || !hasEventFormValuesChanged}
                            inProgress={isUpdating}
                            type="submit"
                        />
                    </div>
                </form>
            </FormProvider>
        );
    }, [
        eventFormMethods,
        eventHandleSubmit,
        onEventFormSubmit,
        eventControl,
        eventFormValues.logAllModules,
        eventFormValues.logAllResources,
        moduleSelectorItems,
        resourceSelectorItems,
        eventIsSubmitting,
        isBusy,
        hasEventFormValuesChanged,
        isUpdating,
    ]);

    return (
        <Container>
            <Widget
                title="Logging Settings"
                titleSize="large"
                busy={isBusy}
                refreshAction={getFreshLoggingSettings}
                widgetLockName={LockWidgetNameEnum.LoggingSettings}
            >
                <TabLayout
                    noBorder
                    tabs={[
                        {
                            title: 'Audit logs',
                            content: createAuditForm(),
                        },
                        {
                            title: 'Event logs',
                            content: createEventForm(),
                        },
                    ]}
                />
            </Widget>
        </Container>
    );
};

export default LoggingSetting;
