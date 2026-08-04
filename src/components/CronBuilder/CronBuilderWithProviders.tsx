import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import CronBuilder from './index';

/**
 * Test story for CronBuilder. The providers are built here, inside the browser, so the store the
 * component tree subscribes to is a real store rather than one bridged from the test process — the
 * latter cannot be torn down, which breaks re-rendering the tree through `component.update()`.
 */
export default function CronBuilderWithProviders({
    value,
    onChange = () => {},
}: Readonly<{ value: string; onChange?: (value: string) => void }>) {
    const [store] = useState(createMockStore);

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/']}>
                <CronBuilder value={value} onChange={onChange} />
            </MemoryRouter>
        </Provider>
    );
}
