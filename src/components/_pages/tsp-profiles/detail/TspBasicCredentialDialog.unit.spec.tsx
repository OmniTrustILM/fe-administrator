import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import TspBasicCredentialDialog from './TspBasicCredentialDialog';
import { COMMON_USERS_STATE } from '../../test-utils/mockModules';
import { clickByTestId } from '../../test-utils/domActions';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { useDispatchMock, useSelectorMock } from '../../test-utils/reactReduxMockModule';

setupReactActEnvironment();

vi.mock('react-redux', async () => {
    return await import('../../test-utils/reactReduxMockModule');
});

vi.mock('components/Container', async () => {
    const { containerMockModule } = await import('../../test-utils/mockModules');
    return containerMockModule();
});

vi.mock('components/Button', () => ({
    default: ({ children, onClick, type }: any) => (
        <button type={type ?? 'button'} onClick={onClick}>
            {children}
        </button>
    ),
}));

vi.mock('components/ProgressButton', () => ({
    default: ({ title, disabled, type }: any) => (
        <button type={type} disabled={disabled} data-testid="submit">
            {title}
        </button>
    ),
}));

vi.mock('components/TextInput', () => ({
    default: ({ id, onChange, value }: any) => <input data-testid={`input-${id}`} value={value} onChange={onChange} />,
}));

vi.mock('components/Select', () => ({
    default: ({ id, onChange, options }: any) => (
        <button type="button" data-testid={`select-${id}`} onClick={() => onChange('user-1')}>
            {(options ?? []).map((o: any) => (
                <span key={o.value} data-testid={`option-${id}`}>
                    {o.label}
                </span>
            ))}
        </button>
    ),
}));

const CREDENTIAL = { uuid: 'cred-1', username: 'alice', mappedUser: { uuid: 'user-1', name: 'Alice' } } as any;

async function typeInto(container: HTMLElement, testId: string, value: string) {
    const input = container.querySelector(`[data-testid="${testId}"]`) as HTMLInputElement;
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    await act(async () => {
        setValue.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });
}

describe('TspBasicCredentialDialog', () => {
    let container: HTMLDivElement;
    let root: Root;
    let dispatch: ReturnType<typeof vi.fn>;
    let state: any;
    let onClose: () => void;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);

        dispatch = vi.fn();
        onClose = vi.fn();
        useDispatchMock.mockReturnValue(dispatch);

        state = {
            users: COMMON_USERS_STATE,
            tspProfileBasicCredentials: {
                isCreating: false,
                isUpdating: false,
                saveSucceeded: false,
                saveErrorMessage: '',
            },
        };

        useSelectorMock.mockImplementation((selector: any) => selector(state));
    });

    it('create mode requires a password before submitting', async () => {
        await act(async () => {
            root.render(<TspBasicCredentialDialog tspProfileUuid="tsp-1" onClose={onClose} />);
        });

        await typeInto(container, 'input-username', 'alice');
        await clickByTestId(container, 'select-mappedUserSelect');
        await clickByTestId(container, 'submit');

        expect(
            dispatch.mock.calls.map((call) => call[0]).some((action) => action.type === 'tspProfileBasicCredentials/createBasicCredential'),
        ).toBe(false);

        await typeInto(container, 'input-password', 's3cret');
        await clickByTestId(container, 'submit');

        const createAction = dispatch.mock.calls
            .map((call) => call[0])
            .find((action) => action.type === 'tspProfileBasicCredentials/createBasicCredential');
        expect(createAction.payload).toEqual({
            tspProfileUuid: 'tsp-1',
            request: { username: 'alice', password: 's3cret', mappedUserUuid: 'user-1' },
        });
    });

    it('edit mode submits without password when the username is unchanged (keeps the current secret)', async () => {
        // Credential mapped to a different user so re-selecting user-1 makes the form dirty without touching the username.
        const credential = { uuid: 'cred-1', username: 'alice', mappedUser: { uuid: 'user-2', name: 'Bob' } } as any;
        await act(async () => {
            root.render(<TspBasicCredentialDialog tspProfileUuid="tsp-1" credential={credential} onClose={onClose} />);
        });

        expect(container.textContent).toContain('Leave blank to keep the current password.');

        await clickByTestId(container, 'select-mappedUserSelect');
        await clickByTestId(container, 'submit');

        const updateAction = dispatch.mock.calls
            .map((call) => call[0])
            .find((action) => action.type === 'tspProfileBasicCredentials/updateBasicCredential');
        expect(updateAction.payload).toEqual({
            tspProfileUuid: 'tsp-1',
            uuid: 'cred-1',
            request: { username: 'alice', password: undefined, mappedUserUuid: 'user-1' },
        });
    });

    it('edit mode requires a new password when the username changes', async () => {
        await act(async () => {
            root.render(<TspBasicCredentialDialog tspProfileUuid="tsp-1" credential={CREDENTIAL} onClose={onClose} />);
        });

        await typeInto(container, 'input-username', 'alice2');

        // The form surfaces the constraint and blocks submit while the password is blank.
        expect(container.textContent).toContain('Changing the username requires a new password.');
        await clickByTestId(container, 'submit');
        expect(
            dispatch.mock.calls.map((call) => call[0]).some((action) => action.type === 'tspProfileBasicCredentials/updateBasicCredential'),
        ).toBe(false);

        // Supplying a new password unblocks the update and rotates the secret.
        await typeInto(container, 'input-password', 'newpw');
        await clickByTestId(container, 'submit');

        const updateAction = dispatch.mock.calls
            .map((call) => call[0])
            .find((action) => action.type === 'tspProfileBasicCredentials/updateBasicCredential');
        expect(updateAction.payload).toEqual({
            tspProfileUuid: 'tsp-1',
            uuid: 'cred-1',
            request: { username: 'alice2', password: 'newpw', mappedUserUuid: 'user-1' },
        });
    });

    it('edit mode submits the new password when one is typed (rotates the secret)', async () => {
        await act(async () => {
            root.render(<TspBasicCredentialDialog tspProfileUuid="tsp-1" credential={CREDENTIAL} onClose={onClose} />);
        });

        await typeInto(container, 'input-password', 'newpw');
        await clickByTestId(container, 'submit');

        const updateAction = dispatch.mock.calls
            .map((call) => call[0])
            .find((action) => action.type === 'tspProfileBasicCredentials/updateBasicCredential');
        expect(updateAction.payload.request.password).toBe('newpw');
    });

    it('shows the backend save error inside the dialog', async () => {
        state.tspProfileBasicCredentials.saveErrorMessage = 'Username already exists';

        await act(async () => {
            root.render(<TspBasicCredentialDialog tspProfileUuid="tsp-1" onClose={onClose} />);
        });

        expect(container.textContent).toContain('Username already exists');
    });

    it('closes and clears save status once the save succeeds', async () => {
        state.tspProfileBasicCredentials.saveSucceeded = true;

        await act(async () => {
            root.render(<TspBasicCredentialDialog tspProfileUuid="tsp-1" onClose={onClose} />);
        });

        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'tspProfileBasicCredentials/clearSaveStatus' }));
        expect(onClose).toHaveBeenCalled();
    });

    it('excludes system users from the mapped-user dropdown', async () => {
        state.users = {
            users: [
                { uuid: 'user-1', username: 'realuser', systemUser: false },
                { uuid: 'sys-1', username: 'acme', systemUser: true },
            ],
        };

        await act(async () => {
            root.render(<TspBasicCredentialDialog tspProfileUuid="tsp-1" onClose={onClose} />);
        });

        const optionLabels = Array.from(container.querySelectorAll('[data-testid="option-mappedUserSelect"]')).map((el) => el.textContent);
        expect(optionLabels).toEqual([' (realuser)']);
    });

    it('fetches users on mount', async () => {
        await act(async () => {
            root.render(<TspBasicCredentialDialog tspProfileUuid="tsp-1" onClose={onClose} />);
        });

        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'users/list' }));
    });
});
