import cn from 'classnames';
import Badge, { type BadgeColor } from 'components/Badge';
import Button from 'components/Button';
import Callout from 'components/Callout';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import { EnumColumnDescription } from 'components/EnumDescription';
import JsonViewer from 'components/JsonViewer';
import PqcVerdictBadge from 'components/PqcVerdictBadge';
import Select from 'components/Select';
import Toggletip from 'components/Toggletip';
import Tooltip from 'components/Tooltip';
import { QUARANTINE_TOOLTIP } from 'components/_pages/crypto-assets/cryptoAssetTableHelpers';
import { getEnumLabel } from 'ducks/enums';
import { TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import type { PlatformEnumMap } from 'types/enums';
import {
    type CryptographicAssetDetailDto,
    type CryptographicAssetNormalizedFieldsDto,
    type CryptographicAssetOidDto,
    type CryptographicAssetPqcExplanationDto,
    type CryptographicAssetSourceDto,
    type CryptographicAssetVerdictDto,
    PlatformEnum,
    PqcExplanationStepOutcome,
    type PqcExplanationStepDto,
    type PqcReferencedAssetDto,
} from 'types/openapi';
import {
    cryptoAssetDetailPath,
    describeLocationCoverage,
    diffPayloads,
    formatPqcFieldValue,
    getCryptoAssetFieldLabel,
    isSamePayload,
    PQC_READINESS_TAB,
    type PayloadDifference,
    type PayloadDifferenceKind,
} from 'utils/crypto-assets';
import { toFiniteNumber } from 'utils/common-utils';
import { dateFormatter } from 'utils/dateUtil';

type DetailProps = Readonly<{ detail: CryptographicAssetDetailDto }>;

type PqcLabelEnums = Readonly<{ assetType: PlatformEnumMap; verdict: PlatformEnumMap; outcome: PlatformEnumMap }>;

const EMPTY_VALUE = '-';

const WRAPPING = 'max-w-[420px] whitespace-normal break-words';

const WRAPPING_VALUE = `block ${WRAPPING}`;

const KEY_VALUE_HEADERS: TableHeader[] = [
    { id: 'property', content: 'Property' },
    { id: 'value', content: 'Value' },
];

const NORMALIZED_FIELDS: ReadonlyArray<keyof CryptographicAssetNormalizedFieldsDto> = [
    'algorithmFamily',
    'primitive',
    'parameterSet',
    'curve',
    'mode',
    'padding',
    'variant',
];

const SOURCE_HEADERS: TableHeader[] = [
    { id: 'serialNumber', content: 'Serial number' },
    { id: 'version', content: 'Version', align: 'right' },
    { id: 'producer', content: 'Producer' },
    { id: 'locations', content: 'Locations' },
    { id: 'action', content: '' },
];

const EVIDENCE_HEADERS: TableHeader[] = [
    { id: 'location', content: 'Location' },
    { id: 'line', content: 'Line', align: 'right' },
    { id: 'offset', content: 'Offset', align: 'right' },
    { id: 'symbol', content: 'Symbol' },
];

const DIFFERENCE_TEXT: Record<PayloadDifferenceKind, string> = {
    changed: 'differs from the properties in use',
    notRecorded: 'not recorded by this source',
    onlyInSource: 'recorded only by this source',
};

const CAPPED_LOCATIONS_TOOLTIP = "Core stores a capped sample of each source's locations";

const STEP_HEADERS: TableHeader[] = [
    { id: 'rule', content: 'Rule' },
    {
        id: 'outcome',
        content: 'Outcome',
        info: <EnumColumnDescription platformEnum={PlatformEnum.PqcExplanationStepOutcome} title="Outcome" />,
    },
    { id: 'verdict', content: 'Verdict' },
    { id: 'message', content: 'Message' },
    { id: 'properties', content: '' },
];

const OUTCOME_COLORS: Record<PqcExplanationStepOutcome, BadgeColor> = {
    [PqcExplanationStepOutcome.Decided]: 'primary',
    [PqcExplanationStepOutcome.Resolved]: 'primary',
    [PqcExplanationStepOutcome.Failed]: 'danger',
    [PqcExplanationStepOutcome.NotMatched]: 'secondary',
    [PqcExplanationStepOutcome.NotReached]: 'secondary',
};

// Marked by a solid badge and a bold title rather than a row fill: a tinted row takes a resolved step's link under AA in the light theme.
const DECIDING_OUTCOMES: ReadonlySet<PqcExplanationStepOutcome> = new Set([
    PqcExplanationStepOutcome.Decided,
    PqcExplanationStepOutcome.Resolved,
]);

const pluralize = (count: number, singular: string, plural: string) => `${count.toLocaleString()} ${count === 1 ? singular : plural}`;

const fieldValueText = (key: string, value: unknown, typeEnum: PlatformEnumMap) =>
    key === 'assetType' && typeof value === 'string' ? getEnumLabel(typeEnum, value) : (formatPqcFieldValue(value) ?? EMPTY_VALUE);

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

export function CryptoAssetIdentity({ detail, typeLabel }: Readonly<{ detail: CryptographicAssetDetailDto; typeLabel: string }>) {
    const rows: TableDataRow[] = [
        {
            id: 'assetType',
            columns: [
                getCryptoAssetFieldLabel('assetType'),
                <span key="assetType" className="flex flex-wrap items-center gap-2">
                    {typeLabel}
                    {detail.quarantined && (
                        <Badge color="warning" title={QUARANTINE_TOOLTIP} dataTestId="crypto-asset-quarantined-badge">
                            <TriangleAlert size={12} strokeWidth={2.2} aria-hidden="true" />
                            Quarantined
                        </Badge>
                    )}
                </span>,
            ],
        },
        ...NORMALIZED_FIELDS.map((key) => ({
            id: key,
            columns: [
                getCryptoAssetFieldLabel(key),
                <span key={key} className={WRAPPING_VALUE}>
                    {detail.normalizedFields?.[key] ?? EMPTY_VALUE}
                </span>,
            ],
        })),
        { id: 'oids', columns: ['OIDs', <OidList key="oids" oids={detail.oids ?? []} />] },
    ];
    return <CustomTable headers={KEY_VALUE_HEADERS} data={rows} />;
}

function PqcFieldList({ fields, typeEnum }: Readonly<{ fields: { [key: string]: unknown }; typeEnum: PlatformEnumMap }>) {
    return (
        <ul className="flex flex-col gap-1">
            {Object.entries(fields).map(([key, value]) => (
                <li key={key} className="break-words">
                    <span className="text-content-muted">{getCryptoAssetFieldLabel(key)}:</span>{' '}
                    <span className="font-mono">{fieldValueText(key, value, typeEnum)}</span>
                </li>
            ))}
        </ul>
    );
}

function PqcReferencedAsset({ asset, typeEnum, tab }: Readonly<{ asset: PqcReferencedAssetDto; typeEnum: PlatformEnumMap; tab?: string }>) {
    if (asset.visible) {
        return (
            <span className="flex flex-wrap items-center gap-2">
                <Link className="whitespace-normal break-words" to={cryptoAssetDetailPath(asset.uuid, tab)}>
                    {asset.name ?? asset.uuid}
                </Link>
                {asset.type && <Badge color="secondary">{getEnumLabel(typeEnum, asset.type)}</Badge>}
            </span>
        );
    }
    return (
        <span className="flex flex-col gap-1">
            <span className="font-mono text-xs break-all">{asset.uuid}</span>
            <span className="whitespace-normal text-xs text-content-muted">
                This asset has been removed from the inventory, or your role does not grant access to it.
            </span>
        </span>
    );
}

export function CryptoAssetVerdict({
    detail,
    verdictLabel,
    typeEnum,
}: Readonly<{ detail: CryptographicAssetDetailDto; verdictLabel: string; typeEnum: PlatformEnumMap }>) {
    // Core omits the block until the PQC sweep has evaluated the asset, whatever the generated type says.
    const verdict: CryptographicAssetVerdictDto | undefined = detail.verdict;
    if (!verdict) {
        return (
            <p className="text-sm text-content-muted" data-testid="crypto-asset-verdict-pending">
                Not evaluated yet. The rule set has not reached this asset since it was synced.
            </p>
        );
    }

    const rows: TableDataRow[] = [
        { id: 'verdict', columns: ['Verdict', <PqcVerdictBadge key="verdict" verdict={detail.pqcVerdict} label={verdictLabel} />] },
        {
            id: 'rule',
            columns: [
                'Rule',
                <span key="rule" className={WRAPPING_VALUE}>
                    {verdict.ruleId ?? 'No rule matched, so the rule set default applies'}
                </span>,
            ],
        },
        ...(verdict.referencedAsset
            ? [
                  {
                      id: 'decidedBy',
                      columns: ['Decided by', <PqcReferencedAsset key="decidedBy" asset={verdict.referencedAsset} typeEnum={typeEnum} />],
                  },
              ]
            : []),
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
    ];
    return <CustomTable headers={KEY_VALUE_HEADERS} data={rows} />;
}

function ExplanationStatus({
    explanation,
    verdictEnum,
}: Readonly<{ explanation: CryptographicAssetPqcExplanationDto; verdictEnum: PlatformEnumMap }>) {
    if (explanation.matchesStored) {
        return (
            <p className="text-sm text-content-muted" data-testid="pqc-explanation-status">
                Evaluation is up-to-date with stored evaluation result
                {explanation.storedEvaluatedAt ? `. It was last evaluated ${dateFormatter(explanation.storedEvaluatedAt)}.` : '.'}
            </p>
        );
    }
    if (!explanation.storedVerdict) {
        return (
            <p className="text-sm text-content-muted" data-testid="pqc-explanation-status">
                This asset has not been evaluated yet. The next re-evaluation will store this result.
            </p>
        );
    }
    // Core reports a stored result as stale on a moved revision alone, so the two may still name the same verdict and rule.
    // The comparison sits outside the callout: a warning-tinted verdict badge would disappear into the callout's own tint.
    return (
        <div className="flex flex-col gap-2" data-testid="pqc-explanation-status">
            <Callout severity="warning">
                The stored evaluation result is out of date. The asset, an asset it refers to, or the platform's rules have changed since it
                was last evaluated. The next re-evaluation will store the recomputed result.
            </Callout>
            <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 text-sm">
                <dt className="text-content-muted">Stored</dt>
                <dd className="flex flex-wrap items-center gap-2" data-testid="pqc-explanation-stored">
                    <PqcVerdictBadge verdict={explanation.storedVerdict} label={getEnumLabel(verdictEnum, explanation.storedVerdict)} />
                    {explanation.storedRuleId ? (
                        <code className="font-mono text-xs">{explanation.storedRuleId}</code>
                    ) : (
                        <span>no rule decided it</span>
                    )}
                    {explanation.storedEvaluatedAt && <span>last evaluated {dateFormatter(explanation.storedEvaluatedAt)}</span>}
                </dd>
                <dt className="text-content-muted">Recomputed</dt>
                <dd className="flex flex-wrap items-center gap-2" data-testid="pqc-explanation-recomputed">
                    <PqcVerdictBadge verdict={explanation.verdict} label={getEnumLabel(verdictEnum, explanation.verdict)} />
                    <code className="font-mono text-xs">{explanation.ruleId}</code>
                </dd>
            </dl>
        </div>
    );
}

function StepProperties({ step, typeEnum }: Readonly<{ step: PqcExplanationStepDto; typeEnum: PlatformEnumMap }>) {
    const fields = step.evaluatedFields ?? {};
    if (Object.keys(fields).length === 0) return null;
    return (
        <Toggletip
            ariaLabel={`Properties read by ${step.ruleId}`}
            dataTestId="pqc-step-properties"
            content={
                <>
                    <div className="mb-1 font-semibold">Properties read</div>
                    <PqcFieldList fields={fields} typeEnum={typeEnum} />
                </>
            }
        />
    );
}

function stepRow(step: PqcExplanationStepDto, index: number, enums: PqcLabelEnums): TableDataRow {
    const isDeciding = DECIDING_OUTCOMES.has(step.outcome);
    return {
        id: `${index}:${step.ruleId}`,
        columns: [
            <span key="rule" className="flex flex-col gap-0.5">
                <span className={cn({ 'font-bold': isDeciding })}>{step.title}</span>
                <code className="font-mono text-xs text-content-muted">{step.ruleId}</code>
            </span>,
            <Badge
                key="outcome"
                color={OUTCOME_COLORS[step.outcome] ?? 'secondary'}
                dataTestId={isDeciding ? 'pqc-deciding-outcome' : 'pqc-step-outcome'}
            >
                {getEnumLabel(enums.outcome, step.outcome)}
            </Badge>,
            step.verdict ? (
                <PqcVerdictBadge key="verdict" verdict={step.verdict} label={getEnumLabel(enums.verdict, step.verdict)} />
            ) : (
                EMPTY_VALUE
            ),
            <span key="message" className={cn('flex min-w-[200px] flex-col gap-2', WRAPPING)}>
                <span>{step.message}</span>
                {step.referencedAsset && (
                    <span className="flex flex-col gap-1">
                        <span className="text-xs text-content-muted">Decided by</span>
                        <PqcReferencedAsset asset={step.referencedAsset} typeEnum={enums.assetType} tab={PQC_READINESS_TAB} />
                    </span>
                )}
            </span>,
            <StepProperties key="properties" step={step} typeEnum={enums.assetType} />,
        ],
    };
}

export function CryptoAssetEvaluatedProperties({
    inputs,
    typeEnum,
}: Readonly<{ inputs: { [key: string]: unknown }; typeEnum: PlatformEnumMap }>) {
    const rows: TableDataRow[] = Object.entries(inputs).map(([key, value]) => ({
        id: `input-${key}`,
        columns: [
            getCryptoAssetFieldLabel(key),
            <span key={key} className={cn('font-mono text-xs', WRAPPING_VALUE)}>
                {fieldValueText(key, value, typeEnum)}
            </span>,
        ],
    }));
    return (
        <div className="flex flex-col gap-3" data-testid="pqc-explanation-inputs">
            {rows.length === 0 ? (
                <p className="text-sm text-content-muted" data-testid="pqc-explanation-inputs-empty">
                    No properties are served for this asset.
                </p>
            ) : (
                <CustomTable headers={KEY_VALUE_HEADERS} data={rows} />
            )}
            <p className="text-xs text-content-subtle" data-testid="pqc-explanation-withheld-note">
                Properties taken from a CBOM you may not read are left out of the rules and of this list, so an absent property does not
                mean the asset lacks it.
            </p>
        </div>
    );
}

export function CryptoAssetPqcExplanation({
    explanation,
    enums,
}: Readonly<{ explanation: CryptographicAssetPqcExplanationDto; enums: PqcLabelEnums }>) {
    const rows: TableDataRow[] = [
        ...explanation.steps.map((step, index) => stepRow(step, index, enums)),
        {
            id: 'result',
            columns: [
                <span key="result">
                    <span className="font-bold">PQC readiness result</span> ({dateFormatter(explanation.explainedAt)})
                </span>,
                '',
                <PqcVerdictBadge key="verdict" verdict={explanation.verdict} label={getEnumLabel(enums.verdict, explanation.verdict)} />,
                <span key="reason" className={cn('min-w-[200px]', WRAPPING_VALUE)}>
                    {explanation.reason}
                </span>,
                '',
            ],
        },
    ];

    return (
        <div className="flex flex-col gap-4" data-testid="pqc-explanation">
            <ExplanationStatus explanation={explanation} verdictEnum={enums.verdict} />
            <CustomTable headers={STEP_HEADERS} data={rows} />
            <p className="text-xs text-content-subtle" data-testid="pqc-rule-set-note">
                The rule set is fixed by the platform and cannot be configured. Stored evaluation results are re-evaluated when something
                they were decided from changes: a new CBOM, a change to the asset or to an asset it refers to, or a rule change after an
                upgrade.
            </p>
        </div>
    );
}

function EvidenceTable({ source, panelId }: Readonly<{ source: CryptographicAssetSourceDto; panelId: string }>) {
    const evidence = source.evidence ?? [];
    const rows: TableDataRow[] = evidence.map((entry, index) => ({
        id: `${index}#${entry.location}#${entry.line ?? ''}#${entry.offset ?? ''}#${entry.symbol ?? ''}`,
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
        <div className="flex flex-col gap-2" id={panelId} data-testid="crypto-asset-evidence">
            <p className="text-sm font-medium text-content break-words">
                Locations in {source.serialNumber} · v{source.version}
            </p>
            <CustomTable headers={EVIDENCE_HEADERS} data={rows} />
            {evidence.length < toFiniteNumber(source.occurrenceCount) && (
                <p className="text-xs text-content-subtle" data-testid="crypto-asset-evidence-capped-note">
                    {CAPPED_LOCATIONS_TOOLTIP}. The count is the true total; the list is a sample.
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

    const hasSeveralSources = toFiniteNumber(detail.sourceCbomCount) > 1;
    const rows: TableDataRow[] = sources.map((source) => {
        const shown = source.evidence?.length ?? 0;
        const occurrences = toFiniteNumber(source.occurrenceCount);
        const isOpen = source.cbomUuid === openCbomUuid;
        const evidencePanelId = `crypto-asset-evidence-${source.cbomUuid}`;
        const isCapped = shown < occurrences;
        const coverage = (
            <span key="locations" className="tabular-nums" data-testid="crypto-asset-source-locations">
                {describeLocationCoverage(shown, occurrences)}
            </span>
        );
        // With a single source the mark is always true, so it says nothing.
        const isInUse = hasSeveralSources && detail.electedPayload !== undefined && isSamePayload(detail.electedPayload, source.payload);
        return {
            id: source.cbomUuid,
            columns: [
                <span key="serial" className="flex flex-wrap items-center gap-2">
                    <Link className="font-mono text-xs" to={`/cboms/detail/${source.cbomUuid}`}>
                        {source.serialNumber}
                    </Link>
                    {isInUse && (
                        <Badge
                            color="info"
                            title="The inventory uses this source's crypto properties. Sources that recorded identical properties are all marked."
                            dataTestId="crypto-asset-source-in-use"
                        >
                            In use
                        </Badge>
                    )}
                </span>,
                <span key="version" className="tabular-nums">
                    {source.version}
                </span>,
                source.source,
                isCapped ? (
                    <Tooltip key="locations" content={CAPPED_LOCATIONS_TOOLTIP}>
                        {coverage}
                    </Tooltip>
                ) : (
                    coverage
                ),
                <Button
                    key="toggle"
                    type="button"
                    variant="outline"
                    disabled={shown === 0}
                    aria-label={`${isOpen ? 'Hide' : 'Show'} locations in ${source.serialNumber}`}
                    aria-expanded={isOpen}
                    aria-controls={evidencePanelId}
                    disabledTooltip="This source recorded no locations"
                    onClick={() => setOpenCbomUuid(isOpen ? undefined : source.cbomUuid)}
                >
                    {isOpen ? 'Hide' : 'Show'}
                </Button>,
            ],
        };
    });

    const openSource = sources.find((source) => source.cbomUuid === openCbomUuid);
    const claimedBy = toFiniteNumber(detail.sourceCbomCount);
    const hidden = Math.max(0, claimedBy - sources.length);

    return (
        <div className="flex flex-col gap-4">
            <p className="text-sm text-content-subtle" data-testid="crypto-asset-claims">
                Claimed by {pluralize(claimedBy, 'CBOM', 'CBOMs')} ·{' '}
                {pluralize(toFiniteNumber(detail.occurrenceCount), 'occurrence', 'occurrences')}
                {hidden > 0 && ` · ${pluralize(hidden, 'document', 'documents')} outside your access`}
            </p>
            <CustomTable headers={SOURCE_HEADERS} data={rows} />
            {openSource && <EvidenceTable source={openSource} panelId={`crypto-asset-evidence-${openSource.cbomUuid}`} />}
        </div>
    );
}

function PayloadPane({
    title,
    description,
    payload,
    emptyText,
    testId,
}: Readonly<{ title: string; description?: string; payload?: object; emptyText: string; testId: string }>) {
    return (
        <div className="flex min-w-0 flex-col gap-2" data-testid={testId}>
            <div>
                <p className="text-sm font-medium text-content">{title}</p>
                {description && <p className="text-xs text-content-subtle">{description}</p>}
            </div>
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
                This source recorded the same properties.
            </p>
        );
    }
    return (
        <div className="flex flex-col gap-1" data-testid="crypto-asset-payload-differences">
            <p className="text-sm font-medium text-content">Where this source disagrees with the properties in use</p>
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
                    title="Properties in use"
                    description="Taken whole from the source CBOM with the most detail. The PQC rules read these values."
                    payload={detail.electedPayload}
                    emptyText="The properties in use are not shown: the source CBOM they were taken from is outside your access, or no source recorded crypto properties."
                    testId="crypto-asset-elected-payload"
                />
                <PayloadPane
                    title={selected ? `As recorded by ${selected.serialNumber} v${selected.version}` : 'Source properties'}
                    payload={selected?.payload}
                    emptyText={
                        selected
                            ? 'This source recorded no crypto properties.'
                            : 'Nothing to compare: this asset has no source CBOM to show.'
                    }
                    testId="crypto-asset-source-payload"
                />
            </div>
            <PayloadDifferences differences={differencesFor(detail.electedPayload, selected)} />
        </div>
    );
}
