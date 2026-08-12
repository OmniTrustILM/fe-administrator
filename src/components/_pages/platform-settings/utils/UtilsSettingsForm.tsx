import TextInput from 'components/TextInput';
import ProgressButton from 'components/ProgressButton';
import Button from 'components/Button';
import Container from 'components/Container';
import { actions, selectors } from 'ducks/settings';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { getFieldErrorMessage } from 'utils/validators-helper';
import { useDispatch, useSelector } from 'react-redux';
import type { SettingsPlatformModel } from 'types/settings';
import {
    buildCbomHealthPath,
    CBOM_REPOSITORY_HEALTH_WARNING_MESSAGE,
    validateCbomRepositoryUrl,
    validateHealthUrl,
    validateUrl,
} from './UtilsSettingsForm.validation';

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
};

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

    const emptySettings = useMemo(() => ({ utils: {} }), []);

    const defaultValues = useMemo(() => {
        return {
            utilsServiceUrl: platformSettings?.utils?.utilsServiceUrl || '',
            cbomRepositoryUrl: platformSettings?.utils?.cbomRepositoryUrl || '',
        };
    }, [platformSettings?.utils?.utilsServiceUrl, platformSettings?.utils?.cbomRepositoryUrl]);

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
    const cbomRepositoryUrlValue = useWatch({ control, name: 'cbomRepositoryUrl' });

    useEffect(() => {
        if (!cbomRepositoryUrlValue || validateCbomRepositoryUrl(cbomRepositoryUrlValue)) {
            setCbomRepositoryHealthWarning(undefined);
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
            const requestSettings: SettingsPlatformModel =
                values.utilsServiceUrl || values.cbomRepositoryUrl
                    ? {
                          utils: {
                              utilsServiceUrl: values.utilsServiceUrl,
                              cbomRepositoryUrl: values.cbomRepositoryUrl,
                          },
                      }
                    : emptySettings;
            dispatch(actions.updatePlatformSettings(requestSettings));
        },
        [dispatch, emptySettings],
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
                    rules={{
                        validate: async (value) => {
                            const urlError = validateUrl(value);
                            if (urlError) return urlError;
                            if (value) {
                                return await debouncingUtilsHealthValidation.validateHealth(
                                    value,
                                    '/health',
                                    'Please enter reachable and valid Utils Service URL (with /health endpoint).',
                                );
                            }
                            return undefined;
                        },
                    }}
                    render={({ field, fieldState }) => (
                        <TextInput
                            {...field}
                            id="utilsServiceUrl"
                            type="text"
                            label="Utils Service URL"
                            placeholder="Utils Service URL"
                            invalid={fieldState.error && fieldState.isTouched}
                            error={getFieldErrorMessage(fieldState)}
                        />
                    )}
                />

                <Controller
                    name="cbomRepositoryUrl"
                    control={control}
                    rules={{
                        validate: async (value) => {
                            return validateCbomRepositoryUrl(value);
                        },
                    }}
                    render={({ field, fieldState }) => (
                        <>
                            <TextInput
                                {...field}
                                id="cbomRepositoryUrl"
                                type="text"
                                label="CBOM Repository URL"
                                placeholder="CBOM Repository URL"
                                invalid={fieldState.error && fieldState.isTouched}
                                error={getFieldErrorMessage(fieldState)}
                            />
                            {!fieldState.error && cbomRepositoryHealthWarning && (
                                <p className="mt-1 text-sm text-warning" data-testid="cbom-repository-health-warning">
                                    {cbomRepositoryHealthWarning}
                                </p>
                            )}
                        </>
                    )}
                />

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
