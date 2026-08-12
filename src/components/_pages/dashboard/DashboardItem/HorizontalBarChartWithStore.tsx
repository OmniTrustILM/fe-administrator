import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import ThemeProvider from 'components/ThemeProvider';
import { createMockStore } from 'utils/test-helpers';
import HorizontalBarChart from './HorizontalBarChart';

export type HorizontalBarChartWithStoreProps = Readonly<React.ComponentProps<typeof HorizontalBarChart>>;

export default function HorizontalBarChartWithStore(props: HorizontalBarChartWithStoreProps) {
    const store = createMockStore();
    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/']}>
                <ThemeProvider>
                    <HorizontalBarChart {...props} />
                </ThemeProvider>
            </MemoryRouter>
        </Provider>
    );
}
