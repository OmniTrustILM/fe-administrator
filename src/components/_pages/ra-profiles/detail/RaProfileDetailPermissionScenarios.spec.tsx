import { test } from '../../../../../playwright/ct-test';
import { expectOffered } from 'components/_pages/test-utils/permissionScenarioAssertions';
import { administrator, objectGrant, type PermissionScenario, readOnly } from 'components/_pages/test-utils/permissionScenarios';
import RaProfileDetailWithStore from './RaProfileDetailWithStore';

const controls = ['edit', 'delete', 'disable', 'check-compliance', 'associate-compliance-profile', 'add'] as const;

// Compliance profiles take grants per object, so the server decides associating one; the compliance check and approval
// profiles follow the profile, where only the administrator holds them.
const expectations: { scenario: PermissionScenario; offered: (typeof controls)[number][] }[] = [
    { scenario: administrator, offered: [...controls] },
    { scenario: readOnly, offered: ['associate-compliance-profile'] },
    { scenario: objectGrant, offered: ['edit', 'disable', 'associate-compliance-profile'] },
];

test.describe('RaProfileDetail actions by permission scenario', () => {
    for (const { scenario, offered } of expectations) {
        test(`offers ${offered.join(', ') || 'no action'} to a ${scenario.name}`, async ({ mount }) => {
            const component = await mount(<RaProfileDetailWithStore scenario={scenario.name} />);

            for (const control of controls) {
                await expectOffered(component.getByTestId(`${control}-button`), offered.includes(control));
            }
        });
    }
});
