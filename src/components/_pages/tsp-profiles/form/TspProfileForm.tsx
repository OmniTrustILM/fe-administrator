import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router';

import AttributeEditor from 'components/Attributes/AttributeEditor';
import Breadcrumb from 'components/Breadcrumb';
import Button from 'components/Button';
import Container from 'components/Container';
import ProgressButton from 'components/ProgressButton';
import TextInput from 'components/TextInput';
import Widget from 'components/Widget';

import { actions as customAttributesActions, selectors as customAttributesSelectors } from 'ducks/customAttributes';
import { actions as tspProfileActions, selectors as tspProfileSelectors } from 'ducks/tsp-profiles';

import { Resource } from 'types/openapi';
import { collectFormAttributes, mapProfileAttribute, transformAttributes } from 'utils/attributes/attributes';
import { validateAlphaNumericWithoutAccents, validateLength, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';

interface FormValues {
    name: string;
    description: string;
}

export const TspProfileForm = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { id } = useParams();
    const editMode = useMemo(() => !!id, [id]);

    const tspProfile = useSelector(tspProfileSelectors.tspProfile);
    const isFetchingDetail = useSelector(tspProfileSelectors.isFetchingDetail);
    const isCreating = useSelector(tspProfileSelectors.isCreating);
    const isUpdating = useSelector(tspProfileSelectors.isUpdating);

    const isFetchingResourceCustomAttributes = useSelector(customAttributesSelectors.isFetchingResourceCustomAttributes);
    const multipleResourceCustomAttributes = useSelector(
        customAttributesSelectors.multipleResourceCustomAttributes([Resource.TspProfiles]),
    );

    const isBusy = useMemo(
        () => isFetchingDetail || isCreating || isUpdating || isFetchingResourceCustomAttributes,
        [isFetchingDetail, isCreating, isUpdating, isFetchingResourceCustomAttributes],
    );

    useEffect(() => {
        dispatch(customAttributesActions.loadMultipleResourceCustomAttributes([{ resource: Resource.TspProfiles, customAttributes: [] }]));
    }, [dispatch]);

    useEffect(() => {
        if (editMode && id) {
            dispatch(tspProfileActions.getTspProfile({ uuid: id }));
        }
    }, [dispatch, editMode, id]);

    const initialCustomAttributes = useMemo(
        () =>
            mapProfileAttribute(
                tspProfile,
                multipleResourceCustomAttributes,
                Resource.TspProfiles,
                'customAttributes',
                '__attributes__customTspProfile__',
            ),
        [tspProfile, multipleResourceCustomAttributes],
    );

    const defaultValues = useMemo<FormValues>(
        () => ({
            name: '',
            description: '',
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
        if (!editMode || !id || tspProfile?.uuid !== id || isFetchingDetail) return undefined;

        const attributeInitialValues = mapProfileAttribute(
            tspProfile,
            multipleResourceCustomAttributes,
            Resource.TspProfiles,
            'customAttributes',
            '__attributes__customTspProfile__',
        );

        return {
            name: tspProfile.name || '',
            description: tspProfile.description || '',
            ...transformAttributes(attributeInitialValues ?? []),
        };
    }, [editMode, id, tspProfile, isFetchingDetail, multipleResourceCustomAttributes]);

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
                description: values.description || undefined,
                customAttributes: collectFormAttributes('customTspProfile', multipleResourceCustomAttributes[Resource.TspProfiles], values),
            };

            if (editMode && id) {
                dispatch(tspProfileActions.updateTspProfile({ uuid: id, tspProfileRequestDto: requestDto }));
            } else {
                dispatch(tspProfileActions.createTspProfile({ tspProfileRequestDto: requestDto }));
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
                    { label: 'TSP Profiles', href: `/${Resource.TspProfiles.toLowerCase()}` },
                    {
                        label: editMode ? tspProfile?.name || 'Edit TSP Profile' : 'Create TSP Profile',
                        href: '',
                    },
                ]}
            />

            <FormProvider {...methods}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="flex flex-col gap-4">
                        <Widget title={editMode ? 'Edit TSP Profile' : 'Create TSP Profile'} busy={isBusy} titleSize="large">
                            <div className="space-y-4">
                                <Controller
                                    name="name"
                                    control={control}
                                    rules={buildValidationRules([validateRequired(), validateAlphaNumericWithoutAccents()])}
                                    render={({ field, fieldState }) => (
                                        <TextInput
                                            {...field}
                                            id="name"
                                            label="Name"
                                            type="text"
                                            required
                                            invalid={fieldState.error && fieldState.isTouched}
                                            error={getFieldErrorMessage(fieldState)}
                                        />
                                    )}
                                />

                                <Controller
                                    name="description"
                                    control={control}
                                    rules={buildValidationRules([validateLength(0, 300)])}
                                    render={({ field, fieldState }) => (
                                        <TextInput
                                            {...field}
                                            id="description"
                                            label="Description"
                                            type="text"
                                            invalid={fieldState.error && fieldState.isTouched}
                                            error={getFieldErrorMessage(fieldState)}
                                        />
                                    )}
                                />
                            </div>
                        </Widget>

                        <Widget title="Custom Attributes" busy={isFetchingResourceCustomAttributes} titleSize="large">
                            <AttributeEditor
                                id="customTspProfile"
                                attributeDescriptors={multipleResourceCustomAttributes[Resource.TspProfiles] || []}
                                attributes={editMode ? tspProfile?.customAttributes : undefined}
                            />
                        </Widget>

                        <Container className="flex-row justify-end" gap={4}>
                            <Button variant="outline" onClick={onCancel} disabled={isSubmitting} type="button">
                                Cancel
                            </Button>
                            <ProgressButton
                                title={editMode ? 'Update' : 'Create'}
                                inProgress={isSubmitting || isCreating || isUpdating}
                                inProgressTitle={editMode ? 'Updating...' : 'Creating...'}
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
