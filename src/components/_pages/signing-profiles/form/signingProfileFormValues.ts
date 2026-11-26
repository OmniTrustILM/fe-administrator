import type { CustomAttributeModel } from 'types/attributes';
import {
    type DigestAlgorithm,
    ManagedSigningType,
    type RawSigningWorkflowDto,
    type RawSigningWorkflowRequestDto,
    Resource,
    type RequestAttribute,
    type SigningProfileDto,
    SigningRecordPersistenceMode,
    type SigningRecordPolicyDto,
    type SigningRecordPolicyRequestDto,
    SigningScheme,
    SigningWorkflowType,
    type StaticKeyManagedSigningRequestDto,
    type TimestampingWorkflowDto,
    type TimestampingWorkflowRequestDto,
} from 'types/openapi';
import { mapProfileAttribute, transformAttributes } from 'utils/attributes/attributes';
import { isContentSigningWorkflow, isRawSigningWorkflow, isStaticKeyManagedSigning, isTimestampingWorkflow } from 'utils/type-guards';
import type { CertificatePurposeFormValues } from './CertificatePurposeFields';
import { type ContentSigningFormValues, contentSigningFormValuesOf, emptyContentSigningFormValues } from './ContentSigningWorkflowFields';

/** Ids of the attribute editors, which prefix the form values `collectFormAttributes` reads. */
export const customAttributesEditorId = 'customSigningProfile';
export const signingOperationAttributesEditorId = 'signingOperationAttrs';
export const timestampingAttributesEditorId = 'signatureFormattingConnectorAttrs';

export type DigestAlgorithmOption = { value: DigestAlgorithm; label: string };

export interface SigningProfileFormValues extends ContentSigningFormValues {
    name: string;
    description: string;
    workflowType: SigningWorkflowType;
    qualifiedTimestamp: boolean;
    validateTokenSignature: boolean;
    timeQualityConfigurationUuid: string;
    defaultPolicyId: string;
    allowedPolicyIds: string[];
    allowedDigestAlgorithms: DigestAlgorithmOption[];
    signingScheme: SigningScheme;
    managedSigningType: ManagedSigningType;
    certificateUuid: string;
    recordingEnabled: boolean;
    recordRequestMetadata: boolean;
    recordSignature: boolean;
    recordSignedDocument: boolean;
    recordDtbs: boolean;
    retentionIndefinite: boolean;
    retentionDays: string;
    persistenceMode: SigningRecordPersistenceMode;
    /** Values of the attribute editors, keyed under each editor's id. */
    [key: string]: unknown;
}

export const digestAlgorithmOption = (algorithm: DigestAlgorithm): DigestAlgorithmOption => ({ value: algorithm, label: algorithm });

/** Defaults of the fields one workflow owns, restored when the operator switches workflow. The certificate depends on the workflow too. */
export const workflowSpecificDefaults = {
    signatureFormattingConnectorUuid: '',
    qualifiedTimestamp: false,
    validateTokenSignature: false,
    timeQualityConfigurationUuid: '',
    defaultPolicyId: '',
    allowedPolicyIds: [],
    allowedDigestAlgorithms: [],
    ...emptyContentSigningFormValues,
    certificateUuid: '',
} satisfies Partial<SigningProfileFormValues>;

const defaultRecordPolicy = {
    recordingEnabled: false,
    recordRequestMetadata: false,
    recordSignature: false,
    recordSignedDocument: false,
    recordDtbs: false,
    retentionIndefinite: true,
    retentionDays: '',
    persistenceMode: SigningRecordPersistenceMode.DeferredDurable,
} satisfies Partial<SigningProfileFormValues>;

/** Raw signature and DTBS are not stored for timestamping, as the RFC 3161 token embeds both (issue #1692). */
export const recordsSignatureAndDtbs = (workflowType: SigningWorkflowType) => workflowType !== SigningWorkflowType.Timestamping;

export const recordsSignedDocument = (workflowType: SigningWorkflowType) =>
    workflowType === SigningWorkflowType.ContentSigning || workflowType === SigningWorkflowType.Timestamping;

export function customAttributeFormValues(
    profile: SigningProfileDto | undefined,
    descriptorsByResource: Record<string, CustomAttributeModel[]>,
): Record<string, unknown> {
    const initial = mapProfileAttribute(
        profile,
        descriptorsByResource,
        Resource.SigningProfiles,
        'customAttributes',
        `__attributes__${customAttributesEditorId}__`,
    );
    return transformAttributes(initial ?? []);
}

export function newFormValues(customAttributeValues: Record<string, unknown>): SigningProfileFormValues {
    return {
        name: '',
        description: '',
        workflowType: SigningWorkflowType.Timestamping,
        ...workflowSpecificDefaults,
        signingScheme: SigningScheme.Managed,
        managedSigningType: ManagedSigningType.StaticKey,
        ...defaultRecordPolicy,
        ...customAttributeValues,
    };
}

function timestampingFormValuesOf(workflow: TimestampingWorkflowDto) {
    return {
        signatureFormattingConnectorUuid: workflow.signatureFormattingConnector?.uuid ?? '',
        qualifiedTimestamp: workflow.qualifiedTimestamp ?? false,
        validateTokenSignature: workflow.validateTokenSignature ?? false,
        timeQualityConfigurationUuid: workflow.timeQualityConfiguration?.uuid ?? '',
        defaultPolicyId: workflow.defaultPolicyId ?? '',
        allowedPolicyIds: workflow.allowedPolicyIds ?? [],
        allowedDigestAlgorithms: (workflow.allowedDigestAlgorithms ?? []).map(digestAlgorithmOption),
    } satisfies Partial<SigningProfileFormValues>;
}

function recordPolicyFormValuesOf(policy: SigningRecordPolicyDto | undefined) {
    if (!policy) return defaultRecordPolicy;
    return {
        recordingEnabled: policy.recordingEnabled ?? false,
        recordRequestMetadata: policy.recordRequestMetadata ?? false,
        recordSignature: policy.recordSignature ?? false,
        recordSignedDocument: policy.recordSignedDocument ?? false,
        recordDtbs: policy.recordDtbs ?? false,
        retentionIndefinite: policy.retentionDays == null,
        retentionDays: policy.retentionDays == null ? '' : String(policy.retentionDays),
        persistenceMode: policy.persistenceMode ?? SigningRecordPersistenceMode.DeferredDurable,
    } satisfies Partial<SigningProfileFormValues>;
}

/** The certificate purpose of a saved raw workflow. A profile saved without one requires no purpose. */
function rawSigningPurposeValuesOf(workflow: RawSigningWorkflowDto) {
    return {
        requireNonRepudiation: workflow.requireNonRepudiation ?? false,
        requiredExtendedKeyUsageOids: workflow.requiredExtendedKeyUsageOids ?? [],
    } satisfies Partial<SigningProfileFormValues>;
}

export function formValuesOf(profile: SigningProfileDto, customAttributeValues: Record<string, unknown>): SigningProfileFormValues {
    const { workflow, signingScheme } = profile;
    const staticKey = isStaticKeyManagedSigning(signingScheme) ? signingScheme : undefined;
    return {
        ...newFormValues(customAttributeValues),
        name: profile.name ?? '',
        description: profile.description ?? '',
        workflowType: workflow?.type ?? SigningWorkflowType.Timestamping,
        ...(isTimestampingWorkflow(workflow) ? timestampingFormValuesOf(workflow) : {}),
        ...(isContentSigningWorkflow(workflow) ? contentSigningFormValuesOf(workflow) : {}),
        ...(isRawSigningWorkflow(workflow) ? rawSigningPurposeValuesOf(workflow) : {}),
        signingScheme: signingScheme?.signingScheme ?? SigningScheme.Managed,
        managedSigningType: staticKey?.managedSigningType ?? ManagedSigningType.StaticKey,
        certificateUuid: staticKey?.certificate?.uuid ?? '',
        ...recordPolicyFormValuesOf(profile.recordPolicy),
    };
}

export function timestampingWorkflowRequest(
    values: SigningProfileFormValues,
    signatureFormattingConnectorAttributes: RequestAttribute[],
): TimestampingWorkflowRequestDto {
    return {
        type: SigningWorkflowType.Timestamping,
        signatureFormattingConnectorUuid: values.signatureFormattingConnectorUuid || undefined,
        signatureFormattingConnectorAttributes,
        qualifiedTimestamp: values.qualifiedTimestamp,
        validateTokenSignature: values.validateTokenSignature,
        timeQualityConfigurationUuid: values.timeQualityConfigurationUuid || undefined,
        defaultPolicyId: values.defaultPolicyId || undefined,
        allowedPolicyIds: values.allowedPolicyIds,
        allowedDigestAlgorithms: values.allowedDigestAlgorithms.map((option) => option.value),
    };
}

export function rawSigningWorkflowRequest(values: CertificatePurposeFormValues): RawSigningWorkflowRequestDto {
    return {
        type: SigningWorkflowType.RawSigning,
        requireNonRepudiation: values.requireNonRepudiation,
        requiredExtendedKeyUsageOids: values.requiredExtendedKeyUsageOids,
    };
}

export function signingSchemeRequest(
    values: SigningProfileFormValues,
    signingOperationAttributes: RequestAttribute[],
): StaticKeyManagedSigningRequestDto {
    return {
        signingScheme: values.signingScheme,
        managedSigningType: values.managedSigningType,
        certificateUuid: values.certificateUuid,
        signingOperationAttributes,
    };
}

/** The record policy, storing only what the workflow can record. */
export function recordPolicyRequest(values: SigningProfileFormValues): SigningRecordPolicyRequestDto {
    const signatureAndDtbs = recordsSignatureAndDtbs(values.workflowType);
    return {
        recordingEnabled: values.recordingEnabled,
        recordRequestMetadata: values.recordRequestMetadata,
        recordSignature: signatureAndDtbs && values.recordSignature,
        recordSignedDocument: recordsSignedDocument(values.workflowType) && values.recordSignedDocument,
        recordDtbs: signatureAndDtbs && values.recordDtbs,
        retentionDays: values.retentionIndefinite ? undefined : Number(values.retentionDays),
        persistenceMode: values.persistenceMode,
    };
}
