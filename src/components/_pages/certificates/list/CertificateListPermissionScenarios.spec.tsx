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
import CertificateListWithStore from './CertificateListWithStore';

const controls = ['add-certificate', 'upload', 'group', 'user-check', 'shield-check', 'archive', 'unarchive', 'delete'] as const;
const onSelection = ['group', 'user-check', 'shield-check', 'archive', 'unarchive', 'delete'] as const;

// Certificates have owners and the bulk endpoints filter by what each caller may touch, so the server decides every
// action on the selection and only creating and importing follow the profile.
const expectations: { scenario: PermissionScenario; offered: (typeof controls)[number][] }[] = [
    { scenario: administrator, offered: [...controls] },
    { scenario: readOnly, offered: [...onSelection] },
    { scenario: owner, offered: [...onSelection] },
    { scenario: createOnly, offered: [...controls] },
    { scenario: groupMember, offered: [...onSelection] },
];

test.describe('CertificateList actions by permission scenario', () => {
    for (const { scenario, offered } of expectations) {
        test(`offers ${offered.join(', ') || 'no action'} to a ${scenario.name}`, async ({ mount }) => {
            const component = await mount(<CertificateListWithStore scenario={scenario.name} />);
            await component
                .getByRole('row', { name: /Certificate one/ })
                .getByRole('checkbox')
                .check();

            for (const control of controls) {
                await expectOffered(component.getByTestId(`${control}-button`), offered.includes(control));
            }
        });
    }
});
