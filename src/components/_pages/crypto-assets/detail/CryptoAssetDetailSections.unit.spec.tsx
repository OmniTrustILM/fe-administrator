import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import type { CryptographicAssetDetailDto, CryptographicAssetSourceDto } from 'types/openapi';
import { CryptographicAssetType, PqcVerdict } from 'types/openapi';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import {
    CryptoAssetIdentity,
    CryptoAssetPayloads,
    CryptoAssetSources,
    CryptoAssetSummary,
    CryptoAssetVerdict,
} from './CryptoAssetDetailSections';

setupReactActEnvironment();

vi.mock('components/CustomTable', async () => {
    const { customTableMockModule } = await import('../../test-utils/mockModules');
    return customTableMockModule();
});
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
        ruleSetVersion: 4,
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
        test('shows the deciding rule, its reason, the fields it read and the rule-set version', async () => {
            await render(<CryptoAssetVerdict detail={detail()} verdictLabel="Not PQC ready" />);

            expect(text('[data-testid="row-ruleSet"]')).toBe('Rule setv4');
            expect(text('[data-testid="row-rule"]')).toContain('CLASSICAL-SHOR');
            expect(text('[data-testid="row-reason"]')).toContain('Security rests on factorisation');
            expect(text('[data-testid="row-evaluatedFields"]')).toContain('algorithmFamily = RSA');
        });

        test('an asset the rule set has not evaluated yet says so instead of throwing on the missing block', async () => {
            await render(<CryptoAssetVerdict detail={detail({ verdict: undefined as never })} verdictLabel="Not PQC ready" />);

            expect(text('[data-testid="crypto-asset-verdict-pending"]')).toContain('Not evaluated yet');
            expect(one('[data-testid="row-rule"]')).toBeNull();
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
