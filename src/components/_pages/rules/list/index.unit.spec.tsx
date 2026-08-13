import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router';
import { Provider } from 'react-redux';
import { createMockStore } from 'utils/test-helpers';
import RulesList from './index';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('./rules-list-component', () => ({ default: () => <div>rules-list</div> }));
vi.mock('./conditions-list-component', () => ({ default: () => <div>conditions-list</div> }));

let currentUrl = '';

function UrlProbe() {
    const location = useLocation();
    currentUrl = location.pathname + location.search;
    return null;
}

describe('RulesList tab persistence', () => {
    let container: HTMLDivElement;
    let root: Root;

    const render = async (initialUrl: string) => {
        await act(async () => {
            root.render(
                <Provider store={createMockStore()}>
                    <MemoryRouter initialEntries={[initialUrl]}>
                        <UrlProbe />
                        <RulesList />
                    </MemoryRouter>
                </Provider>,
            );
        });
    };

    const clickTab = async (title: string) => {
        const tab = [...container.querySelectorAll('button')].find((button) => button.textContent?.trim() === title);
        await act(async () => tab?.click());
    };

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.clearAllMocks();
    });

    it('opens on the Rules tab', async () => {
        await render('/rules');
        expect(container.textContent).toContain('rules-list');
    });

    it('puts the selected tab in the URL so leaving and coming back restores it', async () => {
        await render('/rules');
        await clickTab('Conditions');

        expect(container.textContent).toContain('conditions-list');
        // Without this the URL stays /rules and the browser Back button loses the tab.
        expect(currentUrl).toBe('/rules?tab=conditions');
    });

    it('restores the Conditions tab from the URL', async () => {
        await render('/rules?tab=conditions');
        expect(container.textContent).toContain('conditions-list');
        expect(container.textContent).not.toContain('rules-list');
    });
});
