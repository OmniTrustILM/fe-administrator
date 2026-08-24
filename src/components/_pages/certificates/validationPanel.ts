import { CertificateState, CertificateValidationStatus, type CertificateValidationResultDto } from 'types/openapi';

export type ValidationPanelState = 'pending-issuance' | 'not-run' | 'results';

export const validationPanelMessages: Record<Exclude<ValidationPanelState, 'results'>, string> = {
    'pending-issuance': 'Validation will run once the certificate is issued.',
    'not-run': 'This certificate has not been validated yet.',
};

// The Validation tab was gated on certificate content alone, which hid it for every Requested
// certificate — the one state the pending notice exists to explain. Content still gates the
// results table and the compliance widget; this only decides whether the tab is reachable.
export function isValidationTabVisible(certificate: { state?: CertificateState; certificateContent?: string } | undefined): boolean {
    if (!certificate) return false;
    return Boolean(certificate.certificateContent) || certificate.state === CertificateState.Requested;
}

export function getValidationPanelState(
    certificate: { state?: CertificateState } | undefined,
    validationResult: CertificateValidationResultDto | undefined,
): ValidationPanelState {
    if (!certificate) return 'not-run';
    if (certificate.state === CertificateState.Requested) return 'pending-issuance';
    if (!validationResult) return 'not-run';
    if (Object.keys(validationResult.validationChecks ?? {}).length > 0) return 'results';

    const resultStatus = validationResult.resultStatus;
    return resultStatus && resultStatus !== CertificateValidationStatus.NotChecked ? 'results' : 'not-run';
}
