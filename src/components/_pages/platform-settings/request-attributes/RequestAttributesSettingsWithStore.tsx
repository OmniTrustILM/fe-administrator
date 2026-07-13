import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import RequestAttributesSettings from './RequestAttributesSettings';

// Preload the platform default set as a *defined* (but empty) value so the component's
// undefined → defined seed transition fires and `loaded` flips true, enabling the editor and
// Save button. Component tests run no epics, so the mount-time getPlatformSettings fetch never
// resolves on its own; a browser-side preloaded store is the supported way to reach the loaded
// state (mirrors SigningRecordsDashboardWithStore). Creating the store inside this component
// keeps it in the browser context — a store built in the Node test body does not transfer.
const preloadedState = {
    raProfileRequestAttributes: {
        defaultSet: { requestAttributes: [] },
    },
} as any;

export default function RequestAttributesSettingsWithStore() {
    const store = createMockStore(preloadedState);
    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/platformsettings/request-attributes']}>
                <RequestAttributesSettings />
            </MemoryRouter>
        </Provider>
    );
}
