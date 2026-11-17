import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { createObjectPermissionStore } from 'components/_pages/test-utils/objectPermissionStore';
import { PERMISSION_SCENARIOS, scenarioState } from 'components/_pages/test-utils/permissionScenarios';
import { slice as secretsSlice } from 'ducks/secrets';
import { Resource, SecretState } from 'types/openapi';
import SecretDetail from './index';

const enabledSecret = { uuid: 'secret-1', name: 'Secret one', enabled: true, state: SecretState.Active, version: 1 };
const secrets = { enabled: enabledSecret, disabled: { ...enabledSecret, enabled: false } };

/** The secret detail page as the named permission scenario sees it. */
export default function SecretDetailWithStore({
    scenario,
    variant = 'enabled',
}: Readonly<{ scenario: string; variant?: keyof typeof secrets }>) {
    const secret = secrets[variant];
    const [store] = useState(() => {
        const permissions = scenarioState(PERMISSION_SCENARIOS.find((candidate) => candidate.name === scenario)!, {
            resource: Resource.Secrets,
            uuid: secret.uuid,
        });
        return createObjectPermissionStore({
            resource: Resource.Secrets,
            uuid: secret.uuid,
            allowedActions: [],
            preloadedState: { ...permissions, secrets: { ...secretsSlice.getInitialState(), secret } },
        });
    });

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={[`/secrets/detail/${secret.uuid}`]}>
                <Routes>
                    <Route path="/secrets/detail/:id" element={<SecretDetail />} />
                </Routes>
            </MemoryRouter>
        </Provider>
    );
}
