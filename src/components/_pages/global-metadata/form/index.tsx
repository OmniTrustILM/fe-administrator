import ProgressButton from 'components/ProgressButton';
import Widget from 'components/Widget';

import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { actions, selectors } from 'ducks/globalMetadata';
import { useCallback, useEffect, useMemo } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';
import Button from 'components/Button';
import Container from 'components/Container';
import Checkbox from 'components/Checkbox';
import TextInput from 'components/TextInput';
import type { GlobalMetadataCreateRequestModel, GlobalMetadataUpdateRequestModel } from 'types/globalMetadata';
import { AttributeContentType, PlatformEnum } from 'types/openapi';
import { validateAlphaNumericWithSpecialChars, validateLength, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import Select from 'components/Select';
import Label from 'components/Label';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';

type GlobalMetadataFormProps = Readonly<{
    globalMetadataId?: string;
    onCancel?: () => void;
    onSuccess?: () => void;
}>;

export default function GlobalMetadataForm({ globalMetadataId, onCancel, onSuccess }: GlobalMetadataFormProps) {
    const dispatch = useDispatch();

    const { id: routeId } = useParams();
    const id = globalMetadataId || routeId;
    const editMode = useMemo(() => !!id, [id]);

    const globalMetadataDetail = useSelector(selectors.globalMetadata);
    const isFetchingDetail = useSelector(selectors.isFetchingDetail);
    const isCreating = useSelector(selectors.isCreating);
    const isUpdating = useSelector(selectors.isUpdating);
    const createGlobalMetadataSucceeded = useSelector(selectors.createGlobalMetadataSucceeded);
    const updateGlobalMetadataSucceeded = useSelector(selectors.updateGlobalMetadataSucceeded);

    const attributeContentTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.AttributeContentType));

    const isBusy = useMemo(() => isFetchingDetail || isCreating || isUpdating, [isCreating, isFetchingDetail, isUpdating]);

    const defaultValuesCreate: GlobalMetadataCreateRequestModel = useMemo(
        () => ({
            name: '',
            label: '',
            description: '',
            contentType: AttributeContentType.Text,
            group: '',
            visible: true,
        }),
        [],
    );
    const defaultValuesUpdate: GlobalMetadataUpdateRequestModel = useMemo(
        () => globalMetadataDetail ?? defaultValuesCreate,
        [globalMetadataDetail, defaultValuesCreate],
    );

    const methods = useForm<GlobalMetadataCreateRequestModel>({
        defaultValues: editMode ? defaultValuesUpdate : defaultValuesCreate,
        mode: 'onChange',
    });

    const {
        handleSubmit,
        control,
        formState: { isDirty, isSubmitting, isValid },
    } = methods;

    const onSubmit = useCallback(
        (values: GlobalMetadataCreateRequestModel) =>
            editMode
                ? dispatch(
                      actions.updateGlobalMetadata({
                          uuid: id!,
                          globalMetadataUpdateRequest: values,
                      }),
                  )
                : dispatch(actions.createGlobalMetadata(values)),
        [dispatch, id, editMode],
    );

    useEffect(() => {
        if (editMode && id && id !== globalMetadataDetail?.uuid) {
            dispatch(actions.getGlobalMetadata(id));
        }
    }, [dispatch, editMode, id, globalMetadataDetail?.uuid]);

    useRunOnSuccessfulFinish(isCreating, createGlobalMetadataSucceeded, onSuccess);
    useRunOnSuccessfulFinish(isUpdating, updateGlobalMetadataSucceeded, onSuccess);

    const contentTypeOptions = useMemo(
        () =>
            Object.values(AttributeContentType).map((contentType) => ({
                value: contentType,
                label: getEnumLabel(attributeContentTypeEnum, contentType),
            })),
        [attributeContentTypeEnum],
    );

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Widget noBorder busy={isBusy}>
                    <div className="space-y-4">
                        <Controller
                            name="name"
                            control={control}
                            rules={buildValidationRules([validateRequired(), validateAlphaNumericWithSpecialChars()])}
                            render={({ field, fieldState }) => (
                                <TextInput
                                    {...field}
                                    id="name"
                                    type="text"
                                    label="Name"
                                    required
                                    disabled={editMode}
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                />
                            )}
                        />

                        <Controller
                            name="label"
                            control={control}
                            rules={buildValidationRules([validateRequired(), validateAlphaNumericWithSpecialChars()])}
                            render={({ field, fieldState }) => (
                                <TextInput
                                    {...field}
                                    id="label"
                                    type="text"
                                    label="Label"
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
                                    type="text"
                                    label="Description"
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                />
                            )}
                        />

                        <div>
                            <Label htmlFor="contentType" className="block text-sm font-medium mb-2 text-gray-700 dark:text-white">
                                Content Type <span className="text-red-500">*</span>
                            </Label>
                            <Controller
                                name="contentType"
                                control={control}
                                rules={buildValidationRules([validateRequired()])}
                                render={({ field, fieldState }) => (
                                    <>
                                        <Select
                                            id="contentType"
                                            value={field.value || ''}
                                            onChange={(value) => {
                                                field.onChange(value);
                                            }}
                                            options={contentTypeOptions}
                                            placeholder="Content Type"
                                            disabled={editMode}
                                            placement="bottom"
                                        />
                                        {fieldState.error && fieldState.isTouched && (
                                            <p className="mt-1 text-sm text-red-600">
                                                {typeof fieldState.error === 'string'
                                                    ? fieldState.error
                                                    : fieldState.error?.message || 'Invalid value'}
                                            </p>
                                        )}
                                    </>
                                )}
                            />
                        </div>

                        <Controller
                            name="group"
                            control={control}
                            rules={buildValidationRules([validateAlphaNumericWithSpecialChars()])}
                            render={({ field, fieldState }) => (
                                <TextInput
                                    {...field}
                                    id="group"
                                    type="text"
                                    label="Group"
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                />
                            )}
                        />

                        <Controller
                            name="visible"
                            control={control}
                            render={({ field }) => (
                                <Checkbox id="visible" checked={field.value ?? false} onChange={field.onChange} label="Visible" />
                            )}
                        />

                        <Container className="flex-row justify-end modal-footer" gap={4}>
                            <Button variant="outline" onClick={onCancel} disabled={isSubmitting} type="button">
                                Cancel
                            </Button>
                            <ProgressButton
                                title={editMode ? 'Update' : 'Create'}
                                inProgressTitle={editMode ? 'Updating...' : 'Creating...'}
                                inProgress={isSubmitting}
                                disabled={!isDirty || isSubmitting || !isValid}
                                type="submit"
                            />
                        </Container>
                    </div>
                </Widget>
            </form>
        </FormProvider>
    );
}
