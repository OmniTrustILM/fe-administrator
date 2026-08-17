import { CertificateState, type CertificateValidationResultDto } from 'types/openapi';

export type ValidationPanelState = 'pending-issuance' | 'not-run' | 'results';

export const validationPanelMessages: Record<Exclude<ValidationPanelState, 'results'>, string> = {
    'pending-issuance': 'Validation will run once the certificate is issued.',
    'not-run': 'This certificate has not been validated yet.',
};

export function getValidationPanelState(
    certificate: { state?: CertificateState } | undefined,
    validationResult: CertificateValidationResultDto | undefined,
): ValidationPanelState {
    if (!certificate) return 'not-run';
    if (certificate.state === CertificateState.Requested) return 'pending-issuance';
    if (validationResult?.resultStatus) return 'results';
    return Object.keys(validationResult?.validationChecks ?? {}).length > 0 ? 'results' : 'not-run';
}
