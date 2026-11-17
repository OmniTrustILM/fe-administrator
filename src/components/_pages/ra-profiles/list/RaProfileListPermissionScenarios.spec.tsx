import { test } from '../../../../../playwright/ct-test';
import { expectOffered } from 'components/_pages/test-utils/permissionScenarioAssertions';
import { administrator, objectGrant, type PermissionScenario, readOnly } from 'components/_pages/test-utils/permissionScenarios';
import RaProfileListWithStore from './RaProfileListWithStore';

const controls = ['plus', 'trash', 'check', 'times', 'gavel'] as const;
const onSelection = ['trash', 'check', 'times'] as const;

// RA profiles take grants per object, so the server decides delete, enable and disable on the selection, while creating
// follows the profile and the compliance check follows the compliance profile grant, as on the detail page.
const expectations: { scenario: PermissionScenario; offered: (typeof controls)[number][] }[] = [
    { scenario: administrator, offered: [...controls] },
    { scenario: readOnly, offered: [...onSelection] },
    { scenario: objectGrant, offered: [...onSelection] },
];

test.describe('RaProfileList actions by permission scenario', () => {
    for (const { scenario, offered } of expectations) {
        test(`offers ${offered.join(', ') || 'no action'} to a ${scenario.name}`, async ({ mount }) => {
            const component = await mount(<RaProfileListWithStore scenario={scenario.name} />);

            for (const control of controls) {
                await expectOffered(component.getByTestId(`${control}-button`), offered.includes(control));
            }
        });
    }
});
