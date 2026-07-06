import type { ReactNode } from 'react';

type SelectValueMap = Record<string, unknown>;

type MockButton = {
    tooltip?: string;
    icon?: ReactNode;
    onClick?: () => void;
};

type MockDialogButton = {
    body?: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
};

type MockTableRow = {
    id: string | number;
    columns?: ReactNode[];
};

type MockSelector = (state: unknown) => unknown;

export const reduxHooksMockModule = (useDispatchMock: () => unknown, useSelectorMock: (selector: MockSelector) => unknown) => ({
    useDispatch: () => useDispatchMock(),
    useSelector: (selector: MockSelector) => useSelectorMock(selector),
});

export const routerLinkMockModule = () => ({
    Link: ({ to, children }: { to: string; children?: ReactNode }) => <a href={to}>{children}</a>,
});

export const badgeMockModule = () => ({
    default: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
});

export const containerMockModule = () => ({
    default: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
});

export const widgetMockModule = () => ({
    default: ({ title, widgetButtons, children }: { title?: string; widgetButtons?: MockButton[]; children?: ReactNode }) => (
        <div data-testid={`widget-${title || 'root'}`}>
            {(widgetButtons || []).map((button) => (
                <button key={button.tooltip ?? String(button.icon)} title={button.tooltip} onClick={button.onClick}>
                    {button.icon}
                </button>
            ))}
            {children}
        </div>
    ),
});

export const dialogMockModule = () => ({
    default: ({
        isOpen,
        caption,
        body,
        buttons,
        toggle,
    }: {
        isOpen?: boolean;
        caption?: ReactNode;
        body?: ReactNode;
        buttons?: MockDialogButton[];
        toggle?: () => void;
    }) =>
        isOpen ? (
            <div data-testid="dialog">
                <div>{caption}</div>
                <div>{body}</div>
                <button onClick={toggle}>toggle</button>
                {(buttons || []).map((button) => (
                    <button key={String(button.body)} onClick={button.onClick} disabled={button.disabled}>
                        {button.body}
                    </button>
                ))}
            </div>
        ) : null,
});

export const customTableMockModule = () => ({
    default: ({ data }: { data?: MockTableRow[] }) => (
        <div>
            {(data || []).map((row) => (
                <div key={row.id} data-testid={`row-${row.id}`}>
                    {(row.columns || []).map((column, index) => (
                        <div key={`${row.id}-col-${index}`}>{column}</div>
                    ))}
                </div>
            ))}
        </div>
    ),
});

export const widgetButtonsMockModule = () => ({
    default: ({ buttons }: { buttons?: MockButton[] }) => (
        <div>
            {(buttons || []).map((button) => (
                <button key={button.tooltip ?? String(button.icon)} title={button.tooltip} onClick={button.onClick}>
                    {button.icon}
                </button>
            ))}
        </div>
    ),
});

export const createSelectMockModule = (valuesById: SelectValueMap, defaultValue: unknown = 'user-1') => ({
    default: ({ id, onChange, isMulti }: { id?: string; onChange: (value: unknown) => void; isMulti?: boolean }) => (
        <button
            data-testid={`select-${id}`}
            onClick={() => {
                if (isMulti) {
                    onChange([{ value: 'group-1', label: 'Group 1' }]);
                    return;
                }

                if (id && valuesById[id] !== undefined) {
                    onChange(valuesById[id]);
                    return;
                }

                if (valuesById.__default !== undefined) {
                    onChange(valuesById.__default);
                    return;
                }

                onChange(defaultValue);
            }}
        >
            select
        </button>
    ),
});

export const COMMON_USERS_STATE = { users: [{ uuid: 'user-1', username: 'owner1' }] };
export const COMMON_GROUPS_STATE = { certificateGroups: [{ uuid: 'group-1', name: 'Group 1' }] };
export const COMMON_VAULT_PROFILES_STATE = {
    vaultProfiles: [
        { uuid: 'vp-1', name: 'Vault Profile One', enabled: true, vaultInstance: { uuid: 'vault-1' } },
        { uuid: 'vp-2', name: 'Vault Profile Two', enabled: true, vaultInstance: { uuid: 'vault-2' } },
    ],
};
