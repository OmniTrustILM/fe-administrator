import { test } from '../../../../../playwright/ct-test';
import { expectOnlyOffered } from 'components/_pages/test-utils/permissionScenarioAssertions';
import {
    administrator,
    createOnly,
    objectGrant,
    type OfferedControls,
    offeredTitle,
    readOnly,
} from 'components/_pages/test-utils/permissionScenarios';
import RaProfileListWithStore from './RaProfileListWithStore';

const controls = ['plus', 'trash', 'check', 'times', 'gavel'] as const;
const onSelection = ['trash', 'check', 'times'] as const;

// RA profiles take grants per object, so the server decides delete, enable and disable on the selection, while creating
// follows the profile and the compliance check follows the compliance profile grant, as on the detail page.
const expectations: OfferedControls<(typeof controls)[number]>[] = [
    { scenario: administrator, offered: [...controls] },
    { scenario: readOnly, offered: [...onSelection] },
    { scenario: createOnly, offered: ['plus', ...onSelection] },
    { scenario: objectGrant, offered: [...onSelection] },
];

test.describe('RaProfileList actions by permission scenario', () => {
    for (const { scenario, offered } of expectations) {
        test(offeredTitle({ scenario, offered }), async ({ mount }) => {
            const component = await mount(<RaProfileListWithStore scenario={scenario.name} />);

            await expectOnlyOffered(component, controls, offered);
        });
    }
});
