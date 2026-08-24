import { describe, expect, it } from 'vitest';
import { CertificateValidationStatus } from 'types/openapi';

import { DEFAULT_NODE_CLASSES, getCertificateNodeClasses, getGroupNodeClasses, getNodeClasses } from './nodeStatusClasses';

describe('getCertificateNodeClasses', () => {
    it.each(Object.values(CertificateValidationStatus))('returns dedicated classes for the %s validation status', (status) => {
        const classes = getCertificateNodeClasses(status);

        expect(classes).not.toBe(DEFAULT_NODE_CLASSES);
        expect(classes.length).toBeGreaterThan(0);
    });

    it('maps the valid status to the success token', () => {
        expect(getCertificateNodeClasses(CertificateValidationStatus.Valid)).toContain('border-success');
    });

    it('falls back to the default classes when the validation status is unknown', () => {
        expect(getCertificateNodeClasses(undefined)).toBe(DEFAULT_NODE_CLASSES);
    });
});

describe('getGroupNodeClasses', () => {
    it('styles rule nodes with the brand token', () => {
        expect(getGroupNodeClasses('rules')).toContain('border-brand');
    });

    it('styles action nodes with the success token', () => {
        expect(getGroupNodeClasses('actions')).toContain('border-success');
    });

    it('falls back to the default classes for an unknown group', () => {
        expect(getGroupNodeClasses('something-else')).toBe(DEFAULT_NODE_CLASSES);
        expect(getGroupNodeClasses(undefined)).toBe(DEFAULT_NODE_CLASSES);
    });
});

describe('getNodeClasses', () => {
    it('uses the certificate mapping for a certificate node', () => {
        const classes = getNodeClasses({
            certificateNodeData: { certificateNodeValidationStatus: CertificateValidationStatus.Expiring },
        });

        expect(classes).toBe(getCertificateNodeClasses(CertificateValidationStatus.Expiring));
    });

    it('never applies group styling to a certificate node', () => {
        const classes = getNodeClasses({
            group: 'actions',
            certificateNodeData: { certificateNodeValidationStatus: undefined },
        });

        expect(classes).toBe(DEFAULT_NODE_CLASSES);
        expect(classes).not.toBe(getGroupNodeClasses('actions'));
    });

    it('never applies certificate styling to a group node', () => {
        expect(getNodeClasses({ group: 'rules' })).toBe(getGroupNodeClasses('rules'));
    });

    it('falls back to the default classes for a node that is neither', () => {
        expect(getNodeClasses({})).toBe(DEFAULT_NODE_CLASSES);
        expect(getNodeClasses(undefined)).toBe(DEFAULT_NODE_CLASSES);
    });
});
