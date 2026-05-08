import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import Header from './Header';

export default function LayoutWithStore() {
    const store = createMockStore();
    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/']}>
                <>
                    <Header sidebarToggle={() => {}} />
                    <div data-testid="layout-outlet">Outlet content</div>
                </>
            </MemoryRouter>
        </Provider>
    );
}
