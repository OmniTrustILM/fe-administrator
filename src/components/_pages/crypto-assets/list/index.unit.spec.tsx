import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { CryptographicAssetType, PqcVerdict, Resource } from 'types/openapi';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { useDispatchMock, useSelectorMock } from '../../test-utils/reactReduxMockModule';
import CryptoAssetsList from './index';

setupReactActEnvironment();

vi.mock('react-redux', async () => {
    return await import('../../test-utils/reactReduxMockModule');
});

const pagedListProps = vi.hoisted(() => vi.fn());

vi.mock('components/PagedList/PagedList', () => ({
    default: (props: any) => {
        pagedListProps(props);
        const { configurableColumns } = props;
        return (
            <div>
                <div data-testid="headers">
                    {(configurableColumns?.standardColumns || []).map((column: any) => column.label ?? column.catalogueLabel).join('|')}
                </div>
                {(configurableColumns?.rows || []).map((row: any) => (
                    <div key={configurableColumns.getRowId(row)} data-testid={`row-${configurableColumns.getRowId(row)}`}>
                        {configurableColumns.standardColumns.map((column: any) => (
                            <span key={column.fieldIdentifier}>
                                {configurableColumns.registry?.[`${column.fieldSource}:${column.fieldIdentifier}`]?.(row)}
                            </span>
                        ))}
                    </div>
                ))}
            </div>
        );
    },
}));

const asset = {
    uuid: 'asset-1',
    name: 'RSA-2048',
    type: CryptographicAssetType.Algorithm,
    pqcVerdict: PqcVerdict.NotReady,
    sourceCbomCount: 14,
    occurrenceCount: 3412,
    quarantined: false,
};

function stateWith(assets: object[]) {
    return {
        cryptoAssets: { assetsData: { items: assets }, isFetchingList: false },
        enums: {
            platformEnums: {
                CryptographicAssetType: { [CryptographicAssetType.Algorithm]: { code: 'algorithm', label: 'Algorithm' } },
                PqcVerdict: { [PqcVerdict.NotReady]: { code: 'notReady', label: 'Not PQC ready' } },
            },
        },
    } as any;
}

describe('CryptoAssetsList', () => {
    let container: HTMLDivElement;
    let root: Root;
    let state: any;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        pagedListProps.mockClear();

        useDispatchMock.mockReturnValue(vi.fn());
        state = stateWith([asset]);
        useSelectorMock.mockImplementation((selector: any) => selector(state));
    });

    const render = async () => {
        await act(async () => {
            root.render(
                <MemoryRouter>
                    <CryptoAssetsList />
                </MemoryRouter>,
            );
        });
    };

    const lastProps = () => pagedListProps.mock.calls.at(-1)?.[0];

    it('opts into configurable columns for the crypto asset resource instead of passing fixed headers and rows', async () => {
        await render();

        expect(lastProps().configurableColumns.resource).toBe(Resource.CryptoAssets);
        expect(lastProps().headers).toBeUndefined();
        expect(lastProps().data).toBeUndefined();
    });

    it('shows the standard columns and renders each asset through the cell registry', async () => {
        await render();

        expect(container.querySelector('[data-testid="headers"]')?.textContent).toBe('Name|Type|PQC readiness|Source CBOMs|Occurrences');
        const row = container.querySelector('[data-testid="row-asset-1"]');
        expect(row?.textContent).toContain('RSA-2048');
        expect(row?.textContent).toContain('Algorithm');
        expect(row?.textContent).toContain('Not PQC ready');
        expect(row?.textContent).toContain((3412).toLocaleString());
    });

    // PagedList keys its listing effect on this object, so a fresh one each render would refetch without end.
    it('keeps the column configuration identical across a re-render with unchanged state', async () => {
        await render();
        const first = lastProps().configurableColumns;

        await render();

        expect(pagedListProps.mock.calls.length).toBeGreaterThan(1);
        expect(lastProps().configurableColumns).toBe(first);
    });

    it('hands PagedList the new rows when the listing changes', async () => {
        await render();

        state = stateWith([asset, { ...asset, uuid: 'asset-2', name: 'ML-KEM-768' }]);
        await render();

        expect(lastProps().configurableColumns.rows).toHaveLength(2);
        expect(container.querySelector('[data-testid="row-asset-2"]')?.textContent).toContain('ML-KEM-768');
    });
});
