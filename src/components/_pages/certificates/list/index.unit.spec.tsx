import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import CertificateList from './index';
import certificatesReducer, { actions as certificatesActions, initialState as certificatesInitialState } from 'ducks/certificates';
import { EntityType, actions as filterActions } from 'ducks/filters';
import { clickByText, clickByTitle } from '../../test-utils/domActions';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { useDispatchMock, useSelectorMock } from '../../test-utils/reactReduxMockModule';

setupReactActEnvironment();

vi.mock('react-redux', async () => {
    return await import('../../test-utils/reactReduxMockModule');
});

vi.mock('react-router', () => ({
    Link: ({ to, children }: any) => <a href={to}>{children}</a>,
    useNavigate: () => vi.fn(),
}));

vi.mock('components/PagedList/PagedList', () => ({
    default: ({ additionalButtons, refreshToken }: any) => (
        <div data-testid="paged-list" data-refresh-token={refreshToken}>
            {(additionalButtons || []).map((button: any) => (
                <button key={button.tooltip ?? button.icon} type="button" title={button.tooltip} onClick={button.onClick}>
                    {button.icon}
                </button>
            ))}
        </div>
    ),
}));

vi.mock('components/Dialog', async () => {
    const { dialogMockModule } = await import('../../test-utils/mockModules');
    return dialogMockModule();
});

vi.mock('../CertificateImportDialog', () => ({
    default: ({ onDone }: { onDone: () => void }) => (
        <button type="button" onClick={onDone}>
            Done
        </button>
    ),
}));

const IMPORT_ACTION = 'Import certificates and keys';

describe('CertificateList', () => {
    let state: any;
    let container: HTMLDivElement;
    let root: Root;

    const renderList = () =>
        act(async () => {
            root.render(<CertificateList />);
        });
    const importDialog = () => container.querySelector('[data-testid="dialog"]');
    const listRefreshToken = () => container.querySelector('[data-testid="paged-list"]')?.getAttribute('data-refresh-token');

    beforeEach(() => {
        state = {
            certificates: certificatesInitialState,
            pagings: { pagings: [] },
            filters: { filters: [] },
            enums: { platformEnums: {} },
            users: { users: [] },
        };
        useDispatchMock.mockReturnValue(vi.fn());
        useSelectorMock.mockImplementation((selector: any) => selector(state));
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    it('captions the upload action for the import dialog it opens', async () => {
        await renderList();

        expect(container.querySelector(`button[title="${IMPORT_ACTION}"]`)).not.toBeNull();
        expect(container.querySelector('button[title="Upload Certificate"]')).toBeNull();
    });

    it('refreshes once an import from its dialog succeeds, however the dialog is then closed', async () => {
        await renderList();
        await clickByTitle(container, IMPORT_ACTION);
        expect(importDialog()).not.toBeNull();
        expect(listRefreshToken()).toBe('0');

        state = {
            ...state,
            certificates: certificatesReducer(state.certificates, certificatesActions.importCertificatesSuccess({ results: [] })),
        };
        await renderList();
        await clickByText(container, 'toggle');

        expect(importDialog()).toBeNull();
        expect(listRefreshToken()).toBe('1');
    });

    it('takes the filters kept for a return from a certificate as it mounts', async () => {
        const dispatch = vi.fn();
        useDispatchMock.mockReturnValue(dispatch);

        await renderList();

        expect(dispatch).toHaveBeenCalledWith(filterActions.takePreservedFilters({ entity: EntityType.CERTIFICATE }));
    });

    it('leaves the filters kept for a return alone when mounted as a picker that ignores them', async () => {
        const dispatch = vi.fn();
        useDispatchMock.mockReturnValue(dispatch);

        await act(async () => {
            root.render(<CertificateList withPreservedFilters={false} />);
        });

        expect(dispatch).not.toHaveBeenCalledWith(filterActions.takePreservedFilters({ entity: EntityType.CERTIFICATE }));
    });

    it('keeps the import dialog open while an import runs', async () => {
        await renderList();
        await clickByTitle(container, IMPORT_ACTION);

        state = { ...state, certificates: { ...state.certificates, isImporting: true } };
        await renderList();
        await clickByText(container, 'toggle');

        expect(importDialog()).not.toBeNull();
    });
});
