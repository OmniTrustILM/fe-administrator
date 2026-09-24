import { getEnumDescription, getEnumLabel } from 'ducks/enums';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import type { CryptographicAssetDto } from 'types/openapi';
import { CryptographicAssetType, PqcVerdict } from 'types/openapi';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { setupReactActEnvironment } from '../test-utils/reactActEnvironment';
import { buildCryptoAssetRows, CRYPTO_ASSET_HEADERS, QUARANTINE_TOOLTIP } from './cryptoAssetTableHelpers';

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

const build = (assets: CryptographicAssetDto[]) =>
    buildCryptoAssetRows(assets, { typeEnum, pqcVerdictEnum, getEnumLabel, getEnumDescription });

describe('CRYPTO_ASSET_HEADERS', () => {
    // Paging is served, so a client-side sort would reorder one page and present it as the estate's order; core also
    // answers 422 to any served sort while no field is marked sortable. Marking any header sortable breaks both.
    test('no header is sortable', () => {
        for (const header of CRYPTO_ASSET_HEADERS) {
            expect(header.sortable ?? false).toBe(false);
            expect(header.sort).toBeUndefined();
        }
    });

    test('the five list columns are present, in order', () => {
        expect(CRYPTO_ASSET_HEADERS.map((header) => header.id)).toEqual([
            'name',
            'type',
            'pqcVerdict',
            'sourceCbomCount',
            'occurrenceCount',
        ]);
    });

    // A producer can name an asset with a whole certificate subject; without the cap that one row widens the table.
    test('the name column caps its width, which is what turns the one-line clipping on', () => {
        expect(CRYPTO_ASSET_HEADERS.find((header) => header.id === 'name')?.maxWidth).toBeGreaterThan(0);
    });

    test('the two counts are right-aligned so their digits line up', () => {
        const counts = CRYPTO_ASSET_HEADERS.filter((header) => header.id.endsWith('Count'));

        expect(counts).toHaveLength(2);
        for (const header of counts) {
            expect(header.align).toBe('right');
        }
    });
});

describe('buildCryptoAssetRows', () => {
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
                                    <td key={CRYPTO_ASSET_HEADERS[index].id} data-testid={`cell-${CRYPTO_ASSET_HEADERS[index].id}`}>
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
        expect(row.columns).toHaveLength(CRYPTO_ASSET_HEADERS.length);
    });

    test('the name links to the asset detail page', async () => {
        await renderRow([asset()]);

        const link = cell('name').querySelector('a');

        expect(link?.textContent).toBe('RSA-2048');
        expect(link?.getAttribute('href')).toBe('/cryptoassets/detail/asset-1');
    });

    test('a long name is clipped to one line, with the full value left to the cell tooltip', async () => {
        await renderRow([asset({ name: 'A'.repeat(300) })]);

        const name = cell('name').querySelector('[data-testid="crypto-asset-name"]');

        expect(name?.textContent).toBe('A'.repeat(300));
        expect(name?.className).toContain('text-ellipsis');
        expect(name?.className).toContain('whitespace-nowrap');
    });

    test('the quarantine badge keeps its width while the name shrinks', async () => {
        await renderRow([asset({ quarantined: true })]);

        expect(cell('name').querySelector('[data-testid="crypto-asset-quarantined-badge"]')?.className).toContain('shrink-0');
    });

    test('type and verdict are labelled from the platform enums, not from the raw code', async () => {
        await renderRow([asset()]);

        expect(cell('type').textContent).toBe('Algorithm');
        expect(cell('pqcVerdict').textContent).toBe('Not PQC ready');
        expect(cell('pqcVerdict').querySelector('[data-testid="pqc-verdict-badge"]')?.classList.contains('bg-danger-surface')).toBe(true);
    });

    test('the verdict badge explains itself with the platform enum description', async () => {
        await renderRow([asset()]);

        expect(cell('pqcVerdict').querySelector('[data-testid="pqc-verdict-badge"]')?.getAttribute('title')).toBe(
            'The asset relies on cryptography a quantum computer breaks',
        );
    });

    test('an enum the platform has not loaded falls back to the code rather than rendering blank', async () => {
        const [row] = buildCryptoAssetRows([asset()], {
            typeEnum: undefined,
            pqcVerdictEnum: undefined,
            getEnumLabel,
            getEnumDescription,
        });
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

        expect(cell('sourceCbomCount').textContent).toBe('14');
        expect(cell('occurrenceCount').textContent).toBe((3412).toLocaleString());
    });

    test('a quarantined asset is flagged beside its name, with the contract sentence as the tooltip', async () => {
        await renderRow([asset({ quarantined: true })]);

        const badge = cell('name').querySelector('[data-testid="crypto-asset-quarantined-badge"]');

        expect(badge?.textContent).toBe('Quarantined');
        expect(badge?.getAttribute('title')).toBe(QUARANTINE_TOOLTIP);
        expect(badge?.classList.contains('bg-warning-surface')).toBe(true);
    });

    test('an ordinary asset carries no quarantine flag', async () => {
        await renderRow([asset()]);

        expect(cell('name').querySelector('[data-testid="crypto-asset-quarantined-badge"]')).toBeNull();
    });

    test('an empty page builds no rows', () => {
        expect(build([])).toEqual([]);
    });
});
