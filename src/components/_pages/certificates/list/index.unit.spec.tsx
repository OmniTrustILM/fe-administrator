import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import CertificateList from './index';
import { EntityType } from 'ducks/filters';
import certificatesReducer, { actions as certificatesActions, initialState as certificatesInitialState } from 'ducks/certificates';
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
    default: ({ pageHeader, refreshToken }: any) => (
        <div data-testid="paged-list" data-refresh-token={refreshToken}>
            {[pageHeader?.primaryAction, ...(pageHeader?.actions ?? [])].filter(Boolean).map((action: any) => (
                <button
                    key={action.id}
                    type="button"
                    title={action.label}
                    data-primary={action === pageHeader.primaryAction || undefined}
                    data-disabled-reason={action.disabled ? action.disabledReason : undefined}
                    disabled={action.disabled}
                    onClick={() => action.onClick(null)}
                >
                    {action.icon}
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

    it('offers Create as the primary action and the rest in the actions menu', async () => {
        await renderList();

        expect(container.querySelector('button[data-primary]')?.getAttribute('title')).toBe('Create');
        expect(container.querySelectorAll('button:not([data-primary])').length).toBeGreaterThan(0);
    });

    it('keeps bulk actions disabled, with a reason, until certificates are selected', async () => {
        await renderList();
        const overrideGroups = () => container.querySelector<HTMLButtonElement>('button[title="Override groups"]');
        expect(overrideGroups()?.disabled).toBe(true);
        expect(overrideGroups()?.dataset.disabledReason).toBe('Select one or more certificates');
        expect(container.querySelector<HTMLButtonElement>(`button[title="${IMPORT_ACTION}"]`)?.disabled).toBe(false);

        state = { ...state, pagings: { pagings: [{ entity: EntityType.CERTIFICATE, paging: { checkedRows: ['cert-1'] } }] } };
        await renderList();

        expect(overrideGroups()?.disabled).toBe(false);
    });

    it('renders no page header in the certificate picker', async () => {
        await act(async () => {
            root.render(<CertificateList selectCertsOnly hideWidgetButtons />);
        });

        expect(container.querySelector('button')).toBeNull();
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
