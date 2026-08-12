import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import ThemeProvider from 'components/ThemeProvider';
import { createMockStore } from 'utils/test-helpers';
import Header from './Header';

export default function LayoutWithStore() {
    const store = createMockStore();
    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/']}>
                <ThemeProvider>
                    <>
                        <Header sidebarToggle={() => {}} />
                        <div data-testid="layout-outlet">Outlet content</div>
                    </>
                </ThemeProvider>
            </MemoryRouter>
        </Provider>
    );
}
