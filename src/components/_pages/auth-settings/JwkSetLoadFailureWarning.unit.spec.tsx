import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { setupReactActEnvironment } from '../test-utils/reactActEnvironment';
import { JWK_SET_LOAD_FAILURES, JwkSetLoadFailureWarningTestWrapper } from './jwkSetLoadFailureTestFixtures';

setupReactActEnvironment();

describe('JwkSetLoadFailureWarning', () => {
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

    for (const failure of Object.values(JWK_SET_LOAD_FAILURES)) {
        test(`shows the platform label and description for ${failure.code}`, async () => {
            await act(async () => {
                root.render(<JwkSetLoadFailureWarningTestWrapper failure={failure.code} />);
            });

            const warning = container.querySelector('[data-testid="jwk-set-load-failure-warning"]');
            expect(warning?.textContent).toContain(failure.label);
            expect(warning?.textContent).toContain(failure.description);
        });
    }

    test('renders nothing when loading succeeded', async () => {
        await act(async () => {
            root.render(<JwkSetLoadFailureWarningTestWrapper />);
        });

        expect(container.querySelector('[data-testid="jwk-set-load-failure-warning"]')).toBeNull();
    });
});
