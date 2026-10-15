import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { actions as tokenProfilesActions } from 'ducks/token-profiles';
import { KeyUsage } from 'types/openapi';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { useDispatchMock, useSelectorMock } from '../../test-utils/reactReduxMockModule';
import TokenProfileDetail from './index';

setupReactActEnvironment();

vi.mock('react-redux', async () => await import('../../test-utils/reactReduxMockModule'));
vi.mock('react-router', () => ({
    Link: ({ to, children }: { to: string; children?: React.ReactNode }) => <a href={to}>{children}</a>,
    useParams: () => ({ id: 'profile-1', tokenId: 'token-1' }),
    useSearchParams: () => [new URLSearchParams(), () => undefined],
}));
vi.mock('utils/common-hooks', () => ({ useRunOnSuccessfulFinish: () => undefined }));
vi.mock('components/DetailPageSkeleton', () => ({ default: () => null }));
vi.mock('components/Attributes/AttributeViewer', () => ({ default: () => null }));
vi.mock('components/Attributes/CustomAttributeWidget', () => ({ default: () => null }));
vi.mock('components/Breadcrumb', () => ({ default: () => null }));
vi.mock('components/Container', () => ({ default: ({ children }: { children?: React.ReactNode }) => <div>{children}</div> }));
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
vi.mock('components/StatusBadge', () => ({ default: () => null }));
vi.mock('components/Badge', () => ({ default: ({ children }: { children?: React.ReactNode }) => <span>{children}</span> }));
vi.mock('components/_pages/tokens/TokenStatusBadge', () => ({ default: () => null }));
vi.mock('../form', () => ({ default: () => null }));
vi.mock('components/Select', async () => {
    const { optionListSelectMockModule } = await import('../../test-utils/mockModules');
    return optionListSelectMockModule();
});
vi.mock('components/EnumDescription', () => ({
    EnumValueDescription: () => null,
}));

describe('TokenProfileDetail key-usage dialog', () => {
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
                tokenProfile: {
                    uuid: 'profile-1',
                    name: 'Profile 1',
                    description: 'Profile description',
                    enabled: true,
                    tokenInstanceUuid: 'token-1',
                    tokenInstanceName: 'Token 1',
                    usages: [KeyUsage.Sign],
                    attributes: [],
                    customAttributes: [],
                },
                isFetchingDetail: false,
                isUpdatingKeyUsage: false,
                isUpdating: false,
                updateTokenProfileSucceeded: false,
                isDeleting: false,
                isEnabling: false,
                isDisabling: false,
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

    const openKeyUsageDialog = async () => {
        await act(async () => {
            root.render(<TokenProfileDetail />);
        });
        dispatch.mockClear();
        const updateKeyUsagesButton = container.querySelector('button[title="Update Key Usages"]') as HTMLButtonElement;
        await act(async () => {
            updateKeyUsagesButton.click();
        });
    };

    test('opensDialog_offeringEveryKeyUsage_withTheProfileUsagesSelected', async () => {
        // given
        state.tokenprofiles.tokenProfile.usages = [KeyUsage.Sign];

        // when
        await openKeyUsageDialog();

        // then
        const keyUsageSelect = container.querySelector('[data-testid="select-field"]') as HTMLButtonElement;
        expect(keyUsageSelect.dataset.options).toBe(Object.values(KeyUsage).join(','));
        expect(keyUsageSelect.dataset.value).toBe(KeyUsage.Sign);
        expect(keyUsageSelect.disabled).toBe(false);
        expect(dispatch).not.toHaveBeenCalled();
    });

    test('confirmsDialog_updatingTheProfileWithThePickedUsages', async () => {
        // given
        await openKeyUsageDialog();
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
            tokenProfilesActions.updateKeyUsage({
                tokenInstanceUuid: 'token-1',
                uuid: 'profile-1',
                usage: { usage: Object.values(KeyUsage) },
            }),
        );
    });
});
