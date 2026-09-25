import { getEnumDescription, getEnumLabel } from 'ducks/enums';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import type { CryptographicAssetDto } from 'types/openapi';
import { CryptographicAssetType, PqcVerdict } from 'types/openapi';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { setupReactActEnvironment } from '../test-utils/reactActEnvironment';
import { buildTableRows } from 'components/CustomTable/columns';
import { buildColumnHeaders, getColumnHeading, getColumnKey } from 'utils/tableColumns';
import { buildCryptoAssetCellRegistry, CRYPTO_ASSET_COLUMNS, QUARANTINE_TOOLTIP } from './cryptoAssetTableHelpers';

setupReactActEnvironment();

const typeEnum = { [CryptographicAssetType.Algorithm]: { code: 'algorithm', label: 'Algorithm' } };
const pqcVerdictEnum = {
    [PqcVerdict.NotReady]: {
        code: 'notReady',
        label: 'Not PQC ready',
        description: 'The asset relies on cryptography a quantum computer breaks',
    },
};

const asset = (overrides: Partial<CryptographicAssetDto> = {}): CryptographicAssetDto => ({
    uuid: 'asset-1',
    name: 'RSA-2048',
    type: CryptographicAssetType.Algorithm,
    pqcVerdict: PqcVerdict.NotReady,
    sourceCbomCount: 14,
    occurrenceCount: 3412,
    quarantined: false,
    ...overrides,
});

const registry = buildCryptoAssetCellRegistry({ typeEnum, pqcVerdictEnum, getEnumLabel, getEnumDescription });

const build = (assets: CryptographicAssetDto[], cells = registry) =>
    buildTableRows(assets, CRYPTO_ASSET_COLUMNS, { getRowId: (asset) => asset.uuid, registry: cells });

const HEADERS = buildColumnHeaders(CRYPTO_ASSET_COLUMNS);
const header = (identifier: string) => HEADERS.find((candidate) => candidate.id === `property:${identifier}`);

describe('CRYPTO_ASSET_COLUMNS', () => {
    test('the standard set is the five columns the list always showed, in order', () => {
        expect(CRYPTO_ASSET_COLUMNS.map(getColumnKey)).toEqual([
            'property:CBOM_ASSET_NAME',
            'property:CBOM_ASSET_TYPE',
            'property:CBOM_ASSET_PQC_VERDICT',
            'property:CBOM_ASSET_SOURCE_COUNT',
            'property:CBOM_ASSET_OCCURRENCE_COUNT',
        ]);
    });

    test('the standard headings read as they did before the columns became configurable', () => {
        expect(CRYPTO_ASSET_COLUMNS.map(getColumnHeading)).toEqual(['Name', 'Type', 'PQC readiness', 'Source CBOMs', 'Occurrences']);
    });

    // Sortability comes from the catalogue, so a standard column claiming it would offer a sort core may refuse.
    test('no standard column declares its own sortability', () => {
        for (const column of CRYPTO_ASSET_COLUMNS) {
            expect(column.sortable).toBeUndefined();
        }
    });

    // A producer can name an asset with a whole certificate subject; without the cap that one row widens the table.
    test('the name column caps its width, which is what turns the one-line clipping on', () => {
        expect(header('CBOM_ASSET_NAME')?.maxWidth).toBeGreaterThan(0);
    });

    test('the two counts are right-aligned so their digits line up', () => {
        expect(header('CBOM_ASSET_SOURCE_COUNT')?.align).toBe('right');
        expect(header('CBOM_ASSET_OCCURRENCE_COUNT')?.align).toBe('right');
    });
});

describe('buildCryptoAssetCellRegistry', () => {
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

    const renderRow = async (assets: CryptographicAssetDto[]) => {
        const [row] = build(assets);
        await act(async () => {
            root.render(
                <MemoryRouter initialEntries={['/cryptoassets']}>
                    <table>
                        <tbody>
                            <tr>
                                {row.columns.map((cell, index) => (
                                    <td key={HEADERS[index].id} data-testid={`cell-${CRYPTO_ASSET_COLUMNS[index].fieldIdentifier}`}>
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </MemoryRouter>,
            );
        });
        return row;
    };

    const cell = (id: string) => container.querySelector(`[data-testid="cell-${id}"]`) as HTMLElement;

    test('a row is keyed by the asset uuid and carries one cell per column', async () => {
        const row = await renderRow([asset()]);

        expect(row.id).toBe('asset-1');
        expect(row.columns).toHaveLength(CRYPTO_ASSET_COLUMNS.length);
    });

    test('the name links to the asset detail page', async () => {
        await renderRow([asset()]);

        const link = cell('CBOM_ASSET_NAME').querySelector('a');

        expect(link?.textContent).toBe('RSA-2048');
        expect(link?.getAttribute('href')).toBe('/cryptoassets/detail/asset-1');
    });

    test('a long name is clipped to one line, with the full value left to the cell tooltip', async () => {
        await renderRow([asset({ name: 'A'.repeat(300) })]);

        const name = cell('CBOM_ASSET_NAME').querySelector('[data-testid="crypto-asset-name"]');

        expect(name?.textContent).toBe('A'.repeat(300));
        expect(name?.className).toContain('text-ellipsis');
        expect(name?.className).toContain('whitespace-nowrap');
    });

    test('the quarantine badge keeps its width while the name shrinks', async () => {
        await renderRow([asset({ quarantined: true })]);

        expect(cell('CBOM_ASSET_NAME').querySelector('[data-testid="crypto-asset-quarantined-badge"]')?.className).toContain('shrink-0');
    });

    test('type and verdict are labelled from the platform enums, not from the raw code', async () => {
        await renderRow([asset()]);

        expect(cell('CBOM_ASSET_TYPE').textContent).toBe('Algorithm');
        expect(cell('CBOM_ASSET_PQC_VERDICT').textContent).toBe('Not PQC ready');
        expect(
            cell('CBOM_ASSET_PQC_VERDICT').querySelector('[data-testid="pqc-verdict-badge"]')?.classList.contains('bg-danger-surface'),
        ).toBe(true);
    });

    test('the verdict badge explains itself with the platform enum description', async () => {
        await renderRow([asset()]);

        expect(cell('CBOM_ASSET_PQC_VERDICT').querySelector('[data-testid="pqc-verdict-badge"]')?.getAttribute('title')).toBe(
            'The asset relies on cryptography a quantum computer breaks',
        );
    });

    test('an enum the platform has not loaded falls back to the code rather than rendering blank', async () => {
        const [row] = build(
            [asset()],
            buildCryptoAssetCellRegistry({ typeEnum: undefined, pqcVerdictEnum: undefined, getEnumLabel, getEnumDescription }),
        );
        await act(async () => {
            root.render(
                <MemoryRouter>
                    <div>{row.columns}</div>
                </MemoryRouter>,
            );
        });

        expect(container.textContent).toContain(CryptographicAssetType.Algorithm);
        expect(container.textContent).toContain(PqcVerdict.NotReady);
    });

    test('counts are rendered with thousands separators', async () => {
        await renderRow([asset()]);

        expect(cell('CBOM_ASSET_SOURCE_COUNT').textContent).toBe('14');
        expect(cell('CBOM_ASSET_OCCURRENCE_COUNT').textContent).toBe((3412).toLocaleString());
    });

    test('a quarantined asset is flagged beside its name, with the contract sentence as the tooltip', async () => {
        await renderRow([asset({ quarantined: true })]);

        const badge = cell('CBOM_ASSET_NAME').querySelector('[data-testid="crypto-asset-quarantined-badge"]');

        expect(badge?.textContent).toBe('Quarantined');
        expect(badge?.getAttribute('title')).toBe(QUARANTINE_TOOLTIP);
        expect(badge?.classList.contains('bg-warning-surface')).toBe(true);
    });

    test('an ordinary asset carries no quarantine flag', async () => {
        await renderRow([asset()]);

        expect(cell('CBOM_ASSET_NAME').querySelector('[data-testid="crypto-asset-quarantined-badge"]')).toBeNull();
    });

    test('an empty page builds no rows', () => {
        expect(build([])).toEqual([]);
    });
});
