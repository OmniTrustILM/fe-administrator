import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import { TspProfileDetail } from './TspProfileDetail';
import { PlatformEnum, Resource, TspAuthenticationMethod } from 'types/openapi';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { useDispatchMock, useSelectorMock } from '../../test-utils/reactReduxMockModule';

setupReactActEnvironment();

vi.mock('react-redux', async () => {
    return await import('../../test-utils/reactReduxMockModule');
});

vi.mock('react-router', () => ({
    Link: ({ to, children }: any) => <a href={to}>{children}</a>,
    useParams: () => ({ id: 'tsp-1' }),
    useNavigate: () => () => {},
}));

vi.mock('components/Breadcrumb', () => ({ default: () => <div data-testid="breadcrumb" /> }));

vi.mock('components/Container', async () => {
    const { containerMockModule } = await import('../../test-utils/mockModules');
    return containerMockModule();
});

vi.mock('components/Widget', async () => {
    const { widgetMockModule } = await import('../../test-utils/mockModules');
    return widgetMockModule();
});

vi.mock('components/Dialog', async () => {
    const { dialogMockModule } = await import('../../test-utils/mockModules');
    return dialogMockModule();
});

vi.mock('components/CustomTable', async () => {
    const { customTableMockModule } = await import('../../test-utils/mockModules');
    return customTableMockModule();
});

vi.mock('components/Badge', () => ({ default: ({ children }: any) => <span>{children}</span> }));
vi.mock('components/StatusBadge', () => ({ default: ({ enabled }: any) => <span>{enabled ? 'Enabled' : 'Disabled'}</span> }));
vi.mock('components/Attributes/CustomAttributeWidget', () => ({ default: () => null }));
vi.mock('./TspBasicCredentialDialog', () => ({ default: () => <div data-testid="credential-dialog" /> }));

// WidgetButtons mock that honors `disabled` (the shared mock does not), so we can
// assert per-row actions are blocked while a delete is in flight.
vi.mock('components/WidgetButtons', () => ({
    default: ({ buttons }: any) => (
        <div>
            {(buttons || []).map((button: any) => (
                <button
                    key={button.id}
                    title={button.tooltip}
                    disabled={button.disabled}
                    onClick={() => {
                        if (!button.disabled) button.onClick();
                    }}
                >
                    {button.icon}
                </button>
            ))}
        </div>
    ),
}));

const CREDENTIAL = { uuid: 'cred-1', username: 'alice', mappedUser: { uuid: 'user-1', name: 'Alice' } } as any;

function rowDeleteButton(container: HTMLElement, rowId: string): HTMLButtonElement {
    const row = container.querySelector(`[data-testid="row-${rowId}"]`) as HTMLElement;
    return row.querySelector('button[title="Delete"]') as HTMLButtonElement;
}

async function clickByText(container: HTMLElement, text: string) {
    const button = Array.from(container.querySelectorAll('button')).find((el) => el.textContent === text) as HTMLButtonElement;
    await act(async () => {
        button.click();
    });
}

describe('TspProfileDetail Basic Credentials widget', () => {
    let container: HTMLDivElement;
    let root: Root;
    let dispatch: ReturnType<typeof vi.fn>;
    let state: any;

    const dispatchedTypes = () => dispatch.mock.calls.map((call) => call[0].type);

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);

        dispatch = vi.fn();
        useDispatchMock.mockReturnValue(dispatch);

        state = {
            tspProfiles: {
                tspProfile: {
                    uuid: 'tsp-1',
                    name: 'Profile 1',
                    enabled: true,
                    allowedAuthenticationMethods: [TspAuthenticationMethod.BasicPassword],
                },
                isFetchingDetail: false,
                isDeleting: false,
                isEnabling: false,
                isDisabling: false,
                deleteErrorMessage: '',
            },
            tspProfileBasicCredentials: {
                credentials: [],
                isFetchingList: false,
                isDeleting: false,
                deleteErrorMessage: '',
            },
            enums: {
                platformEnums: {
                    [PlatformEnum.Resource]: { [Resource.TspProfiles]: { label: 'TSP Profiles' } },
                    [PlatformEnum.TspAuthenticationMethod]: {
                        [TspAuthenticationMethod.BasicPassword]: { label: 'Basic password' },
                    },
                },
            },
        };

        useSelectorMock.mockImplementation((selector: any) => selector(state));
    });

    it('lists credentials and fetches them on mount', async () => {
        await act(async () => {
            root.render(<TspProfileDetail />);
        });

        expect(dispatchedTypes()).toContain('tspProfileBasicCredentials/listBasicCredentials');
        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'tspProfileBasicCredentials/listBasicCredentials',
                payload: { tspProfileUuid: 'tsp-1' },
            }),
        );
    });

    it('hides the Basic Credentials widget when Basic password is not allowed and no credentials exist', async () => {
        state.tspProfiles.tspProfile.allowedAuthenticationMethods = [TspAuthenticationMethod.ClientCertificate];

        await act(async () => {
            root.render(<TspProfileDetail />);
        });

        expect(container.querySelector('[data-testid="widget-Basic Credentials"]')).toBeNull();
    });

    it('shows the widget with an empty-state message when Basic password is allowed but no credentials exist', async () => {
        await act(async () => {
            root.render(<TspProfileDetail />);
        });

        expect(container.querySelector('[data-testid="widget-Basic Credentials"]')).not.toBeNull();
        expect(container.textContent).toContain('No Basic credentials configured yet.');
    });

    it('shows the not-allowed warning when credentials exist but Basic password is no longer allowed', async () => {
        state.tspProfiles.tspProfile.allowedAuthenticationMethods = [TspAuthenticationMethod.ClientCertificate];
        state.tspProfileBasicCredentials.credentials = [CREDENTIAL];

        await act(async () => {
            root.render(<TspProfileDetail />);
        });

        // Widget still rendered (so the orphaned credentials remain manageable)...
        expect(container.querySelector('[data-testid="widget-Basic Credentials"]')).not.toBeNull();
        // ...with the warning banner.
        expect(container.textContent).toContain('Basic authentication is not enabled for this profile');
        expect(container.querySelector('[data-testid="row-cred-1"]')).not.toBeNull();
    });

    it('opens the confirm dialog and dispatches deleteBasicCredential when confirmed', async () => {
        state.tspProfileBasicCredentials.credentials = [CREDENTIAL];

        await act(async () => {
            root.render(<TspProfileDetail />);
        });

        await act(async () => {
            rowDeleteButton(container, 'cred-1').click();
        });

        // Confirm dialog is open; confirm the deletion.
        expect(container.textContent).toContain('Its password will be removed from the Vault');
        await clickByText(container, 'Delete');

        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'tspProfileBasicCredentials/deleteBasicCredential',
                payload: { tspProfileUuid: 'tsp-1', uuid: 'cred-1' },
            }),
        );
    });

    it('disables per-row actions while a delete is in flight', async () => {
        state.tspProfileBasicCredentials.credentials = [CREDENTIAL];
        state.tspProfileBasicCredentials.isDeleting = true;

        await act(async () => {
            root.render(<TspProfileDetail />);
        });

        expect(rowDeleteButton(container, 'cred-1').disabled).toBe(true);
    });

    it('resets the credentials slice on unmount so state does not leak across profiles', async () => {
        await act(async () => {
            root.render(<TspProfileDetail />);
        });

        dispatch.mockClear();

        await act(async () => {
            root.unmount();
        });

        expect(dispatchedTypes()).toContain('tspProfileBasicCredentials/resetState');
    });
});
