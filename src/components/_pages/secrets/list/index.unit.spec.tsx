import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import SecretsList from './index';
import { EntityType } from 'ducks/filters';
import { COMMON_GROUPS_STATE, COMMON_USERS_STATE, COMMON_VAULT_PROFILES_STATE } from '../../test-utils/mockModules';
import { clickByText, clickByTitle } from '../../test-utils/domActions';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { useDispatchMock, useSelectorMock } from '../../test-utils/reactReduxMockModule';
import {
    expectSecretOwnerGroupVaultDispatchCalls,
    runSecretOwnerGroupVaultUpdateActions,
} from '../../test-utils/secretOwnerGroupVaultActions';

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

vi.mock('components/_pages/certificates/CertificateStatus', () => ({
    default: ({ status }: any) => <span data-testid="compliance-status">{status}</span>,
}));

vi.mock('components/PagedList/PagedList', () => ({
    default: ({ headers, data, additionalButtons, onDeleteCallback }: any) => (
        <div>
            <div data-testid="headers">{headers.map((h: any) => h.content).join('|')}</div>
            <div data-testid="rows">
                {(data || []).map((row: any) => (
                    <div key={row.id} data-testid={`row-${row.id}`}>
                        {(row.columns || []).map((column: any, index: number) => (
                            <span key={`${row.id}-col-${index}`}>{column}</span>
                        ))}
                    </div>
                ))}
            </div>
            {(additionalButtons || []).map((button: any) => (
                <button key={button.tooltip} title={button.tooltip} onClick={button.onClick} disabled={button.disabled}>
                    {button.icon}
                </button>
            ))}
            <button title="Delete Selected" onClick={() => onDeleteCallback(['sec-1'])}>
                delete-selected
            </button>
        </div>
    ),
}));

vi.mock('components/Dialog', async () => {
    const { dialogMockModule } = await import('../../test-utils/mockModules');
    return dialogMockModule();
});

vi.mock('components/Select', async () => {
    const { createSelectMockModule } = await import('../../test-utils/mockModules');
    return createSelectMockModule({ 'secret-vault-profile': 'vp-2' });
});

vi.mock('components/Container', async () => {
    const { containerMockModule } = await import('../../test-utils/mockModules');
    return containerMockModule();
});

vi.mock('../form', () => ({
    default: () => <div data-testid="secret-form">form</div>,
}));

vi.mock('../SecretStateBadge', () => ({
    default: ({ children }: any) => <span>{children}</span>,
}));

describe('SecretsList compliance integration', () => {
    let container: HTMLDivElement;
    let root: Root;
    let dispatch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);

        dispatch = vi.fn();
        useDispatchMock.mockReturnValue(dispatch);

        const state = {
            secrets: {
                secrets: [
                    {
                        uuid: 'sec-1',
                        name: 'Secret One',
                        type: 'password',
                        state: 'active',
                        enabled: true,
                        complianceStatus: 'ok',
                        sourceVaultProfile: { uuid: 'vp-1', name: 'Vault Profile One' },
                        version: 1,
                        owner: { uuid: 'owner-1', name: 'Owner 1' },
                        groups: [],
                    },
                ],
                isFetchingList: false,
                isDeleting: false,
                isUpdating: false,
            },
            pagings: {
                pagings: [
                    {
                        entity: EntityType.SECRET,
                        paging: {
                            checkedRows: ['sec-1'],
                            pageNumber: 1,
                            pageSize: 10,
                            totalItems: 1,
                            isFetchingList: false,
                        },
                    },
                ],
            },
            enums: {
                platformEnums: {
                    SecretType: { password: { label: 'Password' } },
                    SecretState: { active: { label: 'Active' } },
                },
            },
            users: COMMON_USERS_STATE,
            certificateGroups: COMMON_GROUPS_STATE,
            vaultProfiles: COMMON_VAULT_PROFILES_STATE,
        } as any;

        useSelectorMock.mockImplementation((selector: any) => selector(state));
    });

    it('shows Compliance column and renders compliance status cell', async () => {
        await act(async () => {
            root.render(<SecretsList />);
        });

        expect(container.querySelector('[data-testid="headers"]')?.textContent).toContain('Compliance');
        expect(container.querySelector('[data-testid="row-sec-1"]')?.textContent).toContain('ok');
        expect(container.querySelector('[data-testid="row-sec-1"]')?.textContent).toContain('Vault Profile One');
    });

    it('dispatches enable, disable and delete actions for selected secrets', async () => {
        await act(async () => {
            root.render(<SecretsList />);
        });

        await clickByTitle(container, 'Enable selected Secrets');
        await clickByText(container, 'Enable');
        await clickByTitle(container, 'Disable selected Secrets');
        await clickByText(container, 'Disable');
        await clickByTitle(container, 'Delete Selected');

        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'secrets/enableSecret' }));
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'secrets/disableSecret' }));
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'secrets/deleteSecret' }));
    });

    it('dispatches owner, groups and vault profile override actions', async () => {
        await act(async () => {
            root.render(<SecretsList />);
        });

        await runSecretOwnerGroupVaultUpdateActions(container, {
            ownerTitle: 'Override Owner',
            ownerSelectTestId: 'select-secret-owner',
            groupsTitle: 'Override Groups',
            groupsSelectTestId: 'select-secret-groups-update',
            sourceVaultTitle: 'Override Source Vault Profile',
            sourceVaultSelectTestId: 'select-secret-vault-profile',
        });

        expectSecretOwnerGroupVaultDispatchCalls(dispatch, {
            uuid: 'sec-1',
            sourceVaultProfileUuid: 'vp-2',
        });
    });
});
