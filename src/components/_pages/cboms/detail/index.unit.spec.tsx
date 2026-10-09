import { act } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import ThemeProvider from 'components/ThemeProvider';
import type { ComponentAssetLink } from 'utils/cbom-asset-links';
import { actions as customAttributeActions } from 'ducks/customAttributes';
import { actions as cbomActions } from 'ducks/cbom';
import { reducers } from 'ducks/reducers';
import type { AttributeResponseModel, CustomAttributeModel } from 'types/attributes';
import { AttributeContentType, AttributeType, AttributeVersion, Resource } from 'types/openapi';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import CbomDetail, { buildComponentRows } from './index';

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

describe('CBOM detail attributes', () => {
    const ownerAttribute: AttributeResponseModel = {
        uuid: 'owner-attribute',
        name: 'owner',
        label: 'Owner',
        type: AttributeType.Custom,
        contentType: AttributeContentType.String,
        version: AttributeVersion.V3,
        content: [{ data: 'Inventory team' }],
    };
    const ownerDescriptor: CustomAttributeModel = {
        ...ownerAttribute,
        version: 3,
        properties: {
            label: 'Owner',
            visible: true,
            readOnly: false,
            required: false,
            list: false,
            multiSelect: false,
            extensibleList: false,
        },
    };
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

    const render = async (customAttributes: AttributeResponseModel[]) => {
        const store = configureStore({ reducer: reducers });
        const dispatch = vi.spyOn(store, 'dispatch');
        await act(async () => {
            root.render(
                <Provider store={store}>
                    <ThemeProvider>
                        <MemoryRouter initialEntries={['/cboms/detail/cbom-v2?tab=attributes']}>
                            <Routes>
                                <Route path="/cboms/detail/:id" element={<CbomDetail />} />
                            </Routes>
                        </MemoryRouter>
                    </ThemeProvider>
                </Provider>,
            );
        });
        await act(async () => {
            store.dispatch(
                cbomActions.getCbomDetailSuccess({
                    detail: {
                        uuid: 'cbom-v2',
                        createdAt: '2026-10-09T00:00:00Z',
                        serialNumber: 'urn:cbom:example',
                        version: 2,
                        specVersion: '1.7',
                        content: { components: [] },
                        totalAssets: 0,
                        customAttributes,
                    } as never,
                }),
            );
        });
        await act(async () => new Promise((resolve) => setTimeout(resolve, 50)));
        await act(async () => {
            store.dispatch(customAttributeActions.listResourceCustomAttributesSuccess([ownerDescriptor]));
        });
        return { store, dispatch };
    };

    const selectTab = async (title: string) => {
        const tab = Array.from(container.querySelectorAll('[role="tab"]')).find((element) => element.textContent === title);
        expect(tab).toBeDefined();
        await act(async () => (tab as HTMLElement).click());
        await act(async () => new Promise((resolve) => setTimeout(resolve, 50)));
    };

    test('the attributes tab shows saved content and loads the editor for this CBOM version', async () => {
        const customAttributes = [ownerAttribute];
        const { dispatch } = await render(customAttributes);

        expect(container.textContent).toContain('Custom Attributes');
        expect(container.textContent).toContain('Inventory team');
        expect(dispatch).toHaveBeenCalledWith(customAttributeActions.listResourceCustomAttributes(Resource.Cboms));
        expect(dispatch).toHaveBeenCalledWith(
            customAttributeActions.loadCustomAttributeContent({
                resource: Resource.Cboms,
                resourceUuid: 'cbom-v2',
                customAttributes,
            }),
        );
    });

    test.each([
        { operation: 'add', before: [], after: [ownerAttribute] },
        { operation: 'edit', before: [ownerAttribute], after: [{ ...ownerAttribute, content: [{ data: 'Updated team' }] }] },
        { operation: 'remove', before: [ownerAttribute], after: [] },
    ])('keeps a successful attribute $operation after leaving and reopening the tab', async ({ operation, before, after }) => {
        const { store } = await render(before);
        if (before.length > 0) expect(container.textContent).toContain('Inventory team');
        await act(async () => {
            store.dispatch(
                (operation === 'remove'
                    ? customAttributeActions.removeCustomAttributeContentSuccess
                    : customAttributeActions.updateCustomAttributeContentSuccess)({
                    resource: Resource.Cboms,
                    resourceUuid: 'cbom-v2',
                    customAttributes: after,
                }),
            );
        });
        const expectSavedContent = () => {
            if (operation === 'remove') {
                expect(container.textContent).not.toContain('Inventory team');
            } else {
                expect(container.textContent).toContain(operation === 'edit' ? 'Updated team' : 'Inventory team');
            }
        };
        expectSavedContent();

        await selectTab('Raw JSON');
        expect(container.textContent).not.toContain('Custom Attributes');
        await selectTab('Attributes');
        await act(async () => {
            store.dispatch(customAttributeActions.listResourceCustomAttributesSuccess([ownerDescriptor]));
        });
        expect(container.textContent).toContain('Custom Attributes');
        expectSavedContent();
    });
});
