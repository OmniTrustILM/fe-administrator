import { describe, expect, it } from 'vitest';
import { CertificateValidationStatus } from 'types/openapi';

import {
    DEFAULT_EXPAND_BUTTON_CLASSES,
    getCertificateExpandButtonClasses,
    getExpandButtonClasses,
    getGroupExpandButtonClasses,
} from './expandButtonClasses';

describe('getCertificateExpandButtonClasses', () => {
    it.each(Object.values(CertificateValidationStatus))('returns a dedicated fill for the %s validation status', (status) => {
        const classes = getCertificateExpandButtonClasses(status);

        expect(classes).not.toBe(DEFAULT_EXPAND_BUTTON_CLASSES);
        expect(classes).toContain('!border-none');
    });

    it('fills a valid certificate with the valid node token', () => {
        expect(getCertificateExpandButtonClasses(CertificateValidationStatus.Valid)).toContain('!bg-node-valid/62');
    });

    it('fills an expired certificate with the expired node token', () => {
        expect(getCertificateExpandButtonClasses(CertificateValidationStatus.Expired)).toContain('!bg-node-expired/64');
    });

    it('keeps the inverse icon colour for a revoked certificate', () => {
        expect(getCertificateExpandButtonClasses(CertificateValidationStatus.Revoked)).toContain('!text-node-icon-inverse');
    });

    it('falls back to the default fill when the validation status is unknown', () => {
        expect(getCertificateExpandButtonClasses(undefined)).toBe(DEFAULT_EXPAND_BUTTON_CLASSES);
    });
});

describe('getGroupExpandButtonClasses', () => {
    it('fills rule nodes with the unchecked node token', () => {
        expect(getGroupExpandButtonClasses('rules')).toContain('!bg-node-unchecked/63');
    });

    it('fills action nodes with the valid node token', () => {
        expect(getGroupExpandButtonClasses('actions')).toContain('!bg-node-valid/62');
    });

    it('falls back to the default fill for an unknown group', () => {
        expect(getGroupExpandButtonClasses('something-else')).toBe(DEFAULT_EXPAND_BUTTON_CLASSES);
        expect(getGroupExpandButtonClasses(undefined)).toBe(DEFAULT_EXPAND_BUTTON_CLASSES);
    });
});

describe('getExpandButtonClasses', () => {
    it('uses the certificate mapping for a certificate node', () => {
        const classes = getExpandButtonClasses({
            certificateNodeData: { certificateNodeValidationStatus: CertificateValidationStatus.Expiring },
        });

        expect(classes).toBe(getCertificateExpandButtonClasses(CertificateValidationStatus.Expiring));
    });

    it('never applies group styling to a certificate node', () => {
        const classes = getExpandButtonClasses({
            group: 'actions',
            certificateNodeData: { certificateNodeValidationStatus: undefined },
        });

        expect(classes).toBe(DEFAULT_EXPAND_BUTTON_CLASSES);
        expect(classes).not.toBe(getGroupExpandButtonClasses('actions'));
    });

    it('never applies certificate styling to a group node', () => {
        expect(getExpandButtonClasses({ group: 'rules' })).toBe(getGroupExpandButtonClasses('rules'));
    });

    it('falls back to the default fill for a node that is neither', () => {
        expect(getExpandButtonClasses({})).toBe(DEFAULT_EXPAND_BUTTON_CLASSES);
        expect(getExpandButtonClasses(undefined)).toBe(DEFAULT_EXPAND_BUTTON_CLASSES);
    });
});
