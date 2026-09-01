import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AttributeContentType, FilterFieldSource } from 'types/openapi';
import type { ColumnDefinition } from 'types/tableColumns';
import type { CellRegistry } from './registry';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// The cell primitives are exercised in the browser by the component tests; here the subject is the
// resolution order, so they are stubbed down to something the assertions can read.
vi.mock('./EmptyCell', () => ({ default: () => <span data-testid="empty">empty</span> }));
vi.mock('./AttributeCell', () => ({
    default: ({ contentType, content }: { contentType?: string; content?: { data: unknown }[] }) => (
        <span data-testid="attribute">{`${contentType}:${content?.map((item) => String(item.data)).join('|') ?? 'none'}`}</span>
    ),
}));

const { buildTableRows, renderCell } = await import('./buildTableRows');

interface Row {
    uuid: string;
    commonName?: string;
    attributeValues?: Record<string, Record<string, { data: unknown }[]>>;
}

const commonName: ColumnDefinition = {
    fieldSource: FilterFieldSource.Property,
    fieldIdentifier: 'COMMON_NAME',
    catalogueLabel: 'Common Name',
};

const costCentre: ColumnDefinition = {
    fieldSource: FilterFieldSource.Custom,
    fieldIdentifier: 'costCentre',
    catalogueLabel: 'Cost centre',
    attributeContentType: AttributeContentType.Integer,
};

const registry: CellRegistry<Row> = {
    'property:COMMON_NAME': (row) => row.commonName,
};

describe('renderCell', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    const render = async (row: Row, column: ColumnDefinition, cellRegistry?: CellRegistry<Row>) => {
        await act(async () => {
            root.render(<>{renderCell(row, column, cellRegistry)}</>);
        });
    };

    it('prefers the registry entry over the attribute renderer', async () => {
        await render({ uuid: 'u-1', commonName: 'api.acme.test' }, commonName, registry);

        expect(container.textContent).toBe('api.acme.test');
        expect(container.querySelector('[data-testid="attribute"]')).toBeNull();
    });

    it('falls through to the attribute renderer when no entry is registered', async () => {
        await render({ uuid: 'u-1', attributeValues: { custom: { costCentre: [{ data: 4820 }] } } }, costCentre, registry);

        expect(container.querySelector('[data-testid="attribute"]')?.textContent).toBe('integer:4820');
    });

    it('falls through when no registry is supplied at all', async () => {
        await render({ uuid: 'u-1', commonName: 'api.acme.test' }, commonName);

        expect(container.querySelector('[data-testid="attribute"]')?.textContent).toBe('undefined:none');
    });

    it('renders the empty state when the registry entry has nothing to show', async () => {
        for (const blank of [undefined, null, '']) {
            await render({ uuid: 'u-1' }, commonName, { 'property:COMMON_NAME': () => blank });
            expect(container.querySelector('[data-testid="empty"]')).not.toBeNull();
        }
    });

    it('keeps a registry entry that renders a falsy but meaningful value', async () => {
        await render({ uuid: 'u-1' }, commonName, { 'property:COMMON_NAME': () => 0 });

        expect(container.textContent).toBe('0');
        expect(container.querySelector('[data-testid="empty"]')).toBeNull();
    });

    it('passes the column to the registry entry, so one entry can serve several columns', async () => {
        await render({ uuid: 'u-1' }, commonName, { 'property:COMMON_NAME': (_row, column) => column.catalogueLabel });

        expect(container.textContent).toBe('Common Name');
    });
});

describe('buildTableRows', () => {
    const rows: Row[] = [
        { uuid: 'u-1', commonName: 'api.acme.test', attributeValues: { custom: { costCentre: [{ data: 4820 }] } } },
        { uuid: 'u-2', commonName: 'vpn.acme.test' },
    ];

    it('builds one row per entry, keyed by the id the caller derives', () => {
        const built = buildTableRows(rows, [commonName], { getRowId: (row) => row.uuid, registry });

        expect(built.map((row) => row.id)).toEqual(['u-1', 'u-2']);
    });

    it('builds one cell per column, in the order the columns are given', () => {
        const built = buildTableRows(rows, [costCentre, commonName], { getRowId: (row) => row.uuid, registry });

        expect(built[0].columns).toHaveLength(2);
    });

    it('returns no rows for no entries', () => {
        expect(buildTableRows([], [commonName], { getRowId: (row: Row) => row.uuid })).toEqual([]);
    });

    it('returns a cell-less row for no columns', () => {
        expect(buildTableRows(rows, [], { getRowId: (row) => row.uuid })).toEqual([
            { id: 'u-1', columns: [] },
            { id: 'u-2', columns: [] },
        ]);
    });

    it('attaches row options only where the caller produced them', () => {
        const built = buildTableRows(rows, [commonName], {
            getRowId: (row) => row.uuid,
            registry,
            rowOptions: (row) => (row.uuid === 'u-1' ? { useAccentBottomBorder: true } : undefined),
        });

        expect(built[0].options).toEqual({ useAccentBottomBorder: true });
        expect(built[1]).not.toHaveProperty('options');
    });
});
