import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { initialState as acmeAccountsInitialState } from 'ducks/acme-accounts';
import { initialState as estProfilesInitialState } from 'ducks/est-profiles';
import { initialState as signingRecordsInitialState } from 'ducks/signing-records';
import { initialState as timeQualityInitialState } from 'ducks/time-quality-configurations';
import { AccountStatus, Resource, ResourceAction } from 'types/openapi';
import AcmeAccountDetail from './acme-accounts/detail';
import EstProfileDetail from './est-profiles/detail';
import SigningRecordDetail from './signing-records/detail';
import { TimeQualityConfigurationDetail } from './time-quality-configurations/detail/TimeQualityConfigurationDetail';
import { actionAvailabilityFake } from './test-utils/actionAvailabilityFake';
import { setupReactActEnvironment } from './test-utils/reactActEnvironment';
import { useDispatchMock, useSelectorMock } from './test-utils/reactReduxMockModule';

setupReactActEnvironment();

const routeParams = vi.hoisted(() => ({ current: {} as Record<string, string> }));

vi.mock('react-redux', async () => await import('./test-utils/reactReduxMockModule'));
vi.mock('utils/useActionAvailability', async () => (await import('./test-utils/actionAvailabilityFake')).actionAvailabilityFakeModule());
vi.mock('react-router', () => ({
    useParams: () => routeParams.current,
    useNavigate: () => vi.fn(),
    useSearchParams: () => [new URLSearchParams(), () => undefined],
    Link: ({ children }: { children: ReactElement }) => <span>{children}</span>,
}));
vi.mock('components/Widget', async () => (await import('./test-utils/mockModules')).widgetMockModule());
vi.mock('components/CustomTable', async () => (await import('./test-utils/mockModules')).customTableMockModule());
vi.mock('components/Dialog', async () => (await import('./test-utils/mockModules')).dialogMockModule());
vi.mock('components/Container', async () => (await import('./test-utils/mockModules')).containerMockModule());
vi.mock('components/Breadcrumb', () => ({ default: () => null }));
vi.mock('components/DetailPageSkeleton', () => ({ default: () => null }));
vi.mock('components/CommentPanel', () => ({ default: () => null }));
vi.mock('components/CopyUrlCell', () => ({ default: () => null }));
vi.mock('components/StatusBadge', () => ({ default: () => null }));
vi.mock('components/StatusCircle', () => ({ default: () => null }));
vi.mock('components/Badge', () => ({ default: () => null }));
vi.mock('components/EnumDescription', () => ({ EnumValueDescription: () => null }));
vi.mock('components/JsonViewer', () => ({ default: () => null }));
vi.mock('components/Attributes/AttributeViewer', () => ({ default: () => null }));
vi.mock('components/Attributes/CustomAttributeWidget', () => ({
    default: ({ requires }: { requires?: { available: boolean } }) => (
        <div data-testid="custom-attributes" data-editable={String(requires?.available ?? true)} />
    ),
}));
vi.mock('components/Layout/TabLayout', () => ({
    default: ({ tabs }: { tabs: { title: string; content: ReactElement }[] }) => <div>{tabs.map((tab) => tab.content)}</div>,
}));
vi.mock('./est-profiles/form', () => ({ default: () => null }));

const acmeAccount = {
    uuid: 'acc-1',
    accountId: 'a1',
    enabled: true,
    status: AccountStatus.Valid,
    contact: [],
    termsOfServiceAgreed: true,
    totalOrders: 0,
    successfulOrders: 0,
    failedOrders: 0,
    pendingOrders: 0,
    validOrders: 0,
    processingOrders: 0,
};

const commonState = { users: { users: [] }, certificateGroups: { certificateGroups: [] }, enums: { platformEnums: {} } };

type PageCase = {
    name: string;
    page: () => ReactElement;
    params: Record<string, string>;
    state: Record<string, unknown>;
    widget: string;
    resource: Resource;
    object: string | undefined;
    controls: { tooltip: string; action: ResourceAction }[];
    customAttributes: boolean;
    disabledObjectState?: Record<string, unknown>;
};

const pages: PageCase[] = [
    {
        name: 'EST profile',
        page: () => <EstProfileDetail />,
        params: { id: 'est-1' },
        state: {
            estProfiles: { ...estProfilesInitialState, estProfile: { uuid: 'est-1', name: 'est', enabled: true, customAttributes: [] } },
        },
        widget: 'EST Profile Details',
        resource: Resource.EstProfiles,
        object: 'est-1',
        controls: [
            { tooltip: 'Edit', action: ResourceAction.Update },
            { tooltip: 'Delete', action: ResourceAction.Delete },
            { tooltip: 'Disable', action: ResourceAction.Enable },
        ],
        customAttributes: true,
        disabledObjectState: {
            estProfiles: { ...estProfilesInitialState, estProfile: { uuid: 'est-1', name: 'est', enabled: false, customAttributes: [] } },
        },
    },
    {
        name: 'ACME account',
        page: () => <AcmeAccountDetail />,
        params: { id: 'acc-1', acmeProfileId: 'acme-1' },
        state: {
            acmeAccounts: {
                ...acmeAccountsInitialState,
                account: acmeAccount,
            },
        },
        widget: 'ACME Account Details',
        resource: Resource.AcmeAccounts,
        object: undefined,
        controls: [
            { tooltip: 'Revoke', action: ResourceAction.Revoke },
            { tooltip: 'Disable', action: ResourceAction.Enable },
        ],
        customAttributes: false,
        disabledObjectState: {
            acmeAccounts: { ...acmeAccountsInitialState, account: { ...acmeAccount, enabled: false } },
        },
    },
    {
        name: 'signing record',
        page: () => <SigningRecordDetail />,
        params: { id: 'rec-1' },
        state: { signingRecords: { ...signingRecordsInitialState, signingRecordDetail: { uuid: 'rec-1', name: 'record' } } },
        widget: 'Signing Record Details',
        resource: Resource.SigningRecords,
        object: undefined,
        controls: [{ tooltip: 'Delete', action: ResourceAction.Delete }],
        customAttributes: false,
    },
    {
        name: 'time quality configuration',
        page: () => <TimeQualityConfigurationDetail />,
        params: { id: 'tqc-1' },
        state: {
            timeQualityConfigurations: {
                ...timeQualityInitialState,
                timeQualityConfiguration: { uuid: 'tqc-1', name: 'tqc', ntpServers: [], customAttributes: [] },
            },
        },
        widget: 'Time Quality Configuration Details',
        resource: Resource.TimeQualityConfigurations,
        object: 'tqc-1',
        controls: [
            { tooltip: 'Edit', action: ResourceAction.Update },
            { tooltip: 'Delete', action: ResourceAction.Delete },
        ],
        customAttributes: true,
    },
];

describe('detail page actions follow the user permissions', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        useDispatchMock.mockReturnValue(vi.fn());
    });

    afterEach(async () => {
        await act(async () => root.unmount());
        container.remove();
        vi.clearAllMocks();
    });

    async function render(page: PageCase, granted: ResourceAction[], pageState = page.state) {
        routeParams.current = page.params;
        actionAvailabilityFake.reset(granted);
        const state = { ...commonState, ...pageState };
        useSelectorMock.mockImplementation((selector: (value: unknown) => unknown) => selector(state));
        await act(async () => root.render(page.page()));
    }

    const button = (page: PageCase, tooltip: string) =>
        container.querySelector<HTMLButtonElement>(`[data-testid="widget-${page.widget}"] > button[title="${tooltip}"]`);

    for (const page of pages) {
        describe(page.name, () => {
            it('asks about the object the page shows, or about the resource when Core checks only the resource', async () => {
                await render(page, []);

                expect(actionAvailabilityFake.requests).toContainEqual({ resource: page.resource, objects: page.object });
            });

            it('offers every action to a user holding them', async () => {
                await render(
                    page,
                    page.controls.map((control) => control.action),
                );

                for (const control of page.controls) expect(button(page, control.tooltip)?.disabled, control.tooltip).toBe(false);
                if (page.customAttributes) {
                    expect(container.querySelector('[data-testid="custom-attributes"]')?.getAttribute('data-editable')).toBe('true');
                }
            });

            it('disables every action for a read-only user', async () => {
                await render(page, [ResourceAction.List, ResourceAction.Detail]);

                for (const control of page.controls) expect(button(page, control.tooltip)?.disabled, control.tooltip).toBe(true);
                if (page.customAttributes) {
                    expect(container.querySelector('[data-testid="custom-attributes"]')?.getAttribute('data-editable')).toBe('false');
                }
            });

            const disabledObjectState = page.disabledObjectState;
            if (disabledObjectState) {
                it('offers Enable on a disabled object only to a user holding the enable permission', async () => {
                    await render(page, [ResourceAction.Enable], disabledObjectState);
                    expect(button(page, 'Enable')?.disabled).toBe(false);

                    await render(page, [ResourceAction.List, ResourceAction.Detail], disabledObjectState);
                    expect(button(page, 'Enable')?.disabled).toBe(true);
                });
            }
        });
    }
});
