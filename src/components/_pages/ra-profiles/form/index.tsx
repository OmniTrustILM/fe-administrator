import AttributeEditor from 'components/Attributes/AttributeEditor';
import ProgressButton from 'components/ProgressButton';
import RequestAttributeAuthoringEditor from 'components/RequestAttributes/RequestAttributeAuthoringEditor';

import Widget from 'components/Widget';
import { actions as authoritiesActions, selectors as authoritiesSelectors } from 'ducks/authorities';
import { actions as connectorActions } from 'ducks/connectors';
import { actions as oidActions, selectors as oidSelectors } from 'ducks/oids';

import { actions as appRedirectActions } from 'ducks/app-redirect';
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
import { actions as requestAttributesActions, selectors as requestAttributesSelectors } from 'ducks/raProfileRequestAttributes';
import { useRunOnFailedFinish, useRunOnFinish, useRunOnSuccessfulFinish } from 'utils/common-hooks';
import {
    buildRaProfileRequestAttributesUpdateDto,
    emptyAuthoringForm,
    hasAuthoredRequestAttributes,
    parseRaProfileRequestAttributesDto,
    type RequestAttributeAuthoringFormValues,
} from 'utils/requestAttributeAuthoring';

import { validateAlphaNumericWithSpecialChars, validateLength, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import { toOidSelectOptions } from 'utils/oid';
import { actions as customAttributesActions, selectors as customAttributesSelectors } from '../../../../ducks/customAttributes';
import { Resource, OidCategory } from '../../../../types/openapi';
import TabLayout from '../../../Layout/TabLayout';
import TextInput from 'components/TextInput';
import TextArea from 'components/TextArea';

type RaProfileFormProps = Readonly<{
    raProfileId?: string;
    authorityId?: string;
    onCancel?: () => void;
    onSuccess?: () => void;
    onInFlightChange?: (inFlight: boolean) => void;
}>;

interface FormValues {
    name: string;
    description: string;
    authority: string;
}

export default function RaProfileForm({
    raProfileId,
    authorityId: propAuthorityId,
    onCancel,
    onSuccess,
    onInFlightChange,
}: RaProfileFormProps) {
    const dispatch = useDispatch();

    const oidsByCategory = useSelector(oidSelectors.oidsByCategory);
    const oidsByCategoryError = useSelector(oidSelectors.oidsByCategoryError);
    const oidsByCategoryLoaded = useSelector(oidSelectors.oidsByCategoryLoaded);
    const systemOidsByCategory = useSelector(oidSelectors.systemOidsByCategory);
    const systemOidsError = useSelector(oidSelectors.systemOidsError);
    const systemOidsLoaded = useSelector(oidSelectors.systemOidsLoaded);

    useEffect(() => {
        dispatch(oidActions.listOidsByCategory({ category: OidCategory.RdnAttributeType }));
        dispatch(oidActions.listOidsByCategory({ category: OidCategory.CertificateExtension }));
        // Standard RDNs (CN, O, OU, …) live in the backend SystemOid enum, not in /v1/oids/list — the
        // cached system list is merged into the RDN dropdown below. (No system certificateExtension entries.)
        dispatch(oidActions.listSystemOids());
    }, [dispatch]);

    // RDN target merges built-in system RDNs with custom ones; the two lists are disjoint by construction
    // (the backend rejects a custom OID that shadows a system OID), so no dedupe is needed.
    const rdnOptions = useMemo(
        () =>
            toOidSelectOptions([
                ...(systemOidsByCategory[OidCategory.RdnAttributeType] ?? []),
                ...(oidsByCategory[OidCategory.RdnAttributeType] ?? []),
            ]),
        [systemOidsByCategory, oidsByCategory],
    );
    const extensionOptions = useMemo(() => toOidSelectOptions(oidsByCategory[OidCategory.CertificateExtension] ?? []), [oidsByCategory]);

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
    const createRaProfileSucceeded = useSelector(raProfilesSelectors.createRaProfileSucceeded);

    const [groupAttributesCallbackAttributes, setGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);

    const [localProfileModifications, setLocalProfileModifications] = useState<Partial<RaProfileResponseModel>>({});

    const isUpdatingRequestAttributes = useSelector(requestAttributesSelectors.isUpdatingRaProfileSet);
    const updateRequestAttributesSucceeded = useSelector(requestAttributesSelectors.updateRaProfileSetSucceeded);
    const [requestAttributesForm, setRequestAttributesForm] = useState<RequestAttributeAuthoringFormValues>(emptyAuthoringForm());
    const [requestAttributesDirty, setRequestAttributesDirty] = useState(false);
    const createdRaProfileUuid = useSelector(raProfilesSelectors.createdRaProfileUuid);
    const [pendingCreateAttributes, setPendingCreateAttributes] = useState(false);
    const pendingCreateAuthorityRef = useRef<string | undefined>(undefined);

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

    const isSaving = isSubmitting || isCreating || isUpdating || isUpdatingRequestAttributes;

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

    // Seed the request-attribute authoring form from the loaded profile (edit mode only).
    useEffect(() => {
        if (editMode && raProfileSelector?.uuid === id) {
            setRequestAttributesForm(parseRaProfileRequestAttributesDto(raProfileSelector.certificateRequestAttributes));
            setRequestAttributesDirty(false);
        } else if (!editMode) {
            setRequestAttributesForm(emptyAuthoringForm());
            setRequestAttributesDirty(false);
        }
    }, [editMode, id, raProfileSelector]);

    const connectorAttributeOptions = useMemo(
        () =>
            (raProfileAttributeDescriptors ?? []).map((descriptor) => ({
                value: descriptor.uuid ?? descriptor.name,
                label: descriptor.properties?.label ?? descriptor.name,
                // Internal attribute name — the binding name-fallback key (not the display label).
                description: descriptor.name,
            })),
        [raProfileAttributeDescriptors],
    );

    const refetchRaProfile = useCallback(() => {
        if (editMode && id && authorityId) {
            dispatch(raProfilesActions.getRaProfileDetail({ authorityUuid: authorityId, uuid: id }));
        }
    }, [dispatch, editMode, id, authorityId]);

    useRunOnSuccessfulFinish(isUpdatingRequestAttributes, updateRequestAttributesSucceeded, refetchRaProfile);

    const dispatchCreateRequestAttributes = useCallback(() => {
        if (!pendingCreateAttributes || !createdRaProfileUuid) return;
        const authorityUuid = pendingCreateAuthorityRef.current;
        if (!authorityUuid) return;
        dispatch(
            requestAttributesActions.updateRaProfileRequestAttributes({
                authorityUuid,
                raProfileUuid: createdRaProfileUuid,
                data: buildRaProfileRequestAttributesUpdateDto(requestAttributesForm),
            }),
        );
    }, [dispatch, pendingCreateAttributes, createdRaProfileUuid, requestAttributesForm]);

    useRunOnSuccessfulFinish(isCreating, createRaProfileSucceeded, dispatchCreateRequestAttributes);

    // If the create call itself fails, release the create lock so the user can retry from the open modal.
    const releaseCreateLock = useCallback(() => setPendingCreateAttributes(false), []);
    useRunOnFailedFinish(isCreating, createRaProfileSucceeded, releaseCreateLock);

    // Both the PATCH success and failure paths land on the created profile's detail page. Fire on the
    // PATCH's own finish transition so a failure flag left over from an earlier operation can't redirect
    // before the create-triggered PATCH has run.
    const redirectAfterCreateRequestAttributes = useCallback(() => {
        if (!pendingCreateAttributes || !createdRaProfileUuid) return;
        setPendingCreateAttributes(false);
        dispatch(appRedirectActions.redirect({ url: `../raprofiles/detail/${pendingCreateAuthorityRef.current}/${createdRaProfileUuid}` }));
    }, [dispatch, pendingCreateAttributes, createdRaProfileUuid]);

    useRunOnFinish(isUpdatingRequestAttributes, redirectAfterCreateRequestAttributes);

    // The create → request-attributes PATCH → redirect chain runs here in the component. Report the
    // in-flight window up so the host (the create modal) can block dismissal until it settles —
    // unmounting mid-chain would drop the PATCH dispatch, creating the profile without its attributes.
    const createInFlight = useMemo(
        () => !editMode && (isCreating || pendingCreateAttributes || isUpdatingRequestAttributes),
        [editMode, isCreating, pendingCreateAttributes, isUpdatingRequestAttributes],
    );

    useEffect(() => {
        onInFlightChange?.(createInFlight);
    }, [onInFlightChange, createInFlight]);

    // The authoring form is only trustworthy once it has been seeded from the loaded profile
    // (see the seed effect above). Until then it holds emptyAuthoringForm(); saving that would
    // PATCH requestAttributes: [] and wipe the profile's configured set (the epic does no
    // server-side read-merge).
    const requestAttributesSeeded = editMode && raProfileSelector?.uuid === id && !isFetchingDetail;

    const onChangeRequestAttributes = useCallback((next: RequestAttributeAuthoringFormValues) => {
        setRequestAttributesForm(next);
        setRequestAttributesDirty(true);
    }, []);

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
            // Value-source bindings reference the previous authority's connector-attribute descriptor
            // UUIDs, which are cleared and refetched below. Drop them so stale bindings can't be PATCHed
            // against the newly selected authority. Authored static attributes are authority-independent
            // and are preserved.
            setRequestAttributesForm((prev) => ({ ...prev, valueSourceBindings: [] }));
            dispatch(authoritiesActions.clearRAProfilesAttributesDescriptors());
            dispatch(authoritiesActions.getRAProfilesAttributesDescriptors({ authorityUuid }));
        },
        [dispatch, getValues, setValue],
    );

    const onSubmit = useCallback(
        (values: FormValues) => {
            if (editMode) {
                if (!id) return;
                if (requestAttributesDirty && requestAttributesSeeded) {
                    const authorityUuid = raProfile?.authorityInstanceUuid || authorityId;
                    if (authorityUuid) {
                        dispatch(
                            requestAttributesActions.updateRaProfileRequestAttributes({
                                authorityUuid,
                                raProfileUuid: id,
                                data: buildRaProfileRequestAttributesUpdateDto(requestAttributesForm),
                            }),
                        );
                    }
                }
                dispatch(
                    raProfilesActions.updateRaProfile({
                        profileUuid: id,
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
                const withRequestAttributes = hasAuthoredRequestAttributes(requestAttributesForm);
                pendingCreateAuthorityRef.current = values.authority;
                setPendingCreateAttributes(withRequestAttributes);
                dispatch(
                    raProfilesActions.createRaProfile({
                        authorityInstanceUuid: values.authority,
                        deferRedirect: withRequestAttributes,
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
        [
            dispatch,
            editMode,
            id,
            raProfile,
            raProfileAttributeDescriptors,
            groupAttributesCallbackAttributes,
            resourceCustomAttributes,
            requestAttributesDirty,
            requestAttributesSeeded,
            requestAttributesForm,
            authorityId,
        ],
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
                                            required
                                            value={field.value || ''}
                                            onChange={(value) => {
                                                field.onChange(value);
                                                const next = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
                                                onAuthorityChange(next);
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
                                    disabled: !watchedAuthority,
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
                                    disabled: !watchedAuthority,
                                    content: renderCustomAttributesEditor,
                                },
                                {
                                    title: 'Request Attributes',
                                    disabled: !watchedAuthority,
                                    content: editMode ? (
                                        <div className="space-y-4">
                                            <p className="text-sm text-gray-500">Changes are saved when you click Update.</p>
                                            <RequestAttributeAuthoringEditor
                                                value={requestAttributesForm}
                                                onChange={onChangeRequestAttributes}
                                                showMergeMode
                                                connectorAttributeOptions={connectorAttributeOptions}
                                                rdnOptions={rdnOptions}
                                                extensionOptions={extensionOptions}
                                                rdnOptionsError={!!oidsByCategoryError[OidCategory.RdnAttributeType] || systemOidsError}
                                                extensionOptionsError={!!oidsByCategoryError[OidCategory.CertificateExtension]}
                                                rdnOptionsLoaded={!!oidsByCategoryLoaded[OidCategory.RdnAttributeType] && systemOidsLoaded}
                                                extensionOptionsLoaded={!!oidsByCategoryLoaded[OidCategory.CertificateExtension]}
                                                disabled={isUpdatingRequestAttributes || !requestAttributesSeeded}
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {!watchedAuthority && (
                                                <p className="text-sm text-gray-500">
                                                    Select an authority to configure request attributes.
                                                </p>
                                            )}
                                            <RequestAttributeAuthoringEditor
                                                value={requestAttributesForm}
                                                onChange={setRequestAttributesForm}
                                                showMergeMode
                                                connectorAttributeOptions={connectorAttributeOptions}
                                                disabled={!watchedAuthority || isCreating || isUpdatingRequestAttributes}
                                            />
                                        </div>
                                    ),
                                },
                            ]}
                        />

                        <Container className="flex-row justify-end modal-footer" gap={4}>
                            <Button variant="outline" onClick={onCancel} disabled={isSaving || createInFlight} type="button">
                                Cancel
                            </Button>
                            <ProgressButton
                                title={editMode ? 'Update' : 'Create'}
                                inProgressTitle={editMode ? 'Updating...' : 'Creating...'}
                                inProgress={isSaving || createInFlight}
                                disabled={(!isDirty && !requestAttributesDirty) || isSaving || !isValid || createInFlight}
                                type="submit"
                            />
                        </Container>
                    </div>
                </Widget>
            </form>
        </FormProvider>
    );
}
