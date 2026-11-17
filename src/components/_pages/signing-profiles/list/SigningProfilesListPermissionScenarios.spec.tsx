import { test } from '../../../../../playwright/ct-test';
import { expectOffered } from 'components/_pages/test-utils/permissionScenarioAssertions';
import { administrator, objectGrant, type PermissionScenario, readOnly } from 'components/_pages/test-utils/permissionScenarios';
import SigningProfilesListWithStore from './SigningProfilesListWithStore';

const controls = ['create', 'delete', 'check', 'times'] as const;
const onSelection = ['delete', 'check', 'times'] as const;

// Signing profiles take grants per object, so the server decides every action on the selection and only creating
// follows the profile.
const expectations: { scenario: PermissionScenario; offered: (typeof controls)[number][] }[] = [
    { scenario: administrator, offered: [...controls] },
    { scenario: readOnly, offered: [...onSelection] },
    { scenario: objectGrant, offered: [...onSelection] },
];

test.describe('SigningProfilesList actions by permission scenario', () => {
    for (const { scenario, offered } of expectations) {
        test(`offers ${offered.join(', ') || 'no action'} to a ${scenario.name}`, async ({ mount }) => {
            const component = await mount(<SigningProfilesListWithStore scenario={scenario.name} />);
            await component
                .getByRole('row', { name: /Signing profile one/ })
                .getByRole('checkbox')
                .check();

            for (const control of controls) {
                await expectOffered(component.getByTestId(`${control}-button`), offered.includes(control));
            }
        });
    }
});
