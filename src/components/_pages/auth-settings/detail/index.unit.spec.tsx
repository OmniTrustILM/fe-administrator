import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { JwkSetLoadFailure } from 'types/openapi';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { JWK_SET_LOAD_FAILURES, OAuth2ProviderDetailTestWrapper } from '../jwkSetLoadFailureTestFixtures';

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

    test('passes the provider failure to the warning without disabling edit or delete', async () => {
        await render(<OAuth2ProviderDetailTestWrapper failure={JwkSetLoadFailure.Invalid} />);

        expect(container.querySelector('[data-testid="jwk-set-load-failure-warning"]')?.textContent).toContain(
            JWK_SET_LOAD_FAILURES[JwkSetLoadFailure.Invalid].description,
        );

        const editButton = container.querySelector<HTMLButtonElement>('[data-testid="pencil-button"]');
        const deleteButton = container.querySelector<HTMLButtonElement>('[data-testid="trash-button"]');
        expect(editButton?.disabled).toBe(false);
        expect(deleteButton?.disabled).toBe(false);
    });

    test('does not show another provider while the route selection changes', async () => {
        await render(
            <OAuth2ProviderDetailTestWrapper
                failure={JwkSetLoadFailure.Unavailable}
                providerName="provider-b"
                loadedProviderName="provider-a"
            />,
        );

        expect(container.querySelector('[data-testid="jwk-set-load-failure-warning"]')).toBeNull();
        expect(container.textContent).not.toContain('provider-a');
    });
});
