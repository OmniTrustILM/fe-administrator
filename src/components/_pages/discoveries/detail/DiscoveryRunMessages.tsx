import Badge, { type BadgeColor } from 'components/Badge';
import type { TableDataRow, TableHeader } from 'components/CustomTable';
import PagedCustomTable from 'components/CustomTable/PagedCustomTable';
import Widget from 'components/Widget';
import { actions, selectors } from 'ducks/discoveries';
import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DiscoveryMessageSeverity } from 'types/openapi';
import { dateFormatter } from 'utils/dateUtil';

type Props = Readonly<{
    discoveryUuid: string;
}>;

const SEVERITY: { [key in DiscoveryMessageSeverity]: { color: BadgeColor; text: string } } = {
    [DiscoveryMessageSeverity.Info]: { color: 'info', text: 'Info' },
    [DiscoveryMessageSeverity.Warning]: { color: 'warning', text: 'Warning' },
    [DiscoveryMessageSeverity.Error]: { color: 'danger', text: 'Error' },
};

export function severityBadge(severity: DiscoveryMessageSeverity) {
    const { color, text } = SEVERITY[severity] ?? { color: 'secondary' as BadgeColor, text: String(severity) };
    return (
        <Badge color={color} dataTestId={`severity-${severity}`}>
            {text}
        </Badge>
    );
}

const HEADERS: TableHeader[] = [
    { id: 'severity', content: 'Severity', align: 'center' },
    { id: 'code', content: 'Code' },
    { id: 'message', content: 'Message' },
    { id: 'occurrences', content: 'Occurrences', align: 'right' },
    { id: 'firstSeenAt', content: 'First seen' },
    { id: 'lastSeenAt', content: 'Last seen' },
];

/**
 * Each entry is one kind of problem, not one occurrence: repeats aggregate, so a run that hit one fault tens of
 * thousands of times still shows one row, and the occurrence count and first/last-seen window are what make it
 * readable. Entries aggregate by code together with message text, so several rows may share a code; the row key never
 * rests on the code alone.
 */
export default function DiscoveryRunMessages({ discoveryUuid }: Props) {
    const dispatch = useDispatch();

    const discoveryMessages = useSelector(selectors.discoveryMessages);
    const isFetchingDiscoveryMessages = useSelector(selectors.isFetchingDiscoveryMessages);

    const onReloadData = useCallback(
        (pageSize: number, pageNumber: number) => {
            dispatch(actions.getDiscoveryMessages({ uuid: discoveryUuid, itemsPerPage: pageSize, pageNumber }));
        },
        [dispatch, discoveryUuid],
    );

    const rows: TableDataRow[] = useMemo(
        () =>
            discoveryMessages?.items.map((message, index) => ({
                id: `${discoveryMessages.pageNumber}-${index}-${message.code}-${message.firstSeenAt}`,
                columns: [
                    severityBadge(message.severity),
                    <code key="code" className="text-xs">
                        {message.code}
                    </code>,
                    <span key="message" className="whitespace-pre-wrap break-words">
                        {message.message}
                    </span>,
                    <span key="occurrences" className="tabular-nums">
                        {message.occurrences}
                    </span>,
                    <span key="firstSeenAt" className="whitespace-nowrap">
                        {dateFormatter(message.firstSeenAt)}
                    </span>,
                    <span key="lastSeenAt" className="whitespace-nowrap">
                        {dateFormatter(message.lastSeenAt)}
                    </span>,
                ],
            })) ?? [],
        [discoveryMessages],
    );

    return (
        <Widget title="Messages" titleSize="large" busy={isFetchingDiscoveryMessages}>
            <p className="mb-3 text-sm text-content-muted">
                Messages are advisory: a non-empty log does not mean the run failed. Repeated problems are aggregated into one row, with how
                often each occurred and when it was first and last seen.
            </p>
            <PagedCustomTable headers={HEADERS} data={rows} totalItems={discoveryMessages?.totalItems} onReloadData={onReloadData} />
        </Widget>
    );
}
