import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import CredentialList from './index';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { useDispatchMock, useSelectorMock } from '../../test-utils/reactReduxMockModule';

setupReactActEnvironment();

vi.mock('react-redux', async () => {
    return await import('../../test-utils/reactReduxMockModule');
});

vi.mock('react-router', async () => {
    const { listRouterMockModule } = await import('../../test-utils/reactRouterMockModules');
    return listRouterMockModule;
});

vi.mock('components/Badge', async () => {
    const { badgeMockModule } = await import('../../test-utils/mockModules');
    return badgeMockModule();
});

vi.mock('components/Widget', async () => {
    const { widgetMockModule } = await import('../../test-utils/mockModules');
    return widgetMockModule();
});

vi.mock('components/CustomTable', async () => {
    const { customTableMockModule } = await import('../../test-utils/mockModules');
    return customTableMockModule();
});

vi.mock('components/Dialog', async () => {
    const { dialogMockModule } = await import('../../test-utils/mockModules');
    return dialogMockModule();
});

vi.mock('../form', () => ({
    default: () => <div data-testid="credential-form">form</div>,
}));

describe('CredentialList credential provider cell', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);

        useDispatchMock.mockReturnValue(vi.fn());

        const state = {
            credentials: {
                checkedRows: [],
                credentials: [
                    {
                        uuid: 'cred-1',
                        name: 'Credential With Provider',
                        kind: 'Basic',
                        connectorName: 'Common-Credential-Connector',
                        connectorUuid: 'conn-1',
                    },
                    {
                        uuid: 'cred-2',
                        name: 'Credential Without Provider Uuid',
                        kind: 'Basic',
                        connectorName: 'Common-Credential-Connector',
                        connectorUuid: undefined,
                    },
                ],
                isFetchingList: false,
                isDeleting: false,
                isBulkDeleting: false,
                isCreating: false,
                createCredentialSucceeded: false,
                isUpdating: false,
                updateCredentialSucceeded: false,
            },
        } as unknown as Parameters<typeof useSelectorMock>[0];

        useSelectorMock.mockImplementation((selector: (state: unknown) => unknown) => selector(state));
    });

    it('links the provider when the connector uuid is known', async () => {
        await act(async () => {
            root.render(<CredentialList />);
        });

        const link = container.querySelector('[data-testid="row-cred-1"] a[href="/connectors/detail/conn-1"]');
        expect(link?.textContent).toBe('Common-Credential-Connector');
    });

    it('renders the provider as plain text when the connector uuid is missing', async () => {
        await act(async () => {
            root.render(<CredentialList />);
        });

        const row = container.querySelector('[data-testid="row-cred-2"]');
        expect(row?.textContent).toContain('Common-Credential-Connector');
        expect(row?.innerHTML).not.toContain('undefined');
        expect(row?.querySelectorAll('a')).toHaveLength(1); // the name column only
    });
});
