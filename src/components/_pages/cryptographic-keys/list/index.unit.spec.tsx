import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import CryptographicKeyList from './index';
import certificatesReducer, { actions as certificatesActions, initialState as certificatesInitialState } from 'ducks/certificates';
import { initialState as keysInitialState } from 'ducks/cryptographic-keys';
import { InspectedEntryKind } from 'types/openapi';
import { clickByText, clickByTitle } from '../../test-utils/domActions';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { useDispatchMock, useSelectorMock } from '../../test-utils/reactReduxMockModule';

setupReactActEnvironment();

vi.mock('react-redux', async () => {
    return await import('../../test-utils/reactReduxMockModule');
});

vi.mock('components/PagedList/PagedList', () => ({
    default: ({ additionalButtons, refreshToken }: any) => (
        <div data-testid="paged-list" data-refresh-token={refreshToken}>
            {additionalButtons.map((button: any) => (
                <button key={button.tooltip} type="button" title={button.tooltip} onClick={button.onClick} />
            ))}
        </div>
    ),
}));

vi.mock('components/Dialog', async () => {
    const { dialogMockModule } = await import('../../test-utils/mockModules');
    return dialogMockModule();
});

vi.mock('../form', () => ({ default: () => null }));

describe('CryptographicKeyList', () => {
    let state: any;
    let container: HTMLDivElement;
    let root: Root;

    const renderList = () =>
        act(async () => {
            root.render(<CryptographicKeyList />);
        });
    const listRefreshToken = () => container.querySelector('[data-testid="paged-list"]')?.getAttribute('data-refresh-token');
    const createKeyDialog = () =>
        Array.from(container.querySelectorAll('[data-testid="dialog"]')).find((dialog) => dialog.textContent?.includes('Create Key'));

    beforeEach(() => {
        state = {
            cryptographicKeys: keysInitialState,
            certificates: { ...certificatesInitialState, isImporting: true },
            pagings: { pagings: [] },
            enums: { platformEnums: {} },
        };
        useDispatchMock.mockReturnValue(vi.fn());
        useSelectorMock.mockImplementation((selector: any) => selector(state));
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    it('refreshes as soon as an import from its Create Key dialog succeeds, however the dialog is then closed', async () => {
        await renderList();
        expect(listRefreshToken()).toBe('0');

        const results = [{ entryReference: 'a'.repeat(64), kind: InspectedEntryKind.PrivateKey, imported: true, keyUuid: 'key-1' }];
        state = {
            ...state,
            certificates: certificatesReducer(state.certificates, certificatesActions.importCertificatesSuccess({ results })),
        };
        await renderList();

        expect(listRefreshToken()).toBe('1');
    });

    it('keeps the Create Key dialog open while an import from it runs', async () => {
        await renderList();
        await clickByTitle(container, 'Create Key');
        expect(createKeyDialog()).toBeDefined();

        await clickByText(container, 'toggle');
        expect(createKeyDialog()).toBeDefined();

        state = { ...state, certificates: { ...state.certificates, isImporting: false } };
        await renderList();
        await clickByText(container, 'toggle');
        expect(createKeyDialog()).toBeUndefined();
    });

    it('does not refresh for an import that was refused', async () => {
        await renderList();

        state = {
            ...state,
            certificates: certificatesReducer(state.certificates, certificatesActions.importCertificatesFailure({ error: 'err' })),
        };
        await renderList();

        expect(listRefreshToken()).toBe('0');
    });
});
