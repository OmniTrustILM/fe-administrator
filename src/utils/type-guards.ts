import {
    type DocumentSigningWorkflowDto,
    type ManagedSigningSchemeInterface,
    ManagedSigningType,
    type RawSigningWorkflowDto,
    SigningScheme,
    type SigningSchemeInterface,
    SigningWorkflowType,
    type StaticKeyManagedSigningDto,
    type TimestampingWorkflowDto,
    type WorkflowInterface,
} from 'types/openapi';

// ─── Workflow Type Guards ──────────────────────────────────────────────────

export function isTimestampingWorkflow(wf: WorkflowInterface): wf is TimestampingWorkflowDto {
    return wf.type === SigningWorkflowType.Timestamping;
}

export function isDocumentSigningWorkflow(wf: WorkflowInterface): wf is DocumentSigningWorkflowDto {
    return wf.type === SigningWorkflowType.DocumentSigning;
}

export function isRawSigningWorkflow(wf: WorkflowInterface): wf is RawSigningWorkflowDto {
    return wf.type === SigningWorkflowType.RawSigning;
}

// ─── Signing Scheme Type Guards ──────────────────────────────────────────────

export function isStaticKeyManagedSigning(sc: SigningSchemeInterface): sc is StaticKeyManagedSigningDto {
    return (
        sc.signingScheme === SigningScheme.Managed &&
        (sc as ManagedSigningSchemeInterface).managedSigningType === ManagedSigningType.StaticKey
    );
}
