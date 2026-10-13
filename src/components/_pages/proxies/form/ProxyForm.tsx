import Widget from 'components/Widget';
import { useCallback, useMemo } from 'react';
import { useAreDefaultValuesSame, useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';

import ProgressButton from 'components/ProgressButton';
import Button from 'components/Button';
import Container from 'components/Container';
import TextInput from 'components/TextInput';
import TextArea from 'components/TextArea';
import { validateAlphaNumericWithSpecialChars, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import { actions as proxiesActions, selectors as proxiesSelectors } from 'ducks/proxies';

interface ProxyFormValues {
    name: string;
    description: string;
}

interface ProxyFormProps {
    onCancel?: () => void;
    onSuccess?: () => void;
}

export const ProxyForm = ({ onCancel, onSuccess }: ProxyFormProps = {}) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const isCreatingProxy = useSelector(proxiesSelectors.isCreating);
    const createProxySucceeded = useSelector(proxiesSelectors.createProxySucceeded);

    const isBusy = useMemo(() => isCreatingProxy, [isCreatingProxy]);

    const defaultValues: ProxyFormValues = useMemo(() => {
        return {
            name: '',
            description: '',
        };
    }, []);

    const areDefaultValuesSame = useAreDefaultValuesSame(defaultValues as unknown as Record<string, unknown>);

    const methods = useForm<ProxyFormValues>({ defaultValues, mode: 'onChange' });

    const {
        handleSubmit,
        control,
        formState: { isSubmitting, isValid },
    } = methods;

    const formValues = useWatch({ control });

    useRunOnSuccessfulFinish(isCreatingProxy, createProxySucceeded, onSuccess);

    const handleCancel = useCallback(() => {
        if (onCancel) {
            onCancel();
        } else {
            void navigate('../proxies');
        }
    }, [navigate, onCancel]);

    const onSubmit = useCallback(
        (values: ProxyFormValues) => {
            dispatch(
                proxiesActions.createProxy({
                    name: values.name,
                    description: values.description || undefined,
                }),
            );
        },
        [dispatch],
    );

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Widget noBorder busy={isBusy}>
                    <div className="space-y-4">
                        <Controller
                            name="name"
                            rules={buildValidationRules([validateRequired(), validateAlphaNumericWithSpecialChars()])}
                            control={control}
                            render={({ field, fieldState }) => (
                                <TextInput
                                    {...field}
                                    id="name"
                                    type="text"
                                    label="Proxy Name"
                                    required
                                    placeholder="Enter the Proxy Name"
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                />
                            )}
                        />

                        <Controller
                            name="description"
                            control={control}
                            render={({ field, fieldState }) => (
                                <TextArea
                                    {...field}
                                    id="description"
                                    label="Description"
                                    placeholder="Enter the Description"
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                    rows={4}
                                />
                            )}
                        />

                        <Container className="flex-row justify-end modal-footer" gap={4}>
                            <Button variant="outline" onClick={handleCancel} disabled={isSubmitting} type="button">
                                Cancel
                            </Button>
                            <ProgressButton
                                title={'Create'}
                                inProgressTitle={'Creating...'}
                                inProgress={isSubmitting}
                                disabled={areDefaultValuesSame(formValues) || isSubmitting || !isValid || isBusy}
                                type="submit"
                            />
                        </Container>
                    </div>
                </Widget>
            </form>
        </FormProvider>
    );
};
