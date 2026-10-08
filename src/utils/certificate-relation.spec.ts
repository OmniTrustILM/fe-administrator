import { describe, expect, test } from 'vitest';
import { CertificateState } from 'types/openapi';
import { RELATION_REASON, type RelationCandidate, resolveRelatedCertificateRelation } from './certificate-relation';

const EARLIER = '2026-05-28T09:36:22.000+00:00';
const LATER = '2026-08-05T13:49:30.000+00:00';

const current = (state: CertificateState, notBefore?: string): RelationCandidate => ({ uuid: 'current', state, notBefore });
const selected = (state: CertificateState, notBefore?: string): RelationCandidate => ({ uuid: 'selected', state, notBefore });

describe('resolveRelatedCertificateRelation', () => {
    test.each([
        [
            'a not yet issued certificate selected on an issued one',
            CertificateState.Issued,
            EARLIER,
            CertificateState.PendingIssue,
            undefined,
        ],
        ['a later certificate selected on an earlier one', CertificateState.Issued, EARLIER, CertificateState.Issued, LATER],
        ['a later certificate selected on a revoked one', CertificateState.Revoked, EARLIER, CertificateState.Issued, LATER],
        ['a later certificate awaiting revocation', CertificateState.Issued, EARLIER, CertificateState.PendingRevoke, LATER],
    ])('makes %s a successor', (_name, currentState, currentNotBefore, selectedState, selectedNotBefore) => {
        expect(
            resolveRelatedCertificateRelation(current(currentState, currentNotBefore), selected(selectedState, selectedNotBefore)),
        ).toEqual({ relation: 'successor' });
    });

    test.each([
        [
            'an issued certificate selected on a not yet issued one',
            CertificateState.PendingIssue,
            undefined,
            CertificateState.Issued,
            EARLIER,
        ],
        ['an earlier certificate selected on a later one', CertificateState.Issued, LATER, CertificateState.Issued, EARLIER],
        ['an earlier revoked certificate', CertificateState.Issued, LATER, CertificateState.Revoked, EARLIER],
        ['a certificate issued at the same moment', CertificateState.Issued, EARLIER, CertificateState.Issued, EARLIER],
        ['an issued certificate when a date is unreadable', CertificateState.Issued, 'not-a-date', CertificateState.Issued, EARLIER],
    ])('makes %s a predecessor', (_name, currentState, currentNotBefore, selectedState, selectedNotBefore) => {
        expect(
            resolveRelatedCertificateRelation(current(currentState, currentNotBefore), selected(selectedState, selectedNotBefore)),
        ).toEqual({ relation: 'predecessor' });
    });

    test.each([
        ['neither certificate is issued', CertificateState.PendingIssue, undefined, CertificateState.Requested, undefined, 'noPredecessor'],
        ['the selected certificate failed', CertificateState.Issued, EARLIER, CertificateState.Failed, undefined, 'failedSuccessor'],
        ['the open certificate was rejected', CertificateState.Rejected, undefined, CertificateState.Issued, EARLIER, 'failedSuccessor'],
        [
            'the earlier certificate awaits revocation',
            CertificateState.Issued,
            LATER,
            CertificateState.PendingRevoke,
            EARLIER,
            'earlierNotIssued',
        ],
        ['the later certificate failed', CertificateState.Issued, EARLIER, CertificateState.Failed, LATER, 'failedSuccessor'],
    ] as const)('refuses when %s', (_name, currentState, currentNotBefore, selectedState, selectedNotBefore, reason) => {
        expect(
            resolveRelatedCertificateRelation(current(currentState, currentNotBefore), selected(selectedState, selectedNotBefore)),
        ).toEqual({ reason: RELATION_REASON[reason] });
    });

    test('refuses to relate a certificate to itself', () => {
        const certificate = current(CertificateState.Issued, EARLIER);

        expect(resolveRelatedCertificateRelation(certificate, { ...certificate })).toEqual({ reason: RELATION_REASON.self });
    });
});
