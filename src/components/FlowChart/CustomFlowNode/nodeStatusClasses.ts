import type { CustomNodeData } from 'types/flowchart';
import { CertificateValidationStatus } from 'types/openapi';

export const DEFAULT_NODE_CLASSES = 'text-node-default-text border-node-default-text';

const CERTIFICATE_NODE_CLASSES: Record<CertificateValidationStatus, string> = {
    [CertificateValidationStatus.Valid]: 'text-success border-success [&_.certificate-icon]:text-success',
    [CertificateValidationStatus.Expired]: 'text-danger border-danger',
    [CertificateValidationStatus.Revoked]: 'text-node-revoked border-node-revoked',
    [CertificateValidationStatus.Invalid]: 'text-content border-content border-2',
    [CertificateValidationStatus.NotChecked]: 'text-brand border-brand',
    [CertificateValidationStatus.Inactive]: 'text-content-subtle border-content-subtle',
    [CertificateValidationStatus.Expiring]: 'text-warning border-warning',
    [CertificateValidationStatus.Failed]: 'text-node-failed border-node-failed',
};

const GROUP_NODE_CLASSES: Record<string, string> = {
    rules: 'text-brand border-brand',
    actions: 'text-success border-success [&_.certificate-icon]:text-success',
};

export function isCertificateNode(data: CustomNodeData | undefined): boolean {
    return data?.certificateNodeData !== undefined;
}

export function getCertificateNodeClasses(status: CertificateValidationStatus | undefined): string {
    if (!status) return DEFAULT_NODE_CLASSES;
    return CERTIFICATE_NODE_CLASSES[status] ?? DEFAULT_NODE_CLASSES;
}

export function getGroupNodeClasses(group: string | undefined): string {
    if (!group) return DEFAULT_NODE_CLASSES;
    return GROUP_NODE_CLASSES[group] ?? DEFAULT_NODE_CLASSES;
}

export function getNodeClasses(data: CustomNodeData | undefined): string {
    return isCertificateNode(data)
        ? getCertificateNodeClasses(data?.certificateNodeData?.certificateNodeValidationStatus)
        : getGroupNodeClasses(data?.group);
}
