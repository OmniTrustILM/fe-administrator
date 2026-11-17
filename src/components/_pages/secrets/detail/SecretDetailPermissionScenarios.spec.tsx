import { test } from '../../../../../playwright/ct-test';
import { expectOffered } from 'components/_pages/test-utils/permissionScenarioAssertions';
import {
    administrator,
    createOnly,
    groupMember,
    owner,
    type PermissionScenario,
    readOnly,
} from 'components/_pages/test-utils/permissionScenarios';
import SecretDetailWithStore from './SecretDetailWithStore';

const controls = ['eye', 'times', 'gavel', 'pencil', 'trash', 'plus'] as const;

// Every secret action also checks the resource, so an owner or group member without a grant is offered none of them.
const expectations: { scenario: PermissionScenario; offered: (typeof controls)[number][] }[] = [
    { scenario: administrator, offered: [...controls] },
    { scenario: readOnly, offered: [] },
    { scenario: owner, offered: [] },
    { scenario: createOnly, offered: [] },
    { scenario: groupMember, offered: [] },
];

test.describe('SecretDetail actions by permission scenario', () => {
    for (const { scenario, offered } of expectations) {
        test(`offers ${offered.join(', ') || 'no action'} to a ${scenario.name}`, async ({ mount }) => {
            const component = await mount(<SecretDetailWithStore scenario={scenario.name} />);

            for (const control of controls) {
                await expectOffered(component.getByTestId(`${control}-button`), offered.includes(control));
            }
        });
    }
});
