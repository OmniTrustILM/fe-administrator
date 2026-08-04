import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router';
import { Provider } from 'react-redux';
import { createMockStore } from 'utils/test-helpers';
import ActionsList from './index';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('./actions-list-component', () => ({ default: () => <div>actions-list</div> }));
vi.mock('./executions-list-component', () => ({ default: () => <div>executions-list</div> }));

let currentUrl = '';

function UrlProbe() {
    const location = useLocation();
    currentUrl = location.pathname + location.search;
    return null;
}

describe('ActionsList tab persistence', () => {
    let container: HTMLDivElement;
    let root: Root;

    const render = async (initialUrl: string) => {
        await act(async () => {
            root.render(
                <Provider store={createMockStore()}>
                    <MemoryRouter initialEntries={[initialUrl]}>
                        <UrlProbe />
                        <ActionsList />
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

    it('opens on the Actions tab', async () => {
        await render('/actions');
        expect(container.textContent).toContain('actions-list');
    });

    it('puts the selected tab in the URL so leaving and coming back restores it', async () => {
        await render('/actions');
        await clickTab('Executions');

        expect(container.textContent).toContain('executions-list');
        // Without this the URL stays /rules and the browser Back button loses the tab.
        expect(currentUrl).toBe('/actions?tab=executions');
    });

    it('restores the Executions tab from the URL', async () => {
        await render('/actions?tab=executions');
        expect(container.textContent).toContain('executions-list');
        expect(container.textContent).not.toContain('actions-list');
    });
});
