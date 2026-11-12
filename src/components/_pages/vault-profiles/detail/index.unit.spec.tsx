import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import VaultProfileDetail from './index';
import { PlatformEnum, Resource } from 'types/openapi';
import { COMMON_USERS_STATE } from '../../test-utils/mockModules';
import { clickByText, clickByTitle } from '../../test-utils/domActions';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { useDispatchMock, useSelectorMock } from '../../test-utils/reactReduxMockModule';

setupReactActEnvironment();

vi.mock('react-redux', async () => {
    return await import('../../test-utils/reactReduxMockModule');
});
vi.mock('utils/useActionAvailability', async () => {
    const { actionAvailabilityMockModule } = await import('../../test-utils/mockModules');
    return actionAvailabilityMockModule();
});

vi.mock('react-router', async () => {
    const { vaultProfileDetailRouterMockModule } = await import('../../test-utils/reactRouterMockModules');
    return vaultProfileDetailRouterMockModule;
});

vi.mock('components/Breadcrumb', () => ({
    default: ({ items }: any) => <div data-testid="breadcrumb">{items?.[1]?.label}</div>,
}));

vi.mock('components/Container', async () => {
    const { containerMockModule } = await import('../../test-utils/mockModules');
    return containerMockModule();
});

vi.mock('components/Widget', async () => {
    const { widgetMockModule } = await import('../../test-utils/mockModules');
    return widgetMockModule();
});

vi.mock('components/CustomTable', async () => {
    const { customTableMockModule } = await import('../../test-utils/mockModules');
    return customTableMockModule();
});

vi.mock('components/WidgetButtons', async () => {
    const { widgetButtonsMockModule } = await import('../../test-utils/mockModules');
    return widgetButtonsMockModule();
});

vi.mock('components/Attributes/AttributeViewer', () => ({
    default: () => <div data-testid="attributes">attributes</div>,
}));

vi.mock('components/Attributes/CustomAttributeWidget', () => ({
    default: () => <div data-testid="custom-attributes">custom-attributes</div>,
}));

vi.mock('components/Badge', async () => {
    const { badgeMockModule } = await import('../../test-utils/mockModules');
    return badgeMockModule();
});

vi.mock('../edit-form', () => ({
    default: () => <div data-testid="edit-form">edit-form</div>,
}));

vi.mock('../AssociateComplianceProfileDialogBody', () => ({
    default: () => <div data-testid="associate-compliance-dialog-body">associate-compliance-dialog-body</div>,
}));

vi.mock('components/Dialog', async () => {
    const { dialogMockModule } = await import('../../test-utils/mockModules');
    return dialogMockModule();
});

describe('VaultProfileDetail compliance integration', () => {
    let container: HTMLDivElement;
    let root: Root;
    let dispatch: ReturnType<typeof vi.fn>;
    let state: any;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);

        dispatch = vi.fn();
        useDispatchMock.mockReturnValue(dispatch);

        state = {
            vaultProfiles: {
                vaultProfile: {
                    uuid: 'vp-1',
                    name: 'Vault Profile One',
                    description: 'desc',
                    enabled: true,
                    vaultInstance: { uuid: 'vault-1', name: 'Vault One' },
                    attributes: [],
                    customAttributes: [],
                },
                isFetchingDetail: false,
                isEnabling: false,
                isDisabling: false,
                isDeleting: false,
            },
            complianceProfiles: {
                associatedComplianceProfiles: [{ uuid: 'cp-1', name: 'Compliance A', description: 'A' }],
                isFetchingAssociatedComplianceProfiles: false,
            },
            approvalProfiles: {
                associatedApprovalProfiles: [{ uuid: 'ap-1', name: 'Approval A', description: 'A', expiry: 24 }],
                isFetchingAssociatedApprovalProfiles: false,
            },
            users: COMMON_USERS_STATE,
            enums: {
                platformEnums: {
                    [PlatformEnum.Resource]: {
                        [Resource.VaultProfiles]: { label: 'Vault Profiles' },
                    },
                },
            },
        } as any;

        useSelectorMock.mockImplementation((selector: any) => selector(state));
    });

    it('dispatches compliance check action when check is confirmed', async () => {
        await act(async () => {
            root.render(<VaultProfileDetail />);
        });

        await clickByTitle(container, 'Check Compliance');
        await clickByText(container, 'Yes');

        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'complianceProfiles/checkResourceObjectCompliance',
                payload: { resource: Resource.VaultProfiles, objectUuid: 'vp-1' },
            }),
        );
    });

    it('dispatches dissociate compliance profile action from compliance widget row', async () => {
        await act(async () => {
            root.render(<VaultProfileDetail />);
        });

        await clickByTitle(container, 'Remove');

        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'complianceProfiles/dissociateComplianceProfile',
                payload: {
                    uuid: 'cp-1',
                    resource: Resource.VaultProfiles,
                    associationObjectUuid: 'vp-1',
                },
            }),
        );
    });

    it('dispatches initial detail and associated compliance profile fetch actions', async () => {
        await act(async () => {
            root.render(<VaultProfileDetail />);
        });

        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'vaultProfiles/resetState' }));
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'vaultProfiles/getVaultProfileDetail' }));
        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'complianceProfiles/getAssociatedComplianceProfiles',
                payload: {
                    resource: Resource.VaultProfiles,
                    associationObjectUuid: 'vp-1',
                },
            }),
        );
    });

    it('opens associate and edit dialogs and dispatches disable and delete actions', async () => {
        await act(async () => {
            root.render(<VaultProfileDetail />);
        });

        await clickByTitle(container, 'Associate Compliance Profile');
        expect(container.textContent).toContain('Associate Compliance Profile');

        await clickByTitle(container, 'Edit');
        expect(container.textContent).toContain('Edit Vault Profile');

        await clickByTitle(container, 'Disable');
        await clickByTitle(container, 'Delete');
        await clickByText(container, 'Delete');

        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'vaultProfiles/disableVaultProfile' }));
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'vaultProfiles/deleteVaultProfile' }));
    });

    it('dispatches enable action when profile is disabled', async () => {
        state.vaultProfiles.vaultProfile.enabled = false;

        await act(async () => {
            root.render(<VaultProfileDetail />);
        });

        await clickByTitle(container, 'Enable');

        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'vaultProfiles/enableVaultProfile' }));
    });
});
