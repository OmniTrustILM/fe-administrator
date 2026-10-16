import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { actions as tokenProfilesActions, initialState } from 'ducks/token-profiles';
import { KeyUsage } from 'types/openapi';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { useDispatchMock, useSelectorMock } from '../../test-utils/reactReduxMockModule';
import TokenProfileList from './index';

setupReactActEnvironment();

vi.mock('react-redux', async () => await import('../../test-utils/reactReduxMockModule'));
vi.mock('react-router', async () => {
    const { listRouterMockModule } = await import('../../test-utils/reactRouterMockModules');
    return listRouterMockModule;
});
vi.mock('utils/common-hooks', () => ({ useRunOnSuccessfulFinish: () => undefined }));
vi.mock('components/CustomTable', async () => {
    const { customTableMockModule } = await import('../../test-utils/mockModules');
    return customTableMockModule();
});
vi.mock('components/Dialog', async () => {
    const { dialogMockModule } = await import('../../test-utils/mockModules');
    return dialogMockModule();
});
vi.mock('components/Widget', async () => {
    const { widgetMockModule } = await import('../../test-utils/mockModules');
    return widgetMockModule();
});
vi.mock('components/Select', async () => {
    const { optionListSelectMockModule } = await import('../../test-utils/mockModules');
    return optionListSelectMockModule();
});
vi.mock('components/Badge', async () => {
    const { badgeMockModule } = await import('../../test-utils/mockModules');
    return badgeMockModule();
});
vi.mock('components/StatusBadge', () => ({ default: () => null }));
vi.mock('components/_pages/tokens/TokenStatusBadge', () => ({ default: () => null }));
vi.mock('components/EnumDescription', () => ({ EnumColumnDescription: () => null }));
vi.mock('../form', () => ({ default: () => null }));

const profileOnFirstToken = {
    uuid: 'profile-1',
    name: 'Profile 1',
    enabled: true,
    tokenInstanceUuid: 'token-1',
    tokenInstanceName: 'Token 1',
    usages: [KeyUsage.Sign],
};

const profileOnSecondToken = {
    uuid: 'profile-2',
    name: 'Profile 2',
    enabled: true,
    tokenInstanceUuid: 'token-2',
    tokenInstanceName: 'Token 2',
    usages: [KeyUsage.Encrypt],
};

describe('TokenProfileList bulk key-usage update', () => {
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
            tokenprofiles: {
                ...initialState,
                tokenProfiles: [profileOnFirstToken, profileOnSecondToken],
                checkedRows: [profileOnFirstToken.uuid, profileOnSecondToken.uuid],
            },
            enums: { platformEnums: {} },
        };
        useSelectorMock.mockImplementation((selector: (value: unknown) => unknown) => selector(state));
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
    });

    const renderList = async () => {
        await act(async () => {
            root.render(<TokenProfileList />);
        });
        dispatch.mockClear();
        return container.querySelector('button[title="Update Key Usage"]') as HTMLButtonElement;
    };

    test('enablesBulkUpdate_forProfilesOfDifferentTokens', async () => {
        // when
        const updateKeyUsageButton = await renderList();

        // then
        expect(updateKeyUsageButton.disabled).toBe(false);
    });

    test('disablesBulkUpdate_withoutSelectedProfiles', async () => {
        // given
        state.tokenprofiles.checkedRows = [];

        // when
        const updateKeyUsageButton = await renderList();

        // then
        expect(updateKeyUsageButton.disabled).toBe(true);
    });

    test('opensBulkDialog_offeringEveryKeyUsage', async () => {
        // given
        const updateKeyUsageButton = await renderList();

        // when
        await act(async () => {
            updateKeyUsageButton.click();
        });

        // then
        const keyUsageSelect = container.querySelector('[data-testid="select-field"]') as HTMLButtonElement;
        expect(keyUsageSelect.dataset.options).toBe(Object.values(KeyUsage).join(','));
        expect(keyUsageSelect.disabled).toBe(false);
        expect(dispatch).not.toHaveBeenCalled();
    });

    test('confirmsBulkDialog_updatingEverySelectedProfile', async () => {
        // given
        const updateKeyUsageButton = await renderList();
        await act(async () => {
            updateKeyUsageButton.click();
        });
        const keyUsageSelect = container.querySelector('[data-testid="select-field"]') as HTMLButtonElement;
        await act(async () => {
            keyUsageSelect.click();
        });
        const updateButton = Array.from(container.querySelectorAll('[data-testid="dialog"] button')).find(
            (button) => button.textContent === 'Update',
        ) as HTMLButtonElement;

        // when
        await act(async () => {
            updateButton.click();
        });

        // then
        expect(dispatch).toHaveBeenCalledWith(
            tokenProfilesActions.bulkUpdateKeyUsage({
                usage: { usage: Object.values(KeyUsage), uuids: [profileOnFirstToken.uuid, profileOnSecondToken.uuid] },
            }),
        );
    });
});
