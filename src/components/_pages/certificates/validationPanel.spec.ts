import { describe, expect, it } from 'vitest';

import { getValidationPanelState, validationPanelMessages } from './validationPanel';
import { CertificateState, CertificateValidationStatus } from 'types/openapi';

describe('getValidationPanelState', () => {
    it('reports that validation waits for issuance while the certificate is only requested', () => {
        const state = getValidationPanelState({ state: CertificateState.Requested }, undefined);

        expect(state).toBe('pending-issuance');
        expect(validationPanelMessages['pending-issuance']).toBe('Validation will run once the certificate is issued.');
    });

    it('reports that validation waits for issuance even when a stale result is still in the store', () => {
        const state = getValidationPanelState(
            { state: CertificateState.Requested },
            { resultStatus: CertificateValidationStatus.Valid, validationChecks: {} },
        );

        expect(state).toBe('pending-issuance');
    });

    it('reports that validation has not run when an issued certificate has no result yet', () => {
        const state = getValidationPanelState({ state: CertificateState.Issued }, undefined);

        expect(state).toBe('not-run');
        expect(validationPanelMessages['not-run']).toBe('This certificate has not been validated yet.');
    });

    it('reports that validation has not run while the backend still reports the certificate as not checked', () => {
        const state = getValidationPanelState(
            { state: CertificateState.Issued },
            { resultStatus: CertificateValidationStatus.NotChecked, validationChecks: {} },
        );

        expect(state).toBe('not-run');
    });

    it('reports results when the certificate has a validation status', () => {
        const state = getValidationPanelState({ state: CertificateState.Issued }, { resultStatus: CertificateValidationStatus.Valid });

        expect(state).toBe('results');
    });

    it('reports results when the certificate has individual validation checks', () => {
        const state = getValidationPanelState(
            { state: CertificateState.Issued },
            {
                resultStatus: CertificateValidationStatus.Valid,
                validationChecks: { signature: { status: CertificateValidationStatus.Valid } },
            },
        );

        expect(state).toBe('results');
    });

    it('reports results when checks came back even though the overall status is still not checked', () => {
        const state = getValidationPanelState(
            { state: CertificateState.Issued },
            {
                resultStatus: CertificateValidationStatus.NotChecked,
                validationChecks: { signature: { status: CertificateValidationStatus.Valid } },
            },
        );

        expect(state).toBe('results');
    });

    it('reports that validation has not run when the certificate is not loaded', () => {
        expect(getValidationPanelState(undefined, undefined)).toBe('not-run');
    });
});
