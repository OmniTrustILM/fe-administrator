import Widget from 'components/Widget';
import { actions, selectors } from 'ducks/oids';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    type CustomOidEntryRequestDto,
    type CustomOidEntryUpdateRequestDto,
    type CustomOidEntryUpdateRequestDtoAdditionalProperties,
    OidCategory,
    PlatformEnum,
} from 'types/openapi';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { validateLength, validateRequired, validateOid, validateOidCode } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import Select from 'components/Select';
import Button from 'components/Button';
import Container from 'components/Container';
import ProgressButton from 'components/ProgressButton';
import { selectors as enumSelectors } from 'ducks/enums';
import MultipleValueTextInput from 'components/Input/MultipleValueTextInput';
import TextInput from 'components/TextInput';
import TextArea from 'components/TextArea';
import Label from 'components/Label';

type CustomOIDFormProps = Readonly<{
    oidId?: string;
    onCancel: () => void;
    onSuccess?: () => void;
}>;

interface FormValues {
    oid: string;
    displayName: string;
    description: string;
    category: string;
    code?: string;
    alternativeCode?: string[];
}

export default function CustomOIDForm({ oidId, onCancel, onSuccess }: CustomOIDFormProps) {
    const dispatch = useDispatch();

    const editMode = useMemo(() => !!oidId, [oidId]);

    const oidSelector = useSelector(selectors.oid);
    const isFetching = useSelector(selectors.isFetching);
    const isCreating = useSelector(selectors.isCreating);
    const isUpdating = useSelector(selectors.isUpdating);

    const [oid, setOid] = useState<CustomOidEntryRequestDto>();

    useEffect(() => {
        if (editMode && oidId) {
            dispatch(actions.getOID({ oid: oidId }));
        }
    }, [dispatch, editMode, oidId]);

    useEffect(() => {
        if (editMode && oidSelector?.oid === oidId) {
            setOid(oidSelector);
        }
    }, [dispatch, editMode, oidId, oidSelector]);

    const isBusy = useMemo(() => isFetching || isCreating || isUpdating, [isFetching, isCreating, isUpdating]);

    const submitTitle = useMemo(() => (editMode ? 'Save' : 'Create'), [editMode]);

    const inProgressTitle = useMemo(() => (editMode ? 'Saving...' : 'Creating...'), [editMode]);

    const oidCategoryEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.OidCategory));

    const [categoryList, setCategoryList] = useState<{ label: string; value: OidCategory }[]>([]);

    useEffect(() => {
        if (oidCategoryEnum)
            setCategoryList(
                Object.values(oidCategoryEnum)?.map(({ code, label }) => ({
                    label,
                    value: code as OidCategory,
                })),
            );
    }, [oidCategoryEnum]);

    const defaultValues: FormValues = useMemo(() => {
        const categoryValue = oid?.category ? oid.category : '';

        return {
            oid: editMode ? oid?.oid || '' : '',
            displayName: editMode ? oid?.displayName || '' : '',
            description: editMode ? oid?.description || '' : '',
            category: categoryValue,
            code: editMode ? oid?.additionalProperties?.code : undefined,
            alternativeCode: editMode ? oid?.additionalProperties?.altCodes : undefined,
        };
    }, [oid, editMode]);

    const methods = useForm<FormValues>({
        defaultValues,
        mode: 'onChange',
    });

    const {
        handleSubmit,
        control,
        reset,
        formState: { isDirty, isSubmitting, isValid },
    } = methods;

    useEffect(() => {
        if (editMode && oid) {
            reset(defaultValues);
        }
    }, [oid, reset, defaultValues, editMode]);

    const watchedCategory = useWatch({
        control,
        name: 'category',
    });

    const onSubmit = useCallback(
        (values: FormValues) => {
            const newOID = {
                oid: values.oid,
                displayName: values.displayName,
                description: values.description,
                category: values.category as OidCategory,
                ...(values.category === OidCategory.RdnAttributeType && {
                    additionalProperties: {
                        code: values.code,
                        altCodes: values.alternativeCode ?? undefined,
                    } as CustomOidEntryUpdateRequestDtoAdditionalProperties,
                }),
            };
            if (editMode) {
                dispatch(actions.updateOID({ oid: oidId!, data: newOID }));
            } else {
                dispatch(
                    actions.createOID({
                        oid: newOID,
                    }),
                );
            }
        },
        [dispatch, editMode, oidId],
    );

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Widget noBorder busy={isBusy}>
                    <div className="space-y-4">
                        <Controller
                            name="oid"
                            control={control}
                            rules={buildValidationRules([validateRequired(), validateOid()])}
                            render={({ field, fieldState }) => (
                                <>
                                    <TextInput
                                        {...field}
                                        id="oid"
                                        type="text"
                                        label="OID"
                                        required
                                        placeholder="e.g. 1.2.840.113549.1.1.11"
                                        disabled={editMode}
                                        invalid={fieldState.error && fieldState.isTouched}
                                        error={getFieldErrorMessage(fieldState)}
                                    />
                                    {!(fieldState.error && fieldState.isTouched) && (
                                        <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400">
                                            Dot-separated numeric format, starting with 0, 1, or 2
                                        </p>
                                    )}
                                </>
                            )}
                        />
                        <Controller
                            name="displayName"
                            control={control}
                            rules={buildValidationRules([validateRequired()])}
                            render={({ field, fieldState }) => (
                                <TextInput
                                    {...field}
                                    id="displayName"
                                    type="text"
                                    label="Display Name"
                                    required
                                    placeholder="Enter the Display name"
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
                                <TextArea
                                    {...field}
                                    id="description"
                                    label="Description"
                                    rows={3}
                                    placeholder="Enter Description / Comment"
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                />
                            )}
                        />
                        <Controller
                            name="category"
                            control={control}
                            rules={buildValidationRules([validateRequired()])}
                            render={({ field, fieldState }) => (
                                <>
                                    <Select
                                        id="categorySelect"
                                        label="Select Category"
                                        value={field.value || ''}
                                        onChange={(value) => {
                                            field.onChange(value);
                                        }}
                                        options={categoryList.map((c) => ({ value: c.value, label: c.label }))}
                                        placeholder="Select Category"
                                        isDisabled={editMode}
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

                        {watchedCategory === OidCategory.RdnAttributeType && (
                            <>
                                <Controller
                                    name="code"
                                    control={control}
                                    rules={buildValidationRules([validateRequired(), validateOidCode()])}
                                    render={({ field, fieldState }) => (
                                        <TextInput
                                            {...field}
                                            id="code"
                                            type="text"
                                            label="OID code"
                                            required
                                            placeholder="Enter OID code"
                                            invalid={fieldState.error && fieldState.isTouched}
                                            error={getFieldErrorMessage(fieldState)}
                                        />
                                    )}
                                />

                                <Label htmlFor="alternativeCode">Alternative Code</Label>
                                <Controller
                                    name="alternativeCode"
                                    control={control}
                                    rules={buildValidationRules([validateOidCode()])}
                                    render={({ field, fieldState }) => (
                                        <>
                                            <MultipleValueTextInput
                                                id="alternativeCode"
                                                selectedValues={field.value || []}
                                                onValuesChange={field.onChange}
                                                placeholder="Select or add alternative codes"
                                                addPlaceholder="Add code"
                                                initialOptions={
                                                    editMode && oid?.additionalProperties?.altCodes
                                                        ? oid.additionalProperties.altCodes.map((code) => ({
                                                              label: code,
                                                              value: code,
                                                          }))
                                                        : []
                                                }
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
                            </>
                        )}

                        <Container className="flex-row justify-end modal-footer" gap={4}>
                            <Button variant="outline" onClick={onCancel} disabled={isSubmitting} type="button">
                                Cancel
                            </Button>
                            <ProgressButton
                                title={submitTitle}
                                inProgressTitle={inProgressTitle}
                                inProgress={isSubmitting}
                                disabled={(editMode ? !isDirty : false) || !isValid}
                                type="submit"
                            />
                        </Container>
                    </div>
                </Widget>
            </form>
        </FormProvider>
    );
}
