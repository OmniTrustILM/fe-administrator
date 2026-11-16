import Button from 'components/Button';
import Container from 'components/Container';
import ProgressButton from 'components/ProgressButton';
import { actions, selectors } from 'ducks/settings';

import { useCallback, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useRunOnFailedFinish, useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { SIGNING_MAX_ITEMS_PER_REQUEST_PATH } from 'utils/platform-settings';
import TunableField, { coreRefusal } from '../TunableField';
import { integerText, parseOptionalInteger } from '../tunables';
import { MAX_ITEMS_PER_REQUEST } from './SigningSettings.tunables';

type FormValues = Record<typeof MAX_ITEMS_PER_REQUEST.name, string>;

interface SigningSettingsFormProps {
    onCancel?: () => void;
    onSuccess?: () => void;
}

const SigningSettingsForm = ({ onCancel, onSuccess }: SigningSettingsFormProps = {}) => {
    const dispatch = useDispatch();

    const platformSettings = useSelector(selectors.platformSettings);
    const isFetchingPlatform = useSelector(selectors.isFetchingPlatform);
    const isUpdatingPlatform = useSelector(selectors.isUpdatingPlatform);
    const updateSucceeded = useSelector(selectors.updatePlatformSettingsSucceeded);
    const fieldErrors = useSelector(selectors.platformSettingsFieldErrors);
    const isBusy = isFetchingPlatform || isUpdatingPlatform;

    const storedLimit = platformSettings?.signing?.maxItemsPerRequest;
    const defaultValues = useMemo<FormValues>(() => ({ maxItemsPerRequest: integerText(storedLimit) }), [storedLimit]);

    const {
        handleSubmit,
        control,
        formState: { isDirty, isSubmitting, isValid },
        reset,
        setError,
    } = useForm<FormValues>({
        defaultValues,
        mode: 'onChange',
    });

    useEffect(() => {
        reset(defaultValues);
    }, [defaultValues, reset]);

    useEffect(() => {
        if (!platformSettings) {
            dispatch(actions.getPlatformSettings());
        }
    }, [dispatch, platformSettings]);

    const onSubmit = useCallback(
        (values: FormValues) => {
            // Core stores the signing section as sent. An emptied field therefore returns the limit to the platform default.
            const maxItemsPerRequest = parseOptionalInteger(values.maxItemsPerRequest);
            dispatch(actions.updatePlatformSettings({ signing: { maxItemsPerRequest } }));
        },
        [dispatch],
    );

    const showRefusal = useCallback(() => {
        const refusal = fieldErrors?.[SIGNING_MAX_ITEMS_PER_REQUEST_PATH];
        if (refusal) {
            setError(MAX_ITEMS_PER_REQUEST.name, coreRefusal(refusal));
        }
    }, [fieldErrors, setError]);

    useRunOnSuccessfulFinish(isUpdatingPlatform, updateSucceeded, onSuccess);
    useRunOnFailedFinish(isUpdatingPlatform, updateSucceeded, showRefusal);

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <TunableField control={control} tunable={MAX_ITEMS_PER_REQUEST} />

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
    );
};

export default SigningSettingsForm;
