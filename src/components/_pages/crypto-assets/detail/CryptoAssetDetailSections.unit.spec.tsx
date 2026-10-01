import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import type { PlatformEnumMap } from 'types/enums';
import type {
    CryptographicAssetDetailDto,
    CryptographicAssetPqcExplanationDto,
    CryptographicAssetSourceDto,
    PqcExplanationStepDto,
    PqcReferencedAssetDto,
} from 'types/openapi';
import { CryptographicAssetType, PqcExplanationStepOutcome, PqcVerdict } from 'types/openapi';
import { dateFormatter } from 'utils/dateUtil';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import {
    CryptoAssetIdentity,
    CryptoAssetPayloads,
    CryptoAssetPqcExplanation,
    CryptoAssetSources,
    CryptoAssetSummary,
    CryptoAssetVerdict,
} from './CryptoAssetDetailSections';

setupReactActEnvironment();

// The shared mock renders rows only; the header's info slot is where the outcome descriptions live.
vi.mock('components/CustomTable', async () => {
    const { customTableMockModule } = await import('../../test-utils/mockModules');
    const Rows = customTableMockModule().default;
    return {
        default: (props: { headers?: { id: string; info?: ReactNode }[]; data?: never[] }) => (
            <>
                {props.headers?.map((header) => (
                    <span key={header.id}>{header.info}</span>
                ))}
                <Rows data={props.data} />
            </>
        ),
    };
});
vi.mock('components/EnumDescription', () => ({ EnumColumnDescription: () => <span data-testid="outcome-descriptions" /> }));
vi.mock('components/JsonViewer', () => ({ default: ({ value }: { value: string }) => <pre data-testid="json-viewer">{value}</pre> }));
// Clickable, because picking another source is this section's one interaction: each option is a button that hands
// its value back the way Select does, plus one that clears the selection, which Select's onChange also allows.
vi.mock('components/Select', () => ({
    default: ({ id, value, options, onChange }: any) => (
        <div data-testid={`select-${id}`} data-value={value}>
            {options.map((option: any) => (
                <button key={option.value} type="button" data-testid={`option-${option.value}`} onClick={() => onChange(option.value)}>
                    {option.label}
                </button>
            ))}
            <button type="button" data-testid="option-cleared" onClick={() => onChange(null)}>
                Clear
            </button>
        </div>
    ),
}));

const electedPayload = { assetType: 'algorithm', algorithmProperties: { primitive: 'signature', parameterSetIdentifier: '2048' } };

const source = (overrides: Partial<CryptographicAssetSourceDto> = {}): CryptographicAssetSourceDto => ({
    cbomUuid: 'cbom-1',
    serialNumber: 'urn:uuid:7c1e',
    version: 3,
    occurrenceCount: 1284,
    source: 'cbom-lens',
    payload: electedPayload,
    evidence: Array.from({ length: 50 }, (_, index) => ({ location: `src/tls/handshake-${index}.c`, line: index + 1 })),
    ...overrides,
});

const disagreeingSource = source({
    cbomUuid: 'cbom-2',
    serialNumber: 'urn:uuid:a91b',
    version: 1,
    occurrenceCount: 37,
    source: 'cdxgen',
    payload: { assetType: 'algorithm', algorithmProperties: { primitive: 'signature' } },
    evidence: Array.from({ length: 37 }, (_, index) => ({ location: `lib/pki-${index}.go` })),
});

const detail = (overrides: Partial<CryptographicAssetDetailDto> = {}): CryptographicAssetDetailDto => ({
    uuid: 'asset-1',
    name: 'RSA-2048',
    type: CryptographicAssetType.Algorithm,
    pqcVerdict: PqcVerdict.NotReady,
    sourceCbomCount: 2,
    occurrenceCount: 1321,
    quarantined: false,
    verdict: {
        ruleId: 'CLASSICAL-SHOR',
        reason: 'Security rests on factorisation or a discrete logarithm',
        evaluatedFields: { algorithmFamily: 'RSA', parameterSet: '2048' },
        decidedAt: '2026-09-02T19:41:07Z',
        evaluatedAt: '2026-09-09T06:00:14Z',
    },
    normalizedFields: { algorithmFamily: 'RSA', primitive: 'signature', parameterSet: '2048' },
    electedPayload,
    sources: [source(), disagreeingSource],
    oids: [
        { oid: '1.2.840.113549.1.1.11', refuted: false },
        { oid: '2.16.840.1.101.3.4.2.1', refuted: true },
    ],
    ...overrides,
});

const enumMap = (labels: Record<string, string>) =>
    Object.fromEntries(Object.entries(labels).map(([code, label]) => [code, { code, label }])) as PlatformEnumMap;

const enums = {
    assetType: enumMap({ algorithm: 'Algorithm', certificate: 'Certificate', 'related-crypto-material': 'Related crypto material' }),
    verdict: enumMap({ ready: 'PQC ready', notReady: 'Not PQC ready', unknown: 'Unknown' }),
    outcome: enumMap({ notMatched: 'Not matched', decided: 'Decided', notReached: 'Not reached', resolved: 'Resolved', failed: 'Failed' }),
};

const visibleKey: PqcReferencedAssetDto = {
    uuid: 'key-1',
    visible: true,
    name: 'RSA-2048 key',
    type: CryptographicAssetType.RelatedCryptoMaterial,
};
const hiddenKey: PqcReferencedAssetDto = { uuid: 'key-2', visible: false };

const step = (
    ruleId: string,
    outcome: PqcExplanationStepOutcome,
    overrides: Partial<PqcExplanationStepDto> = {},
): PqcExplanationStepDto => ({
    ruleId,
    title: `Title of ${ruleId}`,
    outcome,
    message: `Message of ${ruleId}`,
    ...overrides,
});

const explanation = (overrides: Partial<CryptographicAssetPqcExplanationDto> = {}): CryptographicAssetPqcExplanationDto => ({
    uuid: 'asset-1',
    verdict: PqcVerdict.NotReady,
    ruleId: 'CLASSICAL-SHOR',
    reason: 'Security rests on factorisation or a discrete logarithm',
    inputs: { assetType: 'algorithm', algorithmFamily: 'RSA', parameterSet: '2048' },
    steps: [
        step('PQC-STANDARDIZED', PqcExplanationStepOutcome.NotMatched, { evaluatedFields: { algorithmFamily: 'RSA' } }),
        step('CLASSICAL-SHOR', PqcExplanationStepOutcome.Decided, {
            verdict: PqcVerdict.NotReady,
            evaluatedFields: { algorithmFamily: 'RSA', parameterSet: '2048' },
        }),
        step('SYMMETRIC-READY', PqcExplanationStepOutcome.NotReached),
    ],
    matchesStored: true,
    storedVerdict: PqcVerdict.NotReady,
    storedRuleId: 'CLASSICAL-SHOR',
    storedEvaluatedAt: '2026-09-09T06:00:14Z',
    explainedAt: '2026-10-01T08:00:00Z',
    ...overrides,
});

describe('crypto asset detail sections', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
    });

    const render = async (node: ReactNode) => {
        await act(async () => {
            root.render(<MemoryRouter>{node}</MemoryRouter>);
        });
    };

    const one = (selector: string) => container.querySelector(selector);
    const all = (selector: string) => Array.from(container.querySelectorAll(selector));
    const text = (selector: string) => one(selector)?.textContent ?? '';

    const clickButton = async (label: string) => {
        const button = all('button').find((candidate) => candidate.textContent === label) as HTMLButtonElement;
        await act(async () => {
            button.click();
        });
    };

    describe('summary', () => {
        test('states the type, the verdict and how many CBOMs claim the asset', async () => {
            await render(<CryptoAssetSummary detail={detail()} typeLabel="Algorithm" verdictLabel="Not PQC ready" />);

            const summary = text('[data-testid="crypto-asset-summary"]');
            expect(summary).toContain('Algorithm');
            expect(summary).toContain('Not PQC ready');
            // The name heads the page, and repeating it here put it twice within one screen height.
            expect(summary).not.toContain('RSA-2048');
            expect(text('[data-testid="crypto-asset-claims"]')).toBe(`Claimed by 2 CBOMs · ${(1321).toLocaleString()} occurrences`);
            expect(one('[data-testid="crypto-asset-quarantined-badge"]')).toBeNull();
        });

        // toFiniteNumber is what the list helper reads these two counts through, so the detail reads them the same way.
        test('a count the API leaves out renders as zero rather than blanking the page', async () => {
            await render(
                <CryptoAssetSummary
                    detail={detail({ sourceCbomCount: null as never, occurrenceCount: undefined as never })}
                    typeLabel="Algorithm"
                    verdictLabel="Not PQC ready"
                />,
            );

            expect(text('[data-testid="crypto-asset-claims"]')).toBe('Claimed by 0 CBOMs · 0 occurrences');
        });

        test('a quarantined asset is flagged in the header', async () => {
            await render(<CryptoAssetSummary detail={detail({ quarantined: true })} typeLabel="Algorithm" verdictLabel="Not PQC ready" />);

            expect(text('[data-testid="crypto-asset-quarantined-badge"]')).toBe('Quarantined');
        });
    });

    describe('identity', () => {
        test('normalized fields Core did not derive render as a dash rather than disappearing', async () => {
            await render(<CryptoAssetIdentity detail={detail()} />);

            expect(text('[data-testid="row-algorithmFamily"]')).toBe('Algorithm familyRSA');
            expect(text('[data-testid="row-curve"]')).toBe('Elliptic curve-');
        });

        // A table cell is one unwrapped line, so a value left bare is cut off at the card's edge instead.
        test('a field value and an OID both wrap rather than run out of the card', async () => {
            await render(<CryptoAssetIdentity detail={detail()} />);

            const value = one('[data-testid="row-algorithmFamily"] span');
            const oid = one('[data-testid="crypto-asset-oid"] span');

            expect(value?.className).toContain('whitespace-normal');
            expect(oid?.className).toContain('whitespace-normal');
        });

        test('a refuted OID is flagged and struck through, an accepted one is not', async () => {
            await render(<CryptoAssetIdentity detail={detail()} />);

            const [accepted, refuted] = all('[data-testid="crypto-asset-oid"]');
            expect(accepted.querySelector('[data-testid="crypto-asset-oid-refuted"]')).toBeNull();
            expect(refuted.querySelector('[data-testid="crypto-asset-oid-refuted"]')?.textContent).toBe('Refuted');
            expect(refuted.querySelector('.line-through')?.textContent).toBe('2.16.840.1.101.3.4.2.1');
        });
    });

    describe('verdict', () => {
        const renderVerdict = (overrides: Partial<CryptographicAssetDetailDto> = {}) =>
            render(<CryptoAssetVerdict detail={detail(overrides)} verdictLabel="Not PQC ready" typeEnum={enums.assetType} />);

        test('shows the deciding rule, its reason and the labelled fields it read, and no rule-set version', async () => {
            await renderVerdict();

            expect(one('[data-testid="row-ruleSet"]')).toBeNull();
            expect(text('[data-testid="row-rule"]')).toContain('CLASSICAL-SHOR');
            expect(text('[data-testid="row-reason"]')).toContain('Security rests on factorisation');
            expect(all('[data-testid="row-evaluatedFields"] li').map((item) => item.textContent)).toEqual([
                'Algorithm family: RSA',
                'Parameter set: 2048',
            ]);
            expect(one('[data-testid="row-decidedBy"]')).toBeNull();
        });

        test.each([
            ['an evaluated asset', {}],
            ['an asset not evaluated yet', { verdict: undefined as never }],
        ])('%s states how its verdict is kept and re-evaluated', async (_, overrides) => {
            await renderVerdict(overrides);

            const note = text('[data-testid="crypto-asset-verdict-sweep-note"]');
            expect(note).toContain('fixed by the platform and cannot be configured');
            expect(note).toContain('CryptoAssetPqcSweepTask');
            expect(note).toContain('hourly by default and not while the job is disabled in the Scheduler');
            expect(note).toContain('computed on demand');
        });

        test('an asset the rule set has not evaluated yet says so instead of throwing on the missing block', async () => {
            await renderVerdict({ verdict: undefined as never });

            expect(text('[data-testid="crypto-asset-verdict-pending"]')).toContain('Not evaluated yet');
            expect(one('[data-testid="row-rule"]')).toBeNull();
        });

        test('a verdict carried over from a visible asset links to it under Decided by', async () => {
            await renderVerdict({ verdict: { ...detail().verdict, ruleId: 'CERT-SUBJECT-KEY', referencedAsset: visibleKey } });

            const link = one('[data-testid="row-decidedBy"] a');
            expect(link?.getAttribute('href')).toBe('/cryptoassets/detail/key-1');
            expect(link?.textContent).toBe('RSA-2048 key');
            expect(text('[data-testid="row-decidedBy"]')).toContain('Related crypto material');
        });

        test('a visible asset with no name is labelled by its uuid', async () => {
            await renderVerdict({ verdict: { ...detail().verdict, referencedAsset: { uuid: 'key-1', visible: true } } });

            expect(text('[data-testid="row-decidedBy"] a')).toBe('key-1');
        });

        test('an asset the reader cannot open is named by uuid without a link, and says why', async () => {
            await renderVerdict({ verdict: { ...detail().verdict, referencedAsset: hiddenKey } });

            expect(one('[data-testid="row-decidedBy"] a')).toBeNull();
            expect(text('[data-testid="row-decidedBy"]')).toContain('key-2');
            expect(text('[data-testid="row-decidedBy"]')).toContain('removed from the inventory, or your role does not grant access to it');
        });
    });

    describe('PQC explanation', () => {
        const renderExplanation = (overrides: Partial<CryptographicAssetPqcExplanationDto> = {}) =>
            render(<CryptoAssetPqcExplanation explanation={explanation(overrides)} enums={enums} />);

        const stepRows = () => all('[data-testid^="row-"]').filter((row) => /^row-\d+:/.test(row.getAttribute('data-testid') ?? ''));
        const cells = (row: Element) => Array.from(row.children).map((cell) => cell.textContent);

        test('lists every step in served order with its title, rule id, outcome, verdict, message and fields', async () => {
            await renderExplanation();

            expect(stepRows().map(cells)).toEqual([
                ['Title of PQC-STANDARDIZEDPQC-STANDARDIZED', 'Not matched', '-', 'Message of PQC-STANDARDIZED', 'Algorithm family: RSA'],
                [
                    'Title of CLASSICAL-SHORCLASSICAL-SHOR',
                    'Decided',
                    'Not PQC ready',
                    'Message of CLASSICAL-SHOR',
                    'Algorithm family: RSAParameter set: 2048',
                ],
                ['Title of SYMMETRIC-READYSYMMETRIC-READY', 'Not reached', '-', 'Message of SYMMETRIC-READY', '-'],
            ]);
            expect(one('[data-testid="outcome-descriptions"]')).not.toBeNull();
        });

        const isSetApart = (row: Element) =>
            row.querySelector('[data-testid="pqc-deciding-outcome"]') !== null && row.querySelector('.font-bold') !== null;

        test('only the deciding step is set apart', async () => {
            await renderExplanation();

            expect(stepRows().map(isSetApart)).toEqual([false, true, false]);
        });

        test('closes on the recomputed verdict with its rule, reason and time', async () => {
            await renderExplanation();

            const result = cells(one('[data-testid="row-result"]') as Element);
            expect(result[0]).toBe(`Recomputed verdict (${dateFormatter('2026-10-01T08:00:00Z')})CLASSICAL-SHOR`);
            expect(result[2]).toBe('Not PQC ready');
            expect(result[3]).toBe('Security rests on factorisation or a discrete logarithm');
        });

        test('a resolved step is set apart and links the asset it carried the verdict over from', async () => {
            await renderExplanation({
                steps: [
                    step('CERT-SUBJECT-KEY', PqcExplanationStepOutcome.Resolved, {
                        verdict: PqcVerdict.NotReady,
                        referencedAsset: visibleKey,
                        evaluatedFields: {
                            assetType: 'certificate',
                            subjectPublicKeyRef: 'crypto/key/rsa-2048',
                            referencedRuleId: 'CLASSICAL-SHOR',
                        },
                    }),
                ],
            });

            const [row] = stepRows();
            expect(isSetApart(row)).toBe(true);
            expect(cells(row)[1]).toBe('Resolved');
            expect(row.querySelector('a')?.getAttribute('href')).toBe('/cryptoassets/detail/key-1');
            expect(Array.from(row.querySelectorAll('li')).map((item) => item.textContent)).toEqual([
                'Asset type: Certificate',
                'Subject public key reference: crypto/key/rsa-2048',
                'Rule of the referenced asset: CLASSICAL-SHOR',
            ]);
        });

        test('a resolved step whose asset the reader cannot open names it without a link', async () => {
            await renderExplanation({
                steps: [
                    step('CERT-SIGNATURE-ALGORITHM', PqcExplanationStepOutcome.Resolved, {
                        verdict: PqcVerdict.NotReady,
                        referencedAsset: hiddenKey,
                    }),
                ],
            });

            const [row] = stepRows();
            expect(row.querySelector('a')).toBeNull();
            expect(row.textContent).toContain('key-2');
            expect(row.textContent).toContain('removed from the inventory, or your role does not grant access to it');
        });

        test('an unresolved reference step shows the references it serves and only its own message', async () => {
            await renderExplanation({
                steps: [
                    step('CERT-REFERENCE-UNRESOLVED', PqcExplanationStepOutcome.Decided, {
                        verdict: PqcVerdict.Unknown,
                        evaluatedFields: { unresolvedRefs: ['crypto/key/a', 'crypto/key/b'] },
                    }),
                ],
            });

            const [row] = stepRows();
            expect(cells(row).slice(3)).toEqual([
                'Message of CERT-REFERENCE-UNRESOLVED',
                'Unresolved references: crypto/key/a, crypto/key/b',
            ]);
        });

        test('an asset the rule set cannot evaluate shows its one failed step and an empty inputs panel', async () => {
            await renderExplanation({
                verdict: PqcVerdict.Unknown,
                ruleId: 'EVALUATION-FAILED',
                reason: 'The rule set could not evaluate this asset',
                inputs: {},
                steps: [
                    step('EVALUATION-FAILED', PqcExplanationStepOutcome.Failed, {
                        title: 'Evaluation',
                        verdict: PqcVerdict.Unknown,
                        message: 'The rule set could not evaluate this asset',
                        evaluatedFields: {},
                    }),
                ],
            });

            expect(stepRows().map(cells)).toEqual([
                ['EvaluationEVALUATION-FAILED', 'Failed', 'Unknown', 'The rule set could not evaluate this asset', '-'],
            ]);
            expect(text('[data-testid="pqc-explanation-inputs-empty"]')).toBe('No properties are served for this asset.');
        });

        test('inputs read as labelled property rows, with unknown keys kept raw and lists joined', async () => {
            await renderExplanation({
                inputs: { assetType: 'protocol', cipherSuites: ['TLS_AES_128_GCM_SHA256', 'TLS_CHACHA20_POLY1305_SHA256'], futureKey: 7 },
            });

            expect(all('[data-testid="pqc-explanation-inputs"] [data-testid^="row-input-"]').map(cells)).toEqual([
                ['Asset type', 'protocol'],
                ['Cipher suites', 'TLS_AES_128_GCM_SHA256, TLS_CHACHA20_POLY1305_SHA256'],
                ['futureKey', '7'],
            ]);
        });

        // Core withholds document-derived values from a reader without CBOM access, and says nothing when it does.
        test('withheld document fields are simply not listed, never reported as unrecorded', async () => {
            await renderExplanation({ inputs: { assetType: 'certificate' } });

            const inputs = text('[data-testid="pqc-explanation-inputs"]');
            expect(all('[data-testid^="row-input-"]')).toHaveLength(1);
            expect(inputs).not.toContain('Subject public key reference');
            expect(inputs).not.toMatch(/not recorded|nothing recorded/i);
            expect(text('[data-testid="pqc-explanation-withheld-note"]')).toContain(
                'left out of the steps and of this list, so an absent property does not mean the asset lacks it',
            );
        });

        test('a stored verdict that agrees says so with its last evaluation', async () => {
            await renderExplanation();

            expect(text('[data-testid="pqc-explanation-status"]')).toBe(
                `The stored verdict agrees with this explanation. It was last evaluated ${dateFormatter('2026-09-09T06:00:14Z')}.`,
            );
        });

        test('an asset never evaluated says the next re-evaluation will store this result', async () => {
            await renderExplanation({
                matchesStored: false,
                storedVerdict: undefined,
                storedRuleId: undefined,
                storedEvaluatedAt: undefined,
            });

            expect(text('[data-testid="pqc-explanation-status"]')).toBe(
                'This asset has not been evaluated yet. The next re-evaluation will store this result.',
            );
        });

        // The typical stale verdict is Unknown, whose warning tint is the callout's own.
        test('a stale stored verdict is contrasted with the recomputed one, with the badges outside the warning tint', async () => {
            await renderExplanation({ matchesStored: false, storedVerdict: PqcVerdict.Unknown, storedRuleId: 'CERT-DEFERRED-V1' });

            expect(text('[data-testid="pqc-explanation-stored"]')).toBe(
                `UnknownCERT-DEFERRED-V1last evaluated ${dateFormatter('2026-09-09T06:00:14Z')}`,
            );
            expect(text('[data-testid="pqc-explanation-recomputed"]')).toBe('Not PQC readyCLASSICAL-SHOR');
            expect(text('[data-testid="pqc-explanation-status"]')).toContain(
                "The asset, an asset it refers to, or the platform's rules have changed since",
            );
            expect(one('[data-testid="pqc-explanation-status"] .bg-warning-surface [data-testid="pqc-verdict-badge"]')).toBeNull();
        });

        // Core also calls a stored verdict stale when only the asset's revision or a referenced verdict moved.
        test('a stale stored verdict that names the same verdict and rule is called out of date, not different', async () => {
            await renderExplanation({ matchesStored: false });

            const status = text('[data-testid="pqc-explanation-status"]');
            expect(status).toContain('The stored verdict is out of date.');
            expect(status).not.toContain('differs');
            expect(text('[data-testid="pqc-explanation-stored"]')).toContain('Not PQC readyCLASSICAL-SHOR');
            expect(text('[data-testid="pqc-explanation-recomputed"]')).toBe('Not PQC readyCLASSICAL-SHOR');
        });

        test('a stale stored verdict no rule decided says so instead of showing an empty rule', async () => {
            await renderExplanation({ matchesStored: false, storedVerdict: PqcVerdict.Unknown, storedRuleId: undefined });

            expect(text('[data-testid="pqc-explanation-stored"]')).toContain('no rule decided it');
        });
    });

    describe('sources', () => {
        test('each source lists its serial number and version and links to the existing CBOM detail page', async () => {
            await render(<CryptoAssetSources detail={detail()} />);

            const row = one('[data-testid="row-cbom-1"]');
            expect(row?.querySelector('a')?.getAttribute('href')).toBe('/cboms/detail/cbom-1');
            expect(row?.textContent).toContain('urn:uuid:7c1e');
            expect(row?.textContent).toContain('3');
        });

        test('capped evidence shows the true count, and a list that fits says it is complete', async () => {
            await render(<CryptoAssetSources detail={detail()} />);

            expect(all('[data-testid="crypto-asset-evidence-coverage"]').map((cell) => cell.textContent)).toEqual([
                `50 shown of ${(1284).toLocaleString()} recorded`,
                'all 37',
            ]);
        });

        // The DTO does not name the electing document, so the mark reports the payload match it can prove.
        test('a source carrying the elected payload is marked, one that disagrees is not', async () => {
            await render(<CryptoAssetSources detail={detail()} />);

            expect(one('[data-testid="row-cbom-1"] [data-testid="crypto-asset-source-elected"]')?.textContent).toBe('Matches elected');
            expect(one('[data-testid="row-cbom-2"] [data-testid="crypto-asset-source-elected"]')).toBeNull();
        });

        test("Show opens that one source's occurrences with the cap note, and Hide closes them", async () => {
            await render(<CryptoAssetSources detail={detail()} />);
            expect(one('[data-testid="crypto-asset-evidence"]')).toBeNull();

            await clickButton('Show');
            expect(text('[data-testid="crypto-asset-evidence"] p')).toBe('Occurrences in urn:uuid:7c1e · v3');
            expect(all('[data-testid="crypto-asset-evidence"] [data-testid^="row-"]')).toHaveLength(50);
            expect(one('[data-testid="crypto-asset-evidence-capped-note"]')).not.toBeNull();

            await clickButton('Show');
            expect(all('[data-testid="crypto-asset-evidence"] [data-testid^="row-"]')).toHaveLength(37);
            expect(one('[data-testid="crypto-asset-evidence-capped-note"]')).toBeNull();

            await clickButton('Hide');
            expect(one('[data-testid="crypto-asset-evidence"]')).toBeNull();
        });

        // Every row's button says the same word, so the name has to carry the source, and the panel state has to
        // be announced rather than left to sighted reading of the table.
        test('the toggle names the source it opens and reports the panel it controls', async () => {
            await render(<CryptoAssetSources detail={detail()} />);

            const toggle = one('[data-testid="row-cbom-1"] button') as HTMLButtonElement;
            expect(toggle.getAttribute('aria-label')).toBe('Show occurrences in urn:uuid:7c1e');
            expect(toggle.getAttribute('aria-expanded')).toBe('false');
            expect(toggle.getAttribute('aria-controls')).toBe('crypto-asset-evidence-cbom-1');

            await clickButton('Show');

            const openToggle = one('[data-testid="row-cbom-1"] button') as HTMLButtonElement;
            expect(openToggle.getAttribute('aria-label')).toBe('Hide occurrences in urn:uuid:7c1e');
            expect(openToggle.getAttribute('aria-expanded')).toBe('true');
            expect(one('[data-testid="crypto-asset-evidence"]')?.id).toBe('crypto-asset-evidence-cbom-1');
        });

        // line, offset and symbol are all optional, so the location alone does not identify an occurrence.
        test('two occurrences recorded in one file with nothing else set both render', async () => {
            const twice = source({
                cbomUuid: 'cbom-3',
                serialNumber: 'urn:uuid:0003',
                occurrenceCount: 2,
                evidence: [{ location: 'src/tls/handshake.c' }, { location: 'src/tls/handshake.c' }],
            });
            await render(<CryptoAssetSources detail={detail({ sources: [twice] })} />);

            await clickButton('Show');

            const rows = all('[data-testid="crypto-asset-evidence"] [data-testid^="row-"]');
            expect(rows).toHaveLength(2);
            expect(new Set(rows.map((row) => row.getAttribute('data-testid'))).size).toBe(2);
        });

        test('a source count the API leaves out is read as zero, not thrown on', async () => {
            const countless = source({ cbomUuid: 'cbom-4', occurrenceCount: null as never, evidence: [] });
            await render(<CryptoAssetSources detail={detail({ sources: [countless] })} />);

            expect(text('[data-testid="row-cbom-4"] [data-testid="crypto-asset-evidence-coverage"]')).toBe('none recorded');
        });

        test('an asset with no visible source says so', async () => {
            await render(<CryptoAssetSources detail={detail({ sources: [] })} />);

            expect(text('[data-testid="crypto-asset-sources-empty"]')).toContain('No source CBOM you can see');
        });
    });

    describe('payloads', () => {
        test('a source that disagrees is shown beside the elected payload, with the disagreement listed', async () => {
            await render(<CryptoAssetPayloads detail={detail()} />);

            expect(text('[data-testid="crypto-asset-elected-payload"] pre')).toContain('"parameterSetIdentifier": "2048"');
            expect(text('[data-testid="crypto-asset-source-payload"] p')).toBe('As recorded by urn:uuid:a91b v1');
            expect(text('[data-testid="crypto-asset-source-payload"] pre')).not.toContain('parameterSetIdentifier');
            expect(all('[data-testid="crypto-asset-payload-difference"]').map((item) => item.textContent)).toEqual([
                'algorithmProperties.parameterSetIdentifier not recorded by this source',
            ]);
        });

        test('a source identical to the elected payload is reported as identical', async () => {
            await render(<CryptoAssetPayloads detail={detail({ sources: [source()] })} />);

            expect(one('[data-testid="crypto-asset-payload-identical"]')).not.toBeNull();
            expect(one('[data-testid="crypto-asset-payload-differences"]')).toBeNull();
        });

        test('picking another source swaps the compared pane and the difference list', async () => {
            await render(<CryptoAssetPayloads detail={detail()} />);
            // It opens on the source that disagrees, so the other one is the identical one.
            expect(text('[data-testid="crypto-asset-source-payload"] p')).toBe('As recorded by urn:uuid:a91b v1');

            await clickButton('urn:uuid:7c1e v3');

            expect(text('[data-testid="crypto-asset-source-payload"] p')).toBe('As recorded by urn:uuid:7c1e v3');
            expect(text('[data-testid="crypto-asset-source-payload"] pre')).toContain('"parameterSetIdentifier": "2048"');
            expect(one('[data-testid="crypto-asset-payload-identical"]')).not.toBeNull();
            expect(all('[data-testid="crypto-asset-payload-difference"]')).toHaveLength(0);
        });

        // Select's onChange is allowed to report a cleared selection, and there is no empty pane to fall back to.
        test('a cleared selection keeps the pane it was on', async () => {
            await render(<CryptoAssetPayloads detail={detail()} />);

            await clickButton('Clear');

            expect(text('[data-testid="crypto-asset-source-payload"] p')).toBe('As recorded by urn:uuid:a91b v1');
        });

        test('with no source served, the pane says there is none rather than blaming an empty payload', async () => {
            await render(<CryptoAssetPayloads detail={detail({ sources: [] })} />);

            const pane = text('[data-testid="crypto-asset-source-payload"]');
            expect(pane).toContain('No source payload to compare');
            expect(pane).not.toContain('This source recorded no payload');
        });

        test('with no elected payload served, the pane says so and no comparison is claimed', async () => {
            await render(<CryptoAssetPayloads detail={detail({ electedPayload: undefined })} />);

            expect(text('[data-testid="crypto-asset-elected-payload"]')).toContain('No elected payload is served');
            expect(one('[data-testid="crypto-asset-payload-identical"]')).toBeNull();
            expect(one('[data-testid="crypto-asset-payload-differences"]')).toBeNull();
        });
    });
});
