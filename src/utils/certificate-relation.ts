import { CertificateState } from 'types/openapi';

export type CertificateRelationRole = 'predecessor' | 'successor';

export type RelationCandidate = {
    uuid: string;
    state: CertificateState;
    notBefore?: string;
};

export type RelatedCertificateResolution =
    | { relation: CertificateRelationRole; reason?: undefined }
    | { relation?: undefined; reason: string };

export const RELATION_REASON = {
    self: 'A certificate cannot be related to itself.',
    earlierNotIssued: 'The certificate issued earlier would be the predecessor, and a predecessor must be Issued or Revoked.',
    noPredecessor: 'Neither certificate is Issued or Revoked, so neither can be the predecessor.',
    failedSuccessor: 'A Failed or Rejected certificate cannot be a successor.',
} as const;

const canBePredecessor = (certificate: RelationCandidate) =>
    certificate.state === CertificateState.Issued || certificate.state === CertificateState.Revoked;

const canBeSuccessor = (certificate: RelationCandidate) =>
    certificate.state !== CertificateState.Failed && certificate.state !== CertificateState.Rejected;

function issuedAt(certificate: RelationCandidate): number | undefined {
    if (!certificate.notBefore) return undefined;
    const time = new Date(certificate.notBefore).getTime();
    return Number.isNaN(time) ? undefined : time;
}

function resolveByIssueOrder(
    current: RelationCandidate,
    selected: RelationCandidate,
    selectedIsLater: boolean,
): RelatedCertificateResolution {
    const [predecessor, successor] = selectedIsLater ? [current, selected] : [selected, current];
    if (!canBePredecessor(predecessor)) return { reason: RELATION_REASON.earlierNotIssued };
    if (!canBeSuccessor(successor)) return { reason: RELATION_REASON.failedSuccessor };
    return { relation: selectedIsLater ? 'successor' : 'predecessor' };
}

// Mirrors Core: two different issue dates fix the direction, otherwise the request order decides it.
export function resolveRelatedCertificateRelation(current: RelationCandidate, selected: RelationCandidate): RelatedCertificateResolution {
    if (current.uuid === selected.uuid) return { reason: RELATION_REASON.self };

    const currentIssuedAt = issuedAt(current);
    const selectedIssuedAt = issuedAt(selected);
    if (currentIssuedAt !== undefined && selectedIssuedAt !== undefined && currentIssuedAt !== selectedIssuedAt) {
        return resolveByIssueOrder(current, selected, selectedIssuedAt > currentIssuedAt);
    }

    if (canBePredecessor(selected) && canBeSuccessor(current)) return { relation: 'predecessor' };
    if (canBePredecessor(current) && canBeSuccessor(selected)) return { relation: 'successor' };
    if (canBePredecessor(current) || canBePredecessor(selected)) return { reason: RELATION_REASON.failedSuccessor };
    return { reason: RELATION_REASON.noPredecessor };
}
