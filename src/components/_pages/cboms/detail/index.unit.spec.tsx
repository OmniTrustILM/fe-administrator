import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import type { ComponentAssetLink } from 'utils/cbom-asset-links';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { buildComponentRows } from './index';

setupReactActEnvironment();

const components = [
    { name: 'RSA-2048', 'bom-ref': 'rsa', cryptoProperties: { assetType: 'algorithm', algorithmProperties: { primitive: 'pke' } } },
    {
        name: 'AES-256',
        'bom-ref': 'aes',
        cryptoProperties: { assetType: 'algorithm' },
        evidence: { occurrences: [{ location: 'src/a.c' }] },
    },
    { name: { text: 'odd name' }, 'bom-ref': 'odd', cryptoProperties: { assetType: 'protocol' } },
];

const links: Record<string, ComponentAssetLink> = {
    rsa: { assetUuid: 'asset-rsa' },
    aes: { unlinked: 'noInventoryAsset' },
};
const resolveLink = (component: { 'bom-ref'?: string }) => links[component['bom-ref'] ?? ''];

// Both tables have five cells a row; only the middle three change places between them.
const CELLS = ['name', 'second', 'third', 'fourth', 'action'] as const;

describe('CBOM detail component rows', () => {
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

    const renderRows = async (view: 'assets' | 'overview', onDetail = vi.fn(), resolve: typeof resolveLink = resolveLink) => {
        const rows = buildComponentRows(components as never, onDetail, resolve as never, view);
        await act(async () => {
            root.render(
                <MemoryRouter>
                    <table>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={String(row.id)} data-testid={`row-${row.id}`}>
                                    {CELLS.map((cell, position) => (
                                        <td key={cell}>{row.columns[position]}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </MemoryRouter>,
            );
        });
        return rows;
    };

    const cells = (rowId: string) => Array.from(container.querySelectorAll(`[data-testid="row-${rowId}"] td`));

    test.each(['assets', 'overview'] as const)('the %s table links a resolved row and states why another is not linked', async (view) => {
        await renderRows(view);

        const linked = cells('rsa')[0];
        expect(linked.querySelector('a')?.getAttribute('href')).toBe('/cryptoassets/detail/asset-rsa');
        expect(linked.querySelector('a')?.textContent).toBe('RSA-2048');

        const unlinked = cells('aes')[0];
        expect(unlinked.querySelector('a')).toBeNull();
        expect(unlinked.textContent).toContain('AES-256');
        expect(unlinked.querySelector('[data-testid="cbom-asset-unlinked-reason"]')?.textContent).toContain('Not linked');
    });

    test('a row the record has no link state for shows its name alone', async () => {
        await renderRows('assets');

        const plain = cells('odd')[0];
        expect(plain.querySelector('a')).toBeNull();
        expect(plain.querySelector('[data-testid="cbom-asset-unlinked-reason"]')).toBeNull();
    });

    test('a name that is not text is rendered as a cell value rather than handed to React as an object', async () => {
        await renderRows('assets');

        expect(cells('odd')[0].textContent).toBe('{"text":"odd name"}');
    });

    test('keeps each table in its own column order', async () => {
        await renderRows('assets');
        expect(cells('aes').map((cell) => cell.textContent)).toEqual([expect.stringContaining('AES-256'), 'src/a.c', 'algorithm', '-', '']);

        await renderRows('overview');
        expect(cells('aes').map((cell) => cell.textContent)).toEqual([expect.stringContaining('AES-256'), 'algorithm', '-', 'src/a.c', '']);
    });

    test('the document JSON dialog stays one click away from a linked row', async () => {
        const onDetail = vi.fn();
        await renderRows('assets', onDetail);

        await act(async () => {
            cells('rsa')[4].querySelector('button')?.click();
        });

        expect(onDetail).toHaveBeenCalledWith('RSA-2048', components[0]);
    });
});
