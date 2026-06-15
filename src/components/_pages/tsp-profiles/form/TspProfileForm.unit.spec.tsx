import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import { TspProfileForm } from './TspProfileForm';
import { PlatformEnum, Resource, TspAuthenticationMethod } from 'types/openapi';
import { COMMON_VAULT_PROFILES_STATE } from '../../test-utils/mockModules';
import { clickByTestId } from '../../test-utils/domActions';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { useDispatchMock, useSelectorMock } from '../../test-utils/reactReduxMockModule';

setupReactActEnvironment();

// Sets a controlled input's value and dispatches the change event (declaration is hoisted, so position is free).
async function typeInto(container: HTMLElement, testId: string, value: string) {
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    const input = container.querySelector(`[data-testid="${testId}"]`) as HTMLInputElement;
    await act(async () => {
        setValue.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });
}

// Set per-test to control what the (mocked) auth-methods multi-select emits on click.
let authMethodsSelection: { value: string; label: string }[] = [];

vi.mock('react-redux', async () => {
    return await import('../../test-utils/reactReduxMockModule');
});

vi.mock('react-router', () => ({
    useParams: () => ({}),
    useNavigate: () => () => {},
}));

vi.mock('components/Widget', async () => {
    const { widgetMockModule } = await import('../../test-utils/mockModules');
    return widgetMockModule();
});

vi.mock('components/Container', async () => {
    const { containerMockModule } = await import('../../test-utils/mockModules');
    return containerMockModule();
});

vi.mock('components/Breadcrumb', () => ({ default: () => <div data-testid="breadcrumb" /> }));

vi.mock('components/Attributes/AttributeEditor', () => ({ default: () => null }));

vi.mock('components/TextInput', () => ({
    default: ({ id, onChange, value }: any) => <input data-testid={`input-${id}`} value={value} onChange={onChange} />,
}));

vi.mock('components/ProgressButton', () => ({
    default: ({ title, disabled, type }: any) => (
        <button type={type} disabled={disabled} data-testid="submit">
            {title}
        </button>
    ),
}));

vi.mock('components/Button', () => ({
    default: ({ children, onClick, type }: any) => (
        <button type={type ?? 'button'} onClick={onClick}>
            {children}
        </button>
    ),
}));

vi.mock('components/Select', () => ({
    default: ({ id, onChange, error }: any) => (
        <div>
            <button
                type="button"
                data-testid={`select-${id}`}
                onClick={() => {
                    if (id === 'allowedAuthenticationMethods') {
                        onChange(authMethodsSelection);
                    } else if (id === 'vaultProfileSelect') {
                        onChange('vp-1');
                    } else {
                        onChange('sp-1');
                    }
                }}
            >
                select
            </button>
            {error ? <div data-testid={`select-error-${id}`}>{error}</div> : null}
        </div>
    ),
}));

describe('TspProfileForm authentication fields', () => {
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

        authMethodsSelection = [];

        state = {
            tspProfiles: { tspProfile: undefined, isFetchingDetail: false, isCreating: false, isUpdating: false },
            signingProfiles: { signingProfiles: [], isFetchingList: false },
            vaultProfiles: { ...COMMON_VAULT_PROFILES_STATE, isFetchingList: false },
            customAttributes: { resourceCustomAttributesContents: [], isFetchingResourceCustomAttributes: false },
            enums: {
                platformEnums: {
                    [PlatformEnum.Resource]: { [Resource.TspProfiles]: { label: 'TSP Profiles' } },
                    [PlatformEnum.TspAuthenticationMethod]: {
                        [TspAuthenticationMethod.ClientCertificate]: { label: 'Client certificate' },
                        [TspAuthenticationMethod.BearerToken]: { label: 'Bearer token' },
                        [TspAuthenticationMethod.BasicPassword]: { label: 'Basic password' },
                    },
                },
            },
        };

        useSelectorMock.mockImplementation((selector: any) => selector(state));
    });

    it('requires a vault profile when Basic password is selected and clears the error once one is chosen', async () => {
        await act(async () => {
            root.render(<TspProfileForm />);
        });

        authMethodsSelection = [{ value: TspAuthenticationMethod.BasicPassword, label: 'Basic password' }];
        await clickByTestId(container, 'select-allowedAuthenticationMethods');

        expect(container.textContent).toContain('Vault Profile is required when Basic password authentication is allowed.');

        await clickByTestId(container, 'select-vaultProfileSelect');

        expect(container.textContent).not.toContain('Vault Profile is required when Basic password authentication is allowed.');
    });

    it('submits allowedAuthenticationMethods and vaultProfileUuid', async () => {
        await act(async () => {
            root.render(<TspProfileForm />);
        });

        await typeInto(container, 'input-name', 'TspProfile1');
        authMethodsSelection = [{ value: TspAuthenticationMethod.BasicPassword, label: 'Basic password' }];
        await clickByTestId(container, 'select-allowedAuthenticationMethods');
        await clickByTestId(container, 'select-vaultProfileSelect');

        await clickByTestId(container, 'submit');

        const createAction = dispatch.mock.calls.map((call) => call[0]).find((action) => action.type === 'tspProfiles/createTspProfile');
        expect(createAction).toBeDefined();
        expect(createAction.payload.tspProfileRequestDto).toMatchObject({
            name: 'TspProfile1',
            allowedAuthenticationMethods: [TspAuthenticationMethod.BasicPassword],
            vaultProfileUuid: 'vp-1',
        });
    });

    it('submits without vaultProfileUuid when Basic password is not selected', async () => {
        await act(async () => {
            root.render(<TspProfileForm />);
        });

        await typeInto(container, 'input-name', 'TspProfile1');
        authMethodsSelection = [{ value: TspAuthenticationMethod.ClientCertificate, label: 'Client certificate' }];
        await clickByTestId(container, 'select-allowedAuthenticationMethods');

        expect(container.textContent).not.toContain('Vault Profile is required when Basic password authentication is allowed.');

        await clickByTestId(container, 'submit');

        const createAction = dispatch.mock.calls.map((call) => call[0]).find((action) => action.type === 'tspProfiles/createTspProfile');
        expect(createAction).toBeDefined();
        expect(createAction.payload.tspProfileRequestDto.allowedAuthenticationMethods).toEqual([TspAuthenticationMethod.ClientCertificate]);
        expect(createAction.payload.tspProfileRequestDto.vaultProfileUuid).toBeUndefined();
    });

    it('fetches vault profiles on mount', async () => {
        await act(async () => {
            root.render(<TspProfileForm />);
        });

        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'vaultProfiles/listVaultProfiles' }));
    });
});
