import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { JwkSetLoadFailure } from 'types/openapi';
import { setupReactActEnvironment } from '../test-utils/reactActEnvironment';
import { AuthenticationSettingsTestWrapper, JWK_SET_LOAD_FAILURES } from './jwkSetLoadFailureTestFixtures';

setupReactActEnvironment();

describe('OAuth2 provider JWK Set keys dialog', () => {
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

    test('shows the selected provider warning', async () => {
        await act(async () => {
            root.render(<AuthenticationSettingsTestWrapper failure={JwkSetLoadFailure.Unavailable} />);
        });

        const keyButton = container.querySelector<HTMLButtonElement>('[data-testid="show-jwk-set-keys-provider"]');
        expect(keyButton).not.toBeNull();
        await act(async () => {
            keyButton?.click();
        });

        const dialog = document.body.querySelector('[role="dialog"]');
        expect(dialog?.textContent).toContain('JWK Set Keys of "provider"');
        expect(dialog?.querySelector('[data-testid="jwk-set-load-failure-warning"]')?.textContent).toContain(
            JWK_SET_LOAD_FAILURES[JwkSetLoadFailure.Unavailable].description,
        );
    });

    test('does not show a previously loaded provider while the selection changes', async () => {
        await act(async () => {
            root.render(
                <AuthenticationSettingsTestWrapper
                    failure={JwkSetLoadFailure.Unavailable}
                    providerName="provider-b"
                    loadedProviderName="provider-a"
                />,
            );
        });

        const keyButton = container.querySelector<HTMLButtonElement>('[data-testid="show-jwk-set-keys-provider-b"]');
        expect(keyButton).not.toBeNull();
        await act(async () => {
            keyButton?.click();
        });

        const dialog = document.body.querySelector('[role="dialog"]');
        expect(dialog?.textContent).toContain('JWK Set Keys of "provider-b"');
        expect(dialog?.querySelector('[data-testid="jwk-set-load-failure-warning"]')).toBeNull();
        expect(dialog?.querySelector('[data-testid="spinner"]')).not.toBeNull();
    });
});
