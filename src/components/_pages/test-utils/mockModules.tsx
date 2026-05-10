type SelectValueMap = Record<string, unknown>;

export const reduxHooksMockModule = (useDispatchMock: any, useSelectorMock: any) => ({
    useDispatch: () => useDispatchMock(),
    useSelector: (selector: any) => useSelectorMock(selector),
});

export const routerLinkMockModule = () => ({
    Link: ({ to, children }: any) => <a href={to}>{children}</a>,
});

export const badgeMockModule = () => ({
    default: ({ children }: any) => <span>{children}</span>,
});

export const containerMockModule = () => ({
    default: ({ children }: any) => <div>{children}</div>,
});

export const widgetMockModule = () => ({
    default: ({ title, widgetButtons, children }: any) => (
        <div data-testid={`widget-${title || 'root'}`}>
            {(widgetButtons || []).map((button: any) => (
                <button key={button.tooltip ?? button.icon} title={button.tooltip} onClick={button.onClick}>
                    {button.icon}
                </button>
            ))}
            {children}
        </div>
    ),
});

export const dialogMockModule = () => ({
    default: ({ isOpen, caption, body, buttons, toggle }: any) =>
        isOpen ? (
            <div data-testid="dialog">
                <div>{caption}</div>
                <div>{body}</div>
                <button onClick={toggle}>toggle</button>
                {(buttons || []).map((button: any) => (
                    <button key={button.body} onClick={button.onClick} disabled={button.disabled}>
                        {button.body}
                    </button>
                ))}
            </div>
        ) : null,
});

export const customTableMockModule = () => ({
    default: ({ data }: any) => (
        <div>
            {(data || []).map((row: any) => (
                <div key={row.id} data-testid={`row-${row.id}`}>
                    {(row.columns || []).map((column: any, index: number) => (
                        <div key={`${row.id}-col-${index}`}>{column}</div>
                    ))}
                </div>
            ))}
        </div>
    ),
});

export const widgetButtonsMockModule = () => ({
    default: ({ buttons }: any) => (
        <div>
            {(buttons || []).map((button: any) => (
                <button key={button.tooltip ?? button.icon} title={button.tooltip} onClick={button.onClick}>
                    {button.icon}
                </button>
            ))}
        </div>
    ),
});

export const createSelectMockModule = (valuesById: SelectValueMap, defaultValue: unknown = 'user-1') => ({
    default: ({ id, onChange, isMulti }: any) => (
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
