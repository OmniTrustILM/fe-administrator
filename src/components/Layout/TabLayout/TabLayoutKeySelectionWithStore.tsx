import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import TabLayout from './index';

/**
 * Harness for key-based tab selection: the first tab can be shown/hidden at runtime so a test can
 * verify that a tab appearing *before* the selected one does not shift the selection onto it.
 */
export default function TabLayoutKeySelectionWithStore() {
    const store = createMockStore();
    const [firstTabVisible, setFirstTabVisible] = useState(false);
    const [selectedTabKey, setSelectedTabKey] = useState('beta');

    return (
        <Provider store={store}>
            <MemoryRouter>
                <button type="button" data-testid="toggle-first-tab" onClick={() => setFirstTabVisible((v) => !v)}>
                    Toggle first tab
                </button>
                <div data-testid="selected-key">{selectedTabKey}</div>
                <TabLayout
                    selectedTabKey={selectedTabKey}
                    onTabKeyChange={setSelectedTabKey}
                    tabs={[
                        { tabKey: 'alpha', title: 'Alpha', hidden: !firstTabVisible, content: <div data-testid="alpha">Alpha body</div> },
                        { tabKey: 'beta', title: 'Beta', content: <div data-testid="beta">Beta body</div> },
                        { tabKey: 'gamma', title: 'Gamma', content: <div data-testid="gamma">Gamma body</div> },
                    ]}
                />
            </MemoryRouter>
        </Provider>
    );
}
