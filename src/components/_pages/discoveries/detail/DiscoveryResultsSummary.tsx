import Badge from 'components/Badge';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Widget from 'components/Widget';
import { useMemo } from 'react';
import type { DiscoveryResponseDetailModel } from 'types/discoveries';

type Props = Readonly<{
    discovery: DiscoveryResponseDetailModel;
    headers: TableHeader[];
    className?: string;
}>;

/**
 * The four numbers on a run are distinct facts, and two of them are certificate-only. Left as one undifferentiated
 * row, a run that found 48 certificates and 4 keys reads as 52 collected but only 48 saved, which looks like four items
 * lost. The group headings stay even on a certificates-only run, where the groups happen to agree.
 */
export default function DiscoveryResultsSummary({ discovery, headers, className }: Props) {
    const thisRun: TableDataRow[] = useMemo(() => {
        const failed = discovery.itemsFailed ?? 0;
        return [
            {
                id: 'itemsDiscovered',
                columns: [
                    'Items collected',
                    discovery.itemsDiscovered === undefined ? (
                        <span key="itemsDiscovered" title="Not reported by a v1 Discovery Provider">
                            —
                        </span>
                    ) : (
                        String(discovery.itemsDiscovered)
                    ),
                ],
            },
            { id: 'itemsNewlyDiscovered', columns: ['New to the inventory', String(discovery.itemsNewlyDiscovered ?? 0)] },
            { id: 'itemsProcessed', columns: ['Imported', String(discovery.itemsProcessed ?? 0)] },
            {
                id: 'itemsFailed',
                columns: [
                    'Failed to import',
                    failed > 0 ? (
                        <Badge key="itemsFailed" color="danger" dataTestId="items-failed">
                            {failed}
                        </Badge>
                    ) : (
                        '0'
                    ),
                ],
            },
        ];
    }, [discovery.itemsDiscovered, discovery.itemsNewlyDiscovered, discovery.itemsProcessed, discovery.itemsFailed]);

    const certificatesOnly: TableDataRow[] = useMemo(() => {
        const saved = discovery.totalCertificatesDiscovered ?? 0;
        const reported = discovery.connectorTotalCertificatesDiscovered ?? 0;
        return [
            { id: 'totalCertificatesDiscovered', columns: ['Saved', String(saved)] },
            {
                id: 'connectorTotalCertificatesDiscovered',
                columns: [
                    'Provider reported',
                    <span key="reported" className="inline-flex flex-wrap items-baseline gap-2">
                        <span>{String(reported)}</span>
                        {reported > saved ? (
                            <span className="text-xs text-warning" data-testid="reported-exceeds-saved">
                                the run ended before everything was collected
                            </span>
                        ) : null}
                    </span>,
                ],
            },
        ];
    }, [discovery.totalCertificatesDiscovered, discovery.connectorTotalCertificatesDiscovered]);

    return (
        <Widget title="Results" titleSize="large" className={className} dataTestId="discovery-results">
            <div className="flex flex-col gap-4">
                <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-content-muted">This run — all resources</p>
                    <CustomTable headers={headers} data={thisRun} />
                </div>
                <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-content-muted">Certificates only</p>
                    <CustomTable headers={headers} data={certificatesOnly} />
                </div>
            </div>
        </Widget>
    );
}
