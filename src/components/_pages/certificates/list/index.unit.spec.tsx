import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import CertificateList from './index';
import certificatesReducer, { actions as certificatesActions, initialState as certificatesInitialState } from 'ducks/certificates';
import { clickByText, clickByTitle } from '../../test-utils/domActions';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { useDispatchMock, useSelectorMock } from '../../test-utils/reactReduxMockModule';

setupReactActEnvironment();

const AVAILABLE = { available: true, hidden: false, loading: false };
const availability = vi.hoisted(() => ({ onlyOnObjects: false }));

vi.mock('utils/useActionAvailability', () => ({
    useActionAvailability: () => (_action: string, options?: { onObjects?: boolean }) =>
        !availability.onlyOnObjects || options?.onObjects
            ? AVAILABLE
            : { available: false, hidden: false, loading: false, reason: 'denied' },
}));

vi.mock('react-redux', async () => {
    return await import('../../test-utils/reactReduxMockModule');
});

vi.mock('react-router', () => ({
    Link: ({ to, children }: any) => <a href={to}>{children}</a>,
    useNavigate: () => vi.fn(),
}));

vi.mock('components/PagedList/PagedList', () => ({
    default: ({ additionalButtons, refreshToken, deleteRequires }: any) => (
        <div data-testid="paged-list" data-refresh-token={refreshToken}>
            {[...(additionalButtons || []), { tooltip: 'Delete', icon: 'trash', requires: deleteRequires }].map((button: any) => (
                <button
                    key={button.tooltip ?? button.icon}
                    type="button"
                    title={button.tooltip}
                    aria-disabled={button.requires ? !button.requires.available : undefined}
                    onClick={button.onClick}
                >
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
        availability.onlyOnObjects = false;
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

    it('keeps the import dialog open while an import runs', async () => {
        await renderList();
        await clickByTitle(container, IMPORT_ACTION);

        state = { ...state, certificates: { ...state.certificates, isImporting: true } };
        await renderList();
        await clickByText(container, 'toggle');

        expect(importDialog()).not.toBeNull();
    });

    it.each(['Override Groups', 'Override Owner', 'Override RA Profile', 'Archive', 'Unarchive', 'Delete'])(
        'offers %s on the selection when only object access, such as ownership, allows it',
        async (tooltip) => {
            availability.onlyOnObjects = true;
            await renderList();

            expect(container.querySelector(`button[title="${tooltip}"]`)?.getAttribute('aria-disabled')).toBe('false');
        },
    );
});
