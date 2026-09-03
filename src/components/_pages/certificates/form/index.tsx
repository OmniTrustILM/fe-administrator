import AttributeEditor from 'components/Attributes/AttributeEditor';

import ProgressButton from 'components/ProgressButton';
import Widget from 'components/Widget';

import { actions as certificateActions, selectors as certificateSelectors } from 'ducks/certificates';
import { actions as connectorActions } from 'ducks/connectors';
import { selectors as cryptographyOperationSelectors } from 'ducks/cryptographic-operations';
import { actions as raProfileActions, selectors as raProfileSelectors } from 'ducks/ra-profiles';
import { actions as tokenProfileActions } from 'ducks/token-profiles';
import { actions as userActions, selectors as userSelectors } from 'ducks/users';
import { actions as certificateGroupActions, selectors as certificateGroupSelectors } from 'ducks/certificateGroups';
import type * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';

import Button from 'components/Button';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';

import { type AttributeDescriptorModel, isDataAttributeModel } from 'types/attributes';
import { splitAttributeValidationErrors } from 'utils/raProfileValidation';
import type { CertificateDetailResponseModel } from '../../../../types/certificate';
import { CertificateRequestFormat, Resource } from '../../../../types/openapi';
import { collectFormAttributes } from 'utils/attributes/attributes';

import { actions as utilsActuatorActions, selectors as utilsActuatorSelectors } from 'ducks/utilsActuator';
import { ParseRequestRequestDtoParseTypeEnum } from 'types/openapi/utils';
import { actions as customAttributesActions, selectors as customAttributesSelectors } from '../../../../ducks/customAttributes';
import { transformParseRequestResponseDtoToCertificateResponseDetailModel } from '../../../../ducks/transform/utilsCertificateRequest';
import {
    actions as utilsCertificateRequestActions,
    selectors as utilsCertificateRequestSelectors,
} from '../../../../ducks/utilsCertificateRequest';

import CertificateAttributes from '../../../CertificateAttributes';
import ComplianceErrorsPanel from '../../../RequestAttributes/ComplianceErrorsPanel';
import FileUpload from '../../../Input/FileUpload/FileUpload';
import TabLayout from '../../../Layout/TabLayout';
import RenderRequestKey from './RenderRequestKey';
import RenderTokenProfile from 'components/_pages/certificates/form/RenderTokenProfile';
import Select from 'components/Select';
import Switch from 'components/Switch';
import Container from 'components/Container';
import Breadcrumb from 'components/Breadcrumb';
import RadioRow from 'components/RadioRow';
import TextInput from 'components/TextInput';

type CertificateFormValues = {
    raProfileUuid: string;
    requestType: 'issue' | 'register';
    uploadCsrSource?: 'external' | 'existing';
    includeAltKey: boolean;
    tokenProfileUuid?: string;
    altTokenProfileUuid?: string;
    keyUuid?: string;
    altKeyUuid?: string;
    authorizationSecret?: string;
    expiresAt?: string;
    ownerUuid?: string;
    groupUuids?: string[];
};

function useDescriptorState() {
    const [value, setValue] = useState<AttributeDescriptorModel[]>(() => []);
    return [value, setValue] as const;
}

function tabTitle(title: string, descriptors: AttributeDescriptorModel[] | undefined | null) {
    const hasRequired = descriptors?.some((d) => isDataAttributeModel(d) && d.properties.required);
    if (!hasRequired) return title;
    return (
        <span>
            {title}
            <span className="text-danger ml-0.5">*</span>
        </span>
    );
}

function renderRequestAttributesTabContent(params: {
    csrAttributeDescriptors: AttributeDescriptorModel[] | undefined | null;
    csrAttributesCallbackAttributes: AttributeDescriptorModel[];
    setCsrAttributesCallbackAttributes: React.Dispatch<React.SetStateAction<AttributeDescriptorModel[]>>;
    isFetchingCsrAttributes: boolean;
    selectedRaProfileUuid: string | undefined;
}) {
    const {
        csrAttributeDescriptors,
        csrAttributesCallbackAttributes,
        setCsrAttributesCallbackAttributes,
        isFetchingCsrAttributes,
        selectedRaProfileUuid,
    } = params;

    if ((csrAttributeDescriptors ?? []).length > 0) {
        return (
            <AttributeEditor
                id="csrAttributes"
                attributeDescriptors={csrAttributeDescriptors ?? []}
                groupAttributesCallbackAttributes={csrAttributesCallbackAttributes}
                setGroupAttributesCallbackAttributes={setCsrAttributesCallbackAttributes}
            />
        );
    }
    if (isFetchingCsrAttributes) {
        return (
            <span className="text-content-subtle" data-testid="csrAttributes-loading">
                Loading request attributes&hellip;
            </span>
        );
    }
    if (selectedRaProfileUuid) {
        return (
            <span className="text-content-subtle" data-testid="csrAttributes-empty">
                This RA Profile has no request attributes.
            </span>
        );
    }
    return (
        <span className="text-content-subtle" data-testid="csrAttributes-hint">
            Select an RA Profile to see its request attributes.
        </span>
    );
}

function renderRegisterAttributesTabContent(params: {
    registerAttributeDescriptors: AttributeDescriptorModel[] | undefined | null;
    registerAttributesCallbackAttributes: AttributeDescriptorModel[];
    setRegisterAttributesCallbackAttributes: React.Dispatch<React.SetStateAction<AttributeDescriptorModel[]>>;
    isFetchingRegisterAttributes: boolean;
    selectedRaProfileUuid: string | undefined;
    callbackParentUuid: string | undefined;
}) {
    const {
        registerAttributeDescriptors,
        registerAttributesCallbackAttributes,
        setRegisterAttributesCallbackAttributes,
        isFetchingRegisterAttributes,
        selectedRaProfileUuid,
        callbackParentUuid,
    } = params;

    if ((registerAttributeDescriptors ?? []).length > 0) {
        return (
            <AttributeEditor
                id="register_attributes"
                attributeDescriptors={registerAttributeDescriptors ?? []}
                callbackParentUuid={callbackParentUuid}
                callbackResource={Resource.Certificates}
                groupAttributesCallbackAttributes={registerAttributesCallbackAttributes}
                setGroupAttributesCallbackAttributes={setRegisterAttributesCallbackAttributes}
            />
        );
    }
    if (isFetchingRegisterAttributes) {
        return (
            <span className="text-content-subtle" data-testid="register_attributes-loading">
                Loading connector attributes&hellip;
            </span>
        );
    }
    if (selectedRaProfileUuid) {
        return (
            <span className="text-content-subtle" data-testid="register_attributes-empty">
                This RA Profile has no connector attributes.
            </span>
        );
    }
    return (
        <span className="text-content-subtle" data-testid="register_attributes-hint">
            Select an RA Profile to see its connector attributes.
        </span>
    );
}

interface CertificateFormProps {
    onCancel?: () => void;
}

export default function CertificateForm({ onCancel }: CertificateFormProps = {}) {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const raProfiles = useSelector(raProfileSelectors.raProfiles);
    const users = useSelector(userSelectors.users);
    const certificateGroups = useSelector(certificateGroupSelectors.certificateGroups);
    const issuanceAttributeDescriptors = useSelector(certificateSelectors.issuanceAttributes);
    const registerAttributeDescriptors = useSelector(certificateSelectors.registerAttributes);
    const isFetchingRegisterAttributes = useSelector(certificateSelectors.isFetchingRegisterAttributes);
    const resourceCustomAttributes = useSelector(customAttributesSelectors.resourceCustomAttributes);
    const isFetchingResourceCustomAttributes = useSelector(customAttributesSelectors.isFetchingResourceCustomAttributes);
    const csrAttributeDescriptors = useSelector(certificateSelectors.csrAttributeDescriptors);
    const isFetchingCsrAttributes = useSelector(certificateSelectors.isFetchingCsrAttributes);
    const signatureAttributeDescriptors = useSelector(cryptographyOperationSelectors.signatureAttributeDescriptors);
    const altSignatureAttributeDescriptors = useSelector(cryptographyOperationSelectors.altSignatureAttributeDescriptors);

    const isIssuing = useSelector(certificateSelectors.isIssuing);
    const isRegistering = useSelector(certificateSelectors.isRegistering);
    // Register and issue are distinct, non-idempotent flows tracked by separate flags; the form must
    // treat either as busy so widgets/Cancel/Create disable and duplicate submits are prevented.
    const issuingCertificate = isIssuing || isRegistering;
    const issueValidationErrors = useSelector(certificateSelectors.issueValidationErrors);
    const parsedCertificateRequest = useSelector(utilsCertificateRequestSelectors.parsedCertificateRequest);
    const parseError = useSelector(utilsCertificateRequestSelectors.parseError);
    const health = useSelector(utilsActuatorSelectors.health);

    const [groupAttributesCallbackAttributes, setGroupAttributesCallbackAttributes] = useDescriptorState();
    const [csrAttributesCallbackAttributes, setCsrAttributesCallbackAttributes] = useDescriptorState();
    const [signatureAttributesCallbackAttributes, setSignatureAttributesCallbackAttributes] = useDescriptorState();
    const [altSignatureAttributesCallbackAttributes, setAltSignatureAttributesCallbackAttributes] = useDescriptorState();
    const [registerAttributesCallbackAttributes, setRegisterAttributesCallbackAttributes] = useDescriptorState();
    const [fileContent, setFileContent] = useState<string>('');
    const [certificate, setCertificate] = useState<CertificateDetailResponseModel | undefined>();
    const [activeRequestTabKey, setActiveRequestTabKey] = useState<string>('request-attributes');

    const [attributeValuesMap] = useState<Record<string, Record<string, unknown>>>({});
    const attributeValuesRef = useRef<Record<string, unknown>>({});

    const methods = useForm<CertificateFormValues>({
        mode: 'onChange',
        defaultValues: {
            raProfileUuid: '',
            requestType: 'issue',
            includeAltKey: false,
        },
    });

    const { control, handleSubmit, setValue, setError, clearErrors, formState } = methods;

    // Attribute-level backend errors (`Extension value of attribute <label>: ...`) are attributed by
    // label to the request-attribute field they belong to; only what cannot be matched stays in the
    // generic panel below the tabs.
    const attributeErrorTargets = useMemo(
        () =>
            (csrAttributeDescriptors ?? [])
                .filter(isDataAttributeModel)
                .filter((d) => d.properties?.visible !== false)
                .map((d) => ({ name: d.name, label: d.properties?.label ?? d.name })),
        [csrAttributeDescriptors],
    );
    const splitValidationErrors = useMemo(
        () => (issueValidationErrors?.length ? splitAttributeValidationErrors(issueValidationErrors, attributeErrorTargets) : undefined),
        [issueValidationErrors, attributeErrorTargets],
    );
    const unattributedValidationErrors = splitValidationErrors ? splitValidationErrors.unattributed : issueValidationErrors;
    useEffect(() => {
        if (!splitValidationErrors) return;
        for (const [attributeName, messages] of splitValidationErrors.byAttributeName) {
            const path = `__attributes__csrAttributes__.${attributeName}` as Parameters<typeof setError>[0];
            setError(path, { type: 'server', message: messages.join('; ') });
        }
    }, [splitValidationErrors, setError]);

    const combinedAttributeValues = useMemo(
        () =>
            Object.values(attributeValuesMap).reduce<Record<string, unknown>>((acc, current) => {
                return { ...acc, ...current };
            }, {}),
        [attributeValuesMap],
    );

    useEffect(() => {
        attributeValuesRef.current = combinedAttributeValues;
    }, [combinedAttributeValues]);

    useEffect(() => {
        dispatch(customAttributesActions.listResourceCustomAttributes(Resource.Certificates));
        dispatch(raProfileActions.listRaProfiles());
        dispatch(tokenProfileActions.listTokenProfiles({ enabled: true }));
        dispatch(connectorActions.clearCallbackData());
        dispatch(utilsCertificateRequestActions.reset());
        dispatch(utilsActuatorActions.health());
        dispatch(certificateActions.clearIssueErrors());
        // Request attributes are resolved per RA profile; start from a clean slate so descriptors left in
        // the shared store by a prior visit (or the Complete/Rekey dialogs) don't render before selection.
        dispatch(certificateActions.clearCsrAttributes());
    }, [dispatch]);

    useEffect(() => {
        setCertificate(
            parsedCertificateRequest
                ? transformParseRequestResponseDtoToCertificateResponseDetailModel(parsedCertificateRequest)
                : undefined,
        );
    }, [parsedCertificateRequest]);

    const selectedRaProfileUuid = useWatch({ control, name: 'raProfileUuid' });
    const selectedRaProfile = useMemo(
        () => raProfiles.find((profile) => profile.uuid === selectedRaProfileUuid),
        [raProfiles, selectedRaProfileUuid],
    );
    const uploadCsrSource = useWatch({ control, name: 'uploadCsrSource' });
    const includeAltKey = useWatch({ control, name: 'includeAltKey' });
    const tokenProfileUuid = useWatch({ control, name: 'tokenProfileUuid' });
    const altTokenProfileUuid = useWatch({ control, name: 'altTokenProfileUuid' });
    const requestType = useWatch({ control, name: 'requestType' });
    const isRegister = requestType === 'register';
    const authorizationSecret = useWatch({ control, name: 'authorizationSecret' });
    // Core decides with String.isBlank(), so an all-whitespace value creates no authorization row —
    // treat it as unchallenged here too, or the operator would see a challenge-gated form for a
    // pre-registration Core leaves open.
    const hasChallenge = !!authorizationSecret?.trim();

    useEffect(() => {
        if (!selectedRaProfileUuid) {
            setValue('tokenProfileUuid', undefined);
            setValue('keyUuid', undefined);
            setValue('includeAltKey', false);
            setValue('altTokenProfileUuid', undefined);
            setValue('altKeyUuid', undefined);
        }
    }, [selectedRaProfileUuid, setValue]);

    useEffect(() => {
        setValue('keyUuid', undefined);
    }, [tokenProfileUuid, setValue]);

    useEffect(() => {
        setValue('altKeyUuid', undefined);
    }, [altTokenProfileUuid, setValue]);

    useEffect(() => {
        // Fields belonging to the other mode must not linger and keep the form stuck invalid.
        if (isRegister) {
            setValue('uploadCsrSource', undefined);
            setValue('tokenProfileUuid', undefined);
            setValue('keyUuid', undefined);
            setValue('includeAltKey', false);
            setValue('altTokenProfileUuid', undefined);
            setValue('altKeyUuid', undefined);
        } else {
            setValue('authorizationSecret', undefined);
            setValue('expiresAt', undefined);
            setValue('ownerUuid', undefined);
            setValue('groupUuids', undefined);
        }
    }, [isRegister, setValue]);

    useEffect(() => {
        // An issuance window is only meaningful for a challenge-gated pre-registration, so a value
        // entered and then abandoned must not survive clearing the challenge.
        if (!hasChallenge) {
            setValue('expiresAt', undefined);
            // RHF skips validation for a disabled field, so an error from a date picked earlier would
            // otherwise sit under the now-empty, unreachable input.
            clearErrors('expiresAt');
        }
    }, [hasChallenge, setValue, clearErrors]);

    useEffect(() => {
        // Owner/Groups options are only needed by the Pre-register Ownership tab; fetch them when that
        // mode is entered rather than on every Add Certificate mount.
        if (isRegister) {
            dispatch(userActions.list());
            dispatch(certificateGroupActions.listGroups());
        }
    }, [isRegister, dispatch]);

    const onRaProfileChange = useCallback(
        (raProfileUuid: string) => {
            // Validation errors belong to the previous profile's request — drop them on any change.
            dispatch(certificateActions.clearIssueErrors());
            if (raProfileUuid) {
                dispatch(certificateActions.getCsrAttributes({ raProfileUuid }));
            } else {
                dispatch(certificateActions.clearCsrAttributes());
            }
            // Callback-produced request-attribute fields belong to the previous profile — reset them on every
            // change (the issuance branch does the same below via setGroupAttributesCallbackAttributes).
            setCsrAttributesCallbackAttributes([]);
            const profile = raProfiles.find((p) => p.uuid === raProfileUuid);
            if (!profile?.authorityInstanceUuid) return;
            dispatch(connectorActions.clearCallbackData());
            setGroupAttributesCallbackAttributes([]);
            setRegisterAttributesCallbackAttributes([]);
            dispatch(
                certificateActions.getIssuanceAttributes({
                    raProfileUuid: profile.uuid,
                    authorityUuid: profile.authorityInstanceUuid,
                }),
            );
            dispatch(
                certificateActions.getRegisterAttributes({
                    raProfileUuid: profile.uuid,
                    authorityUuid: profile.authorityInstanceUuid,
                }),
            );
        },
        [
            dispatch,
            raProfiles,
            setGroupAttributesCallbackAttributes,
            setCsrAttributesCallbackAttributes,
            setRegisterAttributesCallbackAttributes,
        ],
    );

    const raProfileOptions = useMemo(
        () =>
            raProfiles
                .filter((profile) => profile.authorityInstanceUuid)
                .map((profile) => ({
                    label: profile.name,
                    value: profile.uuid,
                })),
        [raProfiles],
    );

    const ownerOptions = useMemo(
        () =>
            users.map((user) => ({
                label: `${user.firstName ? user.firstName + ' ' : ''}${user.lastName ? user.lastName + ' ' : ''}(${user.username})`,
                value: user.uuid,
            })),
        [users],
    );

    const groupOptions = useMemo(() => certificateGroups.map((group) => ({ label: group.name, value: group.uuid })), [certificateGroups]);

    const keySourceOptions = useMemo(
        () => [
            { label: 'External', value: 'external' },
            { label: 'Existing Key', value: 'existing' },
        ],
        [],
    );

    const isExternalSource = uploadCsrSource === 'external';
    const isExistingKeySource = uploadCsrSource === 'existing';

    // A single Request Properties tab strip serves both modes; tabs are shown/hidden per mode so the
    // Custom Attributes editor stays mounted across an Issue<->Pre-register switch (remounting it would
    // wipe entered values). Register: Request Attributes | Custom Attributes | Ownership. Issue-now:
    // Request Attributes (existing key) | Signature | [Alt Signature] | Custom Attributes | Connector.
    const showRequestAttributesTab = isRegister || (isExistingKeySource && !!tokenProfileUuid);
    const showSignatureTab = !isRegister && isExistingKeySource && !!tokenProfileUuid;
    const showAltSignatureTab = !isRegister && includeAltKey && !!altTokenProfileUuid;
    const showConnectorTab = !isRegister;
    const showOwnershipTab = isRegister;
    // Shown for the whole Pre-register mode (mirrors the Issue-mode Connector Attributes tab), even when
    // the CA defines no register attributes — the tab then renders an empty editor rather than vanishing.
    const showRegisterConnectorTab = isRegister;

    // Submitting before the descriptors land would collect an empty attribute set and silently drop
    // required connector/CSR attributes, so block submission while either fetch is in flight.
    const isFetchingRequestAttributes = isFetchingCsrAttributes || (isRegister && isFetchingRegisterAttributes);

    const submitCallback = useCallback(
        (formValues: CertificateFormValues) => {
            const profile = raProfiles.find((p) => p.uuid === formValues.raProfileUuid);
            if (!profile?.authorityInstanceUuid) return;

            const combinedValues = {
                ...formValues,
                ...attributeValuesRef.current,
            };

            if (formValues.requestType === 'register') {
                const csrAttrs = collectFormAttributes('csrAttributes', csrAttributeDescriptors, combinedValues);
                const customAttrs = collectFormAttributes('customCertificate', resourceCustomAttributes, combinedValues);
                const registerAttrs = collectFormAttributes(
                    'register_attributes',
                    [...(registerAttributeDescriptors[profile.uuid] ?? []), ...registerAttributesCallbackAttributes],
                    combinedValues,
                );

                dispatch(
                    certificateActions.registerCertificate({
                        raProfileUuid: profile.uuid,
                        authorityUuid: profile.authorityInstanceUuid,
                        registerRequest: {
                            // Blank is "unchallenged" to Core (String.isBlank), so never ship a
                            // whitespace-only secret that would silently create no authorization row.
                            authorizationSecret: formValues.authorizationSecret?.trim() ? formValues.authorizationSecret : undefined,
                            expiresAt: formValues.expiresAt ? new Date(formValues.expiresAt).toISOString() : undefined,
                            csrAttributes: csrAttrs,
                            customAttributes: customAttrs,
                            attributes: registerAttrs,
                            ownerUuid: formValues.ownerUuid || undefined,
                            groupUuids: formValues.groupUuids?.length ? formValues.groupUuids : undefined,
                        },
                    }),
                );
                return;
            }

            const issuanceAttributes = collectFormAttributes(
                'issuance_attributes',
                [...(issuanceAttributeDescriptors[profile.uuid] ?? []), ...groupAttributesCallbackAttributes],
                combinedValues,
            );

            const csrAttrs = collectFormAttributes('csrAttributes', csrAttributeDescriptors, combinedValues);
            const signatureAttrs = collectFormAttributes('signatureAttributes', signatureAttributeDescriptors, combinedValues);
            const customAttrs = collectFormAttributes('customCertificate', resourceCustomAttributes, combinedValues);

            const payload: Parameters<typeof certificateActions.issueCertificate>[0]['signRequest'] = {
                format: CertificateRequestFormat.Pkcs10,
                request: fileContent,
                attributes: issuanceAttributes,
                csrAttributes: csrAttrs,
                signatureAttributes: signatureAttrs,
                keyUuid: formValues.keyUuid,
                tokenProfileUuid: formValues.tokenProfileUuid,
                customAttributes: customAttrs,
            };

            if (formValues.includeAltKey) {
                payload.altKeyUuid = formValues.altKeyUuid;
                payload.altTokenProfileUuid = formValues.altTokenProfileUuid;
                payload.altSignatureAttributes = collectFormAttributes(
                    'altSignatureAttributes',
                    altSignatureAttributeDescriptors,
                    combinedValues,
                );
            }

            dispatch(
                certificateActions.issueCertificate({
                    raProfileUuid: profile.uuid,
                    authorityUuid: profile.authorityInstanceUuid,
                    signRequest: payload,
                }),
            );
        },
        [
            altSignatureAttributeDescriptors,
            csrAttributeDescriptors,
            dispatch,
            fileContent,
            groupAttributesCallbackAttributes,
            issuanceAttributeDescriptors,
            raProfiles,
            registerAttributeDescriptors,
            registerAttributesCallbackAttributes,
            resourceCustomAttributes,
            signatureAttributeDescriptors,
        ],
    );

    const onSubmit = useCallback(
        (values: CertificateFormValues) => {
            submitCallback(values);
        },
        [submitCallback],
    );

    const submitHandler = useCallback(
        (event: React.SyntheticEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (isFetchingRequestAttributes) {
                return;
            }
            handleSubmit(onSubmit)(event);
        },
        [handleSubmit, isFetchingRequestAttributes, onSubmit],
    );

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: 'Certificates', href: '/certificates/list' },
                    { label: 'Add Certificate', href: '' },
                ]}
            />
            <FormProvider {...methods}>
                <form onSubmit={submitHandler} noValidate>
                    <div className="space-y-4">
                        <Widget title="Add Certificate" busy={issuingCertificate || isFetchingResourceCustomAttributes}>
                            <div className="space-y-4">
                                <Controller
                                    control={control}
                                    name="requestType"
                                    render={({ field }) => (
                                        <div className="space-y-2">
                                            <RadioRow
                                                checked={field.value === 'issue'}
                                                onSelect={() => {
                                                    field.onChange('issue');
                                                    // Stale validation/compliance errors from the other mode must not linger.
                                                    dispatch(certificateActions.clearIssueErrors());
                                                }}
                                            >
                                                <span className="font-medium text-content" data-testid="requestType-issue">
                                                    Request now
                                                </span>
                                                <span className="text-content-subtle">
                                                    Submit a certificate request to the authority immediately.
                                                </span>
                                            </RadioRow>
                                            <RadioRow
                                                checked={field.value === 'register'}
                                                onSelect={() => {
                                                    field.onChange('register');
                                                    // Stale validation/compliance errors from the other mode must not linger.
                                                    dispatch(certificateActions.clearIssueErrors());
                                                }}
                                            >
                                                <span className="font-medium text-content" data-testid="requestType-register">
                                                    Pre-register
                                                </span>
                                                <span className="text-content-subtle">
                                                    Register a certificate to be issued later using a challenge secret.
                                                </span>
                                            </RadioRow>
                                        </div>
                                    )}
                                />

                                <Controller
                                    control={control}
                                    name="raProfileUuid"
                                    rules={{ required: true }}
                                    render={({ field: { value, onChange }, fieldState: { error } }) => (
                                        <Select
                                            id="raProfile"
                                            options={raProfileOptions}
                                            placeholder="Select RA Profile"
                                            value={value ?? ''}
                                            label="RA Profile"
                                            required
                                            onChange={(selected) => {
                                                const uuid = (selected ?? '') as string;
                                                onChange(uuid);
                                                onRaProfileChange(uuid);
                                                setValue('tokenProfileUuid', undefined);
                                                setValue('keyUuid', undefined);
                                                setValue('includeAltKey', false);
                                                setValue('altTokenProfileUuid', undefined);
                                                setValue('altKeyUuid', undefined);
                                            }}
                                            error={error && 'RA Profile is required'}
                                        />
                                    )}
                                />

                                {!isRegister && (
                                    <Controller
                                        control={control}
                                        name="uploadCsrSource"
                                        rules={{ required: !isRegister }}
                                        render={({ field: { value, onChange }, fieldState: { error } }) => (
                                            <Select
                                                id="uploadCsr"
                                                dataTestId="keySource"
                                                options={keySourceOptions}
                                                placeholder="Select Key Source"
                                                value={value ?? ''}
                                                label="Key Source"
                                                required
                                                onChange={(selected) => {
                                                    const source = (selected ?? '') as 'external' | 'existing';
                                                    onChange(source);
                                                    // Stale validation errors from the other source must not linger.
                                                    dispatch(certificateActions.clearIssueErrors());
                                                    if (source === 'external') {
                                                        setValue('tokenProfileUuid', undefined);
                                                        setValue('keyUuid', undefined);
                                                        setValue('includeAltKey', false);
                                                        setValue('altTokenProfileUuid', undefined);
                                                        setValue('altKeyUuid', undefined);
                                                    }
                                                }}
                                                error={error && 'Key Source is required'}
                                            />
                                        )}
                                    />
                                )}
                            </div>
                        </Widget>

                        <Widget title="Request Properties" busy={issuingCertificate || isFetchingResourceCustomAttributes}>
                            {!isRegister && isExternalSource && selectedRaProfile ? (
                                <div className="mb-4">
                                    <FileUpload
                                        editable
                                        required
                                        fileType={'CSR'}
                                        error={parseError}
                                        onContentChange={() => {
                                            dispatch(utilsCertificateRequestActions.reset());
                                            dispatch(certificateActions.clearIssueErrors());
                                        }}
                                        onFileContentLoaded={(uploadedContent) => {
                                            setFileContent(uploadedContent);
                                            dispatch(certificateActions.clearIssueErrors());
                                            if (health) {
                                                dispatch(
                                                    utilsCertificateRequestActions.parseCertificateRequest({
                                                        content: uploadedContent,
                                                        requestParseType: ParseRequestRequestDtoParseTypeEnum.Basic,
                                                    }),
                                                );
                                            }
                                        }}
                                    />

                                    {certificate && <CertificateAttributes csr certificate={certificate} />}
                                </div>
                            ) : null}

                            {!isRegister && isExistingKeySource && selectedRaProfile ? (
                                <div className="space-y-4 mb-4">
                                    <RenderTokenProfile type="normal" name="tokenProfileUuid" />
                                    <RenderRequestKey type="normal" name="keyUuid" tokenProfileField="tokenProfileUuid" />

                                    {tokenProfileUuid ? (
                                        <Controller
                                            control={control}
                                            name="includeAltKey"
                                            render={({ field: { value, onChange } }) => (
                                                <Switch
                                                    id="includeAltKey"
                                                    label="Include Alternative Key"
                                                    checked={value ?? false}
                                                    onChange={(checked) => {
                                                        onChange(checked);
                                                        if (!checked) {
                                                            setValue('altTokenProfileUuid', undefined);
                                                            setValue('altKeyUuid', undefined);
                                                        }
                                                    }}
                                                />
                                            )}
                                        />
                                    ) : null}

                                    {includeAltKey ? (
                                        <>
                                            <RenderTokenProfile type="alt" name="altTokenProfileUuid" />
                                            <RenderRequestKey type="alt" name="altKeyUuid" tokenProfileField="altTokenProfileUuid" />
                                        </>
                                    ) : null}
                                </div>
                            ) : null}

                            {isRegister && (
                                <div className="space-y-4 mb-4">
                                    <Controller
                                        control={control}
                                        name="authorizationSecret"
                                        rules={{
                                            // Optional: Core creates the authorization row only when a secret is
                                            // supplied, so an empty value is a valid unchallenged pre-registration.
                                            // Core tests it with String.isBlank(), hence the trim — an all-space
                                            // value passes the ASCII pattern but would create no row.
                                            validate: (value) =>
                                                !value?.trim() ||
                                                (value.length >= 12 && value.length <= 255 && /^[\x20-\x7E]+$/.test(value)) ||
                                                'Challenge must be 12–255 printable ASCII characters',
                                        }}
                                        render={({ field: { value, onChange }, fieldState }) => (
                                            <TextInput
                                                id="authorizationSecret"
                                                dataTestId="authorizationSecret"
                                                type="password"
                                                label="Challenge (optional)"
                                                labelTooltip="Leave empty to pre-register without a challenge — completion will not require a secret"
                                                value={value ?? ''}
                                                onChange={onChange}
                                                invalid={!!fieldState.error}
                                                error={fieldState.error?.message}
                                            />
                                        )}
                                    />
                                    <Controller
                                        control={control}
                                        name="expiresAt"
                                        // Core rejects expiresAt supplied without a challenge. Disabling on the
                                        // Controller (not just the input) keeps the field out of validation so it
                                        // can never leave the form stuck invalid while unreachable.
                                        disabled={!hasChallenge}
                                        rules={{
                                            // The Core contract marks expiresAt @Future; reject past/today dates the
                                            // native date picker would otherwise permit before Core rejects them.
                                            validate: (value) =>
                                                !value || new Date(value) > new Date() || 'Issuance window must be a future date',
                                        }}
                                        render={({ field: { value, onChange }, fieldState }) => (
                                            <TextInput
                                                id="expiresAt"
                                                dataTestId="expiresAt"
                                                type="date"
                                                label="Issuance window (optional)"
                                                labelTooltip={hasChallenge ? undefined : 'Requires a challenge'}
                                                disabled={!hasChallenge}
                                                value={value ?? ''}
                                                onChange={onChange}
                                                invalid={!!fieldState.error}
                                                error={fieldState.error?.message}
                                            />
                                        )}
                                    />
                                </div>
                            )}

                            <TabLayout
                                selectedTabKey={activeRequestTabKey}
                                onTabKeyChange={setActiveRequestTabKey}
                                onlyActiveTabContent={false}
                                tabs={[
                                    {
                                        tabKey: 'request-attributes',
                                        title: tabTitle('Request Attributes', csrAttributeDescriptors),
                                        hidden: !showRequestAttributesTab,
                                        content: renderRequestAttributesTabContent({
                                            csrAttributeDescriptors,
                                            csrAttributesCallbackAttributes,
                                            setCsrAttributesCallbackAttributes,
                                            isFetchingCsrAttributes,
                                            selectedRaProfileUuid,
                                        }),
                                    },
                                    {
                                        tabKey: 'signature-attributes',
                                        title: tabTitle('Signature Attributes', signatureAttributeDescriptors),
                                        hidden: !showSignatureTab,
                                        content: (
                                            <AttributeEditor
                                                id="signatureAttributes"
                                                attributeDescriptors={signatureAttributeDescriptors ?? []}
                                                groupAttributesCallbackAttributes={signatureAttributesCallbackAttributes}
                                                setGroupAttributesCallbackAttributes={setSignatureAttributesCallbackAttributes}
                                            />
                                        ),
                                    },
                                    {
                                        tabKey: 'alt-signature-attributes',
                                        title: tabTitle('Alternative Signature Attributes', altSignatureAttributeDescriptors),
                                        hidden: !showAltSignatureTab,
                                        content: (
                                            <AttributeEditor
                                                id="altSignatureAttributes"
                                                attributeDescriptors={altSignatureAttributeDescriptors ?? []}
                                                groupAttributesCallbackAttributes={altSignatureAttributesCallbackAttributes}
                                                setGroupAttributesCallbackAttributes={setAltSignatureAttributesCallbackAttributes}
                                            />
                                        ),
                                    },
                                    {
                                        // Never hidden: kept mounted in both modes so a mode switch can't remount and
                                        // clear entered custom-attribute values.
                                        tabKey: 'custom-attributes',
                                        title: tabTitle('Custom Attributes', resourceCustomAttributes),
                                        content: (
                                            <AttributeEditor
                                                id="customCertificate"
                                                attributeDescriptors={resourceCustomAttributes}
                                                attributes={selectedRaProfile?.customAttributes}
                                            />
                                        ),
                                    },
                                    {
                                        tabKey: 'ownership',
                                        title: 'Ownership',
                                        hidden: !showOwnershipTab,
                                        content: (
                                            <div className="space-y-4">
                                                <Controller
                                                    control={control}
                                                    name="ownerUuid"
                                                    render={({ field: { value, onChange } }) => (
                                                        <Select
                                                            id="registerOwner"
                                                            options={ownerOptions}
                                                            placeholder="Select Owner"
                                                            value={value ?? ''}
                                                            label="Owner"
                                                            isClearable
                                                            onChange={(selected) => onChange((selected ?? undefined) as string | undefined)}
                                                        />
                                                    )}
                                                />
                                                <Controller
                                                    control={control}
                                                    name="groupUuids"
                                                    render={({ field: { value, onChange } }) => (
                                                        <Select
                                                            id="registerGroups"
                                                            isMulti
                                                            options={groupOptions}
                                                            placeholder="Select Groups"
                                                            value={groupOptions.filter((option) => value?.includes(option.value))}
                                                            label="Groups"
                                                            onChange={(selected) =>
                                                                onChange((selected ?? []).map((option) => option.value as string))
                                                            }
                                                        />
                                                    )}
                                                />
                                            </div>
                                        ),
                                    },
                                    {
                                        // Issue-only: this tab's descriptors come from getIssuanceAttributes, which is
                                        // unrelated to the register-mode Connector Attributes tab below. Both tabs share
                                        // the same display title, so they need distinct keys to stay distinct subtrees.
                                        tabKey: 'issuance-connector-attributes',
                                        title: tabTitle('Connector Attributes', issuanceAttributeDescriptors[selectedRaProfileUuid || '']),
                                        hidden: !showConnectorTab,
                                        content: (
                                            <AttributeEditor
                                                id="issuance_attributes"
                                                attributeDescriptors={issuanceAttributeDescriptors[selectedRaProfileUuid || ''] || []}
                                                callbackParentUuid={selectedRaProfile?.uuid}
                                                callbackResource={Resource.Certificates}
                                                groupAttributesCallbackAttributes={groupAttributesCallbackAttributes}
                                                setGroupAttributesCallbackAttributes={setGroupAttributesCallbackAttributes}
                                            />
                                        ),
                                    },
                                    {
                                        tabKey: 'register-connector-attributes',
                                        title: tabTitle('Connector Attributes', registerAttributeDescriptors[selectedRaProfileUuid || '']),
                                        hidden: !showRegisterConnectorTab,
                                        content: renderRegisterAttributesTabContent({
                                            registerAttributeDescriptors: registerAttributeDescriptors[selectedRaProfileUuid || ''],
                                            registerAttributesCallbackAttributes,
                                            setRegisterAttributesCallbackAttributes,
                                            isFetchingRegisterAttributes,
                                            selectedRaProfileUuid,
                                            callbackParentUuid: selectedRaProfile?.uuid,
                                        }),
                                    },
                                ]}
                            />

                            {/* Compliance/validation errors apply to any issuance mode, not just external CSR.
                                Attribute-level messages are shown at their field instead; only the rest land here. */}
                            {selectedRaProfile && unattributedValidationErrors?.length ? (
                                <div className="mt-4">
                                    <ComplianceErrorsPanel errors={unattributedValidationErrors} />
                                </div>
                            ) : null}
                        </Widget>

                        <Container className="flex-row justify-end modal-footer" gap={4}>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={onCancel || (() => navigate(-1))}
                                    disabled={issuingCertificate}
                                    type="button"
                                >
                                    Cancel
                                </Button>
                                <ProgressButton
                                    title="Create"
                                    inProgressTitle="Creating"
                                    inProgress={issuingCertificate}
                                    disabled={!formState.isValid || isFetchingRequestAttributes}
                                />
                            </div>
                        </Container>
                    </div>
                </form>
            </FormProvider>
        </div>
    );
}
