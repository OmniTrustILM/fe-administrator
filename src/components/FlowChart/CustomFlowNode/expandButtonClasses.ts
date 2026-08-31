import cn from 'classnames';
import type { CustomNodeData } from 'types/flowchart';
import { CertificateValidationStatus } from 'types/openapi';
import { isCertificateNode } from './nodeStatusClasses';

// Icon colour needed on top of each fill/state to keep it at 4.5:1 (see theme-tokens.spec.ts):
// most statuses read fine with the button's inherited white at rest but need dark text once the
// fill saturates on hover/active; revoked and (at hover/active) failed sit on a fill that's dark
// in one theme and bright in the other, so they need the opposite pairing instead.
const ICON_DARKENING_ON_HOVER_CLASSES = '!border-none !text-node-icon hover:!text-black active:!text-black';

const VALID_FILL_CLASSES = cn('!bg-node-valid/62 hover:!bg-node-valid/93 active:!bg-node-valid/85', ICON_DARKENING_ON_HOVER_CLASSES);

const UNCHECKED_FILL_CLASSES = cn(
    '!bg-node-unchecked/63 hover:!bg-node-unchecked/93 active:!bg-node-unchecked/85',
    ICON_DARKENING_ON_HOVER_CLASSES,
);

export const DEFAULT_EXPAND_BUTTON_CLASSES = cn(
    '!bg-node-default-fill !border-none !text-black',
    'hover:!bg-node-default/93 hover:!text-content-on-brand',
    'active:!bg-node-default/85 active:!text-content-on-brand',
);

const CERTIFICATE_EXPAND_BUTTON_CLASSES: Record<CertificateValidationStatus, string> = {
    [CertificateValidationStatus.Valid]: VALID_FILL_CLASSES,
    [CertificateValidationStatus.Expired]: cn(
        '!bg-node-expired/64 !border-none !text-node-icon',
        'hover:!bg-danger-solid hover:!text-black active:!bg-danger-solid active:!text-black',
    ),
    [CertificateValidationStatus.Revoked]:
        '!bg-node-revoked/72 !border-none hover:!bg-node-revoked active:!bg-node-revoked !text-node-icon-inverse',
    [CertificateValidationStatus.Expiring]:
        '!bg-node-expiring/65 !border-none hover:!bg-node-expiring/93 active:!bg-node-expiring/85 !text-black',
    [CertificateValidationStatus.Invalid]: '!bg-node-invalid/64 !border-none hover:!bg-node-invalid/93 active:!bg-node-invalid/85',
    [CertificateValidationStatus.NotChecked]: UNCHECKED_FILL_CLASSES,
    [CertificateValidationStatus.Failed]: cn(
        '!bg-node-failed/64 !border-none !text-node-icon',
        'hover:!bg-node-failed/93 hover:!text-node-icon-inverse',
        'active:!bg-node-failed/85 active:!text-node-icon-inverse',
    ),
    [CertificateValidationStatus.Inactive]:
        '!bg-node-inactive/63 !border-none hover:!bg-node-inactive/93 active:!bg-node-inactive/85 !text-node-icon',
};

const GROUP_EXPAND_BUTTON_CLASSES: Record<string, string> = {
    rules: UNCHECKED_FILL_CLASSES,
    actions: VALID_FILL_CLASSES,
};

export function getCertificateExpandButtonClasses(status: CertificateValidationStatus | undefined): string {
    if (!status) return DEFAULT_EXPAND_BUTTON_CLASSES;
    return CERTIFICATE_EXPAND_BUTTON_CLASSES[status] ?? DEFAULT_EXPAND_BUTTON_CLASSES;
}

export function getGroupExpandButtonClasses(group: string | undefined): string {
    if (!group) return DEFAULT_EXPAND_BUTTON_CLASSES;
    return GROUP_EXPAND_BUTTON_CLASSES[group] ?? DEFAULT_EXPAND_BUTTON_CLASSES;
}

export function getExpandButtonClasses(data: CustomNodeData | undefined): string {
    return isCertificateNode(data)
        ? getCertificateExpandButtonClasses(data?.certificateNodeData?.certificateNodeValidationStatus)
        : getGroupExpandButtonClasses(data?.group);
}
