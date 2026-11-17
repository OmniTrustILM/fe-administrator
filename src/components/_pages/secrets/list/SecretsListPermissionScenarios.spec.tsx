import { test } from '../../../../../playwright/ct-test';
import { expectOnlyOffered } from 'components/_pages/test-utils/permissionScenarioAssertions';
import {
    administrator,
    createOnly,
    groupMember,
    owner,
    type OfferedControls,
    offeredTitle,
    readOnly,
    scenarioState,
} from 'components/_pages/test-utils/permissionScenarios';
import type { SecretDto } from 'types/openapi';
import SecretsListWithStore from './SecretsListWithStore';

const controls = ['plus', 'check', 'times', 'user-check', 'group', 'shield-check', 'delete'] as const;

// Secret endpoints take plain UUIDs and check the resource, so the profile alone decides every list action.
const expectations: OfferedControls<(typeof controls)[number]>[] = [
    { scenario: administrator, offered: [...controls] },
    { scenario: readOnly, offered: [] },
    { scenario: owner, offered: [] },
    { scenario: createOnly, offered: ['plus'] },
    { scenario: groupMember, offered: [] },
];

test.describe('SecretsList actions by permission scenario', () => {
    for (const { scenario, offered } of expectations) {
        test(offeredTitle({ scenario, offered }), async ({ mount }) => {
            const component = await mount(
                <SecretsListWithStore
                    preloadedState={scenarioState(scenario) as never}
                    seededSecrets={[{ uuid: 'secret-1', name: 'Secret one' } as SecretDto]}
                />,
            );
            await component
                .getByRole('row', { name: /Secret one/ })
                .getByRole('checkbox')
                .check();

            await expectOnlyOffered(component, controls, offered);
        });
    }
});
