import type { TableDataRow } from 'components/CustomTable';
import StatusBadge from 'components/StatusBadge';

/** A value the profile leaves unset, shown as a muted word. */
export const absent = (text: string) => (
    <span key="value" className="text-content-subtle text-sm">
        {text}
    </span>
);

interface CertificatePurpose {
    requireNonRepudiation?: boolean;
    requiredExtendedKeyUsageOids?: string[];
}

/** Detail rows of the certificate purpose a signing workflow requires of its signing certificate. */
export function certificatePurposeRows(purpose: CertificatePurpose): TableDataRow[] {
    const extendedKeyUsages = purpose.requiredExtendedKeyUsageOids ?? [];
    return [
        {
            id: 'requireNonRepudiation',
            columns: ['Require Non-Repudiation', <StatusBadge key="value" enabled={purpose.requireNonRepudiation ?? false} />],
        },
        {
            id: 'requiredExtendedKeyUsages',
            columns: [
                'Required Extended Key Usages',
                extendedKeyUsages.length > 0 ? (
                    <div key="value" className="flex flex-wrap gap-1">
                        {extendedKeyUsages.map((oid) => (
                            <span
                                key={oid}
                                className="inline-flex items-center rounded-full bg-surface-sunken px-2.5 py-0.5 text-xs font-medium text-content-muted"
                            >
                                {oid}
                            </span>
                        ))}
                    </div>
                ) : (
                    absent('Any')
                ),
            ],
        },
    ];
}
