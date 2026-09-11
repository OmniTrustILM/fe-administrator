import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, describe, expect, test, vi } from 'vitest';
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
vi.mock('../../cryptographic-keys/KeyUsageSelect', () => ({
    default: ({ supportedKeyUsages, isDisabled }: { supportedKeyUsages?: KeyUsage[]; isDisabled?: boolean }) => (
        <div data-testid="key-usage-select" data-supported-usages={supportedKeyUsages?.join(',')} data-disabled={isDisabled} />
    ),
}));
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
                supportedTokenProfileKeyUsages: [],
                isFetchingSupportedTokenProfileKeyUsages: false,
            },
            enums: { platformEnums: {} },
        };
        useSelectorMock.mockImplementation((selector: (value: unknown) => unknown) => selector(state));
    });

    test('opensDialog_andRequestsUsagesSupportedByTheProfileToken', async () => {
        // given
        const supportedKeyUsages = [KeyUsage.Sign, KeyUsage.Verify];
        state.tokenprofiles.supportedTokenProfileKeyUsages = supportedKeyUsages;
        await act(async () => {
            root.render(<TokenProfileDetail />);
        });
        const updateKeyUsagesButton = container.querySelector('button[title="Update Key Usages"]') as HTMLButtonElement;

        // when
        await act(async () => {
            updateKeyUsagesButton.click();
        });

        // then
        const keyUsageSelect = container.querySelector('[data-testid="key-usage-select"]') as HTMLElement;
        expect(keyUsageSelect.dataset.supportedUsages).toBe(supportedKeyUsages.join(','));
        expect(keyUsageSelect.dataset.disabled).toBe('false');
        expect(dispatch).toHaveBeenCalledWith({
            type: 'tokenprofiles/clearSupportedTokenProfileKeyUsages',
            payload: undefined,
        });
        expect(dispatch).toHaveBeenCalledWith({
            type: 'tokenprofiles/getSupportedTokenProfileKeyUsages',
            payload: { tokenInstanceUuid: 'token-1' },
        });
    });

    test('opensDialog_withKeyUsageSelectDisabled_whileSupportedUsagesAreLoading', async () => {
        // given
        state.tokenprofiles.isFetchingSupportedTokenProfileKeyUsages = true;
        await act(async () => {
            root.render(<TokenProfileDetail />);
        });
        const updateKeyUsagesButton = container.querySelector('button[title="Update Key Usages"]') as HTMLButtonElement;

        // when
        await act(async () => {
            updateKeyUsagesButton.click();
        });

        // then
        const keyUsageSelect = container.querySelector('[data-testid="key-usage-select"]') as HTMLElement;
        expect(keyUsageSelect.dataset.disabled).toBe('true');
    });
});
