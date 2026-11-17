import { test } from '../../../../../playwright/ct-test';
import { expectOnlyOffered } from 'components/_pages/test-utils/permissionScenarioAssertions';
import { administrator, objectGrant, type OfferedControls, offeredTitle, readOnly } from 'components/_pages/test-utils/permissionScenarios';
import RaProfileDetailWithStore from './RaProfileDetailWithStore';

const controls = ['edit', 'delete', 'disable', 'check-compliance', 'associate-compliance-profile', 'add'] as const;

// Compliance profiles take grants per object, so the server decides associating one; the compliance check and approval
// profiles follow the profile, where only the administrator holds them.
const expectations: OfferedControls<(typeof controls)[number]>[] = [
    { scenario: administrator, offered: [...controls] },
    { scenario: readOnly, offered: ['associate-compliance-profile'] },
    { scenario: objectGrant, offered: ['edit', 'disable', 'associate-compliance-profile'] },
];

test.describe('RaProfileDetail actions by permission scenario', () => {
    for (const { scenario, offered } of expectations) {
        test(offeredTitle({ scenario, offered }), async ({ mount }) => {
            const component = await mount(<RaProfileDetailWithStore scenario={scenario.name} />);

            await expectOnlyOffered(component, controls, offered);
        });
    }
});
