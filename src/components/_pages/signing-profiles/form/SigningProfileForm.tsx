import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router';

import AttributeEditor from 'components/Attributes/AttributeEditor';
import Breadcrumb from 'components/Breadcrumb';
import Button from 'components/Button';
import Container from 'components/Container';
import ProgressButton from 'components/ProgressButton';
import { TriangleAlert } from 'lucide-react';
import Select from 'components/Select';
import Switch from 'components/Switch';
import TextInput from 'components/TextInput';
import Widget from 'components/Widget';
import TabLayout from 'components/Layout/TabLayout';

import { actions as customAttributesActions, selectors as customAttributesSelectors } from 'ducks/customAttributes';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { actions as signingProfileActions, selectors as signingProfileSelectors } from 'ducks/signing-profiles';
import { actions as tqcActions, selectors as tqcSelectors } from 'ducks/time-quality-configurations';

import {
    DigestAlgorithm,
    ManagedSigningType,
    PlatformEnum,
    Resource,
    SigningRecordPersistenceMode,
    SigningScheme,
    SigningWorkflowType,
    type SigningRecordPolicyRequestDto,
    type TimestampingWorkflowRequestDto,
    type StaticKeyManagedSigningRequestDto,
} from 'types/openapi';
import { isStaticKeyManagedSigning, isTimestampingWorkflow } from 'utils/type-guards';
import { collectFormAttributes, mapProfileAttribute, transformAttributes } from 'utils/attributes/attributes';
import { validateAlphaNumericWithoutAccents, validateLength, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';

// ─── Label Helpers ────────────────────────────────────────────────────────────

const workflowTypeLabels: Record<SigningWorkflowType, string> = {
    [SigningWorkflowType.Timestamping]: 'Timestamping',
    [SigningWorkflowType.ContentSigning]: 'Content Signing (coming soon)',
    [SigningWorkflowType.RawSigning]: 'Raw Signing (coming soon)',
};

const workflowTypeTabLabels: Record<SigningWorkflowType, string> = {
    [SigningWorkflowType.Timestamping]: 'Timestamping',
    [SigningWorkflowType.ContentSigning]: 'Content Signing',
    [SigningWorkflowType.RawSigning]: 'Raw Signing',
};

const signingSchemeLabels: Record<SigningScheme, string> = {
    [SigningScheme.Managed]: 'Managed (ILM holds the key)',
    [SigningScheme.Delegated]: 'Delegated (coming soon)',
};

const managedSigningTypeLabels: Record<ManagedSigningType, string> = {
    [ManagedSigningType.StaticKey]: 'Static Key — use an existing certificate',
    [ManagedSigningType.OneTimeKey]: 'One-Time Key (coming soon)',
};

// Persistence-mode labels + descriptions are hardcoded here: SigningRecordPersistenceMode is not
// exposed as a platform enum and the generated enum carries no per-value descriptions. Ordered by
// descending durability, mirroring the DTO @Schema.
const persistenceModeLabels: Record<SigningRecordPersistenceMode, string> = {
    [SigningRecordPersistenceMode.Immediate]: 'Immediate',
    [SigningRecordPersistenceMode.DeferredDurable]: 'Deferred Durable',
    [SigningRecordPersistenceMode.BestEffort]: 'Best Effort',
};

const persistenceModeDescriptions: Record<SigningRecordPersistenceMode, string> = {
    [SigningRecordPersistenceMode.Immediate]: 'Persisted synchronously before responding — highest durability, highest latency.',
    [SigningRecordPersistenceMode.DeferredDurable]: 'Persisted durably but asynchronously — balanced latency and durability.',
    [SigningRecordPersistenceMode.BestEffort]: 'Persistence attempted without guarantees — lowest latency, may be lost.',
};

const persistenceModeOptions = Object.values(SigningRecordPersistenceMode).map((v) => ({ value: v, label: persistenceModeLabels[v] }));

const digestAlgorithmOptions = Object.values(DigestAlgorithm).map((v) => ({ value: v, label: v }));

// ─── Form Values ──────────────────────────────────────────────────────────────

interface AllowedPolicyIdEntry {
    id: number;
    value: string;
}

interface FormValues {
    name: string;
    description: string;
    // Tab 1 – Workflow type
    workflowType: SigningWorkflowType;
    // Tab 2 – Timestamping workflow
    signatureFormattingConnectorUuid: string;
    qualifiedTimestamp: boolean;
    validateTokenSignature: boolean;
    timeQualityConfigurationUuid: string;
    defaultPolicyId: string;
    allowedDigestAlgorithms: { value: DigestAlgorithm; label: string }[];
    // Tab 3 – Signing scheme
    signingScheme: SigningScheme;
    managedSigningType: ManagedSigningType;
    certificateUuid: string;
    // Tab 4 – Record policy
    recordingEnabled: boolean;
    recordRequestMetadata: boolean;
    recordSignature: boolean;
    recordSignedDocument: boolean;
    recordDtbs: boolean;
    retentionIndefinite: boolean;
    retentionDays: string;
    persistenceMode: SigningRecordPersistenceMode;
    // Tab 5 – custom attributes are handled by AttributeEditor / collectFormAttributes
    [key: string]: unknown;
}

const WORKFLOW_TYPE = SigningWorkflowType.Timestamping;

// Parse an ISO-8601 duration (e.g. "PT1S", "PT0.8S", "PT2M", "PT1H") into seconds.
// Returns undefined if the value can't be parsed.
function parseIsoDurationSeconds(duration: string | undefined): number | undefined {
    if (!duration) return undefined;
    // Single anchored pass that enforces the canonical D → (T) H → M → S ordering. Each unit is its own
    // capture group, so out-of-order values (e.g. "PT1S1H") fail to match. Anchoring keeps it linear-time.
    const match = /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(duration.trim());
    if (!match) return undefined;
    const [, days, hours, minutes, seconds] = match;
    // Reject component-less durations like "P" or "PT".
    if (days === undefined && hours === undefined && minutes === undefined && seconds === undefined) return undefined;
    const total = (Number(days) || 0) * 86400 + (Number(hours) || 0) * 3600 + (Number(minutes) || 0) * 60 + (Number(seconds) || 0);
    return Number.isFinite(total) ? total : undefined;
}

// Tailwind classes for a selectable option card (signing scheme / managed signing type).
function optionCardClassName(isSupported: boolean, isSelected: boolean): string {
    if (isSupported) {
        return isSelected ? 'border-blue-500 bg-blue-50 text-gray-900' : 'border-gray-300 bg-white text-gray-900 hover:border-blue-300';
    }
    return 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed opacity-60';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SigningProfileForm() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { id } = useParams();
    const editMode = useMemo(() => !!id, [id]);

    // ── Selectors ──────────────────────────────────────────────────────────────

    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));

    const signingProfile = useSelector(signingProfileSelectors.signingProfile);
    const isFetchingDetail = useSelector(signingProfileSelectors.isFetchingDetail);
    const isCreating = useSelector(signingProfileSelectors.isCreating);
    const isUpdating = useSelector(signingProfileSelectors.isUpdating);

    const connectors = useSelector(signingProfileSelectors.signatureFormattingConnectors);
    const isFetchingConnectors = useSelector(signingProfileSelectors.isFetchingSignatureFormattingConnectors);

    const timeQualityConfigurations = useSelector(tqcSelectors.timeQualityConfigurations);
    const isFetchingTqcList = useSelector(tqcSelectors.isFetchingList);
    const selectedTimeQualityConfiguration = useSelector(tqcSelectors.timeQualityConfiguration);

    const signingCertificates = useSelector(signingProfileSelectors.signingCertificates);
    const isFetchingSigningCertificates = useSelector(signingProfileSelectors.isFetchingSigningCertificates);

    const signingOperationAttributeDescriptors = useSelector(signingProfileSelectors.signingOperationAttributeDescriptors);
    const isFetchingSignatureAttributes = useSelector(signingProfileSelectors.isFetchingSignatureAttributes);

    const signatureFormattingConnectorAttributeDescriptors = useSelector(
        signingProfileSelectors.signatureFormattingConnectorAttributeDescriptors,
    );
    const isFetchingSignatureFormattingConnectorAttributes = useSelector(
        signingProfileSelectors.isFetchingSignatureFormattingConnectorAttributes,
    );

    const isFetchingResourceCustomAttributes = useSelector(customAttributesSelectors.isFetchingResourceCustomAttributes);
    const multipleResourceCustomAttributes = useSelector(
        customAttributesSelectors.multipleResourceCustomAttributes([Resource.SigningProfiles]),
    );

    // ── Local State ────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState(0);
    const [allowedPolicyIds, setAllowedPolicyIds] = useState<AllowedPolicyIdEntry[]>([]);
    const [policyIdInput, setPolicyIdInput] = useState('');
    const nextPolicyIdKey = useRef(0);

    // ── Busy ───────────────────────────────────────────────────────────────────

    const isBusy = useMemo(
        () =>
            isFetchingDetail ||
            isCreating ||
            isUpdating ||
            isFetchingConnectors ||
            isFetchingSigningCertificates ||
            isFetchingSignatureAttributes ||
            isFetchingResourceCustomAttributes,
        [
            isFetchingDetail,
            isCreating,
            isUpdating,
            isFetchingConnectors,
            isFetchingSigningCertificates,
            isFetchingSignatureAttributes,
            isFetchingResourceCustomAttributes,
        ],
    );

    // ── Load data on mount ────────────────────────────────────────────────────

    useEffect(() => {
        dispatch(signingProfileActions.listSignatureFormattingConnectors({ workflowType: WORKFLOW_TYPE }));
        dispatch(signingProfileActions.listSigningCertificates({ workflowType: WORKFLOW_TYPE }));
        dispatch(signingProfileActions.listSupportedProtocols({ workflowType: WORKFLOW_TYPE }));
        dispatch(tqcActions.listTimeQualityConfigurations({}));
        dispatch(
            customAttributesActions.loadMultipleResourceCustomAttributes([{ resource: Resource.SigningProfiles, customAttributes: [] }]),
        );
    }, [dispatch]);

    useEffect(() => {
        if (editMode && id) {
            dispatch(signingProfileActions.getSigningProfile({ uuid: id }));
        }
    }, [dispatch, editMode, id]);

    // ── Option lists ──────────────────────────────────────────────────────────

    const connectorOptions = useMemo(
        () =>
            connectors.map((c) => ({
                value: c.uuid,
                label: c.name,
            })),
        [connectors],
    );

    const certificateOptions = useMemo(
        () =>
            signingCertificates.map((cert) => ({
                value: cert.uuid,
                label: cert.commonName ? `${cert.commonName} (${cert.serialNumber || cert.fingerprint || cert.uuid})` : cert.uuid,
            })),
        [signingCertificates],
    );

    // ── Custom attribute initial values ───────────────────────────────────────

    const initialCustomAttributes = useMemo(
        () =>
            mapProfileAttribute(
                editMode ? signingProfile : undefined,
                multipleResourceCustomAttributes,
                Resource.SigningProfiles,
                'customAttributes',
                '__attributes__customSigningProfile__',
            ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    // ── Default form values ───────────────────────────────────────────────────

    const defaultValues = useMemo<FormValues>(
        () => ({
            name: '',
            description: '',
            workflowType: WORKFLOW_TYPE,
            signatureFormattingConnectorUuid: '',
            qualifiedTimestamp: false,
            timeQualityConfigurationUuid: '',
            defaultPolicyId: '',
            allowedDigestAlgorithms: [],
            signingScheme: SigningScheme.Managed,
            managedSigningType: ManagedSigningType.StaticKey,
            certificateUuid: '',
            recordingEnabled: false,
            recordRequestMetadata: false,
            recordSignature: false,
            recordSignedDocument: false,
            recordDtbs: false,
            retentionIndefinite: true,
            retentionDays: '',
            persistenceMode: SigningRecordPersistenceMode.DeferredDurable,
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
        setValue,
        getValues,
        trigger,
    } = methods;

    const workflowTypeValue = useWatch({ control, name: 'workflowType' });
    const signingSchemeValue = useWatch({ control, name: 'signingScheme' });
    const managedSigningTypeValue = useWatch({ control, name: 'managedSigningType' });
    const qualifiedTimestampValue = useWatch({ control, name: 'qualifiedTimestamp' });
    const certificateUuidValue = useWatch({ control, name: 'certificateUuid' });
    const signatureFormattingConnectorUuidValue = useWatch({ control, name: 'signatureFormattingConnectorUuid' });
    const timeQualityConfigurationUuidValue = useWatch({ control, name: 'timeQualityConfigurationUuid' });
    const recordingEnabledValue = useWatch({ control, name: 'recordingEnabled' });
    const retentionIndefiniteValue = useWatch({ control, name: 'retentionIndefinite' });
    const persistenceModeValue = useWatch({ control, name: 'persistenceMode' });

    // recordSignedDocument is only valid for CONTENT_SIGNING and TIMESTAMPING workflows.
    const recordSignedDocumentAllowed =
        workflowTypeValue === SigningWorkflowType.ContentSigning || workflowTypeValue === SigningWorkflowType.Timestamping;

    // For the timestamping (TSP) workflow the raw signature value and DTBS are intentionally not stored
    // separately: the RFC 3161 timestamp token is self-contained and already embeds both, so they are
    // recoverable from the stored signed document. The recordSignature / recordDtbs toggles are therefore
    // hidden for timestamping. (issue #1692)
    const signatureAndDtbsRecordable = workflowTypeValue !== SigningWorkflowType.Timestamping;

    const isFirstQualifiedTimestampRender = useRef(true);
    useEffect(() => {
        // Time Quality Configuration is required only while Qualified Timestamp is on. RHF does not
        // re-validate that field when this unrelated toggle changes, so re-validate it explicitly —
        // otherwise a stale "required" error (or a missing one) leaves isValid wrong. Running this
        // on every render of this effect (including mount and the edit-load reset that flips the
        // toggle) keeps it correct regardless of the toggle's default value. (issue #1820)
        void trigger('timeQualityConfigurationUuid');

        if (isFirstQualifiedTimestampRender.current) {
            isFirstQualifiedTimestampRender.current = false;
            return;
        }
        if (workflowTypeValue === SigningWorkflowType.Timestamping) {
            dispatch(
                signingProfileActions.listSigningCertificates({
                    workflowType: workflowTypeValue,
                    qualifiedTimestamp: qualifiedTimestampValue || undefined,
                }),
            );
        }
    }, [dispatch, workflowTypeValue, qualifiedTimestampValue, trigger]);

    // Fetch the selected Time Quality configuration's detail (the list DTO has no accuracy).
    useEffect(() => {
        if (timeQualityConfigurationUuidValue) {
            dispatch(tqcActions.getTimeQualityConfiguration({ uuid: timeQualityConfigurationUuidValue }));
        }
    }, [dispatch, timeQualityConfigurationUuidValue]);

    // Delta #219: for qualified signing, warn if the selected Time Quality accuracy is coarser than 1s.
    const selectedTqcAccuracySeconds =
        selectedTimeQualityConfiguration?.uuid === timeQualityConfigurationUuidValue
            ? parseIsoDurationSeconds(selectedTimeQualityConfiguration?.accuracy)
            : undefined;
    const showAccuracyWarning =
        Boolean(qualifiedTimestampValue) && selectedTqcAccuracySeconds !== undefined && selectedTqcAccuracySeconds > 1;
    const signingOperationAttributes = useMemo(() => {
        if (editMode && isStaticKeyManagedSigning(signingProfile?.signingScheme || {})) {
            return signingProfile?.signingScheme.signingOperationAttributes;
        }
        return undefined;
    }, [editMode, signingProfile?.signingScheme]);

    const customAttributes = useMemo(
        () => (editMode ? signingProfile?.customAttributes : undefined),
        [editMode, signingProfile?.customAttributes],
    );

    // ── Populate form in edit mode ────────────────────────────────────────────

    const lastResetIdRef = useRef<string | undefined>(undefined);

    const valuesToReset = useMemo<FormValues | undefined>(() => {
        if (!editMode || !id || !signingProfile || signingProfile.uuid !== id || isFetchingDetail) return undefined;

        const wf = signingProfile.workflow;
        const sc = signingProfile.signingScheme;
        const rp = signingProfile.recordPolicy;

        const attrInitial = mapProfileAttribute(
            signingProfile,
            multipleResourceCustomAttributes,
            Resource.SigningProfiles,
            'customAttributes',
            '__attributes__customSigningProfile__',
        );

        return {
            name: signingProfile.name || '',
            description: signingProfile.description || '',
            workflowType: wf?.type || WORKFLOW_TYPE,
            signatureFormattingConnectorUuid: isTimestampingWorkflow(wf) ? wf.signatureFormattingConnector?.uuid || '' : '',
            qualifiedTimestamp: isTimestampingWorkflow(wf) ? (wf.qualifiedTimestamp ?? false) : false,
            validateTokenSignature: isTimestampingWorkflow(wf) ? (wf.validateTokenSignature ?? false) : false,
            timeQualityConfigurationUuid: isTimestampingWorkflow(wf) ? wf.timeQualityConfiguration?.uuid || '' : '',
            defaultPolicyId: isTimestampingWorkflow(wf) ? wf.defaultPolicyId || '' : '',
            allowedDigestAlgorithms:
                isTimestampingWorkflow(wf) && wf.allowedDigestAlgorithms
                    ? wf.allowedDigestAlgorithms.map((d: DigestAlgorithm) => ({ value: d, label: d }))
                    : [],
            signingScheme: sc?.signingScheme || SigningScheme.Managed,
            managedSigningType: isStaticKeyManagedSigning(sc) ? sc.managedSigningType : ManagedSigningType.StaticKey,
            certificateUuid: isStaticKeyManagedSigning(sc) ? sc.certificateUuid || (sc as any).certificate?.uuid || '' : '',
            recordingEnabled: rp?.recordingEnabled ?? false,
            recordRequestMetadata: rp?.recordRequestMetadata ?? false,
            recordSignature: rp?.recordSignature ?? false,
            recordSignedDocument: rp?.recordSignedDocument ?? false,
            recordDtbs: rp?.recordDtbs ?? false,
            retentionIndefinite: rp?.retentionDays == null,
            retentionDays: rp?.retentionDays != null ? String(rp.retentionDays) : '',
            persistenceMode: rp?.persistenceMode ?? SigningRecordPersistenceMode.DeferredDurable,
            ...transformAttributes(attrInitial ?? []),
        };
    }, [editMode, id, signingProfile, isFetchingDetail, multipleResourceCustomAttributes]);

    useEffect(() => {
        if (valuesToReset && lastResetIdRef.current !== id) {
            reset(valuesToReset);

            // Restore policy IDs
            const wf = signingProfile?.workflow;
            const existingPolicies: string[] = isTimestampingWorkflow(wf) ? (wf.allowedPolicyIds ?? []) : [];
            setAllowedPolicyIds(existingPolicies.map((p) => ({ id: nextPolicyIdKey.current++, value: p })));

            lastResetIdRef.current = id;
        }
    }, [valuesToReset, id, reset, signingProfile]);

    // ── Fetch signature attribute descriptors when certificate changes ─────────

    useEffect(() => {
        if (!certificateUuidValue) return;
        dispatch(signingProfileActions.listSignatureAttributesForCertificate({ certificateUuid: certificateUuidValue }));
    }, [dispatch, certificateUuidValue]);

    useEffect(() => {
        if (!signatureFormattingConnectorUuidValue) return;
        dispatch(
            signingProfileActions.listSignatureFormattingConnectorAttributes({
                connectorUuid: signatureFormattingConnectorUuidValue,
                signingProfileUuid: editMode ? id : undefined,
            }),
        );
    }, [dispatch, signatureFormattingConnectorUuidValue, editMode, id]);

    const signatureFormattingConnectorAttributes = useMemo(
        () =>
            editMode && isTimestampingWorkflow(signingProfile?.workflow)
                ? signingProfile?.workflow.signatureFormattingConnectorAttributes
                : undefined,
        [editMode, signingProfile?.workflow],
    );

    // ── Policy ID helpers ─────────────────────────────────────────────────────

    const addPolicyId = useCallback(() => {
        const trimmed = policyIdInput.trim();
        if (!trimmed) return;
        setAllowedPolicyIds((prev) => [...prev, { id: nextPolicyIdKey.current++, value: trimmed }]);
        setPolicyIdInput('');
    }, [policyIdInput]);

    const removePolicyId = useCallback((id: number) => {
        setAllowedPolicyIds((prev) => prev.filter((p) => p.id !== id));
    }, []);

    // ── Submit ────────────────────────────────────────────────────────────────

    const onSubmit = useCallback(
        (values: FormValues) => {
            const customAttrs = collectFormAttributes(
                'customSigningProfile',
                multipleResourceCustomAttributes[Resource.SigningProfiles],
                values,
            );

            const signingOpAttrs = collectFormAttributes('signingOperationAttrs', signingOperationAttributeDescriptors, values);
            const formattingConnectorAttrs = collectFormAttributes(
                'signatureFormattingConnectorAttrs',
                signatureFormattingConnectorAttributeDescriptors,
                values,
            );

            const workflowRequest: TimestampingWorkflowRequestDto = {
                type: values.workflowType,
                signatureFormattingConnectorUuid: values.signatureFormattingConnectorUuid || undefined,
                signatureFormattingConnectorAttributes: formattingConnectorAttrs,
                qualifiedTimestamp: values.qualifiedTimestamp,
                validateTokenSignature: values.validateTokenSignature,
                timeQualityConfigurationUuid: values.timeQualityConfigurationUuid || undefined,
                defaultPolicyId: values.defaultPolicyId || undefined,
                allowedPolicyIds: allowedPolicyIds.map((p) => p.value),
                allowedDigestAlgorithms: (values.allowedDigestAlgorithms ?? []).map((d) => d.value),
            };

            const schemeRequest: StaticKeyManagedSigningRequestDto = {
                signingScheme: values.signingScheme,
                managedSigningType: values.managedSigningType,
                certificateUuid: values.certificateUuid,
                signingOperationAttributes: signingOpAttrs,
            };

            const recordPolicy: SigningRecordPolicyRequestDto = {
                recordingEnabled: values.recordingEnabled,
                recordRequestMetadata: values.recordRequestMetadata,
                // Not stored for the timestamping workflow; force false when the toggle is hidden.
                recordSignature: signatureAndDtbsRecordable ? values.recordSignature : false,
                // Only valid for CONTENT_SIGNING / TIMESTAMPING; force false otherwise.
                recordSignedDocument: recordSignedDocumentAllowed ? values.recordSignedDocument : false,
                recordDtbs: signatureAndDtbsRecordable ? values.recordDtbs : false,
                retentionDays: values.retentionIndefinite ? undefined : Number(values.retentionDays),
                persistenceMode: values.persistenceMode,
            };

            const requestDto = {
                name: values.name,
                description: values.description || undefined,
                workflow: workflowRequest,
                signingScheme: schemeRequest,
                recordPolicy,
                customAttributes: customAttrs,
            };

            if (editMode && id) {
                dispatch(signingProfileActions.updateSigningProfile({ uuid: id, signingProfileRequestDto: requestDto }));
            } else {
                dispatch(signingProfileActions.createSigningProfile({ signingProfileRequestDto: requestDto }));
            }
        },
        [
            dispatch,
            editMode,
            id,
            allowedPolicyIds,
            multipleResourceCustomAttributes,
            signingOperationAttributeDescriptors,
            signatureFormattingConnectorAttributeDescriptors,
            recordSignedDocumentAllowed,
            signatureAndDtbsRecordable,
        ],
    );

    const onCancel = useCallback(() => {
        navigate(-1);
    }, [navigate]);

    // ─────────────────────────────────────────────────────────────────────────
    // Tab content
    // ─────────────────────────────────────────────────────────────────────────

    // Tab 1 ── General & Workflow Type
    const tab1Content = (
        <div className="space-y-4">
            <Controller
                name="name"
                control={control}
                rules={buildValidationRules([validateRequired(), validateAlphaNumericWithoutAccents(), validateLength(1, 255)])}
                render={({ field, fieldState }) => (
                    <TextInput
                        {...field}
                        id="signingProfileName"
                        type="text"
                        label="Signing Profile Name"
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
                <p className="block text-sm font-medium text-gray-700 mb-2">
                    Signing Workflow Type <span className="text-red-500">*</span>
                </p>
                <div className="space-y-2">
                    {Object.values(SigningWorkflowType)
                        .filter((wt) => wt === SigningWorkflowType.Timestamping)
                        .map((wt) => {
                            const isSupported = wt === SigningWorkflowType.Timestamping;
                            return (
                                <label
                                    key={wt}
                                    className={`flex items-center gap-x-3 p-3 border rounded-lg cursor-pointer ${
                                        isSupported
                                            ? 'border-blue-300 bg-blue-50 text-gray-900'
                                            : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed opacity-60'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="workflowType"
                                        value={wt}
                                        checked={wt === workflowTypeValue}
                                        disabled={!isSupported}
                                        className="accent-blue-600"
                                        onChange={() => setValue('workflowType', wt, { shouldDirty: true })}
                                    />
                                    <span className="text-sm font-medium">{workflowTypeLabels[wt]}</span>
                                </label>
                            );
                        })}
                </div>
            </div>
        </div>
    );

    // Tab 2 ── Timestamping Workflow Properties
    const tab2Content = (
        <div className="space-y-4">
            {/* #219: signature formatting connector is required for the managed scheme when timestamping
                (and content signing); it is hidden/omitted for raw and delegated signing — those
                workflows/schemes are not offered here, so the connector is always required. */}
            <Controller
                name="signatureFormattingConnectorUuid"
                control={control}
                rules={buildValidationRules([validateRequired()])}
                render={({ field, fieldState }) => (
                    <Select
                        id="signatureFormattingConnector"
                        label="Signature Formatting Connector"
                        value={field.value || ''}
                        onChange={field.onChange}
                        options={connectorOptions}
                        placeholder="Select a connector…"
                        isClearable
                        isLoading={isFetchingConnectors}
                        placement="bottom"
                        invalid={fieldState.error && fieldState.isTouched}
                        error={getFieldErrorMessage(fieldState)}
                    />
                )}
            />

            {signatureFormattingConnectorUuidValue && (
                <Widget title="Signature Formatting Connector Attributes" noBorder busy={isFetchingSignatureFormattingConnectorAttributes}>
                    {signatureFormattingConnectorAttributeDescriptors.length > 0 ? (
                        <AttributeEditor
                            id="signatureFormattingConnectorAttrs"
                            attributeDescriptors={signatureFormattingConnectorAttributeDescriptors as any}
                            attributes={signatureFormattingConnectorAttributes}
                        />
                    ) : (
                        !isFetchingSignatureFormattingConnectorAttributes && (
                            <p className="text-xs text-gray-500">No attributes available for the selected connector.</p>
                        )
                    )}
                </Widget>
            )}

            <div className="flex items-center mt-2">
                <Controller
                    name="qualifiedTimestamp"
                    control={control}
                    render={({ field }) => (
                        <Switch
                            id="qualifiedTimestamp"
                            checked={field.value ?? false}
                            onChange={(checked) => field.onChange(checked)}
                            secondaryLabel="Qualified Timestamp (ETSI EN 319 421)"
                        />
                    )}
                />
            </div>

            <div className="flex items-center mt-2">
                <Controller
                    name="validateTokenSignature"
                    control={control}
                    render={({ field }) => (
                        <Switch
                            id="validateTokenSignature"
                            checked={field.value ?? false}
                            onChange={(checked) => field.onChange(checked)}
                            secondaryLabel="Validate Timestamp after Creation"
                        />
                    )}
                />
            </div>

            <Controller
                name="timeQualityConfigurationUuid"
                control={control}
                // Required only when Qualified Timestamp is on. The validator reads the live value via
                // getValues (rather than a render-time closure) because a Controller's `rules` prop is
                // captured at registration and not reactive; pair this with the trigger() call in the
                // qualifiedTimestamp effect so isValid is recomputed when the toggle flips. (issue #1820)
                rules={buildValidationRules([(value) => (getValues('qualifiedTimestamp') ? validateRequired()(value) : undefined)])}
                render={({ field, fieldState }) => (
                    <Select
                        {...field}
                        inputId="timeQualityConfigurationUuid"
                        label={qualifiedTimestampValue ? 'Time Quality Configuration' : 'Time Quality Configuration (optional)'}
                        placeholder="Select a Time Quality Configuration…"
                        options={timeQualityConfigurations.map((tqc) => ({ value: tqc.uuid, label: tqc.name }))}
                        value={
                            field.value
                                ? (timeQualityConfigurations
                                      .filter((tqc) => tqc.uuid === field.value)
                                      .map((tqc) => ({ value: tqc.uuid, label: tqc.name }))[0] ?? null)
                                : null
                        }
                        onChange={field.onChange}
                        isLoading={isFetchingTqcList}
                        isClearable
                        invalid={fieldState.error && fieldState.isTouched}
                        error={getFieldErrorMessage(fieldState)}
                    />
                )}
            />
            {showAccuracyWarning && (
                <div className="mt-2 flex items-start gap-x-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800">
                    <TriangleAlert size={16} className="mt-0.5 shrink-0" />
                    <span>
                        The selected Time Quality Configuration has an accuracy coarser than 1&nbsp;second
                        {selectedTimeQualityConfiguration?.accuracy ? ` (${selectedTimeQualityConfiguration.accuracy})` : ''} — this may not
                        satisfy qualified timestamp requirements.
                    </span>
                </div>
            )}

            <Controller
                name="defaultPolicyId"
                control={control}
                render={({ field, fieldState }) => (
                    <TextInput
                        {...field}
                        id="defaultPolicyId"
                        type="text"
                        label="Default TSA Policy ID (OID format)"
                        placeholder="e.g. 1.2.3.4.5"
                        invalid={fieldState.error && fieldState.isTouched}
                        error={getFieldErrorMessage(fieldState)}
                    />
                )}
            />

            <div>
                <label htmlFor="policyIdInput" className="block text-sm font-medium text-gray-700 mb-1">
                    Allowed TSA Policy IDs
                </label>
                <div className="flex gap-x-2 mb-2">
                    <input
                        id="policyIdInput"
                        type="text"
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter an OID and press Add"
                        value={policyIdInput}
                        onChange={(e) => setPolicyIdInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addPolicyId();
                            }
                        }}
                    />
                    <Button type="button" variant="outline" onClick={addPolicyId} disabled={!policyIdInput.trim()}>
                        Add
                    </Button>
                </div>
                {allowedPolicyIds.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {allowedPolicyIds.map((entry) => (
                            <span
                                key={entry.id}
                                className="inline-flex items-center gap-x-1 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full"
                            >
                                {entry.value}
                                <button
                                    type="button"
                                    className="ml-1 text-blue-500 hover:text-blue-700"
                                    onClick={() => removePolicyId(entry.id)}
                                    aria-label={`Remove ${entry.value}`}
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                )}
                {allowedPolicyIds.length === 0 && (
                    <p className="text-xs text-gray-400">No policies added. All policy IDs will be accepted.</p>
                )}
            </div>

            <Controller
                name="allowedDigestAlgorithms"
                control={control}
                render={({ field }) => (
                    <Select
                        id="allowedDigestAlgorithms"
                        label="Allowed Digest Algorithms"
                        value={field.value}
                        onChange={field.onChange}
                        options={digestAlgorithmOptions}
                        placeholder="All digest algorithms accepted (leave empty)"
                        isMulti
                        placement="bottom"
                    />
                )}
            />
        </div>
    );

    // Tab 3 ── Signing Scheme
    const tab3Content = (
        <div className="space-y-4">
            {/* Level 1: Managed vs Delegated */}
            <div>
                <p className="block text-sm font-medium text-gray-700 mb-2">
                    Signing Scheme <span className="text-red-500">*</span>
                </p>
                <div className="space-y-2">
                    {Object.values(SigningScheme)
                        .filter((scheme) => scheme === SigningScheme.Managed)
                        .map((scheme) => {
                            const isSupported = scheme === SigningScheme.Managed;
                            return (
                                <label
                                    key={scheme}
                                    className={`flex items-center gap-x-3 p-3 border rounded-lg cursor-pointer ${optionCardClassName(
                                        isSupported,
                                        signingSchemeValue === scheme,
                                    )}`}
                                >
                                    <input
                                        type="radio"
                                        name="signingScheme"
                                        value={scheme}
                                        checked={signingSchemeValue === scheme}
                                        disabled={!isSupported}
                                        onChange={() => isSupported && setValue('signingScheme', scheme, { shouldDirty: true })}
                                        className="accent-blue-600"
                                    />
                                    <span className="text-sm font-medium">{signingSchemeLabels[scheme]}</span>
                                </label>
                            );
                        })}
                </div>
            </div>

            {/* Level 2: Managed signing type (only for Managed) */}
            {signingSchemeValue === SigningScheme.Managed && (
                <div>
                    <p className="block text-sm font-medium text-gray-700 mb-2">
                        Managed Signing Type <span className="text-red-500">*</span>
                    </p>
                    <div className="space-y-2">
                        {Object.values(ManagedSigningType)
                            .filter((mst) => mst === ManagedSigningType.StaticKey)
                            .map((mst) => {
                                const isSupported = mst === ManagedSigningType.StaticKey;
                                return (
                                    <label
                                        key={mst}
                                        className={`flex items-center gap-x-3 p-3 border rounded-lg cursor-pointer ${optionCardClassName(
                                            isSupported,
                                            managedSigningTypeValue === mst,
                                        )}`}
                                    >
                                        <input
                                            type="radio"
                                            name="managedSigningType"
                                            value={mst}
                                            checked={managedSigningTypeValue === mst}
                                            disabled={!isSupported}
                                            onChange={() => isSupported && setValue('managedSigningType', mst, { shouldDirty: true })}
                                            className="accent-blue-600"
                                        />
                                        <span className="text-sm font-medium">{managedSigningTypeLabels[mst]}</span>
                                    </label>
                                );
                            })}
                    </div>
                </div>
            )}

            {/* Certificate select – Static Key + Managed */}
            {signingSchemeValue === SigningScheme.Managed && managedSigningTypeValue === ManagedSigningType.StaticKey && (
                <>
                    <Controller
                        name="certificateUuid"
                        control={control}
                        rules={buildValidationRules([validateRequired()])}
                        render={({ field, fieldState }) => (
                            <Select
                                id="certificateUuid"
                                label="Certificate"
                                value={field.value || ''}
                                onChange={field.onChange}
                                options={certificateOptions}
                                placeholder="Select a certificate"
                                isLoading={isFetchingSigningCertificates}
                                placement="bottom"
                                required
                                invalid={fieldState.error && fieldState.isTouched}
                                error={getFieldErrorMessage(fieldState)}
                            />
                        )}
                    />

                    {certificateUuidValue && (
                        <Widget title="Signing Operation Attributes" noBorder busy={isFetchingSignatureAttributes}>
                            {signingOperationAttributeDescriptors.length > 0 ? (
                                <AttributeEditor
                                    id="signingOperationAttrs"
                                    attributeDescriptors={signingOperationAttributeDescriptors as any}
                                    attributes={signingOperationAttributes}
                                />
                            ) : (
                                !isFetchingSignatureAttributes && (
                                    <p className="text-xs text-gray-500">
                                        No signing operation attributes are available for the selected certificate's key algorithm.
                                    </p>
                                )
                            )}
                        </Widget>
                    )}
                </>
            )}
        </div>
    );

    // Tab 4 ── Record Policy
    const tab4Content = (
        <div className="space-y-4">
            <p className="text-sm text-gray-600">
                Configure what is captured for each signing operation, how long it is retained, and how durably it is persisted.
            </p>

            <div className="flex items-center mt-2">
                <Controller
                    name="recordingEnabled"
                    control={control}
                    render={({ field }) => (
                        <Switch
                            id="recordingEnabled"
                            checked={field.value ?? false}
                            onChange={(checked) => field.onChange(checked)}
                            secondaryLabel="Recording Enabled"
                        />
                    )}
                />
            </div>
            {!recordingEnabledValue && (
                <p className="text-xs text-gray-500">No Signing Record is created for this profile while recording is disabled.</p>
            )}

            {/* Content policy */}
            <div className={recordingEnabledValue ? '' : 'opacity-60'}>
                <p className="block text-sm font-medium text-gray-700 mb-2">Captured Content</p>
                <div className="space-y-3">
                    <Controller
                        name="recordRequestMetadata"
                        control={control}
                        render={({ field }) => (
                            <Switch
                                id="recordRequestMetadata"
                                checked={field.value ?? false}
                                onChange={(checked) => field.onChange(checked)}
                                disabled={!recordingEnabledValue}
                                secondaryLabel="Request metadata (algorithm, policy IDs, claimed signer)"
                            />
                        )}
                    />
                    {signatureAndDtbsRecordable && (
                        <Controller
                            name="recordSignature"
                            control={control}
                            render={({ field }) => (
                                <Switch
                                    id="recordSignature"
                                    checked={field.value ?? false}
                                    onChange={(checked) => field.onChange(checked)}
                                    disabled={!recordingEnabledValue}
                                    secondaryLabel="Raw signature value"
                                />
                            )}
                        />
                    )}
                    <div>
                        <Controller
                            name="recordSignedDocument"
                            control={control}
                            render={({ field }) => (
                                <Switch
                                    id="recordSignedDocument"
                                    checked={(field.value ?? false) && recordSignedDocumentAllowed}
                                    onChange={(checked) => field.onChange(checked)}
                                    disabled={!recordingEnabledValue || !recordSignedDocumentAllowed}
                                    secondaryLabel="Assembled signed document"
                                />
                            )}
                        />
                        {!recordSignedDocumentAllowed && (
                            <p className="ml-16 mt-1 text-xs text-gray-500">
                                Only available for the Content Signing and Timestamping workflows.
                            </p>
                        )}
                    </div>
                    {signatureAndDtbsRecordable && (
                        <Controller
                            name="recordDtbs"
                            control={control}
                            render={({ field }) => (
                                <Switch
                                    id="recordDtbs"
                                    checked={field.value ?? false}
                                    onChange={(checked) => field.onChange(checked)}
                                    disabled={!recordingEnabledValue}
                                    secondaryLabel="Data-to-be-signed bytes"
                                />
                            )}
                        />
                    )}
                </div>
            </div>

            {/* Retention */}
            <div className={recordingEnabledValue ? '' : 'opacity-60'}>
                <p className="block text-sm font-medium text-gray-700 mb-2">Retention</p>
                <Controller
                    name="retentionIndefinite"
                    control={control}
                    render={({ field }) => (
                        <Switch
                            id="retentionIndefinite"
                            checked={field.value ?? true}
                            onChange={(checked) => field.onChange(checked)}
                            disabled={!recordingEnabledValue}
                            secondaryLabel="Retain indefinitely"
                        />
                    )}
                />
                {recordingEnabledValue && !retentionIndefiniteValue && (
                    <div className="mt-3">
                        <Controller
                            name="retentionDays"
                            control={control}
                            rules={{
                                required: 'Retention period is required',
                                validate: (value) => {
                                    const n = Number(value);
                                    if (!value || !Number.isInteger(n) || n < 1) {
                                        return 'Retention must be a whole number of at least 1 day';
                                    }
                                    return true;
                                },
                            }}
                            render={({ field, fieldState }) => (
                                <TextInput
                                    {...field}
                                    id="retentionDays"
                                    type="number"
                                    label="Retention (days)"
                                    placeholder="e.g. 365"
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                />
                            )}
                        />
                    </div>
                )}
            </div>

            {/* Persistence mode */}
            <div className={recordingEnabledValue ? '' : 'opacity-60'}>
                <Controller
                    name="persistenceMode"
                    control={control}
                    render={({ field }) => (
                        <Select
                            id="persistenceMode"
                            label="Persistence Mode"
                            value={field.value}
                            onChange={field.onChange}
                            options={persistenceModeOptions}
                            disabled={!recordingEnabledValue}
                            isClearable={false}
                            placement="bottom"
                        />
                    )}
                />
                {persistenceModeValue && <p className="mt-1 text-xs text-gray-500">{persistenceModeDescriptions[persistenceModeValue]}</p>}
            </div>
        </div>
    );

    // Tab 5 ── Custom Attributes
    const tab5Content = (
        <Widget title="Custom Attributes" noBorder busy={isFetchingResourceCustomAttributes}>
            <AttributeEditor
                id="customSigningProfile"
                attributeDescriptors={multipleResourceCustomAttributes[Resource.SigningProfiles] || []}
                attributes={customAttributes}
            />
        </Widget>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <Container>
            <Breadcrumb
                items={[
                    {
                        label: `${getEnumLabel(resourceEnum, Resource.SigningProfiles)} Inventory`,
                        href: `/${Resource.SigningProfiles.toLowerCase()}`,
                    },
                    {
                        label: editMode ? signingProfile?.name || 'Edit Signing Profile' : 'Create Signing Profile',
                        href: '',
                    },
                ]}
            />

            <FormProvider {...methods}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Widget title={editMode ? 'Edit Signing Profile' : 'Create Signing Profile'} busy={isBusy} titleSize="large">
                        <TabLayout
                            selectedTab={activeTab}
                            onTabChange={setActiveTab}
                            onlyActiveTabContent={false}
                            tabs={[
                                {
                                    title: '1 · General',
                                    content: tab1Content,
                                },
                                {
                                    title: `2 · ${workflowTypeTabLabels[workflowTypeValue] ?? 'Signing Workflow'} Properties`,
                                    content: tab2Content,
                                },
                                {
                                    title: '3 · Signing Scheme',
                                    content: tab3Content,
                                },
                                {
                                    title: '4 · Record Policy',
                                    content: tab4Content,
                                },
                                {
                                    title: '5 · Custom Attributes',
                                    content: tab5Content,
                                },
                            ]}
                        />

                        <Container className="flex-row justify-end mt-4" gap={4}>
                            <Button variant="outline" onClick={onCancel} disabled={isSubmitting} type="button">
                                Cancel
                            </Button>
                            <ProgressButton
                                title={editMode ? 'Update' : 'Create'}
                                inProgressTitle={editMode ? 'Updating...' : 'Creating...'}
                                inProgress={isSubmitting || isCreating || isUpdating}
                                disabled={!isDirty || isSubmitting || !isValid}
                                type="submit"
                            />
                        </Container>
                    </Widget>
                </form>
            </FormProvider>
        </Container>
    );
}
