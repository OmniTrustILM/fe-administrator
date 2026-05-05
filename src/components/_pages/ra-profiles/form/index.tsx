import AttributeEditor from 'components/Attributes/AttributeEditor';
import ProgressButton from 'components/ProgressButton';

import Widget from 'components/Widget';
import { actions as authoritiesActions, selectors as authoritiesSelectors } from 'ducks/authorities';
import { actions as connectorActions } from 'ducks/connectors';

import { actions as raProfilesActions, selectors as raProfilesSelectors } from 'ducks/ra-profiles';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';
import Select from 'components/Select';
import Button from 'components/Button';
import Container from 'components/Container';
import type { AttributeDescriptorModel } from 'types/attributes';
import type { RaProfileResponseModel } from 'types/ra-profiles';

import { collectFormAttributes } from 'utils/attributes/attributes';

import { validateAlphaNumericWithSpecialChars, validateLength, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import { actions as customAttributesActions, selectors as customAttributesSelectors } from '../../../../ducks/customAttributes';
import { Resource } from '../../../../types/openapi';
import TabLayout from '../../../Layout/TabLayout';
import TextInput from 'components/TextInput';
import TextArea from 'components/TextArea';

type RaProfileFormProps = Readonly<{
    raProfileId?: string;
    authorityId?: string;
    onCancel?: () => void;
    onSuccess?: () => void;
}>;

interface FormValues {
    name: string;
    description: string;
    authority: string;
}

export default function RaProfileForm({ raProfileId, authorityId: propAuthorityId, onCancel, onSuccess }: RaProfileFormProps) {
    const dispatch = useDispatch();

    const { id: routeId, authorityId: routeAuthorityId } = useParams();
    const id = raProfileId || routeId;
    const authorityId = propAuthorityId || routeAuthorityId;

    const editMode = !!id;

    const raProfileSelector = useSelector(raProfilesSelectors.raProfile);

    const authorities = useSelector(authoritiesSelectors.authorities);
    const raProfileAttributeDescriptors = useSelector(authoritiesSelectors.raProfileAttributeDescriptors);
    const resourceCustomAttributes = useSelector(customAttributesSelectors.resourceCustomAttributes);
    const isFetchingResourceCustomAttributes = useSelector(customAttributesSelectors.isFetchingResourceCustomAttributes);

    const isFetchingAuthorityRAProfileAttributes = useSelector(authoritiesSelectors.isFetchingRAProfilesAttributesDescriptors);

    const isFetchingDetail = useSelector(raProfilesSelectors.isFetchingDetail);
    const isCreating = useSelector(raProfilesSelectors.isCreating);
    const isUpdating = useSelector(raProfilesSelectors.isUpdating);

    const [groupAttributesCallbackAttributes, setGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);

    const [localProfileModifications, setLocalProfileModifications] = useState<Partial<RaProfileResponseModel>>({});

    const isBusy = useMemo(
        () => isFetchingDetail || isCreating || isUpdating || isFetchingAuthorityRAProfileAttributes || isFetchingResourceCustomAttributes,
        [isCreating, isFetchingDetail, isUpdating, isFetchingAuthorityRAProfileAttributes, isFetchingResourceCustomAttributes],
    );

    useEffect(() => {
        dispatch(authoritiesActions.listAuthorities());
        dispatch(authoritiesActions.clearRAProfilesAttributesDescriptors());
        dispatch(connectorActions.clearCallbackData());
        dispatch(customAttributesActions.listResourceCustomAttributes(Resource.RaProfiles));
    }, [dispatch]);

    useEffect(() => {
        if (authorityId) {
            dispatch(authoritiesActions.getRAProfilesAttributesDescriptors({ authorityUuid: authorityId }));
        }
    }, [dispatch, authorityId]);

    const previousIdRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (editMode && id && authorityId) {
            // Fetch if id changed or if we don't have the correct profile loaded
            if (previousIdRef.current !== id || raProfileSelector?.uuid !== id) {
                dispatch(raProfilesActions.getRaProfileDetail({ authorityUuid: authorityId, uuid: id }));
                previousIdRef.current = id;
                setLocalProfileModifications({}); // Reset local modifications when fetching new profile
            }
        } else {
            previousIdRef.current = undefined;
            setLocalProfileModifications({});
        }
    }, [dispatch, editMode, id, authorityId, raProfileSelector]);

    // Derive raProfile from raProfileSelector and merge with local modifications
    const raProfile = useMemo(() => {
        if (editMode && raProfileSelector?.uuid === id) {
            return { ...raProfileSelector, ...localProfileModifications };
        }
        return undefined;
    }, [editMode, id, raProfileSelector, localProfileModifications]);

    const optionsForAuthorities = useMemo(
        () =>
            authorities.map((authority) => ({
                value: authority.uuid,
                label: authority.name,
            })),
        [authorities],
    );

    const defaultValues: FormValues = useMemo(
        () => ({
            name: editMode ? raProfile?.name || '' : '',
            description: editMode ? raProfile?.description || '' : '',
            authority: editMode
                ? (optionsForAuthorities.find((option) => option.value === raProfile?.authorityInstanceUuid)?.value ?? '')
                : '',
        }),
        [editMode, optionsForAuthorities, raProfile],
    );

    const methods = useForm<FormValues>({
        defaultValues,
        mode: 'onChange',
    });

    const {
        handleSubmit,
        control,
        formState: { isDirty, isSubmitting, isValid },
        setValue,
        getValues,
        reset,
    } = methods;

    const watchedAuthority = useWatch({
        control,
        name: 'authority',
    });

    // Reset form values when raProfile is loaded in edit mode
    useEffect(() => {
        if (editMode && id && raProfile?.uuid === id && !isFetchingDetail) {
            const newDefaultValues: FormValues = {
                name: raProfile.name || '',
                description: raProfile.description || '',
                authority: raProfile.authorityInstanceUuid || authorityId || '',
            };
            reset(newDefaultValues, { keepDefaultValues: false });
        } else if (!editMode) {
            // Reset form when switching to create mode
            reset({
                name: '',
                description: '',
                authority: authorityId || '',
            });
        }
    }, [editMode, raProfile, id, reset, isFetchingDetail, authorityId]);

    const onAuthorityChange = useCallback(
        (authorityUuid: string) => {
            dispatch(connectorActions.clearCallbackData());
            setGroupAttributesCallbackAttributes([]);
            const formValues = getValues();
            Object.keys(formValues).forEach((key) => {
                if (key.startsWith('__attributes__ra-profile__')) {
                    setValue(key as any, undefined);
                }
            });
            setLocalProfileModifications({ attributes: [] });
            dispatch(authoritiesActions.clearRAProfilesAttributesDescriptors());
            dispatch(authoritiesActions.getRAProfilesAttributesDescriptors({ authorityUuid }));
        },
        [dispatch, getValues, setValue],
    );

    const onSubmit = useCallback(
        (values: FormValues) => {
            if (editMode) {
                dispatch(
                    raProfilesActions.updateRaProfile({
                        profileUuid: id!,
                        authorityInstanceUuid: values.authority,
                        redirect: `../../../raprofiles/detail/${values.authority}/${id}`,
                        raProfileEditRequest: {
                            enabled: raProfile!.enabled,
                            description: values.description,
                            attributes: collectFormAttributes(
                                'ra-profile',
                                [...(raProfileAttributeDescriptors ?? []), ...groupAttributesCallbackAttributes],
                                values,
                            ),
                            customAttributes: collectFormAttributes('customRaProfile', resourceCustomAttributes, values),
                        },
                    }),
                );
            } else {
                dispatch(
                    raProfilesActions.createRaProfile({
                        authorityInstanceUuid: values.authority,
                        raProfileAddRequest: {
                            name: values.name,
                            description: values.description,
                            attributes: collectFormAttributes(
                                'ra-profile',
                                [...(raProfileAttributeDescriptors ?? []), ...groupAttributesCallbackAttributes],
                                values,
                            ),
                            customAttributes: collectFormAttributes('customRaProfile', resourceCustomAttributes, values),
                        },
                    }),
                );
            }
        },
        [dispatch, editMode, id, raProfile, raProfileAttributeDescriptors, groupAttributesCallbackAttributes, resourceCustomAttributes],
    );

    const renderCustomAttributesEditor = useMemo(() => {
        if (isBusy) return <></>;
        return (
            <AttributeEditor
                id="customRaProfile"
                attributeDescriptors={resourceCustomAttributes}
                attributes={raProfile?.customAttributes}
            />
        );
    }, [isBusy, raProfile, resourceCustomAttributes]);

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>
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
                                    label="RA Profile Name"
                                    required
                                    placeholder="Enter RA Profile Name"
                                    disabled={editMode}
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

                        <div>
                            <Controller
                                name="authority"
                                control={control}
                                rules={buildValidationRules([validateRequired()])}
                                render={({ field, fieldState }) => (
                                    <>
                                        <Select
                                            id="authoritySelect"
                                            label="Select Authority"
                                            value={field.value || ''}
                                            onChange={(value) => {
                                                field.onChange(value);
                                                onAuthorityChange(typeof value === 'string' ? value : value?.toString() || '');
                                            }}
                                            options={optionsForAuthorities}
                                            placeholder="Select to change RA Profile if needed"
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

                        <TabLayout
                            noBorder
                            onlyActiveTabContent={false}
                            tabs={[
                                {
                                    title: 'Connector Attributes',
                                    content: raProfileAttributeDescriptors ? (
                                        <AttributeEditor
                                            id="ra-profile"
                                            callbackParentUuid={raProfile?.authorityInstanceUuid || watchedAuthority || ''}
                                            callbackResource={Resource.RaProfiles}
                                            attributeDescriptors={raProfileAttributeDescriptors}
                                            attributes={raProfile?.attributes}
                                            groupAttributesCallbackAttributes={groupAttributesCallbackAttributes}
                                            setGroupAttributesCallbackAttributes={setGroupAttributesCallbackAttributes}
                                        />
                                    ) : (
                                        <>Group Attr</>
                                    ),
                                },
                                {
                                    title: 'Custom Attributes',
                                    content: renderCustomAttributesEditor,
                                },
                            ]}
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
