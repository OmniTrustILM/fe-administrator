import cn from 'classnames';
import Badge from 'components/Badge';
import Button from 'components/Button';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import JsonViewer from 'components/JsonViewer';
import PqcVerdictBadge from 'components/PqcVerdictBadge';
import Select from 'components/Select';
import { QUARANTINE_TOOLTIP } from 'components/_pages/crypto-assets/cryptoAssetTableHelpers';
import { TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import type {
    CryptographicAssetDetailDto,
    CryptographicAssetNormalizedFieldsDto,
    CryptographicAssetOidDto,
    CryptographicAssetSourceDto,
    CryptographicAssetVerdictDto,
} from 'types/openapi';
import {
    describeEvidenceCoverage,
    diffPayloads,
    isSamePayload,
    type PayloadDifference,
    type PayloadDifferenceKind,
} from 'utils/crypto-assets';
import { dateFormatter } from 'utils/dateUtil';

type DetailProps = Readonly<{ detail: CryptographicAssetDetailDto }>;

type LabelledDetailProps = Readonly<{ detail: CryptographicAssetDetailDto; verdictLabel: string }>;

const EMPTY_VALUE = '-';

const WRAPPING_VALUE = 'block max-w-[420px] whitespace-normal break-words';

const KEY_VALUE_HEADERS: TableHeader[] = [
    { id: 'property', content: 'Property' },
    { id: 'value', content: 'Value' },
];

const NORMALIZED_FIELDS: ReadonlyArray<{ key: keyof CryptographicAssetNormalizedFieldsDto; label: string }> = [
    { key: 'algorithmFamily', label: 'Algorithm family' },
    { key: 'primitive', label: 'Primitive' },
    { key: 'parameterSet', label: 'Parameter set' },
    { key: 'curve', label: 'Elliptic curve' },
    { key: 'mode', label: 'Mode' },
    { key: 'padding', label: 'Padding' },
    { key: 'variant', label: 'Variant' },
];

const SOURCE_HEADERS: TableHeader[] = [
    { id: 'serialNumber', content: 'Serial number' },
    { id: 'version', content: 'Version', align: 'right' },
    { id: 'producer', content: 'Producer' },
    { id: 'occurrences', content: 'Occurrences', align: 'right' },
    { id: 'evidence', content: 'Evidence' },
    { id: 'action', content: '' },
];

const EVIDENCE_HEADERS: TableHeader[] = [
    { id: 'location', content: 'Location' },
    { id: 'line', content: 'Line', align: 'right' },
    { id: 'offset', content: 'Offset', align: 'right' },
    { id: 'symbol', content: 'Symbol' },
];

const DIFFERENCE_TEXT: Record<PayloadDifferenceKind, string> = {
    changed: 'differs from the elected payload',
    notRecorded: 'not recorded by this source',
    onlyInSource: 'recorded only by this source',
};

const pluralize = (count: number, singular: string, plural: string) => `${count.toLocaleString()} ${count === 1 ? singular : plural}`;

const formatFieldValue = (value: unknown) => (typeof value === 'string' ? value : JSON.stringify(value));

export function CryptoAssetSummary({
    detail,
    typeLabel,
    verdictLabel,
}: Readonly<{ detail: CryptographicAssetDetailDto; typeLabel: string; verdictLabel: string }>) {
    return (
        <div className="flex flex-col gap-2" data-testid="crypto-asset-summary">
            <div className="flex flex-wrap items-center gap-2">
                <h2 className="min-w-0 text-xl font-semibold text-content break-words line-clamp-2" title={detail.name}>
                    {detail.name}
                </h2>
                <Badge color="secondary">{typeLabel}</Badge>
                <PqcVerdictBadge verdict={detail.pqcVerdict} label={verdictLabel} />
                {detail.quarantined && (
                    <Badge color="warning" title={QUARANTINE_TOOLTIP} dataTestId="crypto-asset-quarantined-badge">
                        <TriangleAlert size={12} strokeWidth={2.2} aria-hidden="true" />
                        Quarantined
                    </Badge>
                )}
            </div>
            <p className="text-sm text-content-subtle" data-testid="crypto-asset-claims">
                Claimed by {pluralize(detail.sourceCbomCount, 'CBOM', 'CBOMs')} ·{' '}
                {pluralize(detail.occurrenceCount, 'occurrence', 'occurrences')}
            </p>
        </div>
    );
}

function OidList({ oids }: Readonly<{ oids: CryptographicAssetOidDto[] }>) {
    if (oids.length === 0) {
        return <span className="text-content-subtle">No OID recorded</span>;
    }
    return (
        <ul className="flex flex-col gap-1">
            {oids.map((entry) => (
                <li key={entry.oid} className="flex flex-wrap items-center gap-2" data-testid="crypto-asset-oid">
                    <span className={cn('font-mono text-xs', WRAPPING_VALUE, { 'text-content-subtle line-through': entry.refuted })}>
                        {entry.oid}
                    </span>
                    {entry.refuted && (
                        <Badge
                            color="warning"
                            title="The platform determined this identifier does not describe the asset"
                            dataTestId="crypto-asset-oid-refuted"
                        >
                            Refuted
                        </Badge>
                    )}
                </li>
            ))}
        </ul>
    );
}

export function CryptoAssetIdentity({ detail }: DetailProps) {
    const rows: TableDataRow[] = [
        ...NORMALIZED_FIELDS.map(({ key, label }) => ({
            id: key,
            columns: [
                label,
                <span key={key} className={WRAPPING_VALUE}>
                    {detail.normalizedFields?.[key] ?? EMPTY_VALUE}
                </span>,
            ],
        })),
        { id: 'oids', columns: ['OIDs', <OidList key="oids" oids={detail.oids ?? []} />] },
    ];
    return <CustomTable headers={KEY_VALUE_HEADERS} data={rows} />;
}

export function CryptoAssetVerdict({ detail, verdictLabel }: LabelledDetailProps) {
    // Core omits the block until the PQC sweep has evaluated the asset, whatever the generated type says.
    const verdict: CryptographicAssetVerdictDto | undefined = detail.verdict;
    if (!verdict) {
        return (
            <p className="text-sm text-content-muted" data-testid="crypto-asset-verdict-pending">
                Not evaluated yet. The rule set has not reached this asset since it was synced.
            </p>
        );
    }

    const evaluatedFields = Object.entries(verdict.evaluatedFields ?? {});
    const rows: TableDataRow[] = [
        { id: 'verdict', columns: ['Verdict', <PqcVerdictBadge key="verdict" verdict={detail.pqcVerdict} label={verdictLabel} />] },
        { id: 'ruleSet', columns: ['Rule set', `v${verdict.ruleSetVersion}`] },
        {
            id: 'rule',
            columns: [
                'Rule',
                <span key="rule" className={WRAPPING_VALUE}>
                    {verdict.ruleId ?? 'No rule matched, so the rule set default applies'}
                </span>,
            ],
        },
        {
            id: 'reason',
            columns: [
                'Reason',
                <span key="reason" className={WRAPPING_VALUE}>
                    {verdict.reason ?? EMPTY_VALUE}
                </span>,
            ],
        },
        { id: 'decidedAt', columns: ['Decided', dateFormatter(verdict.decidedAt)] },
        { id: 'evaluatedAt', columns: ['Last evaluated', dateFormatter(verdict.evaluatedAt)] },
        {
            id: 'evaluatedFields',
            columns: [
                'Fields the rule read',
                evaluatedFields.length === 0 ? (
                    EMPTY_VALUE
                ) : (
                    <ul key="fields" className="flex flex-wrap gap-1">
                        {evaluatedFields.map(([name, value]) => (
                            <li key={name} className="min-w-0">
                                <code className={cn('font-mono text-xs', WRAPPING_VALUE)}>
                                    {name} = {formatFieldValue(value)}
                                </code>
                            </li>
                        ))}
                    </ul>
                ),
            ],
        },
    ];
    return <CustomTable headers={KEY_VALUE_HEADERS} data={rows} />;
}

function EvidenceTable({ source }: Readonly<{ source: CryptographicAssetSourceDto }>) {
    const evidence = source.evidence ?? [];
    const rows: TableDataRow[] = evidence.map((entry) => ({
        id: `${entry.location}#${entry.line ?? ''}#${entry.offset ?? ''}#${entry.symbol ?? ''}`,
        columns: [
            <span key="location" className={cn('font-mono text-xs', WRAPPING_VALUE)}>
                {entry.location}
            </span>,
            <span key="line" className="tabular-nums">
                {entry.line ?? EMPTY_VALUE}
            </span>,
            <span key="offset" className="tabular-nums">
                {entry.offset ?? EMPTY_VALUE}
            </span>,
            <span key="symbol" className={cn('font-mono text-xs', WRAPPING_VALUE)}>
                {entry.symbol ?? EMPTY_VALUE}
            </span>,
        ],
    }));

    return (
        <div className="flex flex-col gap-2" data-testid="crypto-asset-evidence">
            <p className="text-sm font-medium text-content break-words">
                Occurrences in {source.serialNumber} · v{source.version}
            </p>
            <CustomTable headers={EVIDENCE_HEADERS} data={rows} />
            {evidence.length < source.occurrenceCount && (
                <p className="text-xs text-content-subtle" data-testid="crypto-asset-evidence-capped-note">
                    Core keeps a capped sample of occurrences per source. The count is the true total; the list is a sample.
                </p>
            )}
        </div>
    );
}

export function CryptoAssetSources({ detail }: DetailProps) {
    const [openCbomUuid, setOpenCbomUuid] = useState<string>();
    const sources = detail.sources ?? [];

    if (sources.length === 0) {
        return (
            <p className="text-sm text-content-muted" data-testid="crypto-asset-sources-empty">
                No source CBOM you can see. This asset is claimed only by documents outside your access.
            </p>
        );
    }

    const rows: TableDataRow[] = sources.map((source) => {
        const shown = source.evidence?.length ?? 0;
        const isOpen = source.cbomUuid === openCbomUuid;
        const isElected = detail.electedPayload !== undefined && isSamePayload(detail.electedPayload, source.payload);
        return {
            id: source.cbomUuid,
            columns: [
                <span key="serial" className="flex flex-wrap items-center gap-2">
                    <Link className="font-mono text-xs" to={`/cboms/detail/${source.cbomUuid}`}>
                        {source.serialNumber}
                    </Link>
                    {isElected && (
                        <Badge
                            color="info"
                            title="This source's payload is the one served as the elected payload. Sources that recorded it identically all match."
                            dataTestId="crypto-asset-source-elected"
                        >
                            Matches elected
                        </Badge>
                    )}
                </span>,
                <span key="version" className="tabular-nums">
                    {source.version}
                </span>,
                source.source,
                <span key="occurrences" className="tabular-nums">
                    {source.occurrenceCount.toLocaleString()}
                </span>,
                <span key="coverage" data-testid="crypto-asset-evidence-coverage">
                    {describeEvidenceCoverage(shown, source.occurrenceCount)}
                </span>,
                <Button
                    key="toggle"
                    type="button"
                    variant="outline"
                    disabled={shown === 0}
                    onClick={() => setOpenCbomUuid(isOpen ? undefined : source.cbomUuid)}
                >
                    {isOpen ? 'Hide' : 'Show'}
                </Button>,
            ],
        };
    });

    const openSource = sources.find((source) => source.cbomUuid === openCbomUuid);

    return (
        <div className="flex flex-col gap-4">
            <CustomTable headers={SOURCE_HEADERS} data={rows} />
            {openSource && <EvidenceTable source={openSource} />}
        </div>
    );
}

function PayloadPane({
    title,
    payload,
    emptyText,
    testId,
}: Readonly<{ title: string; payload?: object; emptyText: string; testId: string }>) {
    return (
        <div className="flex min-w-0 flex-col gap-2" data-testid={testId}>
            <p className="text-sm font-medium text-content">{title}</p>
            {payload === undefined ? (
                <p className="text-sm text-content-muted">{emptyText}</p>
            ) : (
                <JsonViewer value={JSON.stringify(payload, null, 2)} height={360} />
            )}
        </div>
    );
}

function PayloadDifferences({ differences }: Readonly<{ differences?: PayloadDifference[] }>) {
    if (differences === undefined) return null;
    if (differences.length === 0) {
        return (
            <p className="text-sm text-content-muted" data-testid="crypto-asset-payload-identical">
                This source's payload is identical to the elected payload.
            </p>
        );
    }
    return (
        <div className="flex flex-col gap-1" data-testid="crypto-asset-payload-differences">
            <p className="text-sm font-medium text-content">Where this source disagrees with the elected payload</p>
            <ul className="flex flex-col gap-1 text-sm">
                {differences.map((difference) => (
                    <li key={difference.path} data-testid="crypto-asset-payload-difference">
                        <code className="font-mono text-xs">{difference.path}</code>{' '}
                        <span className="text-content-muted">{DIFFERENCE_TEXT[difference.kind]}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function differencesFor(elected: object | undefined, source: CryptographicAssetSourceDto | undefined): PayloadDifference[] | undefined {
    if (elected === undefined || source?.payload === undefined) return undefined;
    return diffPayloads(elected, source.payload);
}

export function CryptoAssetPayloads({ detail }: DetailProps) {
    const sources = detail.sources ?? [];
    // Open on a source that disagrees, since that is the comparison worth reading first.
    const defaultSource = sources.find((source) => !isSamePayload(detail.electedPayload, source.payload)) ?? sources[0];
    const [selectedCbomUuid, setSelectedCbomUuid] = useState(defaultSource?.cbomUuid);
    const selected = sources.find((source) => source.cbomUuid === selectedCbomUuid) ?? defaultSource;

    return (
        <div className="flex flex-col gap-4">
            {sources.length > 1 && (
                <Select
                    id="crypto-asset-payload-source"
                    label="Compare with source"
                    value={selected?.cbomUuid ?? ''}
                    onChange={(value) => {
                        if (typeof value === 'string') setSelectedCbomUuid(value);
                    }}
                    options={sources.map((source) => ({ value: source.cbomUuid, label: `${source.serialNumber} v${source.version}` }))}
                />
            )}
            <div className="grid gap-4 md:grid-cols-2">
                <PayloadPane
                    title="Elected payload"
                    payload={detail.electedPayload}
                    emptyText="No elected payload is served: the electing document is outside your access, or no source carries a payload."
                    testId="crypto-asset-elected-payload"
                />
                <PayloadPane
                    title={selected ? `As recorded by ${selected.serialNumber} v${selected.version}` : 'Source payload'}
                    payload={selected?.payload}
                    emptyText="This source recorded no payload."
                    testId="crypto-asset-source-payload"
                />
            </div>
            <PayloadDifferences differences={differencesFor(detail.electedPayload, selected)} />
        </div>
    );
}
