import DynamicContent from 'components/Input/DynamicContent';
import ProgressButton from 'components/ProgressButton';
import Widget from 'components/Widget';

import { actions, selectors } from 'ducks/customAttributes';
import { selectors as enumSelectors, getEnumLabel, getEnumDescription } from 'ducks/enums';
import { useCallback, useEffect, useMemo } from 'react';
import { useAreDefaultValuesSame, useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';
import Select from 'components/Select';
import Button from 'components/Button';
import Container from 'components/Container';
import Checkbox from 'components/Checkbox';
import TextInput from 'components/TextInput';
import type { CustomAttributeCreateRequestModel } from 'types/customAttributes';
import { AttributeContentType, PlatformEnum, ProtectionLevel, type Resource } from 'types/openapi';
import { validateAlphaNumericWithSpecialChars, validateLength, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';

type CustomAttributeFormProps = Readonly<{
    customAttributeId?: string;
    onCancel?: () => void;
    onSuccess?: () => void;
}>;

export default function CustomAttributeForm({ customAttributeId, onCancel, onSuccess }: CustomAttributeFormProps) {
    const dispatch = useDispatch();

    const { id: routeId } = useParams();
    const id = customAttributeId || routeId;
    const editMode = useMemo(() => !!id, [id]);

    const customAttributeDetail = useSelector(selectors.customAttribute);
    const resources = useSelector(selectors.resources);
    const isFetchingDetail = useSelector(selectors.isFetchingDetail);
    const isFetchingResources = useSelector(selectors.isFetchingResources);
    const isCreating = useSelector(selectors.isCreating);
    const isUpdating = useSelector(selectors.isUpdating);
    const createCustomAttributeSucceeded = useSelector(selectors.createCustomAttributeSucceeded);
    const updateCustomAttributeSucceeded = useSelector(selectors.updateCustomAttributeSucceeded);
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const protectionLevelEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ProtectionLevel));

    const isBusy = useMemo(
        () => isFetchingDetail || isCreating || isUpdating || isFetchingResources,
        [isCreating, isFetchingDetail, isUpdating, isFetchingResources],
    );

    type FormValues = Omit<CustomAttributeCreateRequestModel, 'resources'> & {
        resources?: Array<{ label: string; value: Resource }>;
        extensibleList?: boolean;
    };
    const defaultValuesCreate: FormValues = useMemo(
        () => ({
            name: '',
            label: '',
            description: '',
            contentType: AttributeContentType.Text,
            group: '',
            list: false,
            multiSelect: false,
            visible: true,
            required: false,
            readOnly: false,
            resources: [],
            content: undefined,
            protectionLevel: undefined,
            extensibleList: false,
        }),
        [],
    );
    const defaultValuesUpdate: FormValues = useMemo(
        () =>
            customAttributeDetail
                ? {
                      ...customAttributeDetail,
                      resources: customAttributeDetail.resources?.map((r) => ({ label: getEnumLabel(resourceEnum, r), value: r })),
                  }
                : defaultValuesCreate,
        [customAttributeDetail, defaultValuesCreate, resourceEnum],
    );

    const methods = useForm<FormValues>({
        defaultValues: editMode ? defaultValuesUpdate : defaultValuesCreate,
        mode: 'onChange',
    });

    const {
        handleSubmit,
        control,
        formState: { isSubmitting, isValid },
        setValue,
    } = methods;

    const formValues = useWatch({ control });
    const watchedList = useWatch({ control, name: 'list' });
    const watchedContentType = useWatch({ control, name: 'contentType' });
    const defaultValuesToCompare = useMemo(
        () => (editMode ? defaultValuesUpdate : defaultValuesCreate),
        [editMode, defaultValuesUpdate, defaultValuesCreate],
    );
    const areDefaultValuesSame = useAreDefaultValuesSame(defaultValuesToCompare);

    const onSubmit = useCallback(
        (values: FormValues) => {
            const valuesToSubmit = { ...values, resources: values.resources?.map((r) => r.value) };
            if (editMode) {
                dispatch(
                    actions.updateCustomAttribute({
                        uuid: id!,
                        customAttributeUpdateRequest: valuesToSubmit,
                    }),
                );
            } else {
                dispatch(actions.createCustomAttribute(valuesToSubmit as CustomAttributeCreateRequestModel));
            }
        },
        [dispatch, editMode, id],
    );

    useEffect(() => {
        dispatch(actions.listResources());
        if (editMode && id && id !== customAttributeDetail?.uuid) {
            dispatch(actions.getCustomAttribute(id));
        }
    }, [dispatch, editMode, id, customAttributeDetail?.uuid]);

    useRunOnSuccessfulFinish(isCreating, createCustomAttributeSucceeded, onSuccess);
    useRunOnSuccessfulFinish(isUpdating, updateCustomAttributeSucceeded, onSuccess);

    useEffect(() => {
        if (watchedContentType === AttributeContentType.Boolean) {
            setValue('extensibleList', false);
        }
    }, [watchedContentType, setValue]);

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
                                    label="Description"
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                />
                            )}
                        />

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
                            name="resources"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    id="resourcesSelect"
                                    label="Resources"
                                    isMulti
                                    value={field.value || []}
                                    onChange={(value) => {
                                        field.onChange(value);
                                    }}
                                    options={resources.map((r) => ({ label: getEnumLabel(resourceEnum, r), value: r }))}
                                    placeholder="Resources"
                                    isClearable
                                />
                            )}
                        />

                        <Widget title="Properties" noBorder>
                            <Container className="flex-row items-center" gap={4}>
                                <Controller
                                    name="required"
                                    control={control}
                                    render={({ field }) => (
                                        <Checkbox id="required" checked={field.value ?? false} onChange={field.onChange} label="Required" />
                                    )}
                                />
                                <div className="h-6 w-[1px] bg-gray-200" />
                                <Controller
                                    name="readOnly"
                                    control={control}
                                    render={({ field }) => (
                                        <Checkbox
                                            id="readOnly"
                                            checked={field.value ?? false}
                                            onChange={field.onChange}
                                            label="Read Only"
                                        />
                                    )}
                                />
                                <div className="h-6 w-[1px] bg-gray-200" />
                                <Controller
                                    name="list"
                                    control={control}
                                    render={({ field }) => (
                                        <Checkbox
                                            id="list"
                                            checked={field.value ?? false}
                                            onChange={(checked) => {
                                                field.onChange(checked);
                                                if (!checked) {
                                                    setValue('multiSelect', false);
                                                    setValue('extensibleList', false);
                                                }
                                            }}
                                            label="List"
                                        />
                                    )}
                                />

                                {watchedList && (
                                    <>
                                        <Controller
                                            name="multiSelect"
                                            control={control}
                                            render={({ field }) => (
                                                <Checkbox
                                                    id="multiSelect"
                                                    checked={field.value ?? false}
                                                    onChange={field.onChange}
                                                    label="Multi Select"
                                                    disabled={!watchedList}
                                                />
                                            )}
                                        />
                                        <Controller
                                            name="extensibleList"
                                            control={control}
                                            render={({ field }) => (
                                                <Checkbox
                                                    id="extensibleList"
                                                    checked={field.value ?? false}
                                                    onChange={field.onChange}
                                                    label="Extensible List"
                                                    disabled={!watchedList || watchedContentType === AttributeContentType.Boolean}
                                                />
                                            )}
                                        />
                                    </>
                                )}
                            </Container>
                        </Widget>

                        <Controller
                            name="protectionLevel"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    id="protectionLevel"
                                    label="Protection Level"
                                    value={field.value ?? ''}
                                    onChange={(value) => field.onChange(value || undefined)}
                                    options={Object.values(ProtectionLevel).map((v: ProtectionLevel) => ({
                                        label: getEnumLabel(protectionLevelEnum, v),
                                        value: v,
                                        description: getEnumDescription(protectionLevelEnum, v),
                                    }))}
                                    placeholder="None"
                                    isClearable
                                    showOptionDescriptionInDropdown
                                    showSelectedDescriptionAsHelp
                                />
                            )}
                        />

                        <DynamicContent editable={!editMode} isList={!!watchedList} />

                        <Container className="flex-row justify-end modal-footer" gap={4}>
                            <Button variant="outline" onClick={onCancel} disabled={isSubmitting} type="button">
                                Cancel
                            </Button>
                            <ProgressButton
                                title={editMode ? 'Update' : 'Create'}
                                inProgressTitle={editMode ? 'Updating...' : 'Creating...'}
                                inProgress={isSubmitting}
                                disabled={isSubmitting || !isValid || areDefaultValuesSame(formValues)}
                                type="submit"
                            />
                        </Container>
                    </div>
                </Widget>
            </form>
        </FormProvider>
    );
}
