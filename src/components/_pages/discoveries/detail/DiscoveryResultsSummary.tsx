import Badge from 'components/Badge';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Widget from 'components/Widget';
import { useMemo } from 'react';
import type { DiscoveryResponseDetailModel } from 'types/discoveries';
import { certificateNotes } from './discoveryDetailHelpers';

type Props = Readonly<{
    discovery: DiscoveryResponseDetailModel;
    headers: TableHeader[];
    className?: string;
}>;

/**
 * Four figures with four meanings. "Items received" counts every item the provider handed over, repeats included; the
 * certificate rows count what the platform saved, once per distinct certificate, against the items the provider
 * reported. A provider figure above the saved one is usually the same certificate reported more than once, and the
 * note under it says which it was rather than leaving the reader to subtract. Why a provider repeats an item is its
 * own business: several hosts serving one chain, several logs listing one certificate, a chunk re-scanned after a
 * resume. Core collapses all of them on the item reference. The group headings stay even on a
 * certificates-only run, where the groups happen to agree.
 */
export default function DiscoveryResultsSummary({ discovery, headers, className }: Props) {
    const thisRun: TableDataRow[] = useMemo(() => {
        const failed = discovery.itemsFailed ?? 0;
        return [
            {
                id: 'itemsDiscovered',
                columns: [
                    'Items received',
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
        const notes = certificateNotes(discovery);
        return [
            {
                id: 'totalCertificatesDiscovered',
                columns: ['Distinct certificates saved', String(discovery.totalCertificatesDiscovered ?? 0)],
            },
            {
                id: 'connectorTotalCertificatesDiscovered',
                columns: [
                    'Certificate items reported by the provider',
                    <span key="reported" className="inline-flex flex-col gap-0.5">
                        <span>{String(discovery.connectorTotalCertificatesDiscovered ?? 0)}</span>
                        {notes.map((note) => (
                            <span
                                key={note.kind}
                                className={note.kind === 'notHandedOver' ? 'text-xs text-warning' : 'text-xs text-content-muted'}
                                data-testid={`certificate-note-${note.kind}`}
                            >
                                {note.kind === 'repeats'
                                    ? `${note.count} repeated a certificate already received in this run`
                                    : `${note.count} reported by the provider were never handed over`}
                            </span>
                        ))}
                    </span>,
                ],
            },
        ];
    }, [discovery]);

    return (
        <Widget title="Results" titleSize="large" className={className} dataTestId="discovery-results">
            <div className="flex flex-col gap-4">
                <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-content-muted">All resources</p>
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
