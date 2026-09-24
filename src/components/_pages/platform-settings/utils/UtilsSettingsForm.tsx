import TextInput from 'components/TextInput';
import ProgressButton from 'components/ProgressButton';
import Button from 'components/Button';
import Container from 'components/Container';
import { actions, selectors } from 'ducks/settings';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { getFieldErrorMessage } from 'utils/validators-helper';
import { composeValidators, validateMaximum, validateMinimum, validatePositiveInteger } from 'utils/validators';
import { useDispatch, useSelector } from 'react-redux';
import type { SettingsPlatformModel } from 'types/settings';
import {
    buildCbomHealthPath,
    CBOM_REPOSITORY_HEALTH_WARNING_MESSAGE,
    UTILS_SERVICE_HEALTH_WARNING_MESSAGE,
    validateCbomRepositoryUrl,
    validateHealthUrl,
    validateUrl,
} from './UtilsSettingsForm.validation';
import { CBOM_SYNC_TUNABLES, type CbomSyncTunableName, describeTunable, integerText, parseOptionalInteger } from './UtilsSettings.tunables';

class DebouncingHealthValidation {
    clearTimeout = () => {};
    validateHealth = (url: string | undefined, path: string, error: string) => {
        return new Promise<string | undefined>((resolve) => {
            this.clearTimeout();

            const timerId = setTimeout(() => {
                resolve(validateHealthUrl(url, path, error));
            }, 600);

            this.clearTimeout = () => {
                clearTimeout(timerId);
                resolve(undefined);
            };
        });
    };
}

type FormValues = {
    utilsServiceUrl?: string;
    cbomRepositoryUrl?: string;
} & Partial<Record<CbomSyncTunableName, string>>;

interface UtilsSettingsFormProps {
    onCancel?: () => void;
    onSuccess?: () => void;
}

const UtilsSettingsForm = ({ onCancel, onSuccess }: UtilsSettingsFormProps = {}) => {
    const dispatch = useDispatch();

    const platformSettings = useSelector(selectors.platformSettings);
    const isFetchingPlatform = useSelector(selectors.isFetchingPlatform);
    const isUpdatingPlatform = useSelector(selectors.isUpdatingPlatform);

    const isBusy = useMemo(() => isFetchingPlatform || isUpdatingPlatform, [isFetchingPlatform, isUpdatingPlatform]);

    const utilsServiceUrl = platformSettings?.utils?.utilsServiceUrl;
    const cbomRepositoryUrl = platformSettings?.utils?.cbomRepositoryUrl;
    const cbomSyncOverlapSeconds = platformSettings?.utils?.cbomSyncOverlapSeconds;
    const cbomSyncSkippedRetryRuns = platformSettings?.utils?.cbomSyncSkippedRetryRuns;
    const cbomSyncMaxIngestDocuments = platformSettings?.utils?.cbomSyncMaxIngestDocuments;
    const cbomSyncSkipRetentionDays = platformSettings?.utils?.cbomSyncSkipRetentionDays;

    // Keyed on the values, not the utils object: every fetch builds a new object, and a reset on identity alone would
    // wipe an edit in progress whenever a refetch lands with the same content.
    const defaultValues = useMemo<FormValues>(
        () => ({
            utilsServiceUrl: utilsServiceUrl || '',
            cbomRepositoryUrl: cbomRepositoryUrl || '',
            cbomSyncOverlapSeconds: integerText(cbomSyncOverlapSeconds),
            cbomSyncSkippedRetryRuns: integerText(cbomSyncSkippedRetryRuns),
            cbomSyncMaxIngestDocuments: integerText(cbomSyncMaxIngestDocuments),
            cbomSyncSkipRetentionDays: integerText(cbomSyncSkipRetentionDays),
        }),
        [
            utilsServiceUrl,
            cbomRepositoryUrl,
            cbomSyncOverlapSeconds,
            cbomSyncSkippedRetryRuns,
            cbomSyncMaxIngestDocuments,
            cbomSyncSkipRetentionDays,
        ],
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
    const [utilsServiceHealthWarning, setUtilsServiceHealthWarning] = useState<string | undefined>(undefined);
    const [cbomRepositoryHealthWarning, setCbomRepositoryHealthWarning] = useState<string | undefined>(undefined);

    // Reset form when platformSettings change
    useEffect(() => {
        reset(defaultValues);
    }, [defaultValues, reset]);

    useEffect(() => {
        if (!platformSettings) {
            dispatch(actions.getPlatformSettings());
        }
    }, [dispatch, platformSettings]);

    const debouncingUtilsHealthValidation = useMemo(() => new DebouncingHealthValidation(), []);
    const debouncingCbomHealthValidation = useMemo(() => new DebouncingHealthValidation(), []);
    const utilsServiceUrlValue = useWatch({ control, name: 'utilsServiceUrl' });
    const cbomRepositoryUrlValue = useWatch({ control, name: 'cbomRepositoryUrl' });

    // The health probe is a warning, not a validation error, as for the CBOM Repository URL below: a probe that fails
    // (service down, /health not reachable from the browser) is shown, and it runs on the stored URL as soon as the
    // form opens. As an error it would disable Save for the whole form, the CBOM sync tunables included, with the
    // message hidden until the URL field itself was touched.
    useEffect(() => {
        // Cleared before every probe as well as for an empty or malformed value: the warning on screen always belongs
        // to the URL in the field, never to the one probed before it.
        setUtilsServiceHealthWarning(undefined);
        if (!utilsServiceUrlValue || validateUrl(utilsServiceUrlValue)) {
            return;
        }

        let active = true;

        void debouncingUtilsHealthValidation
            .validateHealth(utilsServiceUrlValue, '/health', UTILS_SERVICE_HEALTH_WARNING_MESSAGE)
            .then((warningMessage) => {
                if (!active) return;
                setUtilsServiceHealthWarning(warningMessage);
            });

        return () => {
            active = false;
            debouncingUtilsHealthValidation.clearTimeout();
        };
    }, [utilsServiceUrlValue, debouncingUtilsHealthValidation]);

    useEffect(() => {
        setCbomRepositoryHealthWarning(undefined);
        if (!cbomRepositoryUrlValue || validateCbomRepositoryUrl(cbomRepositoryUrlValue)) {
            return;
        }

        let active = true;

        void debouncingCbomHealthValidation
            .validateHealth(cbomRepositoryUrlValue, buildCbomHealthPath(cbomRepositoryUrlValue), CBOM_REPOSITORY_HEALTH_WARNING_MESSAGE)
            .then((warningMessage) => {
                if (!active) return;
                setCbomRepositoryHealthWarning(warningMessage);
            });

        return () => {
            active = false;
            debouncingCbomHealthValidation.clearTimeout();
        };
    }, [cbomRepositoryUrlValue, debouncingCbomHealthValidation]);

    const onSubmit = useCallback(
        (values: FormValues) => {
            // The utils section is stored as sent: a URL left empty is cleared, a tunable left empty returns to the
            // platform default. Empty fields are left out of the body rather than sent as empty strings.
            const utils: NonNullable<SettingsPlatformModel['utils']> = {
                utilsServiceUrl: values.utilsServiceUrl?.trim() || undefined,
                cbomRepositoryUrl: values.cbomRepositoryUrl?.trim() || undefined,
            };
            for (const tunable of CBOM_SYNC_TUNABLES) {
                utils[tunable.name] = parseOptionalInteger(values[tunable.name]);
            }
            const requestSettings: SettingsPlatformModel = { utils };
            dispatch(actions.updatePlatformSettings(requestSettings));
        },
        [dispatch],
    );

    const wasUpdating = useRef(isUpdatingPlatform);

    useEffect(() => {
        if (wasUpdating.current && !isUpdatingPlatform) {
            if (onSuccess) {
                onSuccess();
            }
        }
        wasUpdating.current = isUpdatingPlatform;
    }, [isUpdatingPlatform, onSuccess]);

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Controller
                    name="utilsServiceUrl"
                    control={control}
                    rules={{ validate: (value) => validateUrl(value) }}
                    render={({ field, fieldState }) => {
                        const warning = fieldState.error ? undefined : utilsServiceHealthWarning;
                        return (
                            <>
                                <TextInput
                                    {...field}
                                    id="utilsServiceUrl"
                                    type="text"
                                    label="Utils Service URL"
                                    placeholder="Utils Service URL"
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                    ariaDescribedBy={warning ? 'utils-service-health-warning' : undefined}
                                />
                                {/* Always mounted: a live region announces changes, not its own arrival with text. */}
                                <p
                                    id="utils-service-health-warning"
                                    aria-live="polite"
                                    className={warning ? 'mt-1 text-sm text-warning' : 'text-sm text-warning'}
                                    data-testid="utils-service-health-warning"
                                >
                                    {warning ?? ''}
                                </p>
                            </>
                        );
                    }}
                />

                <Controller
                    name="cbomRepositoryUrl"
                    control={control}
                    rules={{ validate: (value) => validateCbomRepositoryUrl(value) }}
                    render={({ field, fieldState }) => {
                        const warning = fieldState.error ? undefined : cbomRepositoryHealthWarning;
                        return (
                            <>
                                <TextInput
                                    {...field}
                                    id="cbomRepositoryUrl"
                                    type="text"
                                    label="CBOM Repository URL"
                                    placeholder="CBOM Repository URL"
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                    ariaDescribedBy={warning ? 'cbom-repository-health-warning' : undefined}
                                />
                                <p
                                    id="cbom-repository-health-warning"
                                    aria-live="polite"
                                    className={warning ? 'mt-1 text-sm text-warning' : 'text-sm text-warning'}
                                    data-testid="cbom-repository-health-warning"
                                >
                                    {warning ?? ''}
                                </p>
                            </>
                        );
                    }}
                />

                {CBOM_SYNC_TUNABLES.map((tunable) => (
                    <Controller
                        key={tunable.name}
                        name={tunable.name}
                        control={control}
                        rules={{
                            validate: composeValidators(
                                validatePositiveInteger(),
                                validateMinimum(tunable.min),
                                validateMaximum(tunable.max),
                            ),
                        }}
                        render={({ field, fieldState }) => (
                            <div>
                                <TextInput
                                    {...field}
                                    id={tunable.name}
                                    type="text"
                                    inputMode="numeric"
                                    label={`${tunable.label} (${tunable.unit})`}
                                    placeholder={String(tunable.defaultValue)}
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                    ariaDescribedBy={`${tunable.name}-help`}
                                />
                                <p id={`${tunable.name}-help`} className="text-sm text-content-subtle mt-2">
                                    {tunable.help} Clear to return to the platform default ({describeTunable(tunable, tunable.defaultValue)}
                                    ).
                                </p>
                            </div>
                        )}
                    />
                ))}

                <Container className="flex-row justify-end modal-footer" gap={4}>
                    <Button variant="outline" onClick={onCancel} disabled={isSubmitting || isBusy} type="button">
                        Cancel
                    </Button>
                    <ProgressButton
                        title={'Save'}
                        inProgressTitle={'Saving...'}
                        inProgress={isSubmitting || isBusy}
                        disabled={!isDirty || isSubmitting || !isValid || isBusy}
                        type="submit"
                    />
                </Container>
            </form>
        </FormProvider>
    );
};

export default UtilsSettingsForm;
