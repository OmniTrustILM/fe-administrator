import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import {
    AuthenticationSettingsTestWrapper,
    JWK_SET_LOAD_FAILURES,
    OAuth2ProviderDetailTestWrapper,
} from './OAuth2ProviderDetailTestWrapper';

setupReactActEnvironment();

describe('OAuth2 provider JWK Set load warning', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
    });

    async function render(component: React.ReactNode) {
        await act(async () => {
            root.render(component);
        });
    }

    for (const failure of Object.values(JWK_SET_LOAD_FAILURES)) {
        test(`shows the ${failure.code} warning from the platform enum`, async () => {
            await render(<OAuth2ProviderDetailTestWrapper failure={failure.code} />);

            const warning = container.querySelector('[data-testid="jwk-set-load-failure-warning"]');
            expect(warning).not.toBeNull();
            expect(warning?.textContent).toContain(failure.label);
            expect(warning?.textContent).toContain(failure.description);
            expect((container.querySelector('[data-testid="pencil-button"]') as HTMLButtonElement).disabled).toBe(false);
            expect((container.querySelector('[data-testid="trash-button"]') as HTMLButtonElement).disabled).toBe(false);
        });
    }

    test('does not show a warning when loading succeeded', async () => {
        await render(<OAuth2ProviderDetailTestWrapper />);

        expect(container.querySelector('[data-testid="jwk-set-load-failure-warning"]')).toBeNull();
    });

    test('shows the warning in the keys dialog opened from the providers list', async () => {
        await render(<AuthenticationSettingsTestWrapper failure="unavailable" />);

        const keyButton = container.querySelector('svg.lucide-key')?.closest('button');
        expect(keyButton).not.toBeNull();
        await act(async () => {
            keyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        const dialog = document.body.querySelector('[role="dialog"]');
        expect(dialog?.textContent).toContain('JWK Set Keys of "provider"');
        expect(dialog?.querySelector('[data-testid="jwk-set-load-failure-warning"]')?.textContent).toContain(
            JWK_SET_LOAD_FAILURES.unavailable.description,
        );
    });
});
