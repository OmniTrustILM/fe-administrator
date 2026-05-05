import Dialog from 'components/Dialog';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type ComplianceProfileDtoV2, PlatformEnum, type Resource, type ResourceObjectDto } from 'types/openapi';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import Select from 'components/Select';
import { useDispatch, useSelector } from 'react-redux';
import { buildValidationRules } from 'utils/validators-helper';
import { validateRequired } from 'utils/validators';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { actions as resourceActions, selectors as resourceSelectors } from 'ducks/resource';
import { actions as raActions, selectors as raSelectors } from 'ducks/ra-profiles';
import { actions as tokenProfileActions, selectors as tokenProfileSelectors } from 'ducks/token-profiles';
import { actions } from 'ducks/compliance-profiles';
import { makeOptions } from 'utils/compliance-profile';
import Button from 'components/Button';
import cn from 'classnames';

type Props = Readonly<{
    isOpen: boolean;
    onClose: () => void;
    profile: ComplianceProfileDtoV2 | undefined;
    associationsOfComplianceProfile: ResourceObjectDto[];
}>;

export default function ProfileAssociationsDialog({ isOpen, onClose, profile, associationsOfComplianceProfile }: Props) {
    const dispatch = useDispatch();

    const resourcesList = useSelector(resourceSelectors.resourcesWithComplianceProfiles);
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const raProfiles = useSelector(raSelectors.raProfiles);
    const tokenProfiles = useSelector(tokenProfileSelectors.tokenProfiles);

    const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

    const optionsForResources = useMemo(
        () =>
            resourcesList.map((resource) => ({
                value: resource.resource,
                label: getEnumLabel(resourceEnum, resource.resource),
            })),
        [resourcesList, resourceEnum],
    );

    useEffect(
        () => {
            if (!isOpen) return;
            dispatch(resourceActions.listResources());
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [isOpen],
    );

    useEffect(() => {
        if (selectedResource === 'raProfiles') {
            dispatch(raActions.listRaProfiles());
        } else if (selectedResource === 'tokenProfiles') {
            dispatch(tokenProfileActions.listTokenProfiles({ enabled: undefined }));
        }
    }, [dispatch, selectedResource]);

    const onCancel = useCallback(() => {
        setSelectedResource(null);
        onClose();
    }, [onClose]);

    const onSubmit = useCallback(
        (values: any) => {
            if (!profile || !selectedResource) return;
            const selectedValue = values[selectedResource];
            dispatch(
                actions.associateComplianceProfile({
                    uuid: profile.uuid,
                    resource: values.resource,
                    associationObjectUuid: selectedValue?.uuid || '',
                    associationObjectName: selectedValue?.name || '',
                }),
            );
            onCancel();
        },
        [dispatch, profile, selectedResource, onCancel],
    );

    const optionsForRaProfiles = useMemo(() => {
        return makeOptions(raProfiles, associationsOfComplianceProfile);
    }, [associationsOfComplianceProfile, raProfiles]);

    const optionsForTokenProfiles = useMemo(() => {
        return makeOptions(tokenProfiles, associationsOfComplianceProfile);
    }, [associationsOfComplianceProfile, tokenProfiles]);

    const methods = useForm({
        mode: 'onTouched',
        defaultValues: {
            resource: undefined as Resource | undefined,
            raProfiles: undefined as { uuid: string; name: string } | undefined,
            tokenProfiles: undefined as { uuid: string; name: string } | undefined,
        },
    });

    const { control, handleSubmit, setValue, formState } = methods;
    const watchedResource = useWatch({ control, name: 'resource' });

    useEffect(() => {
        setSelectedResource(watchedResource || null);
    }, [watchedResource, setSelectedResource]);

    const handleFormSubmit = useCallback(
        (values: any) => {
            if (!profile || !selectedResource) return;
            const selectedValue = values[selectedResource];
            onSubmit({
                resource: values.resource,
                [selectedResource]: selectedValue,
            });
        },
        [profile, selectedResource, onSubmit],
    );

    const dialogBody = useMemo(
        () => (
            <div data-testid="add-profile-association-dialog">
                <FormProvider {...methods}>
                    <form onSubmit={handleSubmit(handleFormSubmit)}>
                        <Controller
                            name="resource"
                            control={control}
                            rules={buildValidationRules([validateRequired()])}
                            render={({ field, fieldState }) => (
                                <div className="mb-4">
                                    <label
                                        htmlFor="resource-select"
                                        className="block text-sm font-medium mb-2 text-gray-700 dark:text-white"
                                    >
                                        Select the resource of association
                                    </label>
                                    <Select
                                        id="resource-select"
                                        data-testid="resource-select"
                                        options={optionsForResources}
                                        value={field.value ? (field.value as string) : ''}
                                        onChange={(value) => {
                                            const resource = value as Resource | undefined;
                                            field.onChange(resource);
                                            setSelectedResource(resource || null);
                                            setValue('raProfiles' as any, undefined);
                                            setValue('tokenProfiles' as any, undefined);
                                        }}
                                        placeholder="Select the resource to be associated"
                                        className={cn({
                                            'border-red-500': fieldState.error && fieldState.isTouched,
                                        })}
                                    />
                                    {fieldState.error && fieldState.isTouched && (
                                        <p className="mt-1 text-sm text-red-600">
                                            {typeof fieldState.error === 'string'
                                                ? fieldState.error
                                                : fieldState.error?.message || 'Required Field'}
                                        </p>
                                    )}
                                </div>
                            )}
                        />
                        {selectedResource && (
                            <Controller
                                name={selectedResource as 'raProfiles' | 'tokenProfiles'}
                                control={control}
                                rules={buildValidationRules([validateRequired()])}
                                render={({ field, fieldState }) => {
                                    const options = selectedResource === 'raProfiles' ? optionsForRaProfiles : optionsForTokenProfiles;
                                    const selectOptions = options.map((opt) => ({
                                        value: opt.value.uuid,
                                        label: opt.label,
                                    }));
                                    const fieldValue = field.value as { uuid: string; name: string } | undefined;
                                    const onProfileSelect = (value: unknown) => {
                                        const uuid = value as string | undefined;
                                        const option = options.find((opt) => opt.value.uuid === uuid);
                                        field.onChange(option?.value);
                                    };
                                    return (
                                        <div className="mb-4">
                                            <label
                                                htmlFor="resource-profiles-select"
                                                className="block text-sm font-medium mb-2 text-gray-700 dark:text-white"
                                            >
                                                Select {getEnumLabel(resourceEnum, selectedResource)}
                                            </label>
                                            <Select
                                                id="resource-profiles-select"
                                                options={selectOptions}
                                                value={fieldValue?.uuid || ''}
                                                onChange={onProfileSelect}
                                                placeholder={`Select ${getEnumLabel(resourceEnum, selectedResource)} to be associated`}
                                                className={cn({
                                                    'border-red-500': fieldState.error && fieldState.isTouched,
                                                })}
                                            />
                                            {fieldState.error && fieldState.isTouched && (
                                                <p className="mt-1 text-sm text-red-600">
                                                    {typeof fieldState.error === 'string'
                                                        ? fieldState.error
                                                        : fieldState.error?.message || 'Required Field'}
                                                </p>
                                            )}
                                        </div>
                                    );
                                }}
                            />
                        )}

                        <div className="flex justify-center gap-4">
                            <Button
                                type="submit"
                                color="primary"
                                disabled={formState.isSubmitting || !formState.isValid}
                                onClick={handleSubmit(handleFormSubmit)}
                            >
                                Associate
                            </Button>

                            <Button color="secondary" variant="outline" disabled={formState.isSubmitting} onClick={onCancel} type="button">
                                Cancel
                            </Button>
                        </div>
                    </form>
                </FormProvider>
            </div>
        ),
        [
            methods,
            control,
            handleSubmit,
            handleFormSubmit,
            setValue,
            formState,
            selectedResource,
            onCancel,
            optionsForResources,
            resourceEnum,
            optionsForRaProfiles,
            optionsForTokenProfiles,
        ],
    );

    return <Dialog isOpen={isOpen} caption="Associate Profile" body={dialogBody} toggle={onCancel} buttons={[]} />;
}
